#!/usr/bin/env bash
# Oldest-first open-PR stack compatibility.
# Simulates sequential merges of still-open PRs onto origin/main (createdAt
# ascending — the user's merge order). Optional --self also checks HEAD vs
# origin/main and as the next item after each successful older prefix.
#
# Read-only GitHub: `gh pr list` / `gh api` GET only.
# Never: create/update/merge PRs, force-push, or checkout-merge onto main.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="self"
BASE_REF="${STACK_COMPAT_BASE:-origin/main}"
HEAD_REF="HEAD"
SELF_PR_NUMBER=""
REPO_SLUG="${GITHUB_REPOSITORY:-}"
FAIL_FAST=0
LIST_ONLY=0

GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-open-pr-stack-compat}"
GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-open-pr-stack-compat@local}"
GIT_COMMITTER_NAME="${GIT_COMMITTER_NAME:-open-pr-stack-compat}"
GIT_COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL:-open-pr-stack-compat@local}"
export GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL

usage() {
  cat <<'EOF' >&2
usage: scripts/open-pr-stack-compat.sh [options]

  --self          HEAD vs origin/main, then insert HEAD after older open PRs
                  (createdAt ascending). Default.
  --queue         Sequential merge of every open PR onto origin/main.
  --list          Print the oldest-first open PR queue and overlapping files.
  --self-test     Fixture repo: prove clean merge vs conflict detection.
  --base <ref>    Integration base (default: origin/main)
  --head <ref>    Branch/commit to test as "this work" (default: HEAD)
  --pr <n>        Treat GitHub PR number n as "this work" (exclude from older)
  --repo <slug>   owner/name (default: GITHUB_REPOSITORY or origin remote)
  --fail-fast     Stop at the first conflict

Exit 1 on conflict. Prints the PR number and conflicted files.
Does not merge PRs, does not force-push, does not modify the working tree.
EOF
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --self) MODE="self"; shift ;;
    --queue) MODE="queue"; shift ;;
    --list) LIST_ONLY=1; MODE="list"; shift ;;
    --self-test) MODE="self-test"; shift ;;
    --base)
      BASE_REF="${2:-}"
      shift 2
      ;;
    --head)
      HEAD_REF="${2:-}"
      shift 2
      ;;
    --pr)
      SELF_PR_NUMBER="${2:-}"
      shift 2
      ;;
    --repo)
      REPO_SLUG="${2:-}"
      shift 2
      ;;
    --fail-fast) FAIL_FAST=1; shift ;;
    -h|--help) usage ;;
    *)
      echo "open-pr-stack-compat: unknown argument: $1" >&2
      usage
      ;;
  esac
done

# --- merge-tree plumbing (no working-tree checkout) -------------------------

run_merge_tree() {
  local base="$1" other="$2"
  local out status=0
  MERGE_TREE_OID=""
  CONFLICT_FILES=""
  out="$(git merge-tree --write-tree --name-only --no-messages "$base" "$other" 2>&1)" || status=$?
  MERGE_TREE_OID="${out%%$'\n'*}"
  if [[ "$out" == "$MERGE_TREE_OID" ]]; then
    CONFLICT_FILES=""
  else
    CONFLICT_FILES="${out#*$'\n'}"
  fi
  if [[ "$status" -eq 0 ]]; then
    return 0
  fi
  if [[ "$status" -eq 1 ]]; then
    return 1
  fi
  echo "open-pr-stack-compat: git merge-tree failed (exit $status):" >&2
  printf '%s\n' "$out" >&2
  return "$status"
}

make_merge_commit() {
  local tree="$1" parent_a="$2" parent_b="$3" msg="$4"
  git commit-tree "$tree" -p "$parent_a" -p "$parent_b" -m "$msg"
}

is_ancestor() {
  git merge-base --is-ancestor "$1" "$2" 2>/dev/null
}

tree_of() {
  git rev-parse "$1^{tree}"
}

print_conflict_files() {
  local files="$1"
  if [[ -z "$files" ]]; then
    echo "    (git merge-tree did not list paths; inspect the two commits)" >&2
    return
  fi
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    echo "    $path" >&2
  done <<<"$files"
}

# --- GitHub (read-only) -----------------------------------------------------

