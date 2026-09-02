import type { CharacterStatFields } from "../types/gameTypes.ts";

/**
 * Default 12-field CharacterStats written on champion create.
 * Display-only on the forge — players cannot edit these here.
 */
export function startingChampionStats(): CharacterStatFields {
  return {
    hp: BigInt(100),
    ap: BigInt(10),
    mp: BigInt(5),
    atk: BigInt(15),
    res: BigInt(10),
    evasion: BigInt(5),
    init: BigInt(10),
    sp: BigInt(8),
    sr: BigInt(5),
    resilience: BigInt(8),
    chc: BigInt(5),
    killCount: BigInt(0),
  };
}

export type ChampionForgeVitals = {
  hp: number;
  ap: number;
  mp: number;
  init: number;
};

function natOr(value: bigint | number | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** HP / AP / MP / INIT shown on the forge. Create uses defaults; edit uses saved stats. */
export function championForgeVitalsFromStats(
  stats: Partial<CharacterStatFields> | undefined,
): ChampionForgeVitals {
  const defaults = startingChampionStats();
  return {
    hp: natOr(stats?.hp, Number(defaults.hp)),
    ap: natOr(stats?.ap, Number(defaults.ap)),
    mp: natOr(stats?.mp, Number(defaults.mp)),
    init: natOr(stats?.init, Number(defaults.init)),
  };
}
