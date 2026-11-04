#!/usr/bin/env bash
set -euo pipefail

# Only the staging token is read. Plaintext never leaves the VPS.
TOKEN_PUBLIC_KEY_BASE64="${TOKEN_PUBLIC_KEY_BASE64:-}"
[[ "$TOKEN_PUBLIC_KEY_BASE64" =~ ^[A-Za-z0-9+/=]+$ && ${#TOKEN_PUBLIC_KEY_BASE64} -ge 100 && ${#TOKEN_PUBLIC_KEY_BASE64} -le 4096 ]] || {
  echo 'A base64-encoded RSA public key is required.' >&2
  exit 64
}
umask 077
key_dir="$(mktemp -d)"
cleanup() { rm -rf -- "$key_dir"; }
trap cleanup EXIT
printf '%s' "$TOKEN_PUBLIC_KEY_BASE64" | base64 --decode > "$key_dir/public.pem"
openssl rsa -pubin -in "$key_dir/public.pem" -noout >/dev/null
key_bits="$(openssl pkey -pubin -in "$key_dir/public.pem" -text -noout | sed -n '1s/[^0-9]//gp')"
[[ "$key_bits" == 2048 || "$key_bits" == 3072 || "$key_bits" == 4096 ]] || {
  echo 'Use an RSA public key of 2048, 3072 or 4096 bits.' >&2
  exit 64
}

token="$(sudo -n awk -F= '$1 == "ENGINE_API_TOKEN" {print $2}' /opt/novlearn-engine/staging/.env)"
[[ "$token" =~ ^[a-f0-9]{64}$ ]] || {
  echo 'The existing staging token is missing or invalid.' >&2
  exit 1
}
encrypted="$(printf '%s' "$token" | openssl pkeyutl -encrypt -pubin \
  -inkey "$key_dir/public.pem" \
  -pkeyopt rsa_padding_mode:oaep \
  -pkeyopt rsa_oaep_md:sha256 \
  -pkeyopt rsa_mgf1_md:sha256 | base64 -w 0)"
unset token
printf 'ENCRYPTED_ENGINE_TOKEN=%s\n' "$encrypted"
