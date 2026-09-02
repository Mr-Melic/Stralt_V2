# Oldest-first open PR stack compatibility

Automations open PRs against bare `main`. This repo merges **oldest still-open PR first**. A PR that is clean vs `main` still conflicts after older siblings land unless it was stacked on (or unioned with) those siblings.

There is **no write API** for Cursor Cloud dashboard automation prompts (`get-automation` is read-only). Do not claim dashboard prompts were updated. Enforcement is in-repo: `AGENTS.md`, `.cursor/rules/open-pr-stack-compat.mdc`, this file, `scripts/open-pr-stack-compat.sh`, and the `open-pr-stack` job in `.github/workflows/caffeine-import-gate.yml`.

## Commands

```bash
# This branch vs origin/main AND as the next oldest-first queue item
bash scripts/open-pr-stack-compat.sh --self

# Sequential merge of every still-open PR onto origin/main
bash scripts/open-pr-stack-compat.sh --queue

# Print the createdAt-ascending queue and overlapping files
bash scripts/open-pr-stack-compat.sh --list

# Fixture (no GitHub): conflict vs clean sequential merge
bash scripts/open-pr-stack-compat.sh --self-test
```

`gh` is **read-only** here (`gh pr list`, `gh api` GET). The script does not create, edit, or merge PRs and does not force-push `main`. It uses `git merge-tree` + dangling `commit-tree` objects (no working-tree merge).

CI: sibling job `open-pr-stack` on every PR and `main` (`pull-requests: read`, no PocketIC/dfx). Exit 1 prints the PR number and conflicted files.

## Cursor Cloud Automations — paste-ready addendum

Paste the following into **every** automation prompt that can produce or merge code (same dashboard URLs as `docs/automation/CAFFEINE_IMPORT_GATES.md`):

```
Open PR stack compat (mandatory, do not skip):
Start from latest origin/main. List still-open PRs targeting main; sort by
createdAt ascending (oldest first — that is the merge order). Before opening
or finishing a PR, treat older open PRs as already-queued: union overlapping
files rather than overwriting, and restack onto an oldest-first integration
of those PRs when needed. Union overlapping files means keep one `export
function` implementation per name — do not concatenate two copies of the same
helper (esbuild “Multiple exports with the same name”). Independent rebase onto
bare main is not enough.
This PR must merge cleanly into current main AND after older still-open PRs
land first. Do not treat stack conflicts as pre-existing. Same-SHA subsumption
is OK when this PR's unique delta is already in an older sibling.
Run: bash scripts/open-pr-stack-compat.sh --self
See AGENTS.md and docs/automation/OPEN_PR_STACK_COMPAT.md.
```
