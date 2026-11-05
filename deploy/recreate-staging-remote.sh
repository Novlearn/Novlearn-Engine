#!/usr/bin/env bash
set -euo pipefail

# Reuse the existing staging credentials/image; never load production config.
BASE=/opt/novlearn-engine
ENV_FILE="$BASE/staging/.env"
COMPOSE=(sudo -n docker compose --project-name novlearn-engine-staging --env-file "$ENV_FILE" -f "$BASE/compose.yml")
probe="$(cat <<'JS'
const fs = require('node:fs');
const expected = fs.readFileSync(0, 'utf8').trim();
const token = process.env.ENGINE_API_TOKEN;
const matches = Boolean(expected && token === expected);
console.log(`ENGINE_API_TOKEN_present=${Boolean(token)} staging_env_match=${matches}`);
if (!matches) process.exit(1);
(async () => {
  const response = await fetch('http://127.0.0.1:8080/run', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-engine-archive-sha256': process.env.ENGINE_ARTIFACT_SHA256,
    },
    body: JSON.stringify({protocolVersion: 1, requestId: 'staging-redeploy-probe', operation: 'parseMathInput', payload: {source: '1', context: {}, profile: 'scalar-latex-v1'}}),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  console.log(JSON.stringify({http: response.status, ok: result.ok === true, error: result.error ?? null}));
  if (response.status !== 200 || result.ok !== true) process.exitCode = 1;
})().catch(() => { console.error('Staging authenticated probe failed.'); process.exitCode = 1; });
JS
)"
check_run() {
  sudo -n awk 'index($0,"ENGINE_API_TOKEN=")==1 {sub(/^ENGINE_API_TOKEN=/, ""); print; exit}' "$ENV_FILE" |
    "${COMPOSE[@]}" exec -T engine node -e "$probe"
}

echo 'Staging authenticated probe before recreation:'
check_run || echo 'Initial staging probe failed; recreating the staging service.'
"${COMPOSE[@]}" up -d --no-build --no-deps --force-recreate engine
port="$(sudo -n sed -n 's/^HOST_PORT=//p' "$ENV_FILE")"
[[ "$port" =~ ^[0-9]{4,5}$ ]] || exit 64
ready=false
for _ in {1..30}; do
  if curl --fail --silent --max-time 2 "http://127.0.0.1:$port/healthz" >/dev/null; then
    ready=true
    break
  fi
  sleep 2
done
[[ "$ready" == true ]] || { echo 'Staging readiness failed.' >&2; exit 1; }
echo 'Staging authenticated probe after recreation:'
check_run
