import asyncio
import json
import os
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "examples/python"))
from bridge import EngineBridge, BridgeError
from app import create_app
from httpx import AsyncClient, ASGITransport

NODE = os.environ.get("ENGINE_NODE", r"C:\Program Files\nodejs\node.exe")
CLI = ROOT / "dist/node-host/cli.js"
FIXTURE = ROOT / "tests/fixtures/runtime/transport.mjs"
DEFINITION = {
    "schemaVersion": 5, "kind": "composed", "id": "synthetic-transport", "revision": "1", "title": "Transport",
    "generation": {"schemaVersion": 5, "definitions": [], "constraints": [], "maxAttempts": 1, "maxDraws": 1}, "variables": [],
    "elements": [{"id": "q", "type": "question", "text": "Half", "points": 1, "response": {"format": "latex", "kind": "rational"}, "expectedLatex": "1/2", "policy": {"domain": "rational", "form": "value-only"}}],
}


class BridgeTests(unittest.IsolatedAsyncioTestCase):
    async def test_real_cold_and_persistent_worker_contexts(self):
        for persistent in (False, True):
            bridge = EngineBridge(NODE, CLI, size=1, persistent=persistent)
            try:
                first = await bridge.run("parseMathInput", {"source": " x + 1 ", "context": {"variables": ["x"]}, "profile": "scalar-latex-v1"})
                second = await bridge.run("parseMathInput", {"source": "x+1", "context": {}, "profile": "scalar-latex-v1"})
                self.assertTrue(first["ok"], first)
                self.assertEqual(first["value"]["source"], " x + 1 ")
                self.assertFalse(second["value"]["ok"])
                self.assertNotEqual(first["metrics"]["workerPid"], second["metrics"]["workerPid"])
            finally:
                await bridge.close()

    async def test_supervisor_crash_and_restart(self):
        bridge = EngineBridge(NODE, CLI, size=1)
        try:
            first = await bridge.run("validateDefinition", {"definition": DEFINITION})
            self.assertTrue(first["value"]["ok"])
            process = bridge.slots[0].process
            process.kill()
            await process.wait()
            second = await bridge.run("validateDefinition", {"definition": DEFINITION})
            self.assertTrue(second["value"]["ok"])
            self.assertNotEqual(process.pid, bridge.slots[0].process.pid)
        finally:
            await bridge.close()

    async def test_errors_release_slot_and_recover(self):
        for mode, code in (("hang", "timeout"), ("crash", "protocol-error"), ("corrupt", "protocol-error"), ("overflow", "protocol-error"), ("boolean-version", "protocol-error"), ("list-error", "protocol-error"), ("nonfinite", "protocol-error"), ("deep", "protocol-error"), ("huge-metric", "protocol-error")):
            bridge = EngineBridge(NODE, FIXTURE, size=1, timeout=0.4)
            try:
                with self.assertRaises(BridgeError) as caught:
                    await bridge.run("validateDefinition", {"mode": mode})
                self.assertEqual(caught.exception.code, code)
                self.assertIsNone(bridge.slots[0].process)
                self.assertTrue((await bridge.run("validateDefinition", {"mode": "echo"}))["ok"])
            finally:
                await bridge.close()

    async def test_bounds_cancel_and_close(self):
        bridge = EngineBridge(NODE, FIXTURE, size=1, max_queued=0)
        task = asyncio.create_task(bridge.run("validateDefinition", {"mode": "hang"}))
        await asyncio.sleep(0.1)
        with self.assertRaises(BridgeError) as caught:
            await bridge.run("validateDefinition", {})
        self.assertEqual(caught.exception.code, "busy")
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertEqual(bridge.admitted, 0)
        self.assertTrue((await bridge.run("validateDefinition", {"mode": "echo"}))["ok"])
        await bridge.close()
        with self.assertRaises(BridgeError) as caught:
            await bridge.run("validateDefinition", {})
        self.assertEqual(caught.exception.code, "closed")

    async def test_untrusted_command_and_nonfinite_and_size(self):
        bridge = EngineBridge(NODE, FIXTURE, size=1)
        try:
            for operation, payload, code in (("eval", {}, "invalid-request"), ("validateDefinition", {"n": float("nan")}, "invalid-request"), ("validateDefinition", {"n": "x" * 1048576}, "input-limit")):
                with self.assertRaises(BridgeError) as caught:
                    await bridge.run(operation, payload)
                self.assertEqual(caught.exception.code, code)
            self.assertIsNone(bridge.slots[0].process)
        finally:
            await bridge.close()

    async def test_double_cancellation_waits_for_cleanup_and_restores_slot(self):
        bridge = EngineBridge(NODE, FIXTURE, size=1)
        stop = bridge._stop
        entered = asyncio.Event()
        release = asyncio.Event()
        async def slow_stop(slot):
            entered.set()
            await release.wait()
            await stop(slot)
        # Private seam delays real child cleanup, without replacing the process.
        bridge._stop = slow_stop
        task = asyncio.create_task(bridge.run("validateDefinition", {"mode": "hang"}))
        await entered.wait()
        release.set()
        await asyncio.sleep(0.1)
        entered.clear()
        release.clear()
        task.cancel()
        await entered.wait()
        task.cancel()
        await asyncio.sleep(0.02)
        self.assertFalse(task.done())
        self.assertEqual(bridge.idle.qsize(), 0)
        first_close = asyncio.create_task(bridge.close())
        second_close = asyncio.create_task(bridge.close())
        await asyncio.sleep(0.02)
        self.assertFalse(first_close.done())
        self.assertFalse(second_close.done())
        release.set()
        with self.assertRaises(asyncio.CancelledError):
            await task
        await asyncio.gather(first_close, second_close)
        self.assertEqual(bridge.admitted, 0)
        self.assertEqual(bridge.idle.qsize(), 1)
        self.assertEqual(len(bridge.tasks), 0)
        self.assertIsNone(bridge.slots[0].process)


