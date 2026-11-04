#!/usr/bin/env bash
set -euo pipefail

[[ "${DEPLOY_ENVIRONMENT:-}" == staging || "${DEPLOY_ENVIRONMENT:-}" == production ]] || {
  echo "DEPLOY_ENVIRONMENT must be staging or production." >&2
  exit 64
}
[[ "${IMAGE_REFERENCE:-}" =~ ^ghcr\.io/[a-z0-9-]+/novlearn-engine-host@sha256:[a-f0-9]{64}$ ]] || {
  echo "IMAGE_REFERENCE must identify an immutable Engine image digest." >&2
  exit 64
}
[[ "${GHCR_USER:-}" =~ ^[A-Za-z0-9-]{1,39}$ ]] || {
  echo "GHCR_USER is required." >&2
  exit 64
}
[[ "${GHCR_TOKEN:-}" =~ ^[^[:space:]]{32,4096}$ ]] || {
  echo "GHCR_TOKEN is required." >&2
  exit 64
}

printf '%s\n%s\n' "$GHCR_USER" "$GHCR_TOKEN" | \
  sudo -n /usr/local/sbin/novlearn-engine-deploy \
    "$DEPLOY_ENVIRONMENT" "$IMAGE_REFERENCE"
