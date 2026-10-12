"""Isolated FastAPI example. Demo identity/store must be replaced by the app."""
from contextlib import asynccontextmanager
import json
import secrets
import time
import uuid

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from bridge import BridgeError, bounded_json


class CreateBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    exerciseId: str = Field(min_length=1, max_length=64)


class AnswerBody(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    questionId: str = Field(min_length=1, max_length=64)
    answer: dict


class BoundBody:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        data = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            if len(data) + len(chunk) > 65536:
                await JSONResponse(status_code=413, content={"detail": "input-limit"})(scope, receive, send)
                return
            data.extend(chunk)
            if not message.get("more_body", False):
                break
        if data:
            try:
                decoded = json.loads(data.decode("utf-8"))
                valid = bounded_json(decoded)
                # Escaped lone surrogates decode in Python but cannot cross UTF-8.
                if valid:
                    json.dumps(decoded, ensure_ascii=False, allow_nan=False).encode("utf-8")
            except (ValueError, UnicodeError, RecursionError):
                valid = False
            if not valid:
                await JSONResponse(status_code=422, content={"detail": "invalid-submission"})(scope, receive, send)
                return
        delivered = False
        async def replay():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": bytes(data), "more_body": False}
        await self.app(scope, replay, send)


def create_app(bridge, definitions, *, ttl=600, max_instances=16, max_attempts=64):
    # Definitions are selected from this backend-owned registry, never HTTP JSON.
    registry = json.loads(json.dumps(definitions, allow_nan=False))
    instances = {}
    # A deliberately small application fixture, not engine matchmaking logic.
    duel = {"round": 0, "instanceId": None}

    @asynccontextmanager
    async def lifespan(_):
        try:
            yield
        finally:
            await bridge.close()

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(BoundBody)
    app.state.instances = instances  # Test seam; no endpoint exposes private state.
    app.state.duel = duel

    def identity(authorization):
        # Explicit demonstration tokens; these are not production authentication.
        if authorization not in ("Bearer demo-alice", "Bearer demo-bob"):
            raise HTTPException(401, detail="unauthorized")
        return authorization

    async def call(operation, payload):
        try:
            result = await bridge.run(operation, payload)
        except BridgeError as error:
            status = 504 if error.code == "timeout" else 503
            raise HTTPException(status, detail=error.code) from error
        if not result["ok"]:
            status = 504 if result["error"] == "timeout" else 503
            raise HTTPException(status, detail=result["error"])
        return result["value"]

    @app.exception_handler(RequestValidationError)
    async def invalid_body(_request: Request, _error: RequestValidationError):
        # Avoid returning an input dump in errors, including spoofed snapshots.
        return JSONResponse(status_code=422, content={"detail": "invalid-submission"})

    def authorized_entry(instance_id, owner):
        entry = instances.get(instance_id)
        if entry is None or (entry["owner"] != owner and not entry["duel"]):
            raise HTTPException(404, detail="unknown-instance")
        if entry["expires"] <= time.monotonic():
            raise HTTPException(410, detail="expired-instance")
        if entry["duel"] and duel["instanceId"] != instance_id:
            raise HTTPException(410, detail="expired-round")
        return entry

    def still_authorized(instance_id, owner, entry):
        if authorized_entry(instance_id, owner) is not entry:
            raise HTTPException(410, detail="expired-instance")

    async def create_instance(body, owner, *, is_duel=False):
        definition = registry.get(body.exerciseId)
        if definition is None:
            raise HTTPException(404, detail="unknown-exercise")
        now = time.monotonic()
        for key in list(instances):
            if instances[key]["expires"] <= now:
                del instances[key]
        if len(instances) >= max_instances:
            raise HTTPException(503, detail="busy")
        instance_id = uuid.uuid4().hex
        generated = await call("instantiateExercise", {"definition": definition, "instanceId": instance_id, "seed": secrets.randbits(32)})
        if not generated.get("ok"):
            raise HTTPException(500, detail="generation-failed")
        official = generated["value"]
        public = await call("projectPublicInstance", {"official": official})
        # Capacity can change during the two awaited calls.
        if len(instances) >= max_instances:
            raise HTTPException(503, detail="busy")
        instances[instance_id] = {"owner": owner, "official": official, "expires": time.monotonic() + ttl, "duel": is_duel, "attempts": [], "latest": {}, "sequence": 0, "latestSequence": {}}
        if is_duel:
            duel["round"] += 1
            duel["instanceId"] = instance_id
        return public

    @app.post("/instances")
    async def create(body: CreateBody, authorization: str | None = Header(default=None)):
        return await create_instance(body, identity(authorization))

    @app.post("/duels/demo-duel/instances")
    async def create_round(body: CreateBody, authorization: str | None = Header(default=None)):
        return await create_instance(body, identity(authorization), is_duel=True)

    @app.get("/instances/{instance_id}")
    async def resume(instance_id: str, authorization: str | None = Header(default=None)):
        owner = identity(authorization)
        entry = authorized_entry(instance_id, owner)
        public = await call("projectPublicInstance", {"official": entry["official"]})
        still_authorized(instance_id, owner, entry)
        # Only this learner's submitted answers and server corrections are returned.
        return {"instance": public, "progress": list(entry["latest"].get(owner, {}).values())}

    @app.post("/instances/{instance_id}/answers")
    async def grade(instance_id: str, body: AnswerBody, authorization: str | None = Header(default=None)):
        owner = identity(authorization)
        entry = authorized_entry(instance_id, owner)
        if len(entry["attempts"]) >= max_attempts:
            raise HTTPException(429, detail="attempt-limit")
        entry["sequence"] += 1
        sequence = entry["sequence"]
        submission = {"schemaVersion": 5, "instanceId": instance_id, "questionId": body.questionId, "answer": body.answer}
        # The low-level bridge is never called with an HTTP-provided official.
        result = await call("gradeAnswer", {"official": entry["official"], "submission": submission})
        still_authorized(instance_id, owner, entry)
        if len(entry["attempts"]) >= max_attempts:
            raise HTTPException(429, detail="attempt-limit")
        attempt = {"questionId": body.questionId, "answer": body.answer, "correction": result}
        entry["attempts"].append({"owner": owner, "sequence": sequence, **attempt})
        latest_sequence = entry["latestSequence"].setdefault(owner, {})
        if sequence > latest_sequence.get(body.questionId, 0):
            latest_sequence[body.questionId] = sequence
            entry["latest"].setdefault(owner, {})[body.questionId] = attempt
        return result

    return app