class FastAPITests(unittest.IsolatedAsyncioTestCase):
    async def test_official_creation_grading_authority_ownership_and_expiry(self):
        bridge = EngineBridge(NODE, CLI, size=1)
        app = create_app(bridge, {"half": DEFINITION})
        async with app.router.lifespan_context(app):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://example.test", headers={"Authorization": "Bearer demo-alice"}) as client:
                for extra in ("seed", "official", "policy", "verdict", "expectedAnswer"):
                    result = await client.post("/instances", json={"exerciseId": "half", extra: "spoof"})
                    self.assertEqual(result.status_code, 422)
                    self.assertNotIn("spoof", result.text)
                created = await client.post("/instances", json={"exerciseId": "half"})
                self.assertEqual(created.status_code, 200, created.text)
                public = created.json()
                for private in ("expected", "policy", "generation", "definition", "seed"):
                    self.assertNotIn(private, json.dumps(public))
                url = f'/instances/{public["instanceId"]}/answers'
                for source, state in ((r"\frac{2}{4}", "correct"), ("2", "incorrect"), ("", "invalid")):
                    graded = await client.post(url, json={"questionId": "q", "answer": {"format": "latex", "source": source}})
                    self.assertEqual(graded.status_code, 200, graded.text)
                    self.assertEqual(graded.json()["state"], state)
                    self.assertNotIn("expected", graded.text)
                spoof = await client.post(url, json={"questionId": "q", "answer": {"format": "latex", "source": "2"}, "official": {"expected": "2"}})
                self.assertEqual(spoof.status_code, 422)
                other = await client.post(url, headers={"Authorization": "Bearer demo-bob"}, json={"questionId": "q", "answer": {"format": "latex", "source": "1/2"}})
                self.assertEqual(other.status_code, 404)
                oversized = await client.post(url, content=b"x" * 65537)
                self.assertEqual(oversized.status_code, 413)
                app.state.instances[public["instanceId"]]["expires"] = 0
                expired = await client.post(url, json={"questionId": "q", "answer": {"format": "latex", "source": "1/2"}})
                self.assertEqual(expired.status_code, 410)
        self.assertTrue(bridge.closed)


if __name__ == "__main__":
    unittest.main()
