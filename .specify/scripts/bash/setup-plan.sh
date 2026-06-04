#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
FEATURE_JSON="$REPO_ROOT/.specify/feature.json"
FEATURE_DIR_REL=$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).feature_directory)" "$FEATURE_JSON")
FEATURE_DIR="$REPO_ROOT/$FEATURE_DIR_REL"
FEATURE_SPEC="$FEATURE_DIR/spec.md"
IMPL_PLAN="$FEATURE_DIR/plan.md"
BRANCH=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

mkdir -p "$FEATURE_DIR"
if [[ ! -f "$IMPL_PLAN" ]]; then
  cp "$REPO_ROOT/.specify/templates/plan-template.md" "$IMPL_PLAN"
fi

if [[ "${1:-}" == "--json" ]]; then
  node -e "
    const o = {
      FEATURE_SPEC: process.argv[1],
      IMPL_PLAN: process.argv[2],
      SPECS_DIR: process.argv[3],
      BRANCH: process.argv[4],
      HAS_GIT: 'true'
    };
    console.log(JSON.stringify(o));
  " "$FEATURE_SPEC" "$IMPL_PLAN" "$FEATURE_DIR" "$BRANCH"
else
  echo "FEATURE_SPEC: $FEATURE_SPEC"
  echo "IMPL_PLAN: $IMPL_PLAN"
  echo "SPECS_DIR: $FEATURE_DIR"
  echo "BRANCH: $BRANCH"
fi
