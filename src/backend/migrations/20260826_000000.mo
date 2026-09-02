module {

  // Name-only step. Stralt_V2's first Caffeine deploy (commit 9bf8368,
  // canister ozvtz-4aaaa-aaaai-av4yq-cai) used genesis file
  // `20260826_000000` — the same name as the 2026-08-31 import chain on
  // the parent project. Syncing stralt's later EOP rename (20260826 →
  // 20260801, to skip this step on cwofb's 20260803 tail) deleted the
  // name. moc then found no match for a canister that still records it,
  // fell back to the genesis input `{}`, and trapped
  // `RTS error: Memory-incompatible program upgrade` (IC0503).
  //
  // Keep the name. `{}` → `{}` adds nothing; carried orthogonal state from
  // 20260801 (or from the original 20260826 genesis output) stays. Do not
  // put GameKey here — that stays on 20260901 after the frozen 20260831 tail.

  public func migration(_ : {}) : {} {
    {};
  };
};