require_gh() {
  if ! command -v gh >/dev/null 2>&1; then
    echo "open-pr-stack-compat: gh is not on PATH. Install GitHub CLI (read-only: pr list)." >&2
    exit 1
  fi
}

detect_repo_slug() {
  if [[ -n "$REPO_SLUG" ]]; then
    echo "$REPO_SLUG"
    return
  fi
  if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
    echo "$GITHUB_REPOSITORY"
    return
  fi
  local url
  url="$(git remote get-url origin 2>/dev/null || true)"
  if [[ "$url" =~ github.com[:/](.+/[^/.]+)(\.git)?$ ]]; then
    echo "${BASH_REMATCH[1]%.git}"
    return
  fi
  echo "open-pr-stack-compat: cannot detect owner/repo. Pass --repo owner/name." >&2
  exit 1
}

base_branch_name() {
  local ref="$1"
  ref="${ref#refs/heads/}"
  ref="${ref#refs/remotes/origin/}"
  ref="${ref#origin/}"
  echo "$ref"
}

sort_pr_json() {
  if command -v jq >/dev/null 2>&1; then
    jq 'sort_by(.createdAt, .number)'
    return
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys; p=json.load(sys.stdin); p.sort(key=lambda x:(x.get("createdAt",""), x.get("number",0))); json.dump(p,sys.stdout)'
    return
  fi
  echo "open-pr-stack-compat: need jq or python3 to sort PR JSON." >&2
  exit 1
}

list_open_prs_json() {
  local slug="$1" base_branch="$2"
  gh pr list --repo "$slug" --state open --base "$base_branch" --limit 1000 \
    --json number,title,headRefOid,headRefName,createdAt,url
}

fetch_base() {
  local branch
  branch="$(base_branch_name "$BASE_REF")"
  echo "==> git fetch origin $branch (update $BASE_REF)"
  git fetch --no-tags origin "$branch"
  if ! git rev-parse --verify -q "$BASE_REF" >/dev/null; then
    if git rev-parse --verify -q "origin/$branch" >/dev/null; then
      BASE_REF="origin/$branch"
    else
      echo "open-pr-stack-compat: missing ref $BASE_REF after fetch." >&2
      exit 1
    fi
  fi
}

