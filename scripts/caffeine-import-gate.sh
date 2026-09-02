#!/usr/bin/env bash
# Same commands Caffeine GitHub → import uses.
#   frontend: src/frontend/caffeine.toml [check] = pnpm typecheck && pnpm check
#              [build] = pnpm build (vite/esbuild — this is what failed on
#              duplicate export shouldFloatWorldUnreachable)
#   backend:  src/backend/caffeine.toml [check] = mops check
# Do not treat unused-vars, hook-deps, mock TS, Motoko syntax, or
# empty-canister stable-compat as "pre-existing, skip".
# `.old/src/backend/dist/backend.most` is Caffeine-owned: the byte-identical
# `.most` of the last build Caffeine deployed successfully (2026-08-31 import,
# PR #181 merge f8aa05e — no GameKey). Caffeine compares every import against
# its own copy of that file, so `mops check` here must fail exactly like
# Caffeine's did for PR #311 (M0263) and pass now. Never blank it, never
# hand-write it. The backend gate also runs mops check-stable against every
# recorded shape under src/backend/migrations/snapshots/deployed/ plus
# empty-canister.most, and expects snapshots/unsupported/*.most to FAIL.
# Do not amend a shipped NewActor; never delete/rename a chain file whose name
# a live canister recorded; never put a new stable on a file at or before the
# deployed tail. python3 scripts/check-eop-stables.py enforces all of it with
# the runtime rule (stricter than moc's compile-time check).
# Static check-stable is necessary, not sufficient: run
# node scripts/eop-upgrade-matrix.mjs when PocketIC is available.
# Do not run caffeine build / mops build here (PocketIC / dfx).
# Before opening a PR also run: bash scripts/open-pr-stack-compat.sh --self
# Stack-compat "union" means keep one export implementation, not concatenate
# two `export function` copies of the same helper.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

usage() {
  echo "usage: $0 [all|frontend|backend] [-- mops-check-args...]" >&2
  exit 2
}

mode="${1:-all}"
if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
fi
if [[ $# -gt 0 ]]; then
  shift
fi
if [[ "${1:-}" == "--" ]]; then
  shift
fi

stable_args_without_no_lint() {
  local a
  for a in "$@"; do
    if [[ "$a" != "--no-lint" ]]; then
      printf '%s\n' "$a"
    fi
  done
}

run_frontend() {
  echo "==> duplicate export implementations (restack union ≠ concatenate)"
  python3 "$ROOT/scripts/check-duplicate-exports.py" --self-test
  python3 "$ROOT/scripts/check-duplicate-exports.py" src/frontend/src
  echo "==> pnpm typecheck (Caffeine frontend [check]; TS2393 redeclare)"
  pnpm typecheck
  echo "==> pnpm check (Biome: unused vars, hook deps, noRedeclare are errors)"
  pnpm check
  echo "==> pnpm --dir src/frontend build (Caffeine frontend [build] / vite esbuild)"
  pnpm --dir src/frontend build
}

run_one_populated_stable() {
  local populated="$1"
  shift
  local -a stable_args=("$@")
  if [[ ! -f "$populated" ]]; then
    echo "caffeine-import-gate: missing EOP snapshot: $populated" >&2
    exit 1
  fi
  echo "==> mops check-stable vs ${populated#"$ROOT"/} (reconstructed deployed shape)"
  mops check-stable "$populated" backend "${stable_args[@]}"
}

run_one_unsupported_stable() {
  local unsupported="$1"
  shift
  local -a stable_args=("$@")
  echo "==> mops check-stable vs ${unsupported#"$ROOT"/} (documented unsupported shape; expected to FAIL)"
  if mops check-stable "$unsupported" backend "${stable_args[@]}" >/dev/null 2>&1; then
    echo "note: ${unsupported#"$ROOT"/} now passes static check-stable." >&2
    echo "note: static check has false negatives (missing-field case); confirm with" >&2
    echo "note:   node scripts/eop-upgrade-matrix.mjs before treating that shape as supported." >&2
  else
    echo "    fails as documented (see src/backend/migrations/snapshots/README.md)"
  fi
}

run_populated_stable() {
  local -a stable_args=()
  local a
  while IFS= read -r a; do
    [[ -n "$a" ]] && stable_args+=("$a")
  done < <(stable_args_without_no_lint "$@")
  local snap_dir="${ROOT}/src/backend/migrations/snapshots"
  local found=0
  local f
  for f in "$snap_dir"/deployed/*.most; do
    [[ -f "$f" ]] || continue
    found=1
    run_one_populated_stable "$f" "${stable_args[@]}"
  done
  if [[ "$found" -eq 0 ]]; then
    echo "caffeine-import-gate: no snapshots under ${snap_dir#"$ROOT"/}/deployed/" >&2
    exit 1
  fi
  run_one_populated_stable "$snap_dir/empty-canister.most" "${stable_args[@]}"
  for f in "$snap_dir"/unsupported/*.most; do
    [[ -f "$f" ]] || continue
    run_one_unsupported_stable "$f" "${stable_args[@]}"
  done
}

run_backend() {
  echo "==> EOP stables vs latest NewActor / frozen NewActor / check-limit"
  python3 "$ROOT/scripts/check-eop-stables.py"
  if command -v mops >/dev/null 2>&1; then
    echo "==> mops check (Motoko syntax/types, check-stable vs deployed .old, migrations)"
    mops check "$@"
    echo "==> mops check --no-lint --no-check-limit (full chain, empty-canister genesis kept)"
    mops check --no-lint --no-check-limit "$@"
    run_populated_stable "$@"
    return
  fi
  if command -v caffeine >/dev/null 2>&1; then
    if [[ $# -gt 0 ]]; then
      echo "note: caffeine check ignores mops flags ($*); running caffeine check" >&2
    fi
    echo "==> caffeine check (workspace: frontend [check] + backend mops check)"
    caffeine check
    echo "note: caffeine-only path skipped the deployed-shape EOP check-stable (needs mops)." >&2
    echo "note: install ic-mops and re-run:" >&2
    echo "  for f in src/backend/migrations/snapshots/deployed/*.most; do mops check-stable \"\$f\" backend; done" >&2
    return
  fi
  echo "caffeine-import-gate: mops and caffeine are not on PATH." >&2
  echo "Motoko gate did not run. That is a failure, not a skip." >&2
  echo "Install ic-mops (npm i -g ic-mops) or the Caffeine CLI, then re-run." >&2
  exit 1
}

case "$mode" in
  frontend)
    run_frontend
    ;;
  backend)
    run_backend "$@"
    ;;
  all)
    run_frontend
    run_backend "$@"
    ;;
  *)
    usage
    ;;
esac
