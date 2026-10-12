"""Local vertical bench. Never mount the repository as public static files."""
import asyncio
import hashlib
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "examples/python"))
from app import create_app
from bridge import EngineBridge
from fastapi import Header, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn


class BenchBridge:
    """Fixed server-side fault schedule; no HTTP field can select a command."""
    def __init__(self, node, cli):
        self.real = EngineBridge(node, cli, size=1)
        self.node, self.cli, self.grades = node, cli, 0

    async def run(self, operation, payload):
        if operation == "gradeAnswer":
            self.grades += 1
            if os.environ.get("E2E_FAULTS") == "1" and self.grades in (8, 9):
                # 8: actual cold CLI exceeds a 100 ms transport deadline.
                # 9: private fixture terminates its transport process.
                cli = self.cli if self.grades == 8 else ROOT / "tests/fixtures/runtime/transport.mjs"
                temporary = EngineBridge(self.node, cli, size=1, timeout=0.1 if self.grades == 8 else 1)
                try:
                    return await temporary.run(operation, payload if self.grades == 8 else {"mode": "crash"})
                finally:
                    await temporary.close()
        return await self.real.run(operation, payload)

    async def close(self):
        await self.real.close()


async def main():
    bridge = BenchBridge(os.environ.get("ENGINE_NODE", "/usr/local/bin/node"), ROOT / "dist/node-host/cli.js")
    raw = (ROOT / "docs/exercises_rows.json").read_bytes()
    if hashlib.sha256(raw).hexdigest() != "0f4d1173a78f9bd41e88678704c212c5147627e7e5a42ee28eb398f25f41c3ae":
        raise RuntimeError("Historical corpus changed")
    rows = json.loads(raw)
    recipes = json.loads((ROOT / "tests/fixtures/legacy/recipes.json").read_text(encoding="utf-8"))
    definitions = {}
    try:
        for row in rows:
            if row["id"] not in (78, 106):
                continue
            result = await bridge.run("adaptLegacyExercise", {"source": row, "sourceFormat": "database-row-v1", "recipe": recipes[str(row["id"])]})
            if not result["ok"] or not result["value"]["ok"]:
                raise RuntimeError("Reviewed adaptation failed")
            definitions[str(row["id"])] = result["value"]["definition"]
        app = create_app(bridge, definitions)
        web = Path(__file__).parent / "web"
        app.mount("/assets", StaticFiles(directory=web), name="bench-assets")
        app.mount("/mathlive", StaticFiles(directory=ROOT / "tools/mathlive/node_modules/mathlive"), name="mathlive")

        @app.get("/")
        async def index():
            return FileResponse(web / "index.html", headers={"Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"})

        @app.post("/bench/capture")
        async def capture(request: Request, authorization: str | None = Header(default=None)):
            if authorization != "Bearer demo-alice" or request.headers.get("origin") != "http://127.0.0.1:4318":
                raise HTTPException(403, detail="bench-origin")
            observed = await request.json()
            if not isinstance(observed, dict) or set(observed) != {"version", "locale", "browser", "records"} or not isinstance(observed["records"], list) or len(observed["records"]) > 128:
                raise HTTPException(422, detail="invalid-capture")
            artifacts = Path(os.environ.get("E2E_ARTIFACTS", str(ROOT / ".cache/e2e")))
            artifacts.mkdir(exist_ok=True, parents=True)
            (artifacts / "browser-observations.json").write_text(json.dumps(observed, ensure_ascii=False, indent=2), encoding="utf-8")
            # Backend-only replay evidence; never returned through HTTP/static mounts.
            (artifacts / "private-replay.json").write_text(json.dumps({"definitions": definitions, "instances": app.state.instances}, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"saved": len(observed["records"])}

        await uvicorn.Server(uvicorn.Config(app, host="0.0.0.0", port=4318, loop="asyncio", http="h11", access_log=False, proxy_headers=False)).serve()
    finally:
        await bridge.close()


if __name__ == "__main__":
    asyncio.run(main())
