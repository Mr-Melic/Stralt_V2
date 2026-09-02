#!/usr/bin/env python3
"""Fail if the EOP migration chain can no longer upgrade the recorded canisters.

How moc 1.11 resolves an enhanced migration chain (verified in the compiler
source and on PocketIC, see docs/TROUBLESHOOTING.md "Deep analysis"):

* Runtime (`src/lowering/desugar.ml`, `rts_was_migration_performed`): the
  canister stores the names of the migrations it applied. The new program
  compares the *most recently applied* name with every chain file name; the
  matching file is the chain position, the stored state is loaded as the chain
  type at that position and every later file runs. No match → the whole chain
  runs from the genesis input `{}` → `RTS error: Memory-incompatible program
  upgrade` (IC0503) on any populated canister. A stable field that is neither in
  the loaded state nor produced by a migration that ran → `stable variable …
  not found in persisted state`.
* Compile time (`mo_types/type.ml` `pre`/`post`, `mops check-stable` =
  `moc --stable-compatible <previous.most> <new.most>`): the position is the
  LAST name in the previous signature's chain block. Every field the actor
  declares that is not produced by a later chain file is a REQUIRED input at
  that position (M0263 when the previous version lacks it); a previous field
  that no later file consumes and that the actor no longer declares is dropped
  (M0169). Exception: when the previous version is already at the head of the
  chain, moc marks nothing as required — that is a false negative, the runtime
  still traps (`not found in persisted state`). This script applies the
  runtime rule, so it is stricter than `mops check-stable`.
* Nothing about the built wasm depends on `.old/…/backend.most`: `mops build`
  passes only `--enhanced-migration=src/backend/migrations` to moc (no
  `--stable-baseline` before moc 1.15). `.old` only feeds `mops check-stable`.

Caffeine keeps its own copy of the previous version (the `.most` of the last
build it deployed successfully) and compares every GitHub import against it —
the repo's `.old` file is NOT what Caffeine reads, so the file must be a
byte-identical copy of that build's `src/backend/dist/backend.most`. The M0263
Caffeine reported for PR #311 reproduces locally only with that file in `.old`.

Rules this script enforces (no replica, no PocketIC, no dfx):

1. The genesis file is `20260801_000000.mo` with `OldActor = {}` so a fresh
   canister installs, and it sorts before every recorded Caffeine name.
2. `NewActor` field sets for every file at or before `FROZEN_THROUGH` match
   `snapshots/frozen-newactor-fields.json`. Name-only files (`20260803_185500`)
   stay `migration(_ : {}) : {}`.
3. Actor-level `let`/`var` on `src/backend/main.mo` (not `transient`) must be
   on the latest field-introducing `NewActor` or in the frozen orthogonal
   allowlist. New names need a NEW later chain file (never edit a frozen one).
4. `mops.toml` `check-limit` >= number of chain files.
5. `.old/src/backend/dist/backend.most` and every `snapshots/deployed/*.most`
   must be Version 4.0.0 signatures whose latest applied migration name is a
   chain file, and the chain must be able to upgrade them under the runtime
   rule above (no required field missing, no field dropped). Every
   `snapshots/unsupported/*.most` must FAIL that rule (otherwise the label is
   stale). A blank `actor { };` baseline is rejected.
6. `.old` must be byte-identical (ignoring `//` header lines) to one of the
   `snapshots/deployed/*.most` files, so a hand-written baseline cannot sneak
   in without also being recorded as a deployed shape.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / "src/backend/main.mo"
MIGRATIONS = ROOT / "src/backend/migrations"
SNAPSHOTS = MIGRATIONS / "snapshots"
DEPLOYED = SNAPSHOTS / "deployed"
UNSUPPORTED = SNAPSHOTS / "unsupported"
MOPS = ROOT / "mops.toml"
OLD_BASELINE = ROOT / ".old/src/backend/dist/backend.most"
EMPTY_SNAPSHOT = SNAPSHOTS / "empty-canister.most"
ORTHOGONAL = SNAPSHOTS / "orthogonal-stables.txt"
FROZEN_JSON = SNAPSHOTS / "frozen-newactor-fields.json"
GENESIS = "20260801_000000"
FROZEN_THROUGH = "20260901_000000"
# Names recorded on real Caffeine canisters / in Caffeine's previous-version
# record. Each must stay a chain file.
DEPLOYED_TAILS = {
    "20260803_185500": "cwofb-yqaaa-aaaap-qp45q-cai at Caffeine build #347/#348",
    "20260827_000000": "cwofb-yqaaa-aaaap-qp45q-cai at Caffeine build #354",
    "20260831_000000": (
        "Caffeine's recorded previous version for this project: the 2026-08-31 "
        "import (PR #181 merge f8aa05e, no GameKey) — what zh6cg-aaaaa-aaaad-aar2q-cai is upgraded from"
    ),
    "20260901_000000": "any canister created fresh from main between PR #259 and PR #311",
}
REQUIRED_DEPLOYED_SNAPSHOTS = (
    "caffeine-aug31-import-tail-20260831-no-gamekey.most",
    "caffeine-348-tail-20260803.most",
    "caffeine-354-tail-20260827.most",
    "pr259-tail-20260901.most",
)

ACTOR_FIELD = re.compile(r"^    (let|var) ([A-Za-z_][A-Za-z0-9_]*)\b")
TYPE_NEW = re.compile(r"\btype NewActor\s*=")
TYPE_OLD = re.compile(r"\btype OldActor\s*=")
NOOP_MIGRATION = re.compile(
    r"public\s+func\s+migration\s*\(\s*_\s*:\s*\{\s*\}\s*\)\s*:\s*\{\s*\}\s*\{\s*\{\s*\}\s*;?\s*\}\s*;?",
    re.S,
)
CHECK_LIMIT = re.compile(
    r"\[canisters\.backend\.migrations\][\s\S]*?check-limit\s*=\s*(\d+)",
    re.M,
)
CHAIN_FILE = re.compile(r"^(\d{8}_\d{6})\.mo$")


def _matching_brace_block(src: str, open_at: int) -> str:
    if open_at < 0 or open_at >= len(src) or src[open_at] != "{":
        raise ValueError("expected '{'")
    depth = 0
    i = open_at
    while i < len(src):
        ch = src[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return src[open_at : i + 1]
        i += 1
    raise ValueError("unbalanced braces")


def _type_block(src: str, header: re.Pattern[str]) -> str | None:
    m = header.search(src)
    if not m:
        return None
    brace = src.find("{", m.end())
    if brace < 0:
        return None
    return _matching_brace_block(src, brace)


def _fields_from_actor_type(block: str) -> list[str]:
    """Field names in `type NewActor = { … }` / `type OldActor = { … }`."""
    names: list[str] = []
    depth = 0
    for raw in block.splitlines():
        line = raw.strip()
        if not line or line.startswith("//"):
            continue
        if depth == 1:
            m = re.match(r"^(?:var\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*:", line)
            if m:
                names.append(m.group(1))
        depth += line.count("{") - line.count("}")
    seen: set[str] = set()
    out: list[str] = []
    for n in names:
        if n in seen:
            continue
        seen.add(n)
        out.append(n)
    return out


def is_noop_migration(src: str) -> bool:
    return NOOP_MIGRATION.search(src) is not None and not TYPE_NEW.search(src)


def extract_new_actor_fields(src: str) -> list[str]:
    if is_noop_migration(src):
        return []
    block = _type_block(src, TYPE_NEW)
    if block is None:
        raise ValueError("no type NewActor (and not a `migration(_ : {}) : {}` no-op)")
    return _fields_from_actor_type(block)


def extract_old_actor_fields(src: str) -> list[str]:
    if is_noop_migration(src):
        return []
    block = _type_block(src, TYPE_OLD)
    if block is None:
        raise ValueError("no type OldActor")
    inner = block.strip()
    if inner in {"{}", "{ }"}:
        return []
    return _fields_from_actor_type(block)


def extract_main_stables(src: str) -> list[str]:
    names: list[str] = []
    for line in src.splitlines():
        if re.match(r"^    transient (let|var)\b", line):
            continue
        m = ACTOR_FIELD.match(line)
        if not m:
            continue
        names.append(m.group(2))
    return names


def chain_files() -> list[Path]:
    files = []
    for p in sorted(MIGRATIONS.glob("*.mo")):
        if CHAIN_FILE.match(p.name):
            files.append(p)
    return files


def most_applied_names(content: str) -> list[str] | None:
    """Migration names recorded in a Version 4.0.0 `.most` chain block.

    Mirrors ic-mops `parseMostAppliedMigrationNames`. Returns [] for a
    Version 1.0.0 signature (no chain), None if the file is not a `.most`.
    """
    m = re.search(r"^// Version: ([^\n]+)", content, re.M)
    if not m:
        return None
    if m.group(1).strip() != "4.0.0":
        return []
    actor_idx = re.search(r"\nactor\b", content)
    if actor_idx is None:
        return None
    block = content[: actor_idx.start()]
    return re.findall(r'[{;]\s*"([^"]+)"\s*:', block)


def most_stable_names(content: str) -> list[str]:
    actor_idx = re.search(r"\nactor\b", content)
    if actor_idx is None:
        return []
    body = content[actor_idx.start() :]
    return re.findall(r"^\s+stable (?:var )?([A-Za-z_][A-Za-z0-9_]*)\s*:", body, re.M)


def signature_body(content: str) -> str:
    """The `.most` without its leading `//` header lines (provenance comments)."""
    lines = content.splitlines()
    i = 0
    while i < len(lines) and lines[i].startswith("//"):
        i += 1
    return "\n".join(lines[i:]).strip()


def load_orthogonal() -> set[str]:
    if not ORTHOGONAL.is_file():
        raise SystemExit(f"missing {ORTHOGONAL}")
    names: set[str] = set()
    for line in ORTHOGONAL.read_text(encoding="utf-8").splitlines():
        t = line.strip()
        if not t or t.startswith("#"):
            continue
        names.add(t)
    return names


def load_frozen() -> dict[str, list[str]]:
    if not FROZEN_JSON.is_file():
        raise SystemExit(f"missing {FROZEN_JSON}")
    data = json.loads(FROZEN_JSON.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise SystemExit(f"{FROZEN_JSON} must be an object")
    return {k: list(v) for k, v in data.items()}


def parse_check_limit() -> int:
    text = MOPS.read_text(encoding="utf-8")
    m = CHECK_LIMIT.search(text)
    if not m:
        raise SystemExit("mops.toml: missing [canisters.backend.migrations] check-limit")
    return int(m.group(1))


def stem(path: Path) -> str:
    return path.stem  # 20260831_000000


def latest_introducing(files: list[Path], new_by_stem: dict[str, list[str]]) -> Path | None:
    """Last chain file whose NewActor lists fields (skips name-only no-ops)."""
    for p in reversed(files):
        if new_by_stem.get(stem(p)):
            return p
    return None


def required_at_position(
    files: list[Path],
    old_by_stem: dict[str, list[str]],
    new_by_stem: dict[str, list[str]],
    main_fields: list[str],
    latest_applied: str,
) -> set[str]:
    """Fields the previous version must hold when its latest applied name is
    `latest_applied` — moc's `pres` reverse fold (mo_types/type.ml) under the
    runtime rule: every actor field not produced by a later chain file is
    required, and every input (OldActor field) of a later chain file is required.
    """
    pre = set(main_fields)
    for p in reversed(files):
        if stem(p) == latest_applied:
            return pre
        dom = set(old_by_stem.get(stem(p), []))
        rng = set(new_by_stem.get(stem(p), []))
        pre = dom | {f for f in pre if f not in dom and f not in rng}
    return pre  # name not in chain: genesis input


def upgrade_verdict(
    content: str,
    files: list[Path],
    old_by_stem: dict[str, list[str]],
    new_by_stem: dict[str, list[str]],
    main_fields: list[str],
) -> list[str]:
    """Reasons the current chain cannot upgrade the signature in `content`
    (empty list = upgradable). Names only; field *types* are left to
    `mops check-stable`."""
    applied = most_applied_names(content)
    chain_stems = [stem(p) for p in files]
    if applied is None:
        return ["not a moc .most signature"]
    held = set(most_stable_names(content))
    if not applied:
        if not held:
            return []  # empty canister: whole chain runs from {}
        return [
            "no migration chain block but populated: the whole chain would run from "
            f"the {{}} genesis and drop {sorted(held)} (Memory-incompatible program upgrade)"
        ]
    latest = max(applied)
    if latest not in chain_stems:
        return [
            f"latest applied migration `{latest}` is not a chain file → genesis fallback, "
            "Memory-incompatible program upgrade"
        ]
    required = required_at_position(files, old_by_stem, new_by_stem, main_fields, latest)
    reasons = []
    missing = sorted(required - held)
    if missing:
        reasons.append(
            f"at position `{latest}` the chain requires {missing} which the signature lacks "
            "(M0263 at compile time / `not found in persisted state` at runtime)"
        )
    extra = sorted(held - required)
    if extra:
        reasons.append(
            f"at position `{latest}` the signature holds {extra} which no later chain file "
            "carries or consumes (M0169 at compile time / Memory-incompatible program upgrade at runtime)"
        )
    return reasons


def write_manifests() -> None:
    SNAPSHOTS.mkdir(parents=True, exist_ok=True)
    main_fields = extract_main_stables(MAIN.read_text(encoding="utf-8"))
    files = chain_files()
    frozen: dict[str, list[str]] = {}
    new_by_stem: dict[str, list[str]] = {}
    for p in files:
        fields = extract_new_actor_fields(p.read_text(encoding="utf-8"))
        new_by_stem[stem(p)] = fields
        if stem(p) <= FROZEN_THROUGH:
            frozen[stem(p)] = fields
    latest = latest_introducing(files, new_by_stem)
    latest_set = set(new_by_stem.get(stem(latest), [])) if latest else set()
    ortho = [n for n in main_fields if n not in latest_set]
    ORTHOGONAL.write_text(
        "# Actor-level stables on main.mo that persist orthogonally (not listed\n"
        f"# on the latest field-introducing NewActor, {stem(latest) if latest else '?'}). Frozen.\n"
        "# Do not add names here. New persistent let/var must appear on a later\n"
        "# NewActor instead.\n"
        + "\n".join(ortho)
        + "\n",
        encoding="utf-8",
    )
    FROZEN_JSON.write_text(
        json.dumps(frozen, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {ORTHOGONAL} ({len(ortho)} names)")
    print(f"wrote {FROZEN_JSON} ({len(frozen)} files)")


def check_baseline(path: Path, chain_stems: set[str], errors: list[str], *, label: str) -> None:
    if not path.is_file():
        errors.append(f"missing {label}: {path}")
        return
    content = path.read_text(encoding="utf-8")
    applied = most_applied_names(content)
    if applied is None:
        errors.append(f"{label} {path} is not a moc .most signature")
        return
    if not applied:
        errors.append(
            f"{label} {path} has no migration chain block (blank `actor {{ }};` or "
            "Version 1.0.0). It must be the signature Caffeine holds as previous "
            "version (the `src/backend/dist/backend.most` of the last build it "
            "deployed successfully), not an empty placeholder."
        )
        return
    latest = max(applied)
    if latest not in chain_stems:
        errors.append(
            f"{label} {path}: latest applied migration `{latest}` is not a chain "
            f"file. moc falls back to the genesis input `{{}}` for an unknown "
            "name and traps with `RTS error: Memory-incompatible program upgrade` "
            "on a populated canister. Keep a (no-op) file with that name."
        )


def check() -> int:
    errors: list[str] = []
    files = chain_files()
    if not files:
        errors.append(f"no migration files in {MIGRATIONS}")
        _print(errors)
        return 1
    chain_stems = {stem(p) for p in files}

    genesis = files[0]
    if stem(genesis) != GENESIS:
        errors.append(
            f"empty-canister genesis must stay first in lex order and sort before "
            f"every recorded Caffeine name (got {genesis.name}, expected {GENESIS}.mo)"
        )
    genesis_src = genesis.read_text(encoding="utf-8")
    try:
        old_fields = extract_old_actor_fields(genesis_src)
    except ValueError as exc:
        errors.append(f"{genesis.name}: {exc}")
        old_fields = ["<parse-error>"]
    if old_fields:
        errors.append(
            f"{genesis.name} OldActor must be {{}} for empty-canister import "
            f"(M0263); found {old_fields}"
        )

    for name, where in DEPLOYED_TAILS.items():
        if name not in chain_stems:
            errors.append(
                f"chain file {name}.mo is missing but that name is the latest "
                f"applied migration on {where}. Deleting or renaming it makes moc "
                "fall back to the genesis input and trap (IC0503)."
            )

    limit = parse_check_limit()
    if limit < len(files):
        errors.append(
            f"mops.toml check-limit={limit} < chain length {len(files)}. "
            f"Bump it so {GENESIS} (OldActor = {{}}) is not dropped."
        )

    frozen_expected = load_frozen()
    orthogonal = load_orthogonal()
    new_by_stem: dict[str, list[str]] = {}
    old_by_stem: dict[str, list[str]] = {}
    for p in files:
        src = p.read_text(encoding="utf-8")
        try:
            fields = extract_new_actor_fields(src)
            old_by_stem[stem(p)] = extract_old_actor_fields(src)
        except ValueError as exc:
            errors.append(f"{p.name}: {exc}")
            continue
        new_by_stem[stem(p)] = fields
        if stem(p) <= FROZEN_THROUGH:
            expected = frozen_expected.get(stem(p))
            if expected is None:
                errors.append(
                    f"{p.name}: frozen through {FROZEN_THROUGH} but missing from "
                    f"{FROZEN_JSON.name}. Do not invent a NewActor rewrite; "
                    "copy the extracted field list only when bootstrapping."
                )
            elif list(expected) != fields:
                errors.append(
                    f"{p.name}: frozen NewActor fields changed. "
                    "Do not amend a shipped NewActor (IC0503 / M0263 / M0169). "
                    f"expected {expected}; found {fields}. "
                    "Add a later YYYYMMDD_*.mo instead."
                )
            if expected == [] and not is_noop_migration(src):
                errors.append(
                    f"{p.name}: must stay a name-only `migration(_ : {{}}) : {{}}` no-op."
                )

    latest = latest_introducing(files, new_by_stem)
    latest_fields = new_by_stem.get(stem(latest), []) if latest else []
    latest_set = set(latest_fields)
    main_src = MAIN.read_text(encoding="utf-8")
    main_fields = extract_main_stables(main_src)
    main_set = set(main_fields)

    extras = [n for n in main_fields if n not in latest_set]
    extra_set = set(extras)
    sneaked = sorted(extra_set - orthogonal)
    deleted = sorted(orthogonal - extra_set)
    if sneaked:
        errors.append(
            "new persistent main.mo stables not on the latest field-introducing "
            f"NewActor ({stem(latest) if latest else '?'}) and not in the frozen "
            f"orthogonal allowlist: {sneaked}. Add a NEW later migration file "
            "(input {} or the fields you transform; NewActor = the new fields) and "
            f"bump mops.toml check-limit. Do not edit {FROZEN_THROUGH} or earlier. "
            "Do not append to orthogonal-stables.txt."
        )
    if deleted:
        errors.append(
            f"orthogonal stables removed from main.mo without a consuming migration: {deleted}. "
            "Dropping a stable requires a later migration that lists it as input only."
        )

    missing_on_main = sorted(latest_set - main_set)
    if missing_on_main:
        errors.append(
            f"latest NewActor fields missing from main.mo: {missing_on_main}"
        )

    # The GameKey maps were the field set that broke PR #258 (stuffed into the
    # applied 20260831) and PR #311 (kept there → M0263). They must live on a
    # file that sorts after the deployed 20260831 tail.
    gamekey = {"gameKeyRequests", "gameKeyLedger", "gameKeyReveals", "lastGameKeyRequestAt", "nextGameKeyRequestId"}
    for p in files:
        if stem(p) <= "20260831_000000" and gamekey & set(new_by_stem.get(stem(p), [])):
            errors.append(
                f"{p.name} NewActor carries GameKey fields. The 2026-08-31 deployed tail "
                "has none; they must be introduced by a later chain file (20260901_000000)."
            )
    if not any(gamekey <= set(new_by_stem.get(stem(p), [])) for p in files if stem(p) > "20260831_000000"):
        errors.append(
            "no chain file after 20260831_000000 introduces the GameKey stables; the "
            "deployed Aug-31 tail lacks them (runtime: not found in persisted state)."
        )

    check_baseline(OLD_BASELINE, chain_stems, errors, label="check-stable baseline")
    for name in REQUIRED_DEPLOYED_SNAPSHOTS:
        check_baseline(DEPLOYED / name, chain_stems, errors, label="deployed snapshot")
    deployed_files = sorted(DEPLOYED.glob("*.most")) if DEPLOYED.is_dir() else []
    for p in deployed_files:
        if p.name not in REQUIRED_DEPLOYED_SNAPSHOTS:
            check_baseline(p, chain_stems, errors, label="deployed snapshot")
    if not EMPTY_SNAPSHOT.is_file():
        errors.append(f"missing {EMPTY_SNAPSHOT} (fresh-import check-stable baseline)")

    # Runtime-rule upgrade verdicts (stricter than mops check-stable).
    verdict_inputs = (files, old_by_stem, new_by_stem, main_fields)
    if OLD_BASELINE.is_file():
        old_content = OLD_BASELINE.read_text(encoding="utf-8")
        for reason in upgrade_verdict(old_content, *verdict_inputs):
            errors.append(f"check-stable baseline {OLD_BASELINE.relative_to(ROOT)}: {reason}")
        bodies = {signature_body(p.read_text(encoding="utf-8")): p.name for p in deployed_files}
        if bodies and signature_body(old_content) not in bodies:
            errors.append(
                f"{OLD_BASELINE.relative_to(ROOT)} does not match any snapshots/deployed/*.most "
                "(ignoring `//` header lines). The baseline must be the byte-identical `.most` "
                "of a build Caffeine deployed, recorded under snapshots/deployed/ — not a hand-written one."
            )
    for p in deployed_files:
        for reason in upgrade_verdict(p.read_text(encoding="utf-8"), *verdict_inputs):
            errors.append(f"deployed snapshot {p.name}: {reason}")
    if EMPTY_SNAPSHOT.is_file():
        for reason in upgrade_verdict(EMPTY_SNAPSHOT.read_text(encoding="utf-8"), *verdict_inputs):
            errors.append(f"{EMPTY_SNAPSHOT.name}: {reason}")
    unsupported_files = sorted(UNSUPPORTED.glob("*.most")) if UNSUPPORTED.is_dir() else []
    for p in unsupported_files:
        if not upgrade_verdict(p.read_text(encoding="utf-8"), *verdict_inputs):
            errors.append(
                f"unsupported snapshot {p.name} is now upgradable by the chain; move it to "
                "snapshots/deployed/ and update snapshots/README.md (or the chain regressed "
                "towards a shape no canister holds)."
            )

    _print(errors)
    return 1 if errors else 0


def _print(errors: list[str]) -> None:
    if errors:
        print("check-eop-stables: FAILED", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        return
    print("check-eop-stables: clean")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--write-manifests",
        action="store_true",
        help="rewrite orthogonal-stables.txt and frozen-newactor-fields.json from current sources (bootstrap only)",
    )
    parser.add_argument(
        "--verdict",
        metavar="MOST",
        help="print why the current chain can or cannot upgrade the given .most signature (runtime rule) and exit",
    )
    args = parser.parse_args()
    if args.write_manifests:
        write_manifests()
        return 0
    if args.verdict:
        files = chain_files()
        new_by_stem = {stem(p): extract_new_actor_fields(p.read_text(encoding="utf-8")) for p in files}
        old_by_stem = {stem(p): extract_old_actor_fields(p.read_text(encoding="utf-8")) for p in files}
        main_fields = extract_main_stables(MAIN.read_text(encoding="utf-8"))
        reasons = upgrade_verdict(Path(args.verdict).read_text(encoding="utf-8"), files, old_by_stem, new_by_stem, main_fields)
        if reasons:
            print(f"NOT upgradable: {args.verdict}")
            for r in reasons:
                print(f"  {r}")
            return 1
        print(f"upgradable: {args.verdict}")
        return 0
    return check()


if __name__ == "__main__":
    sys.exit(main())
