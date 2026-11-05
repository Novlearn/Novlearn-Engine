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
from urllib.error import HTTPError
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler

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
        continued = value.endswith("\\")
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


def inspect_include(path, reader=None, seen=None):
    """Inspect installed config, not an invented TLS-only directive whitelist."""
    reader = reader or (lambda name: Path(name).read_text(encoding="utf-8"))
    seen = set() if seen is None else seen
    if path in seen or len(seen) >= 16:
        raise ValueError("Cyclic or excessive Apache includes")
    seen.add(path)
    content = reader(path)
    entries = list(body_statements(content.splitlines(keepends=True)))
    report = {"file": path, "sha256": hashlib.sha256(content.encode()).hexdigest(),
              "directives": sorted({s.split(None, 1)[0].lower() for _, s, _ in entries if s}),
              "routing": [], "includes": []}
    # Installed includes stay untouched. Routing in an include requires review
    # because changing a shared Certbot file would also affect production.
    routing = {"rewriteengine", "rewriterule", "rewritecond", "rewriteoptions", "rewritemap",
               "redirect", "redirectmatch", "alias", "aliasmatch", "scriptalias",
               "scriptaliasmatch", "sethandler", "addhandler", "action", "fallbackresource"}
    for raw, logical, number in entries:
        if not logical:
            continue
        directive = logical.split(None, 1)[0].lower()
        if directive in routing or directive.startswith("proxypass"):
            report["routing"].append({"line": number, "directive": directive})
        if directive in {"include", "includeoptional"}:
            parts = shlex.split(logical)
            if len(parts) != 2 or parts[1] != "/etc/letsencrypt/options-ssl-apache.conf":
                report["routing"].append({"line": number, "directive": "unreviewed-include"})
            else:
                report["includes"].append(inspect_include(parts[1], reader, seen))
    return report


def include_has_routing(report):
    return bool(report["routing"]) or any(include_has_routing(child) for child in report["includes"])


def diagnostic_block(source, line):
    """Show routing structure, not arbitrary config or credential values."""
    matches = [b for b in vhosts(source) if source.count("\n", 0, b.start()) + 1 == line]
    if len(matches) != 1:
        raise ValueError("Cannot locate selected vhost for diagnostic")
    report = []
    public = {"servername", "serveralias", "rewriteengine", "rewriteoptions", "include", "includeoptional",
              "rewriterule", "rewritecond", "redirect", "redirectmatch", "proxypass", "proxypassmatch", "proxypassreverse"}
    # Full routing arguments may contain URLs with credentials or sensitive
    # rewrite destinations. Only standard localhost targets are shown.
    for raw, logical, number in statements(matches[0][0].splitlines(keepends=True)):
        if not logical or logical.startswith("#"):
            continue
        directive = logical.split(None, 1)[0].lower()
        entry = {"line": line + number - 1, "directive": directive}
        if directive in public or logical.startswith("<"):
            if re.search(r"(?i)token|password|secret|authorization|bearer|cookie|api.?key|credential", logical):
                entry["value"] = "[redacted]"
            else:
                safe = re.sub(r"([a-zA-Z]+://)[^/\s]*@", r"\1[redacted]@", logical)
                entry["value"] = safe
        report.append(entry)
    return report


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


def patch(source, port, vhost_line=None, include_reader=None):
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
            # Certbot may legitimately provide LogFormat, IfModule, etc.
            # Keep the installed include intact and detect routing explicitly.
            if parts != [parts[0], "/etc/letsencrypt/options-ssl-apache.conf"]:
                raise ValueError("Included or inherited routing requires review")
            report = inspect_include(parts[1], include_reader)
            if include_has_routing(report):
                raise ValueError("Routing inside shared include requires review; see STAGING_INCLUDE_REPORT")
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


def probe(url, resolve=False, archive=None):
    with tempfile.TemporaryDirectory() as tmp:
        body, headers = Path(tmp)/"body", Path(tmp)/"headers"
        cmd = ["curl", "--silent", "--show-error", "--noproxy", "*", "--max-time", "15",
               "--output", str(body), "--dump-header", str(headers), "--write-out", "%{http_code}",
               "--header", "Content-Type: application/json", "--data", "{}"]
        if resolve:
            cmd.extend(["--resolve", f"{DOMAIN}:443:127.0.0.1"])
        status = run(*cmd, url)
        if status != "401" or re.search(r"(?im)^location:", headers.read_text()) or json.loads(body.read_text()) != {"error": "unauthorized"}:
            raise RuntimeError(f"Expected HTTP 401 unauthorized without Location; got HTTP {status}")
        if archive and not re.search(r"(?im)^x-engine-archive-sha256:\s*" + re.escape(archive) + r"\s*$", headers.read_text()):
            raise RuntimeError("Unauthorized response has an unexpected Engine archive identity")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_http(url, payload=None, headers=None):
    # No proxy inherited from the shell; never forward credentials on a redirect.
    opener = build_opener(ProxyHandler({}), NoRedirect())
    request = Request(url, data=payload, headers=headers or {}, method="POST" if payload is not None else "GET")
    try:
        response = opener.open(request, timeout=15)
    except HTTPError as error:
        response = error
    with response:
        return response.code, response.headers, response.read(1048577)