fetch_pr_heads() {
  local nums=("$@")
  [[ ${#nums[@]} -eq 0 ]] && return 0
  local specs=() n
  for n in "${nums[@]}"; do
    specs+=("+refs/pull/${n}/head:refs/stack-pr/${n}")
  done
  local i batch
  i=0
  while [[ $i -lt ${#specs[@]} ]]; do
    batch=("${specs[@]:$i:40}")
    echo "==> git fetch origin pull refs (${#batch[@]} spec(s))"
    git fetch --no-tags origin "${batch[@]}"
    i=$((i + 40))
  done
}

pr_commit() {
  local num="$1" oid="$2"
  if git rev-parse --verify -q "refs/stack-pr/${num}" >/dev/null; then
    git rev-parse "refs/stack-pr/${num}"
    return
  fi
  if [[ -n "$oid" ]] && git rev-parse --verify -q "$oid^{commit}" >/dev/null; then
    echo "$oid"
    return
  fi
  echo "open-pr-stack-compat: no commit for PR #${num} (oid ${oid:-unknown})." >&2
  exit 1
}

changed_files() {
  git diff --name-only "$1...$2"
}

# --- queue simulation -------------------------------------------------------

# Prints overlapping paths between this_commit and other_commit vs base.
print_overlaps() {
  local base="$1" this_c="$2" other_c="$3" label="$4"
  local tmp_this tmp_other overlap
  tmp_this="$(mktemp)"
  tmp_other="$(mktemp)"
  changed_files "$base" "$this_c" | sort -u >"$tmp_this"
  changed_files "$base" "$other_c" | sort -u >"$tmp_other"
  overlap="$(comm -12 "$tmp_this" "$tmp_other" || true)"
  rm -f "$tmp_this" "$tmp_other"
  if [[ -n "$overlap" ]]; then
    echo "OVERLAP with $label (union these files; do not overwrite):"
    while IFS= read -r path; do
      [[ -z "$path" ]] && continue
      echo "    $path"
    done <<<"$overlap"
  fi
}

simulate() {
  local base_oid="$1"
  local self_oid="${2:-}"
  local self_num="${3:-}"
  local stack="$base_oid"
  local conflicts=0
  local i num title oid commit status
  local merged_labels=()

  echo "==> base $(git rev-parse --short "$base_oid") ($BASE_REF)"

  if [[ -n "$self_oid" ]]; then
    echo "==> this work $(git rev-parse --short "$self_oid") ($HEAD_REF)${self_num:+  PR #$self_num}"
    status=0
    run_merge_tree "$base_oid" "$self_oid" || status=$?
    if [[ "$status" -eq 0 ]]; then
      echo "OK  this work vs $BASE_REF (GitHub merge button)"
    else
      echo "CONFLICT: this work vs $BASE_REF (GitHub merge button would be blocked)" >&2
      echo "  conflicting files:" >&2
      print_conflict_files "$CONFLICT_FILES"
      conflicts=1
      if [[ "$FAIL_FAST" -eq 1 ]]; then
        return 1
      fi
    fi
  fi

  if [[ ${#PR_NUMS[@]} -eq 0 ]]; then
    echo "==> no other open PRs in the oldest-first queue"
  fi
  for i in "${!PR_NUMS[@]}"; do
    num="${PR_NUMS[$i]}"
    title="${PR_TITLES[$i]}"
    oid="${PR_OIDS[$i]}"

    if [[ -n "$self_num" && "$num" == "$self_num" ]]; then
      echo "SKIP PR #${num} (this work)"
      continue
    fi
    if [[ -n "$self_oid" && "$oid" == "$(git rev-parse "$self_oid")" ]]; then
      echo "SKIP PR #${num} (same SHA as this work — subsumed)"
      continue
    fi

    commit="$(pr_commit "$num" "$oid")"

    if [[ -n "$self_oid" ]]; then
      print_overlaps "$base_oid" "$self_oid" "$commit" "PR #${num} ${title}"
    fi

    if is_ancestor "$commit" "$stack"; then
      echo "OK  PR #${num} already in stack (ancestor / same-SHA subsumption) — ${title}"
      continue
    fi

    status=0
    run_merge_tree "$stack" "$commit" || status=$?
    if [[ "$status" -ne 0 ]]; then
      echo "CONFLICT: PR #${num} \"${title}\" vs oldest-first stack so far${merged_labels[*]:+ (${merged_labels[*]})}" >&2
      echo "  conflicting files:" >&2
      print_conflict_files "$CONFLICT_FILES"
      if [[ "$MODE" == "self" ]]; then
        echo "WARN: skipping older PR #${num} for the remaining prefix (pre-existing queue break). This work still must merge onto the successful prefix and vs $BASE_REF." >&2
        if [[ "$FAIL_FAST" -eq 1 ]]; then
          return 1
        fi
        continue
      fi
      conflicts=1
      if [[ "$FAIL_FAST" -eq 1 ]]; then
        return 1
      fi
      continue
    fi

    if [[ "$(tree_of "$stack")" == "$MERGE_TREE_OID" ]]; then
      echo "OK  PR #${num} empty unique delta on stack (subsumed) — ${title}"
      continue
    fi

    stack="$(make_merge_commit "$MERGE_TREE_OID" "$stack" "$commit" "sim: merge #${num} ${title}")"
    merged_labels+=("#${num}")
    echo "OK  sequential merge PR #${num} — ${title}"

    if [[ -n "$self_oid" ]]; then
      if is_ancestor "$self_oid" "$stack"; then
        echo "OK  this work already in stack after #${num} (subsumed)"
        continue
      fi
      status=0
      run_merge_tree "$stack" "$self_oid" || status=$?
      if [[ "$status" -eq 0 ]]; then
        if [[ "$(tree_of "$stack")" == "$MERGE_TREE_OID" ]]; then
          echo "OK  this work subsumed after prefix ${merged_labels[*]}"
        else
          echo "OK  this work vs prefix ${merged_labels[*]}"
        fi
      else
        echo "CONFLICT: this work vs oldest-first prefix ${merged_labels[*]} (after PR #${num} \"${title}\")" >&2
        echo "  conflicting files:" >&2
        print_conflict_files "$CONFLICT_FILES"
        echo "  restack onto that prefix and union overlapping files; do not rebase onto bare main only." >&2
        conflicts=1
        if [[ "$FAIL_FAST" -eq 1 ]]; then
          return 1
        fi
      fi
    fi
  done

  if [[ "$conflicts" -ne 0 ]]; then
    echo "open-pr-stack-compat: FAILED (see CONFLICT lines)" >&2
    return 1
  fi
  echo "open-pr-stack-compat: clean"
  return 0
}

load_open_prs() {
  local slug base_branch json
  if ! command -v jq >/dev/null 2>&1; then
    echo "open-pr-stack-compat: jq is required to parse gh pr list JSON." >&2
    exit 1
  fi
  slug="$(detect_repo_slug)"
  base_branch="$(base_branch_name "$BASE_REF")"
  echo "==> listing open PRs vs ${slug} base=${base_branch} (createdAt ascending)"
  json="$(list_open_prs_json "$slug" "$base_branch")"
  json="$(printf '%s' "$json" | sort_pr_json)"
  PR_COUNT="$(printf '%s' "$json" | jq 'length')"
  echo "==> ${PR_COUNT} open PR(s)"
  PR_NUMS=()
  PR_TITLES=()
  PR_OIDS=()
  PR_HEADS=()
  PR_CREATED=()
  local i
  for ((i = 0; i < PR_COUNT; i++)); do
    PR_NUMS+=("$(printf '%s' "$json" | jq -r ".[$i].number")")
    PR_TITLES+=("$(printf '%s' "$json" | jq -r ".[$i].title")")
    PR_OIDS+=("$(printf '%s' "$json" | jq -r ".[$i].headRefOid")")
    PR_HEADS+=("$(printf '%s' "$json" | jq -r ".[$i].headRefName")")
    PR_CREATED+=("$(printf '%s' "$json" | jq -r ".[$i].createdAt")")
    echo "    #${PR_NUMS[$i]} ${PR_CREATED[$i]} ${PR_HEADS[$i]}  ${PR_TITLES[$i]}"
  done
}

infer_self_pr_number() {
  if [[ -n "$SELF_PR_NUMBER" ]]; then
    echo "$SELF_PR_NUMBER"
    return
  fi
  if [[ "${GITHUB_REF:-}" =~ refs/pull/([0-9]+)/ ]]; then
    echo "${BASH_REMATCH[1]}"
    return
  fi
  local i branch
  branch="$(git rev-parse --abbrev-ref "$HEAD_REF" 2>/dev/null || true)"
  if [[ -n "${GITHUB_HEAD_REF:-}" ]]; then
    branch="$GITHUB_HEAD_REF"
  fi
  if [[ ${#PR_NUMS[@]} -eq 0 ]]; then
    echo ""
    return
  fi
  for i in "${!PR_NUMS[@]}"; do
    if [[ -n "$branch" && "${PR_HEADS[$i]}" == "$branch" ]]; then
      echo "${PR_NUMS[$i]}"
      return
    fi
    if [[ "$(git rev-parse "$HEAD_REF")" == "${PR_OIDS[$i]}" ]]; then
      echo "${PR_NUMS[$i]}"
      return
    fi
  done
  echo ""
}

run_github_modes() {
  require_gh
  fetch_base
  local base_oid self_oid self_num
  base_oid="$(git rev-parse "$BASE_REF")"
  load_open_prs

  if [[ ${#PR_NUMS[@]} -gt 0 ]]; then
    fetch_pr_heads "${PR_NUMS[@]}"
  fi

  self_num="$(infer_self_pr_number)"
  if [[ "$LIST_ONLY" -eq 1 ]]; then
    if git rev-parse --verify -q "$HEAD_REF" >/dev/null; then
      self_oid="$(git rev-parse "$HEAD_REF")"
      local i commit
      for i in "${!PR_NUMS[@]}"; do
        if [[ -n "$self_num" && "${PR_NUMS[$i]}" == "$self_num" ]]; then
          continue
        fi
        commit="$(pr_commit "${PR_NUMS[$i]}" "${PR_OIDS[$i]}")"
        print_overlaps "$base_oid" "$self_oid" "$commit" "PR #${PR_NUMS[$i]} ${PR_TITLES[$i]}"
      done
    fi
    echo "open-pr-stack-compat: listed ${PR_COUNT} open PR(s)"
    return 0
  fi

  if [[ "$MODE" == "queue" ]]; then
    simulate "$base_oid" "" ""
    return
  fi

  self_oid="$(git rev-parse "$HEAD_REF")"
  simulate "$base_oid" "$self_oid" "$self_num"
}

# --- fixture self-test (no GitHub) ------------------------------------------

self_test() {
  local tmp
  tmp="$(mktemp -d)"
  echo "==> self-test in $tmp"
  (
    set -euo pipefail
    git init -q "$tmp"
    cd "$tmp"
    git config user.name "stack-compat-test"
    git config user.email "stack-compat-test@local"
    export GIT_AUTHOR_NAME="stack-compat-test"
    export GIT_AUTHOR_EMAIL="stack-compat-test@local"
    export GIT_COMMITTER_NAME="stack-compat-test"
    export GIT_COMMITTER_EMAIL="stack-compat-test@local"

    echo "shared" >keep.txt
    echo "line-a" >conflict.txt
    git add keep.txt conflict.txt
    git commit -qm "base"
    local main_oid
    main_oid="$(git rev-parse HEAD)"

    git checkout -q -b pr-old
    echo "older-change" >independent.txt
    git add independent.txt
    git commit -qm "older independent file"
    echo "line-a from older" >conflict.txt
    git add conflict.txt
    git commit -qm "older edits conflict.txt"
    local older
    older="$(git rev-parse HEAD)"

    git checkout -q "$main_oid"
    git checkout -q -b pr-new
    echo "newer-only" >newer.txt
    git add newer.txt
    git commit -qm "newer independent file"
    local newer_clean
    newer_clean="$(git rev-parse HEAD)"

    echo "line-a from newer" >conflict.txt
    git add conflict.txt
    git commit -qm "newer edits conflict.txt same line"
    local newer_conflict
    newer_conflict="$(git rev-parse HEAD)"

    # Independent sequential merge must be clean.
    if ! run_merge_tree "$main_oid" "$older"; then
      echo "self-test FAIL: older PR should merge onto main" >&2
      exit 1
    fi
    local stack
    stack="$(make_merge_commit "$MERGE_TREE_OID" "$main_oid" "$older" "sim older")"
    if ! run_merge_tree "$stack" "$newer_clean"; then
      echo "self-test FAIL: independent newer commit should merge onto older prefix" >&2
      echo "  files: $CONFLICT_FILES" >&2
      exit 1
    fi
    echo "OK  fixture: independent files sequential-merge"

    # Same-line sibling edit is still merge-clean vs main (GitHub button) but
    # conflicts after the older PR lands first.
    if ! run_merge_tree "$main_oid" "$newer_conflict"; then
      echo "self-test FAIL: newer same-line edit should still merge onto bare main" >&2
      echo "  files: $CONFLICT_FILES" >&2
      exit 1
    fi
    echo "OK  fixture: sibling same-line edit is clean vs main"

    if run_merge_tree "$stack" "$newer_conflict"; then
      echo "self-test FAIL: expected conflict vs older prefix on conflict.txt" >&2
      exit 1
    fi
    if [[ "$CONFLICT_FILES" != *conflict.txt* ]]; then
      echo "self-test FAIL: expected conflict.txt vs prefix, got: $CONFLICT_FILES" >&2
      exit 1
    fi
    echo "OK  fixture: named file on vs-prefix conflict ($CONFLICT_FILES)"

    # Same SHA onto stack is ancestor / subsumed.
    if ! is_ancestor "$older" "$stack"; then
      echo "self-test FAIL: older should be ancestor of sequential stack" >&2
      exit 1
    fi
    echo "OK  fixture: same-SHA / ancestor subsumption"
    echo "open-pr-stack-compat: self-test passed"
  )
  local st=$?
  rm -rf "$tmp"
  return "$st"
}

case "$MODE" in
  self-test)
    self_test
    ;;
  self|queue|list)
    run_github_modes
    ;;
  *)
    usage
    ;;
esac
