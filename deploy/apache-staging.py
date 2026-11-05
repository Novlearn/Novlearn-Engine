#!/usr/bin/env python3
"""Narrow, transactional staging vhost repair; executed only by Actions."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import tempfile
import time

DOMAIN = "staging.novlearn.fr"
BEGIN = "    # BEGIN Engine staging exact /run"
END = "    # END Engine staging exact /run"


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE).strip()


def vhosts(source):
    return list(re.finditer(r"(?ims)^[ \t]*<VirtualHost\s+[^>]+>.*?^[ \t]*</VirtualHost>[^\n]*", source))


def statements(lines):
    """Read logical Apache lines without changing their original bytes."""
    raw, logical, start = [], [], 0
    for number, line in enumerate(lines, 1):
        if not raw:
            start = number
        raw.append(line)
        value = line.rstrip("\r\n")
        continued = value.endswith("\\") and not value.lstrip().startswith("#")
        logical.append(value[:-1] if continued else value)
        if not continued:
            yield "".join(raw), " ".join(logical).strip(), start
            raw, logical = [], []
    if raw:
        raise ValueError(f"Unfinished continuation at staging body line {start}")


def body_statements(lines):
    """Track container boundaries; expressions and directive values stay opaque."""
    stack = []
    for raw, logical, number in statements(lines):
        if not logical or logical.startswith("#"):
            yield raw, "", number
            continue
        if logical.startswith("<"):
            closing = re.fullmatch(r"</([A-Za-z][A-Za-z0-9]*)\s*>", logical)
            opening = re.fullmatch(r"<([A-Za-z][A-Za-z0-9]*)\b.*>", logical)
            if closing:
                name = closing[1].lower()
                if not stack or stack.pop() != name:
                    raise ValueError(f"Unbalanced staging container at body line {number}")
            elif opening and opening[1].lower() != "virtualhost":
                stack.append(opening[1].lower())
            else:
                raise ValueError(f"Unsupported staging container syntax at body line {number}")
            yield raw, "", number
        else:
            yield raw, logical, number
    if stack:
        raise ValueError("Unclosed staging containers")


def server_name(value):
    # Apache accepts a quoted ServerName, an optional scheme and a port.
    from urllib.parse import urlsplit
    parsed = urlsplit(value if "://" in value else "//" + value)
    return parsed.hostname.lower().rstrip(".") if parsed.hostname else ""


def vhost_summary(source):
    """Only structural metadata, never full config, tokens or certificates."""
    summary = []
    for block in vhosts(source):
        names, directives = [], []
        for raw, stripped, number in statements(block[0].splitlines(keepends=True)[1:-1]):
            if not re.match(r"(?i)^(ServerName|ServerAlias|SSLEngine|Include|IncludeOptional)\s", stripped):
                continue
            parts = shlex.split(stripped)
            directive = parts[0].lower()
            if directive in {"servername", "serveralias"}:
                names.extend(server_name(n) for n in parts[1:])
            elif directive in {"sslengine", "include", "includeoptional"}:
                directives.append(directive)
        summary.append({"line": source.count("\n", 0, block.start()) + 1,
                        "names": names, "tls_directives": directives})
    return summary


def patch(source, port, vhost_line=None):
    """Preserve all bytes outside one unambiguous staging HTTPS vhost."""
    if not 1024 <= port <= 65535:
        raise ValueError("Invalid staging port")
    blocks = vhosts(source)
    if vhost_line is not None:
        # Apache has already resolved includes and selected the active vhost.
        # Its file:line is authoritative; do not guess TLS inheritance by regex.
        matches = [b for b in blocks if source.count("\n", 0, b.start()) + 1 == vhost_line]
    else:
        matches = [b for b in blocks if re.search(r"(?im)^\s*ServerName\s+staging\.novlearn\.fr\s*$", b[0]) and re.search(r"(?im)^\s*SSLEngine\s+on\s*$", b[0])]
    if len(matches) != 1:
        raise ValueError("Expected exactly one staging HTTPS vhost")
    b = matches[0]
    lines = b[0].splitlines(keepends=True)
    if not re.search(r":443\s*>$", lines[0].strip()):
        raise ValueError("Staging vhost must listen on HTTPS port 443")
    body = list(body_statements(lines[1:-1]))
    names = [shlex.split(logical)[1:] for raw, logical, number in body
             if re.match(r"(?i)^ServerName\s", logical)]
    if len(names) != 1 or len(names[0]) != 1 or server_name(names[0][0]) != DOMAIN:
        raise ValueError("Apache-selected vhost is not exclusive to staging; inspect STAGING_VHOSTS metadata")
    if any(re.fullmatch(r"(?i)SSLEngine\s+off", logical) for raw, logical, number in body):
        raise ValueError("Selected staging vhost explicitly disables TLS")
    # Validate the complete structure before making a candidate. Containers,
    # comments and unrelated directives are copied verbatim, including nesting.
    for raw, s, number in body:
        if not s:
            continue
        directive = s.split(None, 1)[0].lower()
        if directive not in {"servername", "serveralias", "include", "includeoptional", "rewriteoptions"}:
            continue
        parts = shlex.split(s)
        if directive in {"servername", "serveralias"} and (len(parts) != 2 or server_name(parts[1]) != DOMAIN):
            raise ValueError("Shared staging/production vhost refused")
        if directive in {"include", "includeoptional", "rewriteoptions"}:
            # Certbot's usual include is accepted only after checking that it
            # contains TLS directives, never routing or further includes.
            if parts != [parts[0], "/etc/letsencrypt/options-ssl-apache.conf"]:
                raise ValueError("Included or inherited routing requires review")
            for included in Path(parts[1]).read_text().splitlines():
                if included.strip() and not included.lstrip().startswith("#") and not re.match(r"(?i)^\s*SSL\w+\s", included):
                    raise ValueError("Unexpected non-TLS directive in SSL include")
    if BEGIN in b[0]:
        expected = route(port)
        if b[0].count(BEGIN) != 1 or expected not in b[0]:
            raise ValueError("Existing managed route differs; review before replacement")
        return source
    result = [lines[0], route(port)]
    for raw, logical, number in body:
        directive = logical.split(None, 1)[0].lower() if logical else ""
        if directive in {"redirect", "redirectmatch"}:
            # mod_alias redirects take precedence over ProxyPass, regardless of
            # textual order. Keep their original arguments under an exact guard.
            result.extend(['    <If "%{REQUEST_URI} != \'/run\'">\n', raw, "    </If>\n"])
        elif directive == "rewriterule":
            # Last condition ANDs with an existing OR condition group.
            result.extend(["    RewriteCond %{REQUEST_URI} !^/run$\n", raw])
        else:
            result.append(raw)
    result.append(lines[-1])
    return source[:b.start()] + "".join(result) + source[b.end():]


def route(port):
    return (f"{BEGIN}\n"
            "    RewriteEngine On\n"
            "    RewriteCond %{REQUEST_URI} ^/run$\n"
            f"    RewriteRule ^/?run$ http://127.0.0.1:{port}/run [P,END]\n"
            f"    ProxyPassMatch ^/run$ http://127.0.0.1:{port}/run\n"
            f"    ProxyPassReverse /run http://127.0.0.1:{port}/run\n"
            f"{END}\n")


def probe(url, resolve=False):
    with tempfile.TemporaryDirectory() as tmp:
        body, headers = Path(tmp)/"body", Path(tmp)/"headers"
        cmd = ["curl", "--silent", "--show-error", "--noproxy", "*", "--max-time", "15",
               "--output", str(body), "--dump-header", str(headers), "--write-out", "%{http_code}",
               "--header", "Content-Type: application/json", "--data", "{}"]
        if resolve:
            cmd.extend(["--resolve", f"{DOMAIN}:443:127.0.0.1"])
        status = run(*cmd, url)
        if status != "401" or re.search(r"(?im)^location:", headers.read_text()) or json.loads(body.read_text()) != {"error": "unauthorized"}:
            raise RuntimeError("Expected HTTP 401 unauthorized without Location")


def atomic_replace(path, content, metadata):
    fd, name = tempfile.mkstemp(prefix=".engine-staging-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())
        shutil.copystat(metadata, name)
        stat = metadata.stat()
        os.chown(name, stat.st_uid, stat.st_gid)
        os.replace(name, path)
    finally:
        Path(name).unlink(missing_ok=True)


def transact(path, candidate, backup_root, check, reload, verify):
    original = path.read_bytes()
    if candidate == original:
        check()
        verify()
        print("Staging route already installed and verified")
        return
    directory = Path(tempfile.mkdtemp(prefix=time.strftime("%Y%m%dT%H%M%S-"), dir=backup_root))
    directory.chmod(0o700)
    backup = directory / "vhost.conf"
    shutil.copy2(path, backup)
    stat = path.stat()
    os.chown(backup, stat.st_uid, stat.st_gid)
    (directory / "manifest.json").write_text(json.dumps({"target": str(path), "before": hashlib.sha256(original).hexdigest(), "after": hashlib.sha256(candidate).hexdigest()}))
    print(f"STAGING_APACHE_BACKUP={directory.name}", flush=True)
    try:
        atomic_replace(path, candidate, backup)
        check()
        reload()
        verify()
    except BaseException:
        print("Restoring original staging vhost", flush=True)
        atomic_replace(path, original, backup)
        check()
        reload()
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["inspect", "apply", "rollback"])
    parser.add_argument("--backup", default="")
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise RuntimeError("Existing passwordless root/sudo access required")
    import fcntl
    with open("/run/lock/novlearn-engine-staging.lock", "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        check = lambda: run("apachectl", "configtest")
        reload = lambda: run("systemctl", "reload", "apache2")
        check()
        dump = run("apachectl", "-S")
        locations = re.findall(r"(?m)^.*port 443 namevhost staging\.novlearn\.fr \(([^()]+):(\d+)\)", dump)
        # Single HTTPS vhost Apache output uses '... staging... (file:line)'.
        if not locations:
            locations = re.findall(r"(?m)^\s*\S+:443\s+staging\.novlearn\.fr \(([^()]+):(\d+)\)", dump)
        if len(locations) != 1:
            raise RuntimeError("Cannot uniquely locate active staging HTTPS vhost")
        path = Path(locations[0][0]).resolve(strict=True)
        if path.parent != Path("/etc/apache2/sites-available"):
            raise RuntimeError("Staging vhost outside sites-available refused")
        original = path.read_bytes()
        print(f"STAGING_HTTPS_VHOST={path}", flush=True)
        print(f"STAGING_HTTPS_VHOST_LINE={locations[0][1]}", flush=True)
        print("STAGING_VHOSTS=" + json.dumps(vhost_summary(original.decode("utf-8"))), flush=True)
        if args.mode != "rollback":
            # Do not source or display .env (contains API credentials).
            values = re.findall(r"(?m)^HOST_PORT=(\d+)\s*$", Path("/opt/novlearn-engine/staging/.env").read_text())
            if len(values) != 1 or not 1024 <= int(values[0]) <= 65535:
                raise RuntimeError("Missing/ambiguous staging HOST_PORT")
            port = int(values[0])
            ids = run("docker", "ps", "--filter", "label=com.docker.compose.project=novlearn-engine-staging", "--filter", "label=com.docker.compose.service=engine", "--format", "{{.ID}}").splitlines()
            if len(ids) != 1 or run("docker", "port", ids[0], "8080/tcp") != f"127.0.0.1:{port}":
                raise RuntimeError("Staging .env and running container port disagree")
            print(f"STAGING_HOST_PORT={port}", flush=True)
            probe(f"http://127.0.0.1:{port}/run")
            candidate = patch(original.decode("utf-8"), port, vhost_line=int(locations[0][1])).encode("utf-8")
            print(f"Staging candidate changes={candidate != original}", flush=True)
            if args.mode == "inspect":
                return
        backup_root = Path("/var/backups/novlearn-engine-apache-staging")
        backup_root.mkdir(mode=0o700, exist_ok=True)
        if args.mode == "rollback":
            if not re.fullmatch(r"[0-9]{8}T[0-9]{6}-[a-z0-9_]+", args.backup):
                raise RuntimeError("Invalid backup ID")
            directory = backup_root / args.backup
            manifest = json.loads((directory/"manifest.json").read_text())
            restored = (directory/"vhost.conf").read_bytes()
            if manifest["target"] != str(path) or hashlib.sha256(original).hexdigest() != manifest["after"] or hashlib.sha256(restored).hexdigest() != manifest["before"]:
                raise RuntimeError("Vhost changed since backup; rollback refused")
            # Restore via another transaction, preserving the pre-rollback file.
            transact(path, restored, backup_root, check, reload, lambda: None)
        else:
            def verify():
                probe(f"https://{DOMAIN}/run", resolve=True)
                probe(f"https://{DOMAIN}/run")
            transact(path, candidate, backup_root, check, reload, verify)


if __name__ == "__main__":
    main()
