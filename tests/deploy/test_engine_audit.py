import ast
import copy
from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import textwrap
import unittest
from unittest.mock import Mock, patch


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/audit-engine-staging.yml"
STEP = "      - name: Identifier le refus du lanceur Linux\n"
step = WORKFLOW.read_text(encoding="utf-8").split(STEP, 1)[1]
SOURCE = textwrap.dedent(
    step.split("sudo -n python3 - <<'PY'\n", 1)[1].split("\n            PY", 1)[0]
)
TREE = ast.parse(SOURCE)
TRACE = ast.literal_eval(next(
    node.value for node in TREE.body
    if isinstance(node, ast.Assign)
    and any(isinstance(target, ast.Name) and target.id == "trace_code"
            for target in node.targets)
))


class LauncherTrace(unittest.TestCase):
    def run_launcher(self, source):
        directory = ROOT / ".cache" / "engine-audit-tests"
        directory.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=directory) as temporary:
            target = Path(temporary) / "launcher.py"
            target.write_text(source, encoding="utf-8")
            return subprocess.run(
                [sys.executable, "-c", TRACE, str(target)],
                capture_output=True, text=True, timeout=5,
            )

    def test_reports_refusal_line_and_keeps_failure_status(self):
        result = self.run_launcher("def main():\n    return 70\n")
        self.assertEqual(result.returncode, 70)
        report = json.loads(result.stderr.removeprefix("AUDIT_TRACE="))
        self.assertEqual(report, {
            "event": "refused", "function": "main", "line": 2,
        })

    def test_reports_errno_without_private_exception_message(self):
        result = self.run_launcher(
            'def main():\n    raise PermissionError(1, "private-token-value")\n'
        )
        self.assertEqual(result.returncode, 70)
        self.assertIn('"errno": 1', result.stderr)
        self.assertIn('"type": "PermissionError"', result.stderr)
        self.assertNotIn("private-token-value", result.stdout + result.stderr)

    def test_does_not_change_a_successful_launcher_result(self):
        result = self.run_launcher("def main():\n    return 0\n")
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout + result.stderr, "")


class ProbeCollection(unittest.TestCase):
    def test_ambiguous_container_selection_stops_before_execution(self):
        output = io.StringIO()
        with patch("subprocess.check_output", return_value="first\nsecond\n") as listing, \
                patch("subprocess.Popen") as launch, redirect_stdout(output):
            with self.assertRaises(SystemExit) as result:
                exec(compile(SOURCE, str(WORKFLOW), "exec"), {})
        self.assertEqual(result.exception.code, 1)
        launch.assert_not_called()
        selection = listing.call_args.args[0]
        self.assertIn("label=com.docker.compose.project=novlearn-engine-staging", selection)
        self.assertIn("label=com.docker.compose.service=engine", selection)
        self.assertEqual(output.getvalue().strip(),
                         "AUDIT_ERROR=EXPECTED_ONE_RUNNING_STAGING_ENGINE")

    def collect(self, exit_code, frames, stderr):
        child = Mock(returncode=exit_code, stdin=io.BytesIO())
        child.communicate.return_value = (
            "\n".join(json.dumps(frame) for frame in frames).encode(),
            stderr.encode(),
        )
        output = io.StringIO()
        with patch("subprocess.check_output", return_value="staging-container\n"), \
                patch("subprocess.run", return_value=Mock(returncode=0, stdout="12")), \
                patch("subprocess.Popen", return_value=child) as launch, \
                redirect_stdout(output):
            with self.assertRaises(SystemExit) as result:
                exec(compile(SOURCE, str(WORKFLOW), "exec"), {})
        return result.exception.code, output.getvalue(), launch.call_args.args[0]

    def test_refusal_keeps_diagnostic_and_discards_raw_stderr(self):
        trace = {"event": "refused", "function": "main", "line": 94}
        status, output, command = self.collect(
            70, [], "private-token-value\nAUDIT_TRACE=" + json.dumps(trace) + "\n",
        )
        self.assertEqual(status, 1)
        self.assertIn("LAUNCHER_TRACE=" + json.dumps(trace), output)
        self.assertNotIn("private-token-value", output)
        self.assertIn('"worker_started": false', output)
        self.assertEqual(command[:4], ["docker", "exec", "-i", "staging-container"])
        self.assertIn("/usr/bin/env -i", command[6])

    def test_verified_synthetic_result_is_successful(self):
        status, output, _ = self.collect(0, [
            {"event": "started", "runtime": 1},
            {"requestId": "audit-launcher", "ok": True, "value": {"ok": True}},
        ], "")
        self.assertEqual(status, 0)
        self.assertIn('"worker_started": true', output)
        self.assertIn('"transport_ok": true', output)


