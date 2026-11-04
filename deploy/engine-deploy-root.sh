#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-}"
IMAGE="${2:-}"
[[ $# -eq 2 ]] || { echo "Expected environment and image digest." >&2; exit 64; }
if [[ "${0##*/}" == novlearn-engine-deploy-staging ]]; then
  [[ "$ENVIRONMENT" == staging ]] || { echo "Staging helper only accepts staging." >&2; exit 64; }
else
  [[ "$ENVIRONMENT" == staging || "$ENVIRONMENT" == production ]] || exit 64
fi
GH_OWNER="$(cat /etc/novlearn-engine-owner)"
[[ "$IMAGE" =~ ^ghcr\.io/${GH_OWNER}/novlearn-engine-host@sha256:[a-f0-9]{64}$ ]] || {
  echo "Rejected image reference." >&2; exit 64;
}
IFS= read -r registry_user || { echo "Missing registry username." >&2; exit 64; }
[[ "$registry_user" =~ ^[A-Za-z0-9-]{1,39}$ ]] || exit 64
IFS= read -r registry_token || { echo "Missing registry credential." >&2; exit 64; }
[[ "$registry_token" =~ ^[^[:space:]]{32,4096}$ ]] || exit 64
if IFS= read -r _; then echo "Unexpected trailing input." >&2; exit 64; fi

BASE=/opt/novlearn-engine
DIR="$BASE/$ENVIRONMENT"
COMPOSE=(docker compose --project-name "novlearn-engine-$ENVIRONMENT" --env-file "$DIR/.env" -f "$BASE/compose.yml")
exec 9>"/run/lock/novlearn-engine-$ENVIRONMENT.lock"
flock -n 9 || { echo "Deployment already in progress." >&2; exit 75; }
auth_dir="$(mktemp -d /run/novlearn-engine-auth.XXXXXX)"
chmod 0700 "$auth_dir"
export DOCKER_CONFIG="$auth_dir"
cleanup() {
  docker logout ghcr.io >/dev/null 2>&1 || true
  rm -rf -- "$auth_dir"
}
trap cleanup EXIT
printf '%s\n' "$registry_token" | docker login ghcr.io --username "$registry_user" --password-stdin >/dev/null
unset registry_user registry_token

old_image="$(sed -n 's/^ENGINE_IMAGE=//p' "$DIR/.env")"
cp -p "$DIR/.env" "$DIR/.env.rollback"
tmp="$(mktemp "$DIR/.env.XXXXXX")"
awk -v image="$IMAGE" '$0 ~ /^ENGINE_IMAGE=/ {$0="ENGINE_IMAGE=" image} {print}' "$DIR/.env" > "$tmp"
chown root:root "$tmp"; chmod 0600 "$tmp"; mv "$tmp" "$DIR/.env"

healthy() {
  local port
  port="$(sed -n 's/^HOST_PORT=//p' "$DIR/.env")"
  for _ in {1..30}; do
    if curl --fail --silent --show-error --max-time 2 "http://127.0.0.1:$port/healthz" >/dev/null; then return 0; fi
    sleep 2
  done
  return 1
}
recover() {
  if [[ "$old_image" =~ ^ghcr\.io/${GH_OWNER}/novlearn-engine-host@sha256:[a-f0-9]{64}$ && "$old_image" != *0000000000000000000000000000000000000000000000000000000000000000 ]]; then
    cp -p "$DIR/.env.rollback" "$DIR/.env"
    "${COMPOSE[@]}" pull && "${COMPOSE[@]}" up -d --no-build && healthy || true
  else
    "${COMPOSE[@]}" down || true
  fi
}

if ! "${COMPOSE[@]}" pull || ! "${COMPOSE[@]}" up -d --no-build || ! healthy; then
  echo "Deployment health check failed; restoring the previous image." >&2
  recover
  exit 1
fi
cp -p "$DIR/.env" "$DIR/.env.rollback"
echo "Deployment healthy: $ENVIRONMENT $IMAGE"
