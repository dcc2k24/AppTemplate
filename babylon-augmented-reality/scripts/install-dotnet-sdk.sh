#!/usr/bin/env bash
set -euo pipefail
# Installs the .NET SDK into ~/.dotnet when the `dotnet` command is missing.
# Safe to re-run; skips if dotnet is already on PATH.

if command -v dotnet >/dev/null 2>&1; then
  echo "dotnet already on PATH: $(command -v dotnet)"
  dotnet --version
  exit 0
fi

INSTALL_DIR="${DOTNET_ROOT:-$HOME/.dotnet}"
mkdir -p "$INSTALL_DIR"

curl -sSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
chmod +x /tmp/dotnet-install.sh
/tmp/dotnet-install.sh --channel 10.0 --install-dir "$INSTALL_DIR"

echo ""
echo "Add to PATH (e.g. ~/.bashrc):"
echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
echo "  export DOTNET_ROOT=\"$INSTALL_DIR\""