def authenticated_probe(url, token, archive):
    payload = {"protocolVersion": 1, "requestId": "staging-apache-qualification",
               "operation": "parseMathInput", "payload": {"source": "1", "context": {}, "profile": "scalar-latex-v1"}}
    status, headers, body = request_http(url, json.dumps(payload).encode(), {
        "Authorization": "Bearer " + token, "Content-Type": "application/json", "x-engine-archive-sha256": archive})
    if status != 200 or headers.get("Location") or headers.get("x-engine-archive-sha256") != archive:
        raise RuntimeError(f"Authenticated Engine calculation failed: HTTP {status} (no redirect followed)")
    result = json.loads(body)
    if result.get("ok") is not True or result.get("requestId") != payload["requestId"]:
        raise RuntimeError("Authenticated Engine calculation returned an invalid result")
    print("Authenticated Engine calculation: HTTP 200, ok=true, archive identity verified", flush=True)


def page_baseline():
    results = {}
    for path in ["/", "/accueil"]:
        status, headers, body = request_http(f"https://{DOMAIN}{path}")
        if status >= 500:
            raise RuntimeError("Novlearn staging is unhealthy before/after Apache change")
        results[path] = (status, headers.get("Location"), headers.get_content_type())
    return results


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
        source = original.decode("utf-8")
        selected_line = int(locations[0][1])
        print(f"STAGING_HTTPS_VHOST={path}", flush=True)
        print(f"STAGING_HTTPS_VHOST_LINE={locations[0][1]}", flush=True)
        print("STAGING_VHOSTS=" + json.dumps(vhost_summary(source)), flush=True)
        if args.mode != "rollback":
            print("STAGING_ROUTING_REPORT=" + json.dumps(diagnostic_block(source, selected_line)), flush=True)
            include_report = inspect_include("/etc/letsencrypt/options-ssl-apache.conf")
            print("STAGING_INCLUDE_REPORT=" + json.dumps(include_report), flush=True)
            required = {"proxy_module", "proxy_http_module", "rewrite_module", "ssl_module"}
            modules = set(re.findall(r"(?m)^\s*(\w+_module)\s", run("apachectl", "-M")))
            print("STAGING_MISSING_MODULES=" + json.dumps(sorted(required - modules)), flush=True)
            # Do not source or display .env (contains API credentials).
            env_text = Path("/opt/novlearn-engine/staging/.env").read_text()
            values = re.findall(r"(?m)^HOST_PORT=(\d+)\s*$", env_text)
            if len(values) != 1 or not 1024 <= int(values[0]) <= 65535:
                raise RuntimeError("Missing/ambiguous staging HOST_PORT")
            port = int(values[0])
            ids = run("docker", "ps", "--filter", "label=com.docker.compose.project=novlearn-engine-staging", "--filter", "label=com.docker.compose.service=engine", "--format", "{{.ID}}").splitlines()
            if len(ids) != 1 or run("docker", "port", ids[0], "8080/tcp") != f"127.0.0.1:{port}":
                raise RuntimeError("Staging .env and running container port disagree")
            print(f"STAGING_HOST_PORT={port}", flush=True)
            archive = run("docker", "exec", ids[0], "printenv", "ENGINE_ARTIFACT_SHA256")
            if not re.fullmatch(r"[a-f0-9]{64}", archive):
                raise RuntimeError("Missing running Engine archive identity")
            tokens = re.findall(r"(?m)^ENGINE_API_TOKEN=([^\r\n]+)$", env_text)
            if len(tokens) != 1 or len(tokens[0]) < 32:
                raise RuntimeError("Invalid staging API token configuration (value not displayed)")
            token = tokens[0]
            local_url = f"http://127.0.0.1:{port}/run"
            if args.mode == "inspect":
                # Inspection is independent of candidate generation. Report all
                # findings and keep the existing configuration/services intact.
                for name, action in [
                    ("LOCAL_UNAUTHENTICATED", lambda: probe(local_url, archive=archive)),
                    ("LOCAL_AUTHENTICATED", lambda: authenticated_probe(local_url, token, archive)),
                    ("PUBLIC_UNAUTHENTICATED", lambda: probe(f"https://{DOMAIN}/run", archive=archive)),
                ]:
                    try:
                        action()
                        print(name + "=PASS", flush=True)
                    except Exception as error:
                        print(name + "=FAIL " + type(error).__name__ + ": " + str(error), flush=True)
                try:
                    candidate = patch(source, port, vhost_line=selected_line).encode("utf-8")
                    print(f"STAGING_CANDIDATE_PREPARED=true changed={candidate != original}", flush=True)
                except ValueError as error:
                    print("STAGING_CANDIDATE_PREPARED=false reason=" + str(error), flush=True)
                print("INSPECT_COMPLETE=true (diagnostic only; this is not Admin qualification)", flush=True)
                return
            if required - modules:
                raise RuntimeError("Missing Apache modules; inspect STAGING_MISSING_MODULES")
            probe(local_url, archive=archive)
            authenticated_probe(local_url, token, archive)
            candidate = patch(source, port, vhost_line=selected_line).encode("utf-8")
            print(f"Staging candidate changes={candidate != original}", flush=True)
            pages_before = page_baseline()
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
                if inspect_include("/etc/letsencrypt/options-ssl-apache.conf") != include_report:
                    raise RuntimeError("Shared SSL include changed during Apache repair")
                probe(f"https://{DOMAIN}/run", resolve=True, archive=archive)
                probe(f"https://{DOMAIN}/run", archive=archive)
                authenticated_probe(f"https://{DOMAIN}/run", token, archive)
                if page_baseline() != pages_before:
                    raise RuntimeError("Novlearn staging page behavior changed; restoring Apache")
            if path.read_bytes() != original:
                raise RuntimeError("Apache vhost changed during preflight; apply refused")
            transact(path, candidate, backup_root, check, reload, verify)


if __name__ == "__main__":
    main()
