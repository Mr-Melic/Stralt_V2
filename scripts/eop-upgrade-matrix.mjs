#!/usr/bin/env node
// Runtime proof that the current backend upgrades from every reconstructed
// deployed shape. Static `mops check-stable` has false negatives: when the
// previous version is already at the head of the new chain, moc marks no field
// as required, so it passed 2026-08-31 -> PR #258 which trapped with "stable
// variable … not found in persisted state". This installs real wasms on
// PocketIC and performs the upgrades. The built wasm never depends on
// `.old/…/backend.most` (identical md5 with a blank, wrong or real baseline).
//
// Requirements (local only; not part of CI):
//   - ic-mops on PATH with the toolchain from mops.toml (moc 1.11.2)
//   - a PocketIC server binary: $POCKET_IC_BIN, or ~/.cache/mops/pocket-ic/*/pocket-ic
//     (`mops toolchain use pocket-ic 15.0.0` downloads one; it rewrites
//     mops.toml, so `git checkout -- mops.toml` afterwards)
//   - pnpm install at the repo root (@dfinity/pic)
//
// Usage:
//   node scripts/eop-upgrade-matrix.mjs                # all paths in upgrade-paths.json
//   node scripts/eop-upgrade-matrix.mjs --only zh6cg   # paths whose name contains "zh6cg"
//   node scripts/eop-upgrade-matrix.mjs --keep         # keep built wasms under .mops/.eop-matrix
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK = join(ROOT, ".mops", ".eop-matrix");
const PATHS = JSON.parse(readFileSync(join(ROOT, "src/backend/migrations/snapshots/upgrade-paths.json"), "utf8")).paths;

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const keep = args.includes("--keep");

const require = createRequire(join(ROOT, "package.json"));
const { PocketIc, PocketIcServer, createIdentity } = require("@dfinity/pic");
let IDL = null;
try {
  IDL = createRequire(require.resolve("@dfinity/pic"))("@dfinity/candid").IDL;
} catch {
  console.warn("note: @dfinity/candid not resolvable; skipping the user-profile data probe");
}

function findPocketIc() {
  if (process.env.POCKET_IC_BIN && existsSync(process.env.POCKET_IC_BIN)) return process.env.POCKET_IC_BIN;
  const base = join(process.env.HOME ?? "", ".cache", "mops", "pocket-ic");
  if (existsSync(base)) {
    const versions = readdirSync(base).sort().reverse();
    for (const v of versions) {
      const bin = join(base, v, "pocket-ic");
      if (existsSync(bin)) return bin;
    }
  }
  console.error("PocketIC server not found. Set POCKET_IC_BIN or run: mops toolchain use pocket-ic 15.0.0 (then git checkout -- mops.toml)");
  process.exit(2);
}

function mocPath() {
  return execFileSync("mops", ["toolchain", "bin", "moc"], { cwd: ROOT, encoding: "utf8" }).trim();
}

function buildEmptyActor() {
  const dir = join(WORK, "empty");
  mkdirSync(dir, { recursive: true });
  const src = join(dir, "empty.mo");
  writeFileSync(src, "persistent actor { };\n");
  const wasm = join(dir, "backend.wasm");
  execFileSync(mocPath(), ["-c", "--release", "-o", wasm, src], { stdio: "pipe" });
  return wasm;
}

// `mops build` exits non-zero when its PocketIC check-deploy step cannot run,
// but the wasm/.most are already written by then; accept the artifacts.
function mopsBuild(cwd) {
  const r = spawnSync("mops", ["build"], { cwd, encoding: "utf8" });
  const wasm = join(cwd, "src/backend/dist/backend.wasm");
  const most = join(cwd, "src/backend/dist/backend.most");
  if (!existsSync(wasm) || !existsSync(most)) {
    throw new Error(`mops build produced no artifacts in ${cwd}\n${r.stdout}\n${r.stderr}`);
  }
  return { wasm, most };
}

