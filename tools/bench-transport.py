"""Bounded local transport measurements. Synthetic workload, no secret outputs."""
import asyncio
import json
import math
import os
from pathlib import Path
import platform
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "examples/python"))
from bridge import EngineBridge

NODE = os.environ.get("ENGINE_NODE", r"C:\Program Files\nodejs\node.exe")
CLI = ROOT / "dist/node-host/cli.js"


def percentile(values, quantile):
    return sorted(values)[max(0, math.ceil(len(values) * quantile) - 1)]


async def scenario(persistent, size, count):
    bridge = EngineBridge(NODE, CLI, persistent=persistent, size=size, timeout=15)
    samples = []
    try:
        # Only the persistent supervisor is warm; every math worker is still new.
        if persistent:
            await asyncio.gather(*(bridge.run("parseMathInput", {"source": "1+2", "context": {}, "profile": "scalar-latex-v1"}) for _ in range(size)))
        async def one():
            start = time.perf_counter()
            result = await bridge.run("parseMathInput", {"source": "x^2+2x+1", "context": {"variables": ["x"]}, "profile": "scalar-latex-v1"})
            if not result["ok"] or not result["value"]["ok"]:
                raise RuntimeError("Benchmark request failed: " + str(result.get("error")))
            memory_field = "peakCommittedBytes" if "peakCommittedBytes" in result["metrics"] else "peakCgroupBytes"
            samples.append({"elapsedMs": (time.perf_counter() - start) * 1000, memory_field: result["metrics"][memory_field], "supervisorRssBytes": result["metrics"]["supervisorRssBytes"]})
        start = time.perf_counter()
        # Exactly size in flight: throughput measurement excludes a growing queue.
        for offset in range(0, count, size):
            await asyncio.gather(*(one() for _ in range(min(size, count - offset))))
        duration = time.perf_counter() - start
        times = [sample["elapsedMs"] for sample in samples]
        memory_field = "peakCommittedBytes" if "peakCommittedBytes" in samples[0] else "peakCgroupBytes"
        memory_summary = "maxWorkerCommittedBytes" if memory_field == "peakCommittedBytes" else "maxScopeCgroupBytes"
        return {"persistentSupervisor": persistent, "size": size, "count": count, "durationSeconds": duration, "requestsPerSecond": count / duration, "p50Ms": percentile(times, 0.5), "p95Ms": percentile(times, 0.95), memory_summary: max(sample[memory_field] for sample in samples), "maxSupervisorRssBytes": max(sample["supervisorRssBytes"] for sample in samples), "samples": samples}
    finally:
        await bridge.close()


async def main():
    node_version = subprocess.check_output([NODE, "--version"], text=True).strip()
    cortex_version = json.loads((ROOT / "node_modules/@cortex-js/compute-engine/package.json").read_text(encoding="utf-8"))["version"]
    report = {"reportVersion": 1, "date": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "python": platform.python_version(), "os": platform.platform(), "processor": platform.processor(), "node": node_version, "cortex": cortex_version, "memoryMiB": 384, "heapMiB": 128, "mathDeadlineMs": 5000, "workload": "parseMathInput school-free polynomial x^2+2x+1; fresh worker each time", "percentiles": "nearest rank, small local sample; not a production SLO", "scenarios": []}
    for persistent, size, count in ((False, 1, 20), (True, 1, 20), (True, 2, 20)):
        result = await scenario(persistent, size, count)
        report["scenarios"].append(result)
        print(json.dumps({key: value for key, value in result.items() if key != "samples"}), flush=True)
    (ROOT / ".cache/m9-transport-benchmark.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())
