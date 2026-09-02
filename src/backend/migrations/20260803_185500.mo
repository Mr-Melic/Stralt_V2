module {

  // Name-only step. The original Caffeine canister (cwofb-yqaaa-aaaap-qp45q-cai)
  // recorded `20260803_185500` as its first migration (Caffeine builds #347 and
  // #348, 2026-08-03); build #354 replaced that file with 20260827_000000.
  //
  // moc's enhanced-migration loader looks up the *latest applied* migration
  // name on the canister in this chain and loads the state as the chain type at
  // that position. A name that is missing from the chain falls back to the
  // genesis input `{}`, which traps on any populated canister with
  // `RTS error: Memory-incompatible program upgrade`. Keeping this name in the
  // chain lets a canister still at #347/#348 resume with 20260827 → 20260831.
  //
  // The chain state here must equal the 37-field legacy shape produced by
  // 20260801_000000 (= 20260827_000000 OldActor), which this no-op preserves.
  // Do not add fields here.

  public func migration(_ : {}) : {} {
    {};
  };
};
