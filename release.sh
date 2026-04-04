#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

confirm() {
  local prompt="$1"
  read -r -p "$prompt [y/N]: " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

echo "Running release flow from: $ROOT_DIR"

echo "1/5 pnpm build"
pnpm build

if confirm "2/5 Run pnpm changeset now"; then
  echo "Running pnpm changeset..."
  pnpm changeset
fi

CHANGESET_COUNT=$(find .changeset -maxdepth 1 -type f -name '*.md' ! -name 'README.md' | wc -l | tr -d ' ')
if [[ "$CHANGESET_COUNT" == "0" ]]; then
  echo "No pending changesets found in .changeset/."
  echo "Terminating without publishing."
  exit 1
fi

echo "3/5 pnpm version-packages"
pnpm version-packages

echo "4/5 pnpm release:dry-run"
pnpm release:dry-run

if ! confirm "Dry run finished. Continue with pnpm release"; then
  echo "Release canceled by user."
  exit 0
fi

echo "5/5 pnpm release"
pnpm release

echo "Release flow completed successfully."