"""Private backend transport. Callers own definitions, snapshots and identities."""
import asyncio
import json
import math
import os
import sys
from pathlib import Path
import uuid

OPERATIONS = frozenset({"validateDefinition", "validateSubmission", "parseMathInput", "generateVariables", "instantiateExercise", "projectPublicInstance", "gradeAnswer"})
ERRORS = frozenset({"invalid-request", "input-limit", "output-limit", "stderr-limit", "busy", "timeout", "aborted", "closed", "unavailable", "crash", "protocol-error", "worker-error"})


def bounded_json(value):
    stack = [(value, 0)]
    count = 0
    while stack:
        item, depth = stack.pop()
        count += 1
        if depth > 64 or count > 32768:
            return False
        if type(item) is float and not math.isfinite(item):
            return False
        if type(item) not in (dict, list, str, int, float, bool, type(None)):
            return False
        if type(item) is dict:
            stack.extend((child, depth + 1) for child in item.values())
        elif type(item) is list:
            stack.extend((child, depth + 1) for child in item)
    return True


class BridgeError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


class _Slot:
    def __init__(self):
        self.process = None
        self.stderr = None


async def await_cleanup(task):
    """Repeated cancellation must not release a slot before cleanup finishes."""
    cancelled = False
    while not task.done():
        try:
            await asyncio.shield(task)
        except asyncio.CancelledError:
            cancelled = True
    task.result()
    return cancelled


