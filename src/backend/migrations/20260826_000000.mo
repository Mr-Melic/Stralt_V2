module {

  // Name-only step. Stralt_V2's first Caffeine source export (commit 9bf8368)
  // used genesis file `20260826_000000`. Keep the name so a canister that
  // actually recorded it still matches. `{}` → `{}` adds nothing.
  //
  // If ozvtz-4aaaa-aaaai-av4yq-cai never recorded any EM name (fork / #340
  // Version 1.0.0), this file is never the match: 20260801's optional
  // 37-field OldActor is type_0 and adopts that heap. Do not put GameKey here.

  public func migration(_ : {}) : {} {
    {};
  };
};
