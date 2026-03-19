#!/usr/bin/env bash
set -euo pipefail
# Starts the Blazor app, runs Playwright tests, then stops the app.
# Usage: from repo root, with dotnet + pwsh + browsers installed.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${DOTNET_ROOT:-$HOME/.dotnet}:$PATH"
export BABYLON_AR_BASE_URL="${BABYLON_AR_BASE_URL:-http://127.0.0.1:5275}"

# Avoid stale Kestrel from a previous run (common in dev / CI retries).
pkill -f "BabylonAugmentedReality.App" 2>/dev/null || true
if command -v fuser >/dev/null 2>&1; then
  for _ in $(seq 1 5); do
    fuser -k 5275/tcp 2>/dev/null || true
    sleep 0.4
    fuser 5275/tcp 2>/dev/null || break
  done
fi
sleep 0.5

APP_PID=""
cleanup() {
  if [[ -n "${APP_PID}" ]] && kill -0 "${APP_PID}" 2>/dev/null; then
    kill "${APP_PID}" 2>/dev/null || true
    wait "${APP_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

dotnet build "$ROOT/BabylonAugmentedReality.sln" -c Release

dotnet run --project "$ROOT/src/BabylonAugmentedReality.App/BabylonAugmentedReality.App.csproj" \
  -c Release --urls "${BABYLON_AR_BASE_URL}" --no-build &
APP_PID=$!

echo "Waiting for ${BABYLON_AR_BASE_URL} ..."
for _ in $(seq 1 60); do
  if curl -sf "${BABYLON_AR_BASE_URL}/" >/dev/null; then
    break
  fi
  sleep 1
done
if ! curl -sf "${BABYLON_AR_BASE_URL}/" >/dev/null; then
  echo "App did not become ready." >&2
  exit 1
fi

dotnet test "$ROOT/BabylonAugmentedReality.sln" -c Release --no-build --filter "FullyQualifiedName~PlaywrightTests"
