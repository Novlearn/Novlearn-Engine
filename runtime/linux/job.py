"""Fixed Linux x86_64 launcher; requires an existing bounded cgroup v2 scope.

No cgroup creation, privilege escalation, client command or math evaluation.
"""
import ctypes
import errno
import json
import os
from pathlib import Path
import signal
import resource
import stat
import sys
import threading

libc = ctypes.CDLL(None, use_errno=True)
libc.prctl.restype = ctypes.c_int


def prctl(option, value):
    if libc.prctl(option, value, 0, 0, 0) != 0:
        raise OSError(ctypes.get_errno(), "prctl failed")


def parent_death(parent):
    prctl(1, signal.SIGKILL)  # PR_SET_PDEATHSIG; also check the installation race.
    if os.getppid() != parent or parent <= 1:
        os._exit(70)


def thread_only():
    # seccomp x86_64: allow pthread clone, deny child-process creation.
    # clone3 returns ENOSYS so glibc can fall back to its permitted thread clone.
    class Filter(ctypes.Structure):
        _fields_ = [("code", ctypes.c_ushort), ("jt", ctypes.c_ubyte), ("jf", ctypes.c_ubyte), ("k", ctypes.c_uint)]
    class Program(ctypes.Structure):
        _fields_ = [("length", ctypes.c_ushort), ("filters", ctypes.POINTER(Filter))]
    deny, allow = 0x00050000 | errno.EPERM, 0x7FFF0000
    rules = [
        (0x20, 0, 0, 4),                 # seccomp_data.arch
        (0x15, 1, 0, 0xC000003E),        # AUDIT_ARCH_X86_64
        (0x06, 0, 0, 0x80000000),        # KILL_PROCESS on a different ABI
        (0x20, 0, 0, 0),                 # seccomp_data.nr
        (0x45, 0, 1, 0x40000000),        # x32 shares arch, reject its syscall bit
        (0x06, 0, 0, deny),
        (0x15, 0, 1, 435),               # clone3
        (0x06, 0, 0, 0x00050000 | errno.ENOSYS),
        (0x15, 0, 1, 57), (0x06, 0, 0, deny),  # fork
        (0x15, 0, 1, 58), (0x06, 0, 0, deny),  # vfork
        (0x15, 0, 4, 56),                # clone
        (0x20, 0, 0, 16),                # clone flags, low word
        (0x54, 0, 0, 0x10000),           # CLONE_THREAD
        (0x15, 1, 0, 0x10000),
        (0x06, 0, 0, deny),
        (0x06, 0, 0, allow),
    ]
    filters = (Filter * len(rules))(*(Filter(*rule) for rule in rules))
    program = Program(len(rules), filters)
    prctl(38, 1)  # PR_SET_NO_NEW_PRIVS
    if libc.prctl(22, 2, ctypes.byref(program), 0, 0) != 0:  # PR_SET_SECCOMP
        raise OSError(ctypes.get_errno(), "seccomp failed")


def frame(data):
    sys.stdout.buffer.write(json.dumps(data, separators=(",", ":")).encode("ascii") + b"\n")
    sys.stdout.buffer.flush()


def main():
    if len(sys.argv) != 7 or os.uname().machine != "x86_64" or sys.version_info < (3, 11):
        return 70
    node, worker = sys.argv[1:3]
    memory, heap, input_limit, timeout = map(int, sys.argv[3:])
    if not Path(node).is_absolute() or not Path(worker).is_absolute() or not 64 * 1048576 <= memory <= 2048 * 1048576 or not 16 <= heap <= 512 or not 1024 <= input_limit <= 1048576 or not 1 <= timeout <= 60000:
        return 70
    # Privileged exec can clear the kernel parent-death signal.
    if os.stat(node).st_mode & (stat.S_ISUID | stat.S_ISGID):
        return 70
    try:
        if os.getxattr(node, "security.capability"):
            return 70
    except OSError as error:
        if error.errno != errno.ENODATA:
            return 70
    # Only inherited cgroup quotas count. V8 heap and RLIMIT_AS are insufficient.
    entry = next(line[3:] for line in Path("/proc/self/cgroup").read_text().splitlines() if line.startswith("0::"))
    root = Path("/sys/fs/cgroup").resolve()
    group = (root / entry.lstrip("/")).resolve()
    if group != root and root not in group.parents:
        return 70
    cap = int((group / "memory.max").read_text().strip())
    swap = int((group / "memory.swap.max").read_text().strip())
    tasks = int((group / "pids.max").read_text().strip())
    if int((group / "memory.peak").read_text().strip()) < 0:
        return 70
    if not 64 * 1048576 <= cap <= memory or swap != 0 or not 1 <= tasks <= 64:
        return 70
    parent_death(os.getppid())
    # fork while this trusted launcher is still single-threaded. Child inherits
    # the cgroup at creation and waits for the ordered started frame before exec.
    input_read, input_write = os.pipe()
    ready_read, ready_write = os.pipe()
    gate_read, gate_write = os.pipe()
    parent = os.getpid()
    pid = os.fork()
    if pid == 0:
        try:
            os.close(input_write); os.close(ready_read); os.close(gate_write)
            os.setsid()
            parent_death(parent)
            # Do not write private process memory into a core dump on abort.
            resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
            thread_only()
            os.dup2(input_read, 0)
            os.close(input_read)
            os.write(ready_write, b"1"); os.close(ready_write)
            if os.read(gate_read, 1) != b"1":
                os._exit(70)
            os.close(gate_read)
            os.execve(node, [node, "--max-old-space-size=" + str(heap), worker], os.environ)
        except BaseException:
            os._exit(70)
    os.close(input_read); os.close(ready_write); os.close(gate_read)
    reaped = False
    try:
        if os.read(ready_read, 1) != b"1":
            return 70
        os.close(ready_read)
        frame({"runtime": 1, "event": "started", "pid": pid, "memoryLimitBytes": memory})
        def watchdog():
            threading.Event().wait(timeout / 1000)
            os._exit(75)  # kernel parent-death signal kills the blocked worker
        threading.Thread(target=watchdog, daemon=True).start()
        os.write(gate_write, b"1"); os.close(gate_write)
        request = sys.stdin.buffer.readline(input_limit + 2)
        if not request.endswith(b"\n") or len(request) > input_limit + 1:
            return 71
        with os.fdopen(input_write, "wb") as output:
            input_write = -1
            output.write(request[:-1])
        def lifetime():
            try:
                while sys.stdin.buffer.read(1):
                    pass
            finally:
                os._exit(72)
        threading.Thread(target=lifetime, daemon=True).start()
        _, status = os.waitpid(pid, 0)
        reaped = True
        code = os.waitstatus_to_exitcode(status)
        peak = int((group / "memory.peak").read_text().strip())
        frame({"runtime": 1, "event": "finished", "pid": pid, "exitCode": code, "peakCgroupBytes": peak})
        return 0 if code == 0 else 73
    finally:
        if not reaped:
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            try:
                os.waitpid(pid, 0)
            except ChildProcessError:
                pass
        if input_write != -1:
            os.close(input_write)


if __name__ == "__main__":
    try:
        # The lifetime thread may be blocked on stdin. Frames are explicitly
        # flushed; do not run interpreter shutdown with that buffered lock held.
        os._exit(main())
    except Exception:
        os.write(2, b"launcher-unavailable\n")
        os._exit(70)
