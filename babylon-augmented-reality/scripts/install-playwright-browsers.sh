#!/usr/bin/env bash
set -euo pipefail
# Builds the Playwright test project and installs Chromium for the matching Microsoft.Playwright version.
# Requires: dotnet on PATH, and pwsh (PowerShell) for playwright.ps1.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${DOTNET_ROOT:-$HOME/.dotnet}:$PATH"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet not found. Run scripts/install-dotnet-sdk.sh first and add ~/.dotnet to PATH." >&2
  exit 1
fi

if ! command -v pwsh >/dev/null 2>&1; then
  echo "pwsh not found. Install PowerShell: https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-linux" >&2
  exit 1
fi

dotnet build "$ROOT/tests/BabylonAugmentedReality.PlaywrightTests/BabylonAugmentedReality.PlaywrightTests.csproj" -c Release

TFM="net10.0"
BIN="$ROOT/tests/BabylonAugmentedReality.PlaywrightTests/bin/Release/$TFM"

if [[ ! -f "$BIN/playwright.ps1" ]]; then
  echo "Expected playwright.ps1 under $BIN (update TFM in script if target framework changed)." >&2
  exit 1
fi

echo "Installing Playwright browsers from $BIN ..."
pwsh "$BIN/playwright.ps1" install chromium
echo "Done."
