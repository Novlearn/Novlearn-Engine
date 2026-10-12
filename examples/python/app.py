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

from bridge import BridgeError


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
        delivered = False
        async def replay():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": bytes(data), "more_body": False}
        await self.app(scope, replay, send)


def create_app(bridge, definitions, *, ttl=600, max_instances=16):
    # Definitions are selected from this backend-owned registry, never HTTP JSON.
    registry = json.loads(json.dumps(definitions, allow_nan=False))
    instances = {}

    @asynccontextmanager
    async def lifespan(_):
        try:
            yield
        finally:
            await bridge.close()

    app = FastAPI(lifespan=lifespan)
    app.add_middleware(BoundBody)
    app.state.instances = instances  # Test seam; no endpoint exposes private state.

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

    @app.post("/instances")
    async def create(body: CreateBody, authorization: str | None = Header(default=None)):
        owner = identity(authorization)
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
        instances[instance_id] = {"owner": owner, "official": official, "expires": time.monotonic() + ttl}
        return public

    @app.post("/instances/{instance_id}/answers")
    async def grade(instance_id: str, body: AnswerBody, authorization: str | None = Header(default=None)):
        owner = identity(authorization)
        entry = instances.get(instance_id)
        if entry is None or entry["owner"] != owner:
            raise HTTPException(404, detail="unknown-instance")
        if entry["expires"] <= time.monotonic():
            raise HTTPException(410, detail="expired-instance")
        submission = {"schemaVersion": 5, "instanceId": instance_id, "questionId": body.questionId, "answer": body.answer}
        # The low-level bridge is never called with an HTTP-provided official.
        result = await call("gradeAnswer", {"official": entry["official"], "submission": submission})
        if entry["expires"] <= time.monotonic() or instances.get(instance_id) is not entry:
            raise HTTPException(410, detail="expired-instance")
        return result

    return app
