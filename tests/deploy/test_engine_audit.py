import ast
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


if __name__ == "__main__":
    unittest.main()
