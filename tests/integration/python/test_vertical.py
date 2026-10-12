"""Application invariants exercised against the real isolated engine."""
import asyncio
import json
import os
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "examples/python"))
from bridge import EngineBridge
from app import create_app
from httpx import AsyncClient, ASGITransport

NODE = os.environ.get("ENGINE_NODE", r"C:\Program Files\nodejs\node.exe")
CLI = ROOT / "dist/node-host/cli.js"
DEFINITION = json.loads((ROOT / "tests/fixtures/legacy/adapted/78.definition.json").read_text(encoding="utf-8"))
Q = "1781009000002"


class VerticalTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.bridge = EngineBridge(NODE, CLI, size=1)
        self.app = create_app(self.bridge, {"78": DEFINITION})
        self.client = AsyncClient(transport=ASGITransport(app=self.app), base_url="http://example.test", headers={"Authorization": "Bearer demo-alice"})

    async def asyncTearDown(self):
        await self.client.aclose()
        await self.bridge.close()

    async def create(self, duel=False):
        result = await self.client.post("/duels/demo-duel/instances" if duel else "/instances", json={"exerciseId": "78"})
        self.assertEqual(result.status_code, 200, result.text)
        return result.json()["instanceId"]

    async def answer(self, instance, source):
        return await self.client.post(f"/instances/{instance}/answers", json={"questionId": Q, "answer": {"format": "latex", "source": source}})

    async def test_partial_resume_ids_and_snapshot_replay(self):
        instance = await self.create()
        resumed = await self.client.get(f"/instances/{instance}")
        self.assertEqual(resumed.json()["progress"], [])
        for source, state in (("1{,}25", "incorrect"), (r"\frac{\placeholder{}}{2}", "invalid"), (r"\ln(2)", "indeterminate")):
            result = await self.answer(instance, source)
            self.assertEqual(result.json()["state"], state, result.text)
        entry = self.app.state.instances[instance]
        source = next(e for e in entry["official"]["elements"] if e["id"] == Q)["expected"]["math"]["displayLatex"]
        self.assertEqual((await self.answer(instance, source)).json()["state"], "correct")
        # The displayed option order is irrelevant: IDs, not positions, are sent.
        result = await self.client.post(f"/instances/{instance}/answers", json={"questionId": "1781009000003", "answer": {"format": "selection", "optionIds": ["1"]}})
        self.assertEqual(result.json()["state"], "correct")
        resumed = await self.client.get(f"/instances/{instance}")
        progress = resumed.json()["progress"]
        self.assertEqual(len(progress), 2)  # Third question is still unanswered.
        self.assertEqual(progress[0]["answer"]["source"], source)
        self.assertEqual(progress[0]["correction"]["state"], "correct")
        def keys(value):
            if isinstance(value, dict):
                return set(value).union(*(keys(v) for v in value.values()))
            if isinstance(value, list):
                return set().union(*(keys(v) for v in value))
            return set()
        self.assertTrue(keys(resumed.json()).isdisjoint({"expected", "policy", "seed", "definition", "legacy"}))
        official = json.loads(json.dumps(entry["official"]))
        replay = await self.bridge.run("instantiateExercise", {"definition": DEFINITION, "seed": int(official["generation"]["seed"]), "instanceId": instance})
        self.assertTrue(replay["ok"], replay)
        self.assertEqual(replay["value"]["value"], official)
        for attempt in entry["attempts"]:
            graded = await self.bridge.run("gradeAnswer", {"official": official, "submission": {"schemaVersion": 5, "instanceId": instance, "questionId": attempt["questionId"], "answer": attempt["answer"]}})
            self.assertEqual(graded["value"], attempt["correction"])

    async def test_resume_owner_and_expired_round_before_and_after_grade(self):
        instance = await self.create()
        other = await self.client.get(f"/instances/{instance}", headers={"Authorization": "Bearer demo-bob"})
        self.assertEqual(other.status_code, 404)
        old = await self.create(duel=True)
        current = await self.create(duel=True)
        self.assertEqual((await self.answer(old, "0")).status_code, 410)
        self.assertEqual((await self.client.get(f"/instances/{old}")).status_code, 410)
        # Delay return of an actual correction, then replace the application's round.
        original = self.bridge.run
        entered, release = asyncio.Event(), asyncio.Event()
        async def held(operation, payload):
            result = await original(operation, payload)
            if operation == "gradeAnswer":
                entered.set()
                await release.wait()
            return result
        self.bridge.run = held
        pending = asyncio.create_task(self.answer(current, "0"))
        await entered.wait()
        await self.create(duel=True)
        release.set()
        self.assertEqual((await pending).status_code, 410)
        self.assertEqual(self.app.state.instances[current]["attempts"], [])

    async def test_invalid_json_and_bounded_attempts(self):
        instance = await self.create()
        url = f"/instances/{instance}/answers"
        for content in (b'{"questionId":"q","answer":{"n":NaN}}', b'[' * 1000 + b'0' + b']' * 1000, b'\xff', rb'{"questionId":"q","answer":{"source":"\ud800"}}'):
            self.assertEqual((await self.client.post(url, content=content, headers={"Content-Type": "application/json"})).status_code, 422)
        for extra in ("seed", "policy", "verdict", "score", "official"):
            result = await self.client.post(url, json={"questionId": Q, "answer": {"format": "latex", "source": "0"}, extra: "spoof"})
            self.assertEqual(result.status_code, 422)
        self.assertEqual(self.app.state.instances[instance]["attempts"], [])
        self.app.state.instances[instance]["attempts"] = [{}] * 64
        self.assertEqual((await self.answer(instance, "0")).status_code, 429)

    async def test_latest_is_submission_order_not_completion_order(self):
        instance = await self.create()
        original = self.bridge.run
        entered, release = asyncio.Event(), asyncio.Event()
        async def held(operation, payload):
            result = await original(operation, payload)
            if operation == "gradeAnswer" and payload["submission"]["answer"]["source"] == "0":
                entered.set()
                await release.wait()
            return result
        self.bridge.run = held
        older = asyncio.create_task(self.answer(instance, "0"))
        await entered.wait()
        newer = await self.answer(instance, "1")
        self.assertEqual(newer.status_code, 200)
        release.set()
        self.assertEqual((await older).status_code, 200)
        resumed = await self.client.get(f"/instances/{instance}")
        self.assertEqual(resumed.json()["progress"][0]["answer"]["source"], "1")
        self.assertEqual(len(self.app.state.instances[instance]["attempts"]), 2)

    async def test_ttl_after_real_grade_and_duel_progress_is_per_learner(self):
        instance = await self.create(duel=True)
        alice = await self.answer(instance, "0")
        self.assertEqual(alice.status_code, 200)
        bob = await self.client.get(f"/instances/{instance}", headers={"Authorization": "Bearer demo-bob"})
        self.assertEqual(bob.status_code, 200)
        self.assertEqual(bob.json()["progress"], [])
        original = self.bridge.run
        async def expire(operation, payload):
            result = await original(operation, payload)
            if operation == "gradeAnswer":
                self.app.state.instances[instance]["expires"] = 0
            return result
        self.bridge.run = expire
        result = await self.answer(instance, "1")
        self.assertEqual(result.status_code, 410)
        self.assertEqual(len(self.app.state.instances[instance]["attempts"]), 1)

    async def test_historical_single_question_infinity_through_http(self):
        rows = json.loads((ROOT / "tests/fixtures/legacy/exercises_rows.original.json").read_text(encoding="utf-8"))
        recipes = json.loads((ROOT / "tests/fixtures/legacy/recipes.json").read_text(encoding="utf-8"))
        adapted = await self.bridge.run("adaptLegacyExercise", {"source": next(row for row in rows if row["id"] == 1), "sourceFormat": "database-row-v1", "recipe": recipes["1"]})
        self.assertTrue(adapted["ok"], adapted)
        self.assertTrue(adapted["value"]["ok"])
        application = create_app(self.bridge, {"1": adapted["value"]["definition"]})
        async with AsyncClient(transport=ASGITransport(app=application), base_url="http://example.test", headers={"Authorization": "Bearer demo-alice"}) as client:
            created = await client.post("/instances", json={"exerciseId": "1"})
            self.assertEqual(created.status_code, 200, created.text)
            public = created.json()
            questions = [e for e in public["elements"] if e["type"] == "question"]
            self.assertEqual(len(questions), 1)
            observed = json.loads((ROOT / "tests/fixtures/mathlive/observed-0.111.1.json").read_text(encoding="utf-8"))
            # Real archived MathLive serialization, not a regenerated fake capture.
            negative = next(record["expandedLatex"] for record in observed["records"] if record["expandedLatex"] == r"-\infty")
            for source, state in ((negative, "correct"), (r"+\infty", "incorrect"), (r"\frac{1}{0}", "invalid")):
                graded = await client.post(f'/instances/{public["instanceId"]}/answers', json={"questionId": questions[0]["id"], "answer": {"format": "latex", "source": source}})
                self.assertEqual(graded.status_code, 200, graded.text)
                self.assertEqual(graded.json()["state"], state)
            self.assertNotIn('"expected"', created.text)
            self.assertNotIn('"seed"', created.text)


if __name__ == "__main__":
    unittest.main()