function buildCommit(commit) {
  const sha = execFileSync("git", ["rev-parse", "--short", commit], { cwd: ROOT, encoding: "utf8" }).trim();
  const out = join(WORK, sha);
  const wasm = join(out, "backend.wasm");
  if (existsSync(wasm)) return wasm;
  const wt = join(WORK, `wt-${sha}`);
  if (!existsSync(wt)) {
    execFileSync("git", ["worktree", "add", "--detach", wt, sha], { cwd: ROOT, stdio: "pipe" });
  }
  if (!existsSync(join(wt, ".mops"))) symlinkSync(join(ROOT, ".mops"), join(wt, ".mops"));
  mkdirSync(join(wt, "src/backend/dist"), { recursive: true });
  const built = mopsBuild(wt);
  mkdirSync(out, { recursive: true });
  writeFileSync(wasm, readFileSync(built.wasm));
  writeFileSync(join(out, "backend.most"), readFileSync(built.most));
  execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: ROOT, stdio: "pipe" });
  return wasm;
}

function buildCurrent() {
  const built = mopsBuild(ROOT);
  const out = join(WORK, "current");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "backend.wasm"), readFileSync(built.wasm));
  return join(out, "backend.wasm");
}

const upgradeModeOptions = { skip_pre_upgrade: [], wasm_memory_persistence: [{ keep: null }] };
const Profile = IDL ? IDL.Record({ name: IDL.Text, uiLayout: IDL.Text }) : null;
const probeProfile = { name: "eop-probe", uiLayout: '{"hud":{"x":1}}' };

async function runPath(pic, path, wasmOf, currentWasm) {
  const canisterId = await pic.createCanister();
  const identity = createIdentity("eop-upgrade-matrix");
  const sender = identity.getPrincipal();
  const steps = [...path.commits.map(wasmOf), currentWasm];
  await pic.installCode({ canisterId, wasm: readFileSync(steps[0]) });
  let probed = false;
  if (Profile && path.commits[0] !== "empty") {
    try {
      await pic.updateCall({ canisterId, sender, method: "saveCallerUserProfile", arg: IDL.encode([Profile], [probeProfile]) });
      probed = true;
    } catch {
      probed = false;
    }
  }
  for (const w of steps.slice(1)) {
    await pic.advanceTime(15 * 60 * 1000); // install_code rate limit
    await pic.tick(5);
    await pic.upgradeCanister({ canisterId, wasm: readFileSync(w), upgradeModeOptions });
  }
  if (probed) {
    const res = await pic.queryCall({ canisterId, sender, method: "getCallerUserProfile", arg: IDL.encode([], []) });
    const [decoded] = IDL.decode([IDL.Opt(Profile)], res);
    if (!(decoded.length === 1 && decoded[0].name === probeProfile.name && decoded[0].uiLayout === probeProfile.uiLayout)) {
      throw new Error(`user profile lost across upgrade: ${JSON.stringify(decoded)}`);
    }
    return "ok (profile preserved)";
  }
  return "ok";
}

async function main() {
  process.env.POCKET_IC_BIN = findPocketIc();
  mkdirSync(WORK, { recursive: true });
  writeFileSync(join(WORK, ".gitignore"), "*\n");
  const selected = PATHS.filter((p) => !only || p.name.includes(only));
  if (selected.length === 0) {
    console.error(`no path matches --only ${only}`);
    process.exit(2);
  }
  const cache = new Map();
  const wasmOf = (c) => {
    if (!cache.has(c)) {
      process.stdout.write(`building ${c} ... `);
      cache.set(c, c === "empty" ? buildEmptyActor() : buildCommit(c));
      console.log("done");
    }
    return cache.get(c);
  };
  process.stdout.write("building current working tree ... ");
  const currentWasm = buildCurrent();
  console.log("done");
  for (const p of selected) for (const c of p.commits) wasmOf(c);

  const server = await PocketIcServer.start({ showRuntimeLogs: false, showCanisterLogs: false });
  const pic = await PocketIc.create(server.getUrl());
  let failures = 0;
  try {
    for (const p of selected) {
      let outcome;
      try {
        outcome = await runPath(pic, p, wasmOf, currentWasm);
      } catch (e) {
        outcome = `FAIL: ${String(e?.message ?? e).split("\n")[0].slice(0, 220)}`;
      }
      const passed = p.expect === "fail" ? outcome.startsWith("FAIL") : !outcome.startsWith("FAIL");
      if (!passed) failures++;
      console.log(`${passed ? "PASS" : "UNEXPECTED"} [${p.expect}] ${p.name}\n      ${outcome}`);
    }
  } finally {
    await pic.tearDown();
    await server.stop();
    if (!keep) rmSync(WORK, { recursive: true, force: true });
  }
  if (failures > 0) {
    console.error(`${failures} path(s) did not match their expectation`);
    process.exit(1);
  }
  console.log("eop-upgrade-matrix: all paths match expectations");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
