#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script as root, for example with sudo." >&2
  exit 1
fi

STAGING_PORT=""
PRODUCTION_PORT=""
GH_OWNER=""
SSH_USER=""
while (($#)); do
  case "$1" in
    --staging-port) STAGING_PORT="${2:-}"; shift 2 ;;
    --production-port) PRODUCTION_PORT="${2:-}"; shift 2 ;;
    --gh-owner) GH_OWNER="${2:-}"; shift 2 ;;
    --ssh-user) SSH_USER="${2:-}"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 64 ;;
  esac
done

valid_port() { [[ "$1" =~ ^[0-9]{1,5}$ ]] && ((10#$1 >= 1024 && 10#$1 <= 65535)); }
valid_port "$STAGING_PORT" || { echo "Supply an available staging port (1024-65535)." >&2; exit 64; }
valid_port "$PRODUCTION_PORT" || { echo "Supply an available production port (1024-65535)." >&2; exit 64; }
[[ "$STAGING_PORT" != "$PRODUCTION_PORT" ]] || { echo "Ports must differ." >&2; exit 64; }
[[ "$GH_OWNER" =~ ^[a-z0-9-]+$ ]] || { echo "Invalid lowercase GitHub organization." >&2; exit 64; }
[[ "$SSH_USER" =~ ^[a-z_][a-z0-9_-]{0,31}$ && "$SSH_USER" != root ]] || {
  echo "Supply the existing non-root VPS SSH username (1-32 lowercase letters, digits, _ or -)." >&2; exit 64;
}
getent passwd "$SSH_USER" >/dev/null || { echo "The existing SSH user does not exist on this VPS." >&2; exit 1; }

for tool in docker curl ss flock openssl useradd visudo getent stat grep tr cmp awk sed mktemp install; do
  command -v "$tool" >/dev/null || { echo "Missing prerequisite: $tool" >&2; exit 1; }
done
docker compose version >/dev/null
[[ "$(docker info --format '{{.CgroupVersion}}')" == "2" ]] || {
  echo "Docker must use cgroup v2." >&2; exit 1;
}
[[ "$(stat -fc %T /sys/fs/cgroup)" == "cgroup2fs" ]] || {
  echo "The host must expose unified cgroup v2." >&2; exit 1;
}
[[ -f deploy/compose.yml && -f deploy/engine-deploy-root.sh ]] || {
  echo "Run from the Engine repository root." >&2; exit 1;
}
ROOT=/opt/novlearn-engine
if [[ -e "$ROOT" ]]; then
  [[ -d "$ROOT" && ! -L "$ROOT" && -f "$ROOT/.bootstrap-managed" ]] || {
    echo "$ROOT exists without this bootstrap's marker; refusing to alter it." >&2; exit 1;
  }
  [[ "$(stat -c '%U' "$ROOT")" == root ]] || { echo "$ROOT must be root-owned." >&2; exit 1; }
  [[ ! -L "$ROOT/.bootstrap-managed" && "$(stat -c '%U' "$ROOT/.bootstrap-managed")" == root ]] || {
    echo "Unsafe bootstrap marker." >&2; exit 1;
  }
else
  install -d -o root -g root -m 0755 "$ROOT"
  install -o root -g root -m 0644 /dev/null "$ROOT/.bootstrap-managed"
fi
for environment in staging production; do
  dir="$ROOT/$environment"
  if [[ -e "$dir" ]]; then
    [[ -d "$dir" && ! -L "$dir" && "$(stat -c '%U' "$dir")" == root ]] || {
      echo "Unsafe environment directory: $dir" >&2; exit 1;
    }
  fi
done
for port in "$STAGING_PORT" "$PRODUCTION_PORT"; do
  if ss -H -ltn "sport = :$port" | grep -q .; then
    env_name=staging
    [[ "$port" == "$PRODUCTION_PORT" ]] && env_name=production
    configured=false
    if [[ -f "$ROOT/$env_name/.env" ]] && grep -Fqx "HOST_PORT=$port" "$ROOT/$env_name/.env" \
      && [[ -n "$(docker ps -q --filter "label=com.docker.compose.project=novlearn-engine-$env_name")" ]]; then
      configured=true
    fi
    [[ "$configured" == true ]] || { echo "Port $port is already listening." >&2; exit 1; }
  fi
done

if [[ -e "$ROOT" && ( ! -d "$ROOT" || -L "$ROOT" ) ]]; then
  echo "$ROOT exists but is not a safe directory." >&2; exit 1
fi
install -d -o root -g root -m 0755 "$ROOT" "$ROOT/staging" "$ROOT/production"
if [[ -e "$ROOT/compose.yml" ]]; then
  cmp -s deploy/compose.yml "$ROOT/compose.yml" || {
    echo "Existing Compose config differs; refusing to overwrite it." >&2; exit 1;
  }
else
  install -o root -g root -m 0644 deploy/compose.yml "$ROOT/compose.yml"
fi
if [[ -e /etc/novlearn-engine-owner ]]; then
  [[ "$(cat /etc/novlearn-engine-owner)" == "$GH_OWNER" ]] || {
    echo "Existing Engine owner configuration differs." >&2; exit 1;
  }
else
  printf '%s\n' "$GH_OWNER" > /etc/novlearn-engine-owner
  chmod 0644 /etc/novlearn-engine-owner
fi

for environment in staging production; do
  if [[ "$environment" == staging ]]; then PORT="$STAGING_PORT"; else PORT="$PRODUCTION_PORT"; fi
  if [[ ! -e "$ROOT/$environment/.env" ]]; then
    TOKEN="$(openssl rand -hex 32)"
    DIGEST="$(printf '%064d' 0)"
    cat > "$ROOT/$environment/.env" <<EOF
ENGINE_IMAGE=ghcr.io/$GH_OWNER/novlearn-engine-host@sha256:$DIGEST
HOST_PORT=$PORT
ENGINE_API_TOKEN=$TOKEN
EOF
    chown root:root "$ROOT/$environment/.env"
    chmod 0600 "$ROOT/$environment/.env"
  else
    [[ "$(stat -c '%U:%a' "$ROOT/$environment/.env")" == "root:600" ]] || {
      echo "Existing $environment env file must be root-owned mode 0600." >&2; exit 1;
    }
    grep -Eq '^ENGINE_API_TOKEN=.{32,}$' "$ROOT/$environment/.env" || {
      echo "Existing $environment token is missing or too short." >&2; exit 1;
    }
    grep -Fqx "HOST_PORT=$PORT" "$ROOT/$environment/.env" || {
      echo "Existing $environment port differs; refusing to overwrite config." >&2; exit 1;
    }
  fi
done

install -d -o root -g root -m 0755 /usr/local/libexec /usr/local/sbin
for pair in "deploy/engine-deploy-root.sh:/usr/local/sbin/novlearn-engine-deploy"; do
  source_file="${pair%%:*}"
  target_file="${pair#*:}"
  if [[ -e "$target_file" ]]; then
    cmp -s "$source_file" "$target_file" || {
      echo "Existing $target_file differs; refusing to overwrite it." >&2; exit 1;
    }
  else
    install -o root -g root -m 0755 "$source_file" "$target_file"
  fi
done
if [[ ! -e /etc/sudoers.d/novlearn-engine-deploy ]]; then
  printf '%s ALL=(root) NOPASSWD: /usr/local/sbin/novlearn-engine-deploy *\n' "$SSH_USER" > /etc/sudoers.d/novlearn-engine-deploy
elif ! grep -Fqx "$SSH_USER ALL=(root) NOPASSWD: /usr/local/sbin/novlearn-engine-deploy *" /etc/sudoers.d/novlearn-engine-deploy; then
  echo "Existing Engine sudo rule differs; refusing to overwrite it." >&2; exit 1
fi
chmod 0440 /etc/sudoers.d/novlearn-engine-deploy
visudo -cf /etc/sudoers.d/novlearn-engine-deploy >/dev/null

echo "Bootstrap installed for existing SSH user $SSH_USER. No container was started and Apache was not changed."
echo "Configure the GitHub environments and verify the existing Apache /run proxy next."
echo "The staging and production API tokens are stored in root-only .env files."
