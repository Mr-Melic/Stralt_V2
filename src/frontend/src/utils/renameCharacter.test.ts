import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySpendToCommitted,
  createProgressPersist,
  spendFromUiBalance,
} from "./progressPersist.ts";
import {
  RENAME_DOKA_COST,
  committedDokaAfterRename,
  liveDokaAfterRename,
  readRenameCharacterResult,
  shouldCommitRenameDokaSpend,
  shouldDebitRenameDoka,
  shouldStartRename,
} from "./renameCharacter.ts";

describe("shouldStartRename", () => {
  it("blocks a second click while the first rename is in flight", () => {
    assert.equal(shouldStartRename(false, 200), true);
    assert.equal(shouldStartRename(true, 200), false);
    assert.equal(shouldStartRename(false, 99), false);
  });
});

describe("readRenameCharacterResult", () => {
  it("accepts ok / _ok / __kind__ payloads", () => {
    assert.deepEqual(readRenameCharacterResult({ __kind__: "ok", ok: null }), {
      ok: true,
    });
    assert.deepEqual(readRenameCharacterResult({ ok: null }), { ok: true });
    assert.deepEqual(readRenameCharacterResult({ _ok: null }), { ok: true });
  });

  it("rejects canister errors so the UI cannot debit", () => {
    const taken = readRenameCharacterResult({
      __kind__: "err",
      err: "Name already in use",
    });
    assert.deepEqual(taken, { err: "Name already in use" });
    assert.equal(shouldDebitRenameDoka(taken), false);

    const short = readRenameCharacterResult({
      err: "Not enough Doka. Need 100, have 40",
    });
    assert.equal(shouldDebitRenameDoka(short), false);
    assert.equal(readRenameCharacterResult(undefined).err != null, true);
  });

  it("does not treat a rejected rename as a persist spend", () => {
    const parsed = readRenameCharacterResult({
      __kind__: "err",
      err: "Name already in use",
    });
    assert.equal(shouldDebitRenameDoka(parsed), false);

    const lock = createProgressPersist({ doka: 200, xp: 0, level: 1 });
    // Correct path: leave the live wallet alone so idle hydrate keeps 200.
    assert.equal(lock.hydrateWhenIdle({ doka: 200, xp: 0, level: 1 }), true);
    const healWrite = applySpendToCommitted(
      lock.snapshot().doka,
      spendFromUiBalance(200, 170),
    );
    assert.equal(healWrite, 170);
  });

  it("does not let an err-path UI debit cut a seeded wallet via idle hydrate", () => {
    const lock = createProgressPersist({ doka: 200, xp: 0, level: 1 });
    // Handler deducted UI to 100 on #err. Idle hydrate must keep 200 so a
    // later heal spends from the live canister, not a phantom rename.
    lock.hydrateWhenIdle({
      doka: 200 - RENAME_DOKA_COST,
      xp: 0,
      level: 1,
    });
    const healWrite = applySpendToCommitted(
      lock.snapshot().doka,
      spendFromUiBalance(100, 70),
    );
    assert.equal(lock.snapshot().doka, 200);
    assert.equal(healWrite, 170);
  });
});

describe("liveDokaAfterRename / committedDokaAfterRename", () => {
  it("does not let a stale click-time rename debit cut a credited wallet", () => {
    const lock = createProgressPersist({ doka: 200, xp: 0, level: 1 });
    // Victory persist landed while rename was awaiting the canister.
    lock.commit({ doka: 250 });
    const clickTimeDoka = 200;
    lock.hydrateWhenIdle({
      doka: clickTimeDoka - RENAME_DOKA_COST,
      xp: 0,
      level: 1,
    });
    // Idle hydrate must keep the credited 250. The handler still has to
    // debit the live ref + lock on #ok; this only blocks the stale UI cut.
    assert.equal(lock.snapshot().doka, 250);
    const healWrite = applySpendToCommitted(
      lock.snapshot().doka,
      spendFromUiBalance(100, 70),
    );
    assert.equal(healWrite, 220);
  });

  it("keeps the credited wallet when #ok spends from the live ref and lock", () => {
    const lock = createProgressPersist({ doka: 200, xp: 0, level: 1 });
    lock.commit({ doka: 250 });
    const live = 250;
    lock.commit({ doka: committedDokaAfterRename(lock.snapshot().doka) });
    const ui = liveDokaAfterRename(live);
    assert.equal(lock.snapshot().doka, 150);
    assert.equal(ui, 150);
    assert.equal(lock.hydrateWhenIdle({ doka: ui, xp: 0, level: 1 }), true);
    const healWrite = applySpendToCommitted(
      lock.snapshot().doka,
      spendFromUiBalance(ui, ui - 30),
    );
    assert.equal(healWrite, 120);
  });

  it("does not persist a rename spend from an unseeded placeholder 0", () => {
    assert.equal(shouldCommitRenameDokaSpend(true), true);
    assert.equal(shouldCommitRenameDokaSpend(false), false);

    const lock = createProgressPersist({ doka: 0, xp: 0, level: 1 });
    assert.equal(lock.isWalletSeeded(), false);
    const parsed = readRenameCharacterResult({ __kind__: "ok", ok: null });
    if (
      shouldDebitRenameDoka(parsed) &&
      shouldCommitRenameDokaSpend(lock.isWalletSeeded())
    ) {
      lock.commit({ doka: committedDokaAfterRename(lock.snapshot().doka) });
    }
    assert.equal(lock.isWalletSeeded(), false);
    assert.equal(lock.snapshot().doka, 0);
  });
});