class EngineBridge:
    def __init__(self, node, cli, *, size=2, max_queued=8, timeout=6.0, persistent=True):
        self.node, self.cli = Path(node).resolve(strict=True), Path(cli).resolve(strict=True)
        if type(size) is not int or not 1 <= size <= 4 or type(max_queued) is not int or not 0 <= max_queued <= 32:
            raise ValueError("Invalid pool bounds")
        if not math.isfinite(timeout) or not 0.1 <= timeout <= 65:
            raise ValueError("Invalid transport deadline")
        self.timeout, self.persistent = timeout, persistent
        self.capacity, self.admitted, self.closed = size + max_queued, 0, False
        self.slots = [_Slot() for _ in range(size)]
        self.idle = asyncio.Queue(maxsize=size)
        for slot in self.slots:
            self.idle.put_nowait(slot)
        self.tasks = set()
        self.closing = None

    async def _stop(self, slot):
        process, stderr = slot.process, slot.stderr
        slot.process = slot.stderr = None
        if process is not None:
            if process.returncode is None:
                try:
                    process.kill()
                except ProcessLookupError:
                    pass
            await process.wait()
        if stderr is not None:
            await stderr

    async def _start(self, slot):
        env = {key: os.environ[key] for key in ("SystemRoot", "WINDIR", "TEMP", "TMP") if key in os.environ}
        args = [str(self.node), str(self.cli)] + ([] if self.persistent else ["--once"])
        try:
            slot.process = await asyncio.create_subprocess_exec(*args, stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, env=env, limit=2099200)
        except (OSError, NotImplementedError) as error:
            raise BridgeError("unavailable") from error
        process = slot.process

        async def drain():
            total = 0
            while chunk := await process.stderr.read(4096):
                total += len(chunk)
                if total > 65536:
                    if process.returncode is None:
                        process.kill()
                    return
        slot.stderr = asyncio.create_task(drain())

    async def run(self, operation, payload):
        deadline = asyncio.get_running_loop().time() + self.timeout
        if self.closed:
            raise BridgeError("closed")
        if type(operation) is not str or operation not in OPERATIONS or type(payload) is not dict or not bounded_json(payload):
            raise BridgeError("invalid-request")
        # Avoid a large backend-owned string creating an unbounded JSON buffer.
        pending, string_bytes = [payload], 0
        while pending:
            item = pending.pop()
            if type(item) is str:
                if len(item) > 1048576:
                    raise BridgeError("input-limit")
                try:
                    string_bytes += len(item.encode("utf-8"))
                except UnicodeError as error:
                    raise BridgeError("invalid-request") from error
                if string_bytes > 1048576:
                    raise BridgeError("input-limit")
            elif type(item) is dict:
                if any(type(key) is not str for key in item):
                    raise BridgeError("invalid-request")
                pending.extend(item.keys())
                pending.extend(item.values())
            elif type(item) is list:
                pending.extend(item)
        request_id = uuid.uuid4().hex
        try:
            data = json.dumps({"protocolVersion": 1, "requestId": request_id, "operation": operation, "payload": payload}, ensure_ascii=False, allow_nan=False, separators=(",", ":")).encode("utf-8")
        except (TypeError, ValueError, RecursionError) as error:
            raise BridgeError("invalid-request") from error
        if len(data) > 1048576:
            raise BridgeError("input-limit")
        if self.admitted >= self.capacity:
            raise BridgeError("busy")
        self.admitted += 1
        task = asyncio.current_task()
        self.tasks.add(task)
        slot = None
        try:
            async with asyncio.timeout_at(deadline):
                slot = await self.idle.get()
                if slot.process is None or slot.process.returncode is not None:
                    await self._stop(slot)
                    await self._start(slot)
                process = slot.process
                process.stdin.write(data + b"\n")
                await process.stdin.drain()
                line = await process.stdout.readline()
                if not line.endswith(b"\n") or len(line) > 2099200:
                    raise BridgeError("protocol-error")
                response = json.loads(line.decode("utf-8"), parse_constant=lambda _: (_ for _ in ()).throw(ValueError("Nonfinite JSON")))
                if not bounded_json(response) or type(response) is not dict or type(response.get("transportVersion")) is not int or response["transportVersion"] != 1 or response.get("requestId") != request_id or type(response.get("ok")) is not bool:
                    raise BridgeError("protocol-error")
                expected = {"transportVersion", "requestId", "ok", "metrics", "value" if response["ok"] else "error"}
                if set(response) != expected or type(response["metrics"]) is not dict:
                    raise BridgeError("protocol-error")
                metrics = response["metrics"]
                if set(metrics) - {"elapsedMs", "queuedMs", "workerPid", "peakCommittedBytes", "peakCgroupBytes", "supervisorRssBytes"}:
                    raise BridgeError("protocol-error")
                for key in ("elapsedMs", "queuedMs"):
                    if type(metrics.get(key)) not in (int, float) or not math.isfinite(metrics[key]) or metrics[key] < 0:
                        raise BridgeError("protocol-error")
                for key in ("workerPid", "peakCommittedBytes", "peakCgroupBytes", "supervisorRssBytes"):
                    if key in metrics and (type(metrics[key]) is not int or metrics[key] < 0):
                        raise BridgeError("protocol-error")
                if not response["ok"] and (type(response["error"]) is not str or response["error"] not in ERRORS):
                    raise BridgeError("protocol-error")
                if not self.persistent:
                    await process.wait()
                    if process.returncode != 0:
                        raise BridgeError("crash")
                    await self._stop(slot)
                return response
        except TimeoutError as error:
            raise BridgeError("timeout") from error
        except (OSError, UnicodeError, ValueError, RecursionError, OverflowError) as error:
            raise BridgeError("protocol-error") from error
        finally:
            # Cancellation, timeout and corrupt framing discard the whole slot.
            cancelled = False
            try:
                if slot is not None and (task.cancelling() or sys.exc_info()[0] is not None):
                    cancelled = await await_cleanup(asyncio.create_task(self._stop(slot)))
            finally:
                if slot is not None:
                    self.idle.put_nowait(slot)
                self.tasks.discard(task)
                self.admitted -= 1
            if cancelled:
                raise asyncio.CancelledError

    async def close(self):
        if self.closing is None:
            self.closed = True
            async def cleanup():
                tasks = list(self.tasks)
                for task in tasks:
                    task.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
                await asyncio.gather(*(self._stop(slot) for slot in self.slots))
            self.closing = asyncio.create_task(cleanup())
        if await await_cleanup(self.closing):
            raise asyncio.CancelledError
