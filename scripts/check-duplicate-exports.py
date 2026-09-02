#!/usr/bin/env python3
"""Fail on restack-union duplicate export implementations in one TS/JS file.

Caffeine GitHub → import runs frontend `pnpm build` (esbuild). Two
`export function foo` copies in the same module fail with:

  Multiple exports with the same name "…"
  The symbol "…" has already been declared

`tsc` (TS2393) and Biome `noRedeclare` also catch this, but a sequential
open-PR restack can concatenate two full implementations. Stack-compat
"union overlapping files" means keep one implementation, not paste both.

Overload *signatures* (`export function foo(…): T;`) plus a single body
are allowed (see `targeting.ts` `hasBresenhamLoS`).
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

EXPORT_START = re.compile(
    r"^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+"
    r"([A-Za-z_$][\w]*)"
)
DEFAULT_FN = re.compile(
    r"^export\s+default\s+(?:async\s+)?function\s+([A-Za-z_$][\w]*)"
)


def _kind_and_name(line: str) -> tuple[str, str] | None:
    stripped = line.lstrip()
    m = EXPORT_START.match(stripped)
    if m:
        if re.match(r"^export\s+(?:async\s+)?function\b", stripped):
            return ("function", m.group(1))
        if re.match(r"^export\s+class\b", stripped):
            return ("class", m.group(1))
        if re.match(r"^export\s+const\b", stripped):
            return ("const", m.group(1))
        if re.match(r"^export\s+let\b", stripped):
            return ("let", m.group(1))
        if re.match(r"^export\s+var\b", stripped):
            return ("var", m.group(1))
    m = DEFAULT_FN.match(stripped)
    if m:
        return ("function", m.group(1))
    return None


def _signature_terminator(src: str, start: int) -> str | None:
    """Return '{' (implementation) or ';' (overload) after a balanced signature."""
    i = start
    depth = 0
    n = len(src)
    while i < n:
        ch = src[i]
        if ch == "(":
            depth += 1
        elif ch == ")":
            if depth:
                depth -= 1
        elif ch in "{;" and depth == 0:
            return ch
        i += 1
    return None


def implementations_in(src: str) -> dict[tuple[str, str], list[int]]:
    """Map (kind, name) → 1-based line numbers of implementations (not overloads)."""
    found: dict[tuple[str, str], list[int]] = defaultdict(list)
    lines = src.splitlines()
    i = 0
    offset = 0
    while i < len(lines):
        line = lines[i]
        parsed = _kind_and_name(line)
        if parsed is None:
            offset += len(line) + 1
            i += 1
            continue
        kind, name = parsed
        line_no = i + 1
        # Find this line in src at offset (handles the export keyword start).
        stripped = line.lstrip()
        local = src.find(stripped, offset)
        if local < 0:
            local = offset
        term = _signature_terminator(src, local)
        if kind == "function":
            if term == "{":
                found[(kind, name)].append(line_no)
            # ';' → overload signature; skip
        else:
            # const/let/var/class: any export is an implementation.
            found[(kind, name)].append(line_no)
        offset += len(line) + 1
        i += 1
    return found


def scan_file(path: Path) -> list[str]:
    try:
        src = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        return [f"{path}: cannot read: {exc}"]
    impl = implementations_in(src)
    errors: list[str] = []
    for (kind, name), lines in sorted(impl.items()):
        if len(lines) < 2:
            continue
        loc = ", ".join(f"L{n}" for n in lines)
        errors.append(
            f"{path}: duplicate export {kind} {name} ({loc}). "
            "Keep one implementation; restack union is not concatenate."
        )
    return errors


def scan_tree(root: Path) -> list[str]:
    errors: list[str] = []
    skip_parts = {"node_modules", "dist", "build", "declarations"}
    for dirpath, dirnames, files in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip_parts]
        for name in files:
            if not name.endswith((".ts", ".tsx", ".js", ".jsx", ".mts", ".cts")):
                continue
            if name.endswith(".d.ts"):
                continue
            errors.extend(scan_file(Path(dirpath) / name))
    return errors


def self_test() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="dup-export-"))
    try:
        bad = tmp / "bad.ts"
        bad.write_text(
            "export function shouldFloatWorldUnreachable(): boolean { return true; }\n"
            "export function shouldFloatWorldUnreachable(): boolean { return true; }\n",
            encoding="utf-8",
        )
        good_overloads = tmp / "overloads.ts"
        good_overloads.write_text(
            "export function hasBresenhamLoS(a: number): boolean;\n"
            "export function hasBresenhamLoS(a: number, b: number): boolean;\n"
            "export function hasBresenhamLoS(a: number, b?: number): boolean { return true; }\n",
            encoding="utf-8",
        )
        ok_unique = tmp / "unique.ts"
        ok_unique.write_text(
            "export function alpha(): void {}\nexport function beta(): void {}\n",
            encoding="utf-8",
        )
        bad_hits = scan_file(bad)
        if not bad_hits or "shouldFloatWorldUnreachable" not in bad_hits[0]:
            print("self-test FAIL: expected duplicate function to be reported", file=sys.stderr)
            print(bad_hits, file=sys.stderr)
            return 1
        if scan_file(good_overloads):
            print("self-test FAIL: overload signatures + one body must pass", file=sys.stderr)
            print(scan_file(good_overloads), file=sys.stderr)
            return 1
        if scan_file(ok_unique):
            print("self-test FAIL: unique exports must pass", file=sys.stderr)
            return 1
        print("check-duplicate-exports: self-test passed")
        return 0
    finally:
        for p in tmp.glob("*"):
            p.unlink()
        tmp.rmdir()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "root",
        nargs="?",
        default="src/frontend/src",
        help="directory to scan (default: src/frontend/src)",
    )
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    root = Path(args.root)
    if not root.is_dir():
        print(f"check-duplicate-exports: not a directory: {root}", file=sys.stderr)
        return 1
    errors = scan_tree(root)
    if errors:
        print("check-duplicate-exports: FAILED", file=sys.stderr)
        for err in errors:
            print(err, file=sys.stderr)
        return 1
    print(f"check-duplicate-exports: clean ({root})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