class SwapRepair(unittest.TestCase):
    def setUp(self):
        primary = textwrap.dedent(WORKFLOW.read_text(encoding="utf-8").split(
            "<<'PY'\n", 1)[1].split("\n            PY", 1)[0])
        tree = ast.parse(primary)
        functions = ast.Module(body=[
            node for node in tree.body if isinstance(node, ast.FunctionDef)
            and node.name in {"staging_swap", "limit_bytes"}
        ], type_ignores=[])
        self.container = {
            "Id": "staging-id", "Image": "sha256:original-image",
            "Config": {
                "Env": ["ENGINE_API_TOKEN=private-test-value"],
                "Labels": {"com.docker.compose.project": "novlearn-engine-staging",
                           "com.docker.compose.service": "engine"},
            },
            "HostConfig": {"Memory": 402653184, "MemorySwap": -1, "PidsLimit": 64},
            "State": {"Running": True, "Pid": 42},
        }
        self.after = copy.deepcopy(self.container)
        self.after["HostConfig"]["MemorySwap"] = 402653184
        self.before_limits = {"memory.max": "402653184", "memory.swap.max": "max", "pids.max": "64"}
        self.after_limits = {**self.before_limits, "memory.swap.max": "0"}
        self.supported = True
        self.compose_swap = "384m"
        self.reports = []
        self.commands = Mock(side_effect=self.command)
        self.cgroups = Mock(side_effect=lambda _: self.before_limits if self.cgroups.call_count == 1 else self.after_limits)

        def stop(code):
            raise SystemExit(code)

        self.namespace = {
            "json": json, "re": __import__("re"), "command": self.commands,
            "staging_cgroup": self.cgroups, "stop": stop,
            "report": lambda name, **values: self.reports.append((name, values)),
        }
        exec(compile(functions, str(WORKFLOW), "exec"), self.namespace)

    def command(self, *args):
        if args[:2] == ("docker", "info"):
            return json.dumps(self.supported)
        if args[:2] == ("docker", "compose"):
            return json.dumps({"services": {"engine": {
                "mem_limit": "384m", "memswap_limit": self.compose_swap,
            }}})
        if args[:2] == ("docker", "update"):
            return "staging-id"
        if args == ("docker", "inspect", "staging-id"):
            return json.dumps([self.after])
        raise AssertionError("Unexpected Docker command")

    def repair(self, apply=True):
        self.namespace["staging_swap"]("staging-id", self.container, apply)

    def updates(self):
        return [call.args for call in self.commands.call_args_list
                if call.args[:2] == ("docker", "update")]

    def test_inspection_never_updates_container(self):
        self.repair(False)
        self.commands.assert_not_called()
        self.assertFalse(self.updates())

    def test_repairs_only_selected_container_and_checks_effective_quota(self):
        self.repair()
        self.assertEqual(self.updates(), [(
            "docker", "update", "--memory", "402653184",
            "--memory-swap", "402653184", "staging-id",
        )])
        self.assertIn(("STAGING_SWAP_REPAIR", {
            "applied": True, "effective_swap_zero": True,
            "same_image": True, "same_process": True,
        }), self.reports)
        self.assertNotIn("private-test-value", json.dumps(self.reports))

    def test_refuses_production_container_before_any_update(self):
        self.container["Config"]["Labels"]["com.docker.compose.project"] = "novlearn-engine-production"
        with self.assertRaisesRegex(SystemExit, "REPAIR_STAGING_CONTAINER_GUARD_FAILED"):
            self.repair()
        self.assertFalse(self.updates())

    def test_refuses_unsupported_swap_limits(self):
        self.supported = False
        with self.assertRaisesRegex(SystemExit, "DOCKER_SWAP_LIMIT_UNSUPPORTED"):
            self.repair()
        self.assertFalse(self.updates())

    def test_refuses_persistent_compose_drift_before_updating(self):
        self.compose_swap = None
        with self.assertRaisesRegex(SystemExit, "PERSISTENT_STAGING_LIMITS_INVALID"):
            self.repair()
        self.assertFalse(self.updates())

    def test_docker_success_does_not_hide_unlimited_kernel_swap(self):
        self.after_limits = self.before_limits
        with self.assertRaisesRegex(SystemExit, "REPAIR_EFFECTIVE_LIMITS_NOT_APPLIED"):
            self.repair()
        self.assertNotIn("STAGING_SWAP_REPAIR", [name for name, _ in self.reports])

    def test_rejects_unexpected_image_change(self):
        self.after["Image"] = "sha256:unexpected-image"
        with self.assertRaisesRegex(SystemExit, "REPAIR_CONTAINER_POSTCHECK_FAILED"):
            self.repair()

    def test_repeated_repair_does_not_update_correct_limits(self):
        self.before_limits = self.after_limits
        self.container["HostConfig"]["MemorySwap"] = 402653184
        self.repair()
        self.assertFalse(self.updates())


if __name__ == "__main__":
    unittest.main()
