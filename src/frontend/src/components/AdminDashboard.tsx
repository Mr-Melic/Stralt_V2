import { Principal } from "@dfinity/principal";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { backendInterface } from "../backend";
import { listAdminModifierTypeOptions } from "../engine/mapModifiers";
import { useActor } from "../hooks/useActor";
import {
  useAdminAddEnemyName,
  useAdminDeleteAchievementConfig,
  useAdminDeleteEnemyConfig,
  useAdminDeleteEnemyName,
  useAdminDeleteMapModifier,
  useAdminDeletePlayerSpriteConfig,
  useAdminDeleteRegionConfig,
  useAdminDeleteSpellConfig,
  useAdminSetAchievementConfig,
  useAdminSetEnemyConfig,
  useAdminSetGameConfig,
  useAdminSetMapModifier,
  useAdminSetPlayerSpriteConfig,
  useAdminSetRegionConfig,
  useAdminSetSpellConfig,
  useAssignUserRole,
  useDeleteBossConfig,
  useGetAchievementConfigs,
  useGetAllBossConfigs,
  useGetEnemyConfigs,
  useGetEnemyNames,
  useGetGameConfig,
  useGetMapModifiers,
  useGetPlayerSpriteConfigs,
  useGetRegionConfigs,
  useGetSpellConfigs,
  useInitDefaultNames,
  useSetBossConfig,
} from "../hooks/useQueries";
import { DEFAULT_BOSS_CONFIGS } from "../types/bossDefaults";
import type { BossConfig, BossPhaseConfig } from "../types/bossTypes";
import { BOSS_IDS, BossAbility } from "../types/bossTypes";
import type { ChessPieceType } from "../types/gameTypes";
import type { AchievementConfig } from "../types/gameTypes";
import type {
  AdminDashboardState,
  AdminGameConfig,
  BattleEffect,
  EnemyConfig,
  MapModifierConfig,
  PlayerSpriteConfig,
  RegionConfig,
  SpellConfig,
  TierSpawnConfig,
} from "../types/gameTypes";
import {
  assertAdminCmdOk,
  readPrincipalListResult,
  toBackendLevelUpConfig,
} from "../utils/adminContract";
import {
  KNOWN_ACHIEVEMENT_CONDITIONS,
  MAX_DOKA_GRANT,
  unsafeUrl,
  validateAchievementConfig,
  validateAdBox,
  validateDokaGrant,
  validateGameConfig,
  validateLevelUpConfig,
  validateOptionalUrl,
  validateSpellConfig,
  validateTierSpawnConfig,
  validateWalkFrameUrls,
} from "../utils/adminSafety";
import {
  ENEMY_SPRITE_URL_FIELD_LABEL,
  ENEMY_SPRITE_URL_HELP,
  ENEMY_SPRITE_URL_PLACEHOLDER,
  PLAYER_SPRITE_URL_HONESTY,
  enemyVisualStatusCopy,
  spriteUrlIsStored,
} from "../utils/adminVisualStatus";
import { logDebugWarn } from "../utils/debugLogger";
import AdminGameKeyPurchases from "./AdminGameKeyPurchases";

// ── defaults ─────────────────────────────────────────────────────────────────

const newSpell = (): SpellConfig => ({
  id: `spell_${Date.now()}`,
  name: "",
  description: "",
  iconEmoji: "\u26A1",
  apCost: BigInt(3),
  mpCost: BigInt(0),
  damage: BigInt(20),
  effectType: "damage",
  range: BigInt(3),
  spellType: "damage",
  healAmount: 0,
  isPhysical: false,
  usableByPlayer: true,
  usableByEnemy: true,
  minLevel: 1,
  effectCategory: "damage",
  effectParams: null,
  modifiableRange: true,
  lineOfSight: true,
  linear: false,
  diagonal: false,
  freeCells: false,
  aoe: false,
  hitTiles: [],
  hitsMultiple: false,
  cooldown: 0,
  minRange: 1,
  maxRange: 3,
  multiTarget: false,
  hitsAllies: false,
  buffStat: undefined,
  buffModifier: undefined,
  buffDuration: undefined,
  debuffStat: undefined,
  debuffModifier: undefined,
  debuffDuration: undefined,
  dotDamage: undefined,
  dotDuration: undefined,
  isSwap: false,
  isMirror: false,
  isTimestep: false,
  isSacrifice: false,
  isBarrier: false,
  isTrap: false,
  isMark: false,
  isSummon: false,
  summonAI: "",
  summonLifespan: 0,
  summonUnitDef: { pieceType: "", level: 0, hpScale: 0, damageScale: 0 },
});

/** Eligibility band only — not a player career cap. */
const DEFAULT_ELIGIBILITY_LEVEL_MAX = BigInt(9999);

const newEnemy = (): EnemyConfig => ({
  id: `enemy_${Date.now()}`,
  name: "",
  hp: BigInt(50),
  ap: BigInt(6),
  mp: BigInt(3),
  initStat: BigInt(8),
  levelMin: BigInt(1),
  levelMax: DEFAULT_ELIGIBILITY_LEVEL_MAX,
  regions: [],
  spriteUrl: [],
});

const newRegion = (): RegionConfig => ({
  id: `region_${Date.now()}`,
  name: "",
  levelMin: BigInt(1),
  levelMax: DEFAULT_ELIGIBILITY_LEVEL_MAX,
  battleEffects: [],
  backgroundColor: "#0d0f1a",
});

const newSprite = (): PlayerSpriteConfig => ({
  id: `sprite_${Date.now()}`,
  name: "",
  characterPieceType: "pawn",
  frontUrl: [],
  rightUrl: [],
  leftUrl: [],
  backUrl: [],
  walkFramesFront: [],
  walkFramesRight: [],
  walkFramesLeft: [],
  walkFramesBack: [],
});

const newBattleEffect = (): BattleEffect => ({
  id: `fx_${Date.now()}`,
  name: "",
  description: "",
  effectType: { damage: null },
  value: BigInt(0),
});

// ── design tokens ────────────────────────────────────────────────────────────

const C = {
  bg0: "#13161f",
  bg1: "#1d2230",
  bg2: "#1a1e2b",
  bg3: "#242a3a",
  gold: "#f0c44a",
  goldBright: "#ffe89a",
  goldDim: "#5c4a1f",
  red: "#d8463f",
  blue: "#86c4ff",
  green: "#56d18a",
  silver: "#b8b0c8",
  dim: "#8a8090",
  dimmer: "#5a5060",
} as const;

function matchesQuery(q: string, ...parts: Array<string | undefined>): boolean {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  return parts.some((p) => (p ?? "").toLowerCase().includes(n));
}

// ── shared primitives ─────────────────────────────────────────────────────────

const inputStyle = (err?: boolean): React.CSSProperties => ({
  width: "100%",
  background: "linear-gradient(180deg,#13141c,#0e0f16)",
  border: `1px solid ${err ? "#c0392b" : "rgba(192,57,43,0.27)"}`,
  borderRadius: 8,
  color: "#c0ccd8",
  padding: "7px 10px",
  fontSize: 12,
  outline: "none",
  transition: "box-shadow 0.15s",
  fontFamily: "'Saira', system-ui, sans-serif",
  boxShadow:
    "inset 0 1px 3px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04)",
});

const labelStyle: React.CSSProperties = {
  color: "#d8463f",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 4,
  display: "block",
  fontFamily: "'Saira', system-ui, sans-serif",
};

const sectionHeadStyle: React.CSSProperties = {
  color: "#d8463f",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  marginBottom: 10,
  paddingBottom: 5,
  borderBottom: "1px solid rgba(216,70,63,0.25)",
  fontFamily: "'Saira', system-ui, sans-serif",
};

const ELIGIBILITY_BAND_HINT =
  "Level Min/Max is an eligibility band, not a player career cap. New drafts default max to 9999 so high-level play still matches.";

function CatalogNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      data-ocid="admin.catalog_note"
      style={{
        color: C.dim,
        fontSize: 11,
        lineHeight: 1.5,
        margin: "0 0 14px",
        padding: "8px 10px",
        border: `1px solid ${C.goldDim}`,
        borderRadius: 6,
        background: "linear-gradient(180deg,#13141c,#0e0f16)",
      }}
    >
      {children}
    </p>
  );
}

function ListSearch({
  value,
  onChange,
  placeholder,
  ocid,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ocid: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-ocid={ocid}
      style={{ ...inputStyle(), maxWidth: 260, margin: 0 }}
    />
  );
}

function Btn({
  variant,
  children,
  onClick,
  ocid,
  small,
  type = "button",
  disabled,
}: {
  variant: "gold" | "red" | "ghost" | "blue";
  children: React.ReactNode;
  onClick?: () => void;
  ocid?: string;
  small?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 border-none cursor-pointer transition-all duration-150 ease-in-out font-bold uppercase tracking-wider";
  const size = small
    ? "px-2.5 py-1 text-[10px] rounded-lg"
    : "px-4 py-1.5 text-[11px] rounded-xl";
  const cls =
    variant === "gold" || variant === "red"
      ? `${base} ${size} stone-btn-crimson`
      : variant === "blue"
        ? `${base} ${size} stone-btn-slate text-[#86c4ff]`
        : `${base} ${size} bg-transparent text-[#5a6a7a] border border-[rgba(192,57,43,0.27)] hover:text-[#cdbfd2]`;
  return (
    <button
      type={type}
      onClick={onClick}
      data-ocid={ocid}
      className={cls}
      disabled={disabled}
      style={disabled ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
    >
      {children}
    </button>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel = "Delete",
  ocidPrefix,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  ocidPrefix: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      data-ocid={`${ocidPrefix}.dialog`}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,6,14,0.85)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "linear-gradient(180deg,#13141c,#0e0f16)",
          border: `1px solid ${C.red}`,
          borderRadius: 10,
          padding: "28px 32px",
          minWidth: 320,
          maxWidth: 420,
          boxShadow: "0 0 40px rgba(192,57,43,0.25)",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, textAlign: "center", marginBottom: 12 }}>
          ⚠️
        </div>
        <h3
          style={{
            color: "#f0c44a",
            textAlign: "center",
            margin: "0 0 10px",
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            color: "#8a8090",
            fontSize: 12,
            textAlign: "center",
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          {body}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn
            variant="ghost"
            onClick={onCancel}
            ocid={`${ocidPrefix}.cancel_button`}
          >
            Cancel
          </Btn>
          <Btn
            variant="red"
            onClick={onConfirm}
            ocid={`${ocidPrefix}.confirm_button`}
          >
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  ocid,
  err,
  disabled,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  ocid?: string;
  err?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  const id = ocid ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="mb-2.5">
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-ocid={ocid}
        disabled={disabled}
        className="stone-inset w-full px-2.5 py-1.5 text-xs text-[#c0ccd8] font-['Saira',system-ui,sans-serif]"
        style={{
          border: `1px solid ${err ? "#c0392b" : "transparent"}`,
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? "not-allowed" : undefined,
        }}
      />
      {hint && (
        <p style={{ color: "#6a6070", fontSize: 10, margin: "3px 0 0" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  onChange,
  ocid,
}: {
  label: string;
  value: bigint;
  onChange: (v: bigint) => void;
  ocid?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-2 px-3 py-1.5 rounded-lg stone-inset border border-[rgba(192,57,43,0.15)]">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#d8463f] w-[72px] shrink-0 font-['Saira',system-ui,sans-serif]">
        {label}
      </span>
      <input
        type="number"
        value={String(value)}
        min={0}
        onChange={(e) =>
          onChange(BigInt(Math.max(0, Number.parseInt(e.target.value) || 0)))
        }
        data-ocid={ocid}
        className="flex-1 bg-transparent border-none text-[13px] font-semibold text-[#c0ccd8] outline-none font-['Saira',system-ui,sans-serif]"
      />
    </div>
  );
}

function PanelCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="stone-frame mb-2">
      <div className="stone-well p-3">{children}</div>
    </div>
  );
}

// ── M2: TabErrorBanner — shown when a query fails, prevents full panel crash ──────
const TabErrorBanner: React.FC<{
  tabName: string;
  onRetry: () => void;
}> = ({ tabName, onRetry }) => (
  <div
    data-ocid="admin.tab.error_state"
    style={{
      background: "#1a0505",
      border: "1px solid #8b1a14",
      borderRadius: 8,
      padding: "14px 18px",
      margin: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    }}
  >
    <span style={{ color: "#f87171", fontSize: 12, fontWeight: 600 }}>
      ⚠️ Failed to load {tabName} data. The backend may be unavailable.
    </span>
    <button
      type="button"
      data-ocid="admin.tab.retry_button"
      onClick={onRetry}
      style={{
        background: "#8b1a14",
        border: "none",
        borderRadius: 5,
        color: "#fde",
        fontSize: 10,
        fontWeight: 700,
        padding: "5px 12px",
        cursor: "pointer",
        letterSpacing: "0.06em",
        textTransform: "uppercase" as const,
      }}
    >
      Retry
    </button>
  </div>
);

// ── EnemyPresets — localStorage-backed saved enemy configurations ──────────────────
const MAX_PRESETS = 10;
const PRESETS_KEY = "enemyPresets";

interface EnemyPreset {
  id: string;
  name: string;
  config: EnemyConfig;
}

function loadPresets(): EnemyPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) return JSON.parse(raw) as EnemyPreset[];
  } catch {
    /* ignore */
  }
  return [];
}

function savePresets(presets: EnemyPreset[]): void {
  try {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify(presets.slice(0, MAX_PRESETS)),
    );
  } catch {
    /* ignore */
  }
}

const EnemyPresets: React.FC<{
  currentConfig: EnemyConfig;
  onLoad: (cfg: EnemyConfig) => void;
}> = ({ currentConfig, onLoad }) => {
  const [presets, setPresets] = React.useState<EnemyPreset[]>(loadPresets);
  const [presetName, setPresetName] = React.useState("");
  const handleSave = () => {
    const name = presetName.trim();
    if (!name) return;
    const next = [
      ...presets.filter((p) => p.name !== name),
      { id: `preset_${Date.now()}`, name, config: { ...currentConfig } },
    ].slice(-MAX_PRESETS);
    setPresets(next);
    savePresets(next);
    setPresetName("");
  };
  const handleDelete = (id: string) => {
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    savePresets(next);
  };
  return (
    <div
      style={{
        background:
          "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
        border: `1px solid ${C.goldDim}`,
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 16,
      }}
    >
      <p style={sectionHeadStyle}>Enemy Stat Presets</p>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 10,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="Preset name\u2026"
          data-ocid="admin.enemy.preset_name_input"
          style={{ ...inputStyle(), flex: 1, marginBottom: 0 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        <Btn
          variant="blue"
          small
          onClick={handleSave}
          ocid="admin.enemy.save_preset_button"
        >
          Save as Preset
        </Btn>
      </div>
      {presets.length === 0 ? (
        <p style={{ color: "#6a6070", fontSize: 11 }}>No presets saved yet.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {presets.map((p, i) => (
            <div
              key={p.id}
              data-ocid={`admin.enemy.preset.item.${i + 1}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background:
                  "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
                border: `1px solid ${C.goldDim}`,
                borderRadius: 5,
                padding: "4px 10px",
              }}
            >
              <span style={{ color: "#c0ccd8", fontSize: 11, fontWeight: 700 }}>
                {p.name}
              </span>
              <button
                type="button"
                data-ocid={`admin.enemy.preset.load_button.${i + 1}`}
                onClick={() => onLoad({ ...p.config })}
                style={{
                  background: `${C.blue}22`,
                  border: `1px solid ${C.blue}44`,
                  borderRadius: 3,
                  color: C.blue,
                  fontSize: 9,
                  padding: "2px 7px",
                  cursor: "pointer",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Load
              </button>
              <button
                type="button"
                data-ocid={`admin.enemy.preset.delete_button.${i + 1}`}
                onClick={() => handleDelete(p.id)}
                style={{
                  background: C.red,
                  border: "none",
                  borderRadius: 3,
                  color: "#fde",
                  fontSize: 9,
                  padding: "2px 7px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── EnemyEditor

const EnemyEditor: React.FC<{
  initial: EnemyConfig;
  regions: RegionConfig[];
  onSave: (c: EnemyConfig) => void;
  onCancel: () => void;
  saving: boolean;
  idLocked?: boolean;
}> = ({ initial, regions, onSave, onCancel, saving, idLocked }) => {
  const [cfg, setCfg] = useState<EnemyConfig>(initial);
  const set = <K extends keyof EnemyConfig>(k: K, v: EnemyConfig[K]) =>
    setCfg((p) => ({ ...p, [k]: v }));
  const visualCopy = enemyVisualStatusCopy(spriteUrlIsStored(cfg.spriteUrl));

  return (
    <div data-ocid="admin.enemy_editor" style={{ padding: 20 }}>
      <EnemyPresets currentConfig={cfg} onLoad={(loaded) => setCfg(loaded)} />
      <p style={sectionHeadStyle}>Spawn template</p>
      <p style={{ color: "#6a6070", fontSize: 10, margin: "0 0 10px" }}>
        Catalog spawn fields only (hp/ap/mp/init/level/regions). Combat identity
        (damage, res, sp, sr, chc) is not on this form and is not persisted
        here.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <Field
          label="ID"
          value={cfg.id}
          onChange={(v) => set("id", v)}
          ocid="admin.enemy.id_input"
          placeholder="unique-id"
          disabled={idLocked}
          hint={
            idLocked
              ? "ID is locked after create — changing it would orphan the live record."
              : undefined
          }
        />
        <Field
          label="Name"
          value={cfg.name}
          onChange={(v) => set("name", v)}
          ocid="admin.enemy.name_input"
          placeholder="Shadow Knight"
        />
      </div>

      <p style={{ ...sectionHeadStyle, marginTop: 4 }}>Stats</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <StatRow
          label="HP"
          value={cfg.hp}
          onChange={(v) => set("hp", v)}
          ocid="admin.enemy.hp_input"
        />
        <StatRow
          label="AP"
          value={cfg.ap}
          onChange={(v) => set("ap", v)}
          ocid="admin.enemy.ap_input"
        />
        <StatRow
          label="MP"
          value={cfg.mp}
          onChange={(v) => set("mp", v)}
          ocid="admin.enemy.mp_input"
        />
        <StatRow
          label="Init"
          value={cfg.initStat}
          onChange={(v) => set("initStat", v)}
          ocid="admin.enemy.initstat_input"
        />
        <StatRow
          label="Level Min"
          value={cfg.levelMin}
          onChange={(v) => set("levelMin", v)}
          ocid="admin.enemy.levelmin_input"
        />
        <StatRow
          label="Level Max"
          value={cfg.levelMax}
          onChange={(v) => set("levelMax", v)}
          ocid="admin.enemy.levelmax_input"
        />
      </div>
      <p style={{ color: "#6a6070", fontSize: 10, margin: "0 0 10px" }}>
        {ELIGIBILITY_BAND_HINT}
      </p>

      <div style={{ marginBottom: 10 }}>
        <label htmlFor="admin.enemy.sprite_input" style={labelStyle}>
          {ENEMY_SPRITE_URL_FIELD_LABEL}
        </label>
        <p style={{ color: "#6a6070", fontSize: 10, margin: "0 0 6px" }}>
          {ENEMY_SPRITE_URL_HELP}
        </p>
        <input
          id="admin.enemy.sprite_input"
          type="text"
          value={cfg.spriteUrl[0] ?? ""}
          onChange={(e) =>
            set("spriteUrl", e.target.value ? [e.target.value] : [])
          }
          placeholder={ENEMY_SPRITE_URL_PLACEHOLDER}
          data-ocid="admin.enemy.sprite_input"
          style={inputStyle()}
        />
        <p
          data-ocid="admin.enemy.visual_status"
          style={{
            color: visualCopy.storedNotRendered ? C.dim : C.green,
            fontSize: 10,
            margin: "4px 0 0",
            fontWeight: 700,
          }}
        >
          {visualCopy.status}
        </p>
      </div>

      <p style={{ ...sectionHeadStyle, marginTop: 8 }}>
        Regions ({cfg.regions.length} selected)
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
          background:
            "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          borderRadius: 6,
          padding: "10px 12px",
          border: `1px solid ${C.goldDim}`,
        }}
      >
        {regions.map((r) => {
          const checked = cfg.regions.includes(r.id);
          return (
            <label
              key={r.id}
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                cursor: "pointer",
                color: checked ? C.goldBright : C.dim,
                fontSize: 11,
                fontWeight: checked ? 700 : 400,
                background: checked ? `${C.gold}18` : "transparent",
                border: `1px solid ${checked ? C.gold : C.dimmer}`,
                borderRadius: 4,
                padding: "3px 8px",
                transition: "all 0.15s",
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  set(
                    "regions",
                    checked
                      ? cfg.regions.filter((x) => x !== r.id)
                      : [...cfg.regions, r.id],
                  )
                }
                style={{ accentColor: C.gold, width: 13, height: 13 }}
              />
              {r.name || r.id}
            </label>
          );
        })}
        {regions.length === 0 && (
          <span style={{ color: "#6a6070", fontSize: 11 }}>
            No regions configured yet — add some first
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn
          variant="gold"
          onClick={() => {
            if (!cfg.id.trim() || !cfg.name.trim()) {
              toast.error("Enemy ID and name are required");
              return;
            }
            const spriteErr = validateOptionalUrl(
              "spriteUrl",
              cfg.spriteUrl[0] ?? "",
            );
            if (spriteErr) {
              toast.error(spriteErr);
              return;
            }
            onSave(cfg);
          }}
          ocid="admin.enemy.save_button"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Enemy"}
        </Btn>
        <Btn
          variant="ghost"
          onClick={onCancel}
          ocid="admin.enemy.cancel_button"
        >
          Cancel
        </Btn>
      </div>
    </div>
  );
};

// ── RegionEditor ──────────────────────────────────────────────────────────────

const RegionEditor: React.FC<{
  initial: RegionConfig;
  onSave: (c: RegionConfig) => void;
  onCancel: () => void;
  saving: boolean;
  idLocked?: boolean;
}> = ({ initial, onSave, onCancel, saving, idLocked }) => {
  const [cfg, setCfg] = useState<RegionConfig>(initial);
  const [newFx, setNewFx] = useState<BattleEffect>(newBattleEffect());
  const set = <K extends keyof RegionConfig>(k: K, v: RegionConfig[K]) =>
    setCfg((p) => ({ ...p, [k]: v }));

  const addEffect = () => {
    if (!newFx.name.trim()) return;
    set("battleEffects", [
      ...cfg.battleEffects,
      { ...newFx, id: `fx_${Date.now()}` },
    ]);
    setNewFx(newBattleEffect());
  };

  return (
    <div data-ocid="admin.region_editor" style={{ padding: 20 }}>
      <p style={sectionHeadStyle}>Region Configuration</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <Field
          label="ID"
          value={cfg.id}
          onChange={(v) => set("id", v)}
          ocid="admin.region.id_input"
          placeholder="frozen-wastes"
          disabled={idLocked}
          hint={
            idLocked
              ? "ID is locked after create — changing it would orphan the live record."
              : undefined
          }
        />
        <Field
          label="Name"
          value={cfg.name}
          onChange={(v) => set("name", v)}
          ocid="admin.region.name_input"
          placeholder="Frozen Wastes"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0 16px",
        }}
      >
        <StatRow
          label="Level Min"
          value={cfg.levelMin}
          onChange={(v) => set("levelMin", v)}
          ocid="admin.region.levelmin_input"
        />
        <StatRow
          label="Level Max"
          value={cfg.levelMax}
          onChange={(v) => set("levelMax", v)}
          ocid="admin.region.levelmax_input"
        />
        <div style={{ marginBottom: 8 }}>
          <label htmlFor="admin.region.bgcolor_input" style={labelStyle}>
            Background Color
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              id="admin.region.bgcolor_input"
              type="color"
              value={cfg.backgroundColor}
              onChange={(e) => set("backgroundColor", e.target.value)}
              data-ocid="admin.region.bgcolor_input"
              style={{
                width: 36,
                height: 36,
                border: `1px solid ${C.goldDim}`,
                borderRadius: 5,
                cursor: "pointer",
                background: "transparent",
                padding: 2,
              }}
            />
            <span style={{ color: "#c0ccd8", fontSize: 12 }}>
              {cfg.backgroundColor}
            </span>
          </div>
        </div>
      </div>
      <p style={{ color: "#6a6070", fontSize: 10, margin: "0 0 10px" }}>
        {ELIGIBILITY_BAND_HINT} Region effects apply only while the player level
        is inside this band.
      </p>

      <p style={{ ...sectionHeadStyle, marginTop: 8 }}>
        Battle Effects ({cfg.battleEffects.length})
      </p>

      {cfg.battleEffects.map((fx, i) => (
        <div
          key={fx.id}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginBottom: 6,
            background:
              "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
            padding: "7px 12px",
            borderRadius: 6,
            border: `1px solid ${C.goldDim}`,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                color: "#f0c44a",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {fx.name}
            </span>
            <span
              style={{
                background: `${C.gold}22`,
                border: `1px solid ${C.goldDim}`,
                borderRadius: 20,
                padding: "1px 7px",
                fontSize: 10,
                color: "#f0c44a",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {Object.keys(fx.effectType)[0]}
            </span>
            <span style={{ color: "#8a8090", fontSize: 11 }}>
              +{String(fx.value)}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              set(
                "battleEffects",
                cfg.battleEffects.filter((_, idx) => idx !== i),
              )
            }
            data-ocid={`admin.region.effect.delete_button.${i + 1}`}
            style={{
              background: C.red,
              border: "none",
              borderRadius: 4,
              color: "#fde",
              padding: "3px 10px",
              fontSize: 12,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>
      ))}

      {/* Add effect row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto",
          gap: 8,
          alignItems: "end",
          marginTop: 6,
          background:
            "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          padding: "10px 12px",
          borderRadius: 6,
          border: `1px solid ${C.goldDim}`,
          marginBottom: 16,
        }}
      >
        <div>
          <label htmlFor="admin.region.effect.name_input" style={labelStyle}>
            Effect Name
          </label>
          <input
            id="admin.region.effect.name_input"
            type="text"
            value={newFx.name}
            onChange={(e) => setNewFx((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Frost Burn"
            data-ocid="admin.region.effect.name_input"
            style={inputStyle()}
          />
        </div>
        <div>
          <label htmlFor="admin.region.effect.type_select" style={labelStyle}>
            Type
          </label>
          <select
            id="admin.region.effect.type_select"
            value={Object.keys(newFx.effectType)[0]}
            onChange={(e) =>
              setNewFx((p) => ({
                ...p,
                effectType: {
                  [e.target.value]: null,
                } as BattleEffect["effectType"],
              }))
            }
            data-ocid="admin.region.effect.type_select"
            style={{
              background:
                "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
              border: `1px solid ${C.goldDim}`,
              borderRadius: 5,
              color: "#c0ccd8",
              padding: "7px 10px",
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="damage">Damage</option>
            <option value="buff">Buff</option>
            <option value="debuff">Debuff</option>
          </select>
        </div>
        <div>
          <label htmlFor="admin.region.effect.value_input" style={labelStyle}>
            Value
          </label>
          <input
            id="admin.region.effect.value_input"
            type="number"
            value={String(newFx.value)}
            min={0}
            onChange={(e) =>
              setNewFx((p) => ({
                ...p,
                value: BigInt(
                  Math.max(0, Number.parseInt(e.target.value) || 0),
                ),
              }))
            }
            data-ocid="admin.region.effect.value_input"
            style={{ ...inputStyle(), width: 70 }}
          />
        </div>
        <Btn
          variant="blue"
          onClick={addEffect}
          ocid="admin.region.effect.add_button"
        >
          + Add
        </Btn>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn
          variant="gold"
          onClick={() => {
            if (!cfg.id.trim() || !cfg.name.trim()) {
              toast.error("Region ID and name are required");
              return;
            }
            onSave(cfg);
          }}
          ocid="admin.region.save_button"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Region"}
        </Btn>
        <Btn
          variant="ghost"
          onClick={onCancel}
          ocid="admin.region.cancel_button"
        >
          Cancel
        </Btn>
      </div>
    </div>
  );
};

// ── SpriteEditor ──────────────────────────────────────────────────────────────

const PIECE_TYPES = [
  "king",
  "queen",
  "rook",
  "bishop",
  "knight",
  "pawn",
  "custom",
];

/** Inline frame-list editor: each frame is an individual URL input with a delete button */
function WalkFrameSection({
  label,
  frames,
  onChange,
  ocidPrefix,
}: {
  label: string;
  frames: string[];
  onChange: (v: string[]) => void;
  ocidPrefix: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      style={{
        marginBottom: 10,
        border: `1px solid ${C.goldDim}`,
        borderRadius: 6,
        overflow: "hidden",
        background:
          "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
      }}
    >
      {/* Section header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        data-ocid={`${ocidPrefix}.toggle`}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#f0c44a",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
        }}
      >
        <span>
          {label}{" "}
          <span
            style={{
              background: `${C.gold}22`,
              border: `1px solid ${C.goldDim}`,
              borderRadius: 10,
              padding: "0 6px",
              fontSize: 9,
              marginLeft: 4,
            }}
          >
            {frames.length}
          </span>
        </span>
        <span style={{ fontSize: 12, opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 12px 10px" }}>
          {frames.map((url, idx) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: frame URLs are ordered and don't reorder
              key={`${ocidPrefix}-frame-${idx}`}
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  color: "#6a6070",
                  fontSize: 10,
                  width: 56,
                  flexShrink: 0,
                }}
              >
                Frame {idx + 1}
              </span>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  const next = [...frames];
                  next[idx] = e.target.value;
                  onChange(next);
                }}
                placeholder="https://…"
                data-ocid={`${ocidPrefix}.frame_input.${idx + 1}`}
                style={{ ...inputStyle(), flex: 1, marginBottom: 0 }}
              />
              <button
                type="button"
                onClick={() => onChange(frames.filter((_, i) => i !== idx))}
                data-ocid={`${ocidPrefix}.frame_delete.${idx + 1}`}
                style={{
                  background: C.red,
                  border: "none",
                  borderRadius: 4,
                  color: "#fde",
                  padding: "4px 9px",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange([...frames, ""])}
            data-ocid={`${ocidPrefix}.add_frame_button`}
            style={{
              background: `${C.blue}18`,
              border: `1px solid ${C.blue}44`,
              borderRadius: 4,
              color: C.blue,
              padding: "4px 12px",
              fontSize: 10,
              cursor: "pointer",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              marginTop: 2,
            }}
          >
            + Add Frame
          </button>
        </div>
      )}
    </div>
  );
}

/** Right-column editor form */
const SpriteEditorForm: React.FC<{
  initial: PlayerSpriteConfig;
  onSave: (c: PlayerSpriteConfig) => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ initial, onSave, onCancel, saving }) => {
  const [cfg, setCfg] = useState<PlayerSpriteConfig>(initial);
  const set = <K extends keyof PlayerSpriteConfig>(
    k: K,
    v: PlayerSpriteConfig[K],
  ) => setCfg((p) => ({ ...p, [k]: v }));

  const setOpt = (
    k: "frontUrl" | "rightUrl" | "leftUrl" | "backUrl",
    v: string,
  ) => set(k, v ? [v] : []);

  const previewUrl = cfg.frontUrl[0] ?? "";

  return (
    <div
      data-ocid="admin.sprite_editor"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      {/* Scrollable form body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 8px" }}>
        <p style={sectionHeadStyle}>Character Details</p>

        {/* Row: name + piece type */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 16px",
          }}
        >
          <Field
            label="Name"
            value={cfg.name}
            onChange={(v) => set("name", v)}
            ocid="admin.sprite.name_input"
            placeholder="Dark Pawn"
          />
          <div style={{ marginBottom: 10 }}>
            <label htmlFor="admin.sprite.piecetype_select" style={labelStyle}>
              Piece Type
            </label>
            <select
              id="admin.sprite.piecetype_select"
              value={cfg.characterPieceType}
              onChange={(e) => set("characterPieceType", e.target.value)}
              data-ocid="admin.sprite.piecetype_select"
              style={inputStyle()}
            >
              {PIECE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview */}
        <div
          style={{
            marginBottom: 14,
            background:
              "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
            border: `1px solid ${C.goldDim}`,
            borderRadius: 8,
            padding: 12,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              border: `2px solid ${C.goldDim}`,
              borderRadius: 6,
              background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {previewUrl && !unsafeUrl(previewUrl) ? (
              <img
                src={previewUrl}
                alt="preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  imageRendering: "pixelated",
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span
                data-ocid="admin.sprite.default_visual_status"
                style={{
                  color: C.green,
                  fontSize: 9,
                  textAlign: "center",
                  padding: 4,
                }}
              >
                Default Pixel Visual — Active fallback
              </span>
            )}
          </div>
          <div>
            <div
              style={{
                color: "#c0ccd8",
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              {cfg.name || "Unnamed Character"}
            </div>
            <div style={{ color: "#8a8090", fontSize: 10 }}>
              {cfg.characterPieceType.charAt(0).toUpperCase() +
                cfg.characterPieceType.slice(1)}
            </div>
          </div>
        </div>

        {/* Direction URLs */}
        <p style={{ ...sectionHeadStyle, marginTop: 4 }}>Direction Sprites</p>
        <p
          style={{
            color: "#6a6070",
            fontSize: 10,
            margin: "0 0 8px",
            lineHeight: 1.45,
          }}
        >
          {PLAYER_SPRITE_URL_HONESTY}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 16px",
          }}
        >
          {(
            [
              ["Front URL", "frontUrl"],
              ["Right URL", "rightUrl"],
              ["Left URL", "leftUrl"],
              ["Back URL", "backUrl"],
            ] as [string, "frontUrl" | "rightUrl" | "leftUrl" | "backUrl"][]
          ).map(([label, k]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <label htmlFor={`admin.sprite.${k}_input`} style={labelStyle}>
                {label}
              </label>
              <input
                id={`admin.sprite.${k}_input`}
                type="text"
                value={cfg[k][0] ?? ""}
                onChange={(e) => setOpt(k, e.target.value)}
                placeholder="https://… (optional)"
                data-ocid={`admin.sprite.${k}_input`}
                style={inputStyle()}
              />
            </div>
          ))}
        </div>

        {/* Walk frames */}
        <p style={{ ...sectionHeadStyle, marginTop: 4 }}>
          Walk Animation Frames
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 16px",
          }}
        >
          <WalkFrameSection
            label="Front Walk"
            frames={cfg.walkFramesFront}
            onChange={(v) => set("walkFramesFront", v)}
            ocidPrefix="admin.sprite.walk_front"
          />
          <WalkFrameSection
            label="Right Walk"
            frames={cfg.walkFramesRight}
            onChange={(v) => set("walkFramesRight", v)}
            ocidPrefix="admin.sprite.walk_right"
          />
          <WalkFrameSection
            label="Left Walk"
            frames={cfg.walkFramesLeft}
            onChange={(v) => set("walkFramesLeft", v)}
            ocidPrefix="admin.sprite.walk_left"
          />
          <WalkFrameSection
            label="Back Walk"
            frames={cfg.walkFramesBack}
            onChange={(v) => set("walkFramesBack", v)}
            ocidPrefix="admin.sprite.walk_back"
          />
        </div>
      </div>

      {/* Bottom action bar */}
      <div
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${C.goldDim}`,
          padding: "12px 20px",
          display: "flex",
          gap: 10,
          background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
          justifyContent: "flex-end",
        }}
      >
        <Btn
          variant="ghost"
          onClick={onCancel}
          ocid="admin.sprite.cancel_button"
        >
          Cancel
        </Btn>
        <Btn
          variant="gold"
          onClick={() => onSave(cfg)}
          ocid="admin.sprite.save_button"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Character"}
        </Btn>
      </div>
    </div>
  );
};

// ── SpritePanel — DOFUS-style two-column layout ───────────────────────────────

const _SpriteEditor: React.FC<{
  initial: PlayerSpriteConfig;
  onSave: (c: PlayerSpriteConfig) => void;
  onCancel: () => void;
  saving: boolean;
}> = (props) => <SpriteEditorForm {...props} />;

// ── SpriteList ────────────────────────────────────────────────────────────────

const PIECE_ICONS: Record<string, string> = {
  king: "♔",
  queen: "♕",
  rook: "♖",
  bishop: "♗",
  knight: "♘",
  pawn: "♙",
};

/** DOFUS-style two-column sprite manager */
const SpriteList: React.FC<{
  sprites: PlayerSpriteConfig[];
  loading: boolean;
  saving: boolean;
  onSave: (c: PlayerSpriteConfig) => void;
  onDelete: (id: string) => void;
  onEditorOpenChange?: (id: string | null) => void;
}> = ({ sprites, loading, saving, onSave, onDelete, onEditorOpenChange }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingCfg, setEditingCfg] = useState<PlayerSpriteConfig | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const visibleSprites = sprites.filter((s) =>
    matchesQuery(query, s.name, s.id, s.characterPieceType),
  );

  useEffect(() => {
    onEditorOpenChange?.(editingCfg ? (selectedId ?? "__new__") : null);
  }, [editingCfg, selectedId, onEditorOpenChange]);

  const selectSprite = (s: PlayerSpriteConfig) => {
    setSelectedId(s.id);
    setEditingCfg({ ...s });
  };

  const createNew = () => {
    const fresh = newSprite();
    setSelectedId("__new__");
    setEditingCfg(fresh);
  };

  const handleCancel = () => {
    setSelectedId(null);
    setEditingCfg(null);
  };

  const handleSave = (cfg: PlayerSpriteConfig) => {
    onSave(cfg);
    setSelectedId(null);
    setEditingCfg(null);
  };

  const handleDeleteConfirm = (id: string) => {
    onDelete(id);
    setConfirmDeleteId(null);
    if (selectedId === id) {
      setSelectedId(null);
      setEditingCfg(null);
    }
  };

  return (
    <div
      data-ocid="admin.sprites_panel"
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── LEFT COLUMN: character list ───────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
          borderRight: `1px solid ${C.goldDim}`,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px 10px",
            borderBottom: `1px solid ${C.goldDim}`,
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              color: "#f0c44a",
              margin: 0,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Characters
          </h3>
          <Btn
            variant="gold"
            small
            onClick={createNew}
            ocid="admin.sprites.add_button"
          >
            + New
          </Btn>
        </div>
        <div style={{ padding: "8px 16px 0" }}>
          <CatalogNote>
            Catalog only. WorldExploration never reads getPlayerSpriteConfigs —
            characters keep the Default Pixel Visual until a renderer is wired.
            Custom URLs are optional and not mandatory for new pieces.
          </CatalogNote>
          <ListSearch
            value={query}
            onChange={setQuery}
            placeholder="Filter characters…"
            ocid="admin.sprites.search_input"
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {loading && (
            <div
              data-ocid="admin.sprites.loading_state"
              style={{
                color: "#8a8090",
                fontSize: 11,
                textAlign: "center",
                padding: 24,
              }}
            >
              Loading…
            </div>
          )}

          {!loading && sprites.length === 0 && (
            <div
              data-ocid="admin.sprites.empty_state"
              style={{
                textAlign: "center",
                padding: "32px 16px",
                color: "#6a6070",
                fontSize: 12,
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 8 }}>♟️</div>
              <div style={{ fontWeight: 700, marginBottom: 4, color: C.dim }}>
                No characters yet
              </div>
              <div style={{ fontSize: 10 }}>Click "+ New" to add one</div>
            </div>
          )}

          {!loading && sprites.length > 0 && visibleSprites.length === 0 && (
            <div
              data-ocid="admin.sprites.no_match"
              style={{
                textAlign: "center",
                padding: "24px 16px",
                color: "#6a6070",
                fontSize: 12,
              }}
            >
              No characters match “{query}”
            </div>
          )}

          {visibleSprites.map((s, i) => {
            const isActive = selectedId === s.id;
            const thumb = s.frontUrl[0];
            return (
              <button
                type="button"
                key={s.id}
                data-ocid={`admin.sprites.item.${i + 1}`}
                onClick={() => selectSprite(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") selectSprite(s);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 16px",
                  cursor: "pointer",
                  width: "100%",
                  border: "none",
                  borderLeft: `3px solid ${isActive ? C.gold : "transparent"}`,
                  background: isActive
                    ? `linear-gradient(90deg, ${C.gold}16, transparent)`
                    : "transparent",
                  transition: "background 0.15s, border-color 0.15s",
                  textAlign: "left",
                  font: "inherit",
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: `1px solid ${isActive ? C.gold : C.goldDim}`,
                    borderRadius: 6,
                    background:
                      "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        imageRendering: "pixelated",
                      }}
                    />
                  ) : (
                    <span style={{ color: "#f0c44a", fontSize: 18 }}>
                      {PIECE_ICONS[s.characterPieceType] ?? "♙"}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: isActive ? C.goldBright : C.silver,
                      fontWeight: 700,
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.name || "Unnamed"}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      background: `${C.gold}18`,
                      border: `1px solid ${C.goldDim}`,
                      borderRadius: 10,
                      padding: "1px 7px",
                      fontSize: 9,
                      color: "#f0c44a",
                      textTransform: "capitalize",
                      letterSpacing: "0.05em",
                      marginTop: 2,
                    }}
                  >
                    {s.characterPieceType}
                  </div>
                </div>

                {/* Edit & Delete */}
                <div
                  style={{ display: "flex", gap: 4, flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => selectSprite(s)}
                    data-ocid={`admin.sprites.edit_button.${i + 1}`}
                    title="Edit"
                    style={{
                      background: "transparent",
                      border: `1px solid ${C.goldDim}`,
                      borderRadius: 4,
                      color: "#8a8090",
                      padding: "3px 7px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    ✏
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(s.id)}
                    data-ocid={`admin.sprites.delete_button.${i + 1}`}
                    title="Delete"
                    style={{
                      background: C.red,
                      border: "none",
                      borderRadius: 4,
                      color: "#fde",
                      padding: "3px 7px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    ×
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT COLUMN: editor or placeholder ────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background:
            "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
        }}
      >
        {editingCfg ? (
          <SpriteEditorForm
            initial={editingCfg}
            saving={saving}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <div
            data-ocid="admin.sprites.placeholder"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#6a6070",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 42 }}>♟️</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.dim }}>
              Select a character or create new
            </div>
            <div style={{ fontSize: 11 }}>
              Use the list on the left to get started
            </div>
            <button
              type="button"
              onClick={createNew}
              data-ocid="admin.sprites.placeholder_add_button"
              style={{
                marginTop: 8,
                background: `linear-gradient(135deg, #8b1a14, ${C.gold})`,
                border: "none",
                borderRadius: 6,
                color: "#fde",
                padding: "9px 24px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                boxShadow: "0 2px 12px rgba(192,57,43,0.3)",
              }}
            >
              + New Character
            </button>
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete Character?"
          body="This removes the sprite override. Characters without a custom visual keep the Default Pixel Visual. This cannot be undone."
          ocidPrefix="admin.sprites.delete"
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => handleDeleteConfirm(confirmDeleteId)}
        />
      )}
    </div>
  );
};

const EnemyList: React.FC<{
  enemies: EnemyConfig[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ enemies, loading, onAdd, onEdit, onDelete }) => {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const pending = enemies.find((e) => e.id === confirmId);
  const visible = enemies.filter((e) =>
    matchesQuery(query, e.name, e.id, e.regions.join(" ")),
  );
  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            style={{
              color: "#f0c44a",
              margin: 0,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.06em",
            }}
          >
            Enemy Configurations
          </h3>
          <p style={{ color: "#8a8090", fontSize: 11, margin: "3px 0 0" }}>
            {enemies.length} enemi{enemies.length === 1 ? "y" : "es"} configured
            {query.trim() ? ` · ${visible.length} shown` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ListSearch
            value={query}
            onChange={setQuery}
            placeholder="Filter by name, id, region…"
            ocid="admin.enemies.search_input"
          />
          <Btn variant="gold" onClick={onAdd} ocid="admin.enemies.add_button">
            + Add Enemy
          </Btn>
        </div>
      </div>
      <CatalogNote>
        Canister catalog only. Overworld spawn still uses player-relative tiers
        and chess-piece pixels — saving a row here does not change encounter
        packs. Custom visual URL is optional; empty keeps the Default Pixel
        Visual.
      </CatalogNote>

      {loading && (
        <div
          data-ocid="admin.enemies.loading_state"
          style={{
            color: "#8a8090",
            fontSize: 12,
            textAlign: "center",
            padding: 24,
          }}
        >
          Loading enemies…
        </div>
      )}

      {!loading && enemies.length === 0 && (
        <div
          data-ocid="admin.enemies.empty_state"
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "#6a6070",
            fontSize: 13,
            border: `1px dashed ${C.dimmer}`,
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚔️</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>No enemies yet</div>
          <div style={{ fontSize: 11 }}>
            Add your first enemy configuration above
          </div>
        </div>
      )}

      {!loading && enemies.length > 0 && visible.length === 0 && (
        <div
          data-ocid="admin.enemies.no_match"
          style={{
            textAlign: "center",
            padding: "24px 0",
            color: "#6a6070",
            fontSize: 12,
          }}
        >
          No enemies match “{query}”
        </div>
      )}

      {visible.map((e, i) => {
        const visualCopy = enemyVisualStatusCopy(
          spriteUrlIsStored(e.spriteUrl),
        );
        return (
          <PanelCard key={e.id}>
            <div
              data-ocid={`admin.enemies.item.${i + 1}`}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: "10px 14px",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: `linear-gradient(135deg, ${C.bg0}, ${C.bg3})`,
                  border: `1px solid ${C.goldDim}`,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                👾
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: "#c0ccd8",
                    fontWeight: 700,
                    fontSize: 13,
                    marginBottom: 2,
                  }}
                >
                  {e.name || e.id}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {[
                    [
                      `Lv ${String(e.levelMin)}–${String(e.levelMax)}`,
                      C.goldBright,
                    ],
                    [`HP ${String(e.hp)}`, C.red],
                    [`AP ${String(e.ap)}`, C.blue],
                    [`MP ${String(e.mp)}`, C.green],
                    [`Init ${String(e.initStat)}`, C.dim],
                    [
                      visualCopy.chip,
                      visualCopy.storedNotRendered ? C.dim : C.green,
                    ],
                  ].map(([label, color]) => (
                    <span
                      key={label}
                      style={{
                        background: `${color}18`,
                        border: `1px solid ${color}44`,
                        borderRadius: 20,
                        padding: "1px 7px",
                        fontSize: 10,
                        color,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  variant="ghost"
                  small
                  onClick={() => onEdit(e.id)}
                  ocid={`admin.enemies.edit_button.${i + 1}`}
                >
                  Edit
                </Btn>
                <Btn
                  variant="red"
                  small
                  onClick={() => setConfirmId(e.id)}
                  ocid={`admin.enemies.delete_button.${i + 1}`}
                >
                  ×
                </Btn>
              </div>
            </div>
          </PanelCard>
        );
      })}
      {confirmId && (
        <ConfirmDialog
          title={`Delete ${pending?.name || pending?.id || "enemy"}?`}
          body="This removes the live enemy template immediately. Players can encounter it until you recreate it. This cannot be undone."
          ocidPrefix="admin.enemies.delete"
          onCancel={() => setConfirmId(null)}
          onConfirm={() => {
            onDelete(confirmId);
            setConfirmId(null);
          }}
        />
      )}
    </div>
  );
};

// ── RegionList ────────────────────────────────────────────────────────────────

const RegionList: React.FC<{
  regions: RegionConfig[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ regions, loading, onAdd, onEdit, onDelete }) => {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const pending = regions.find((r) => r.id === confirmId);
  const visible = regions.filter((r) => matchesQuery(query, r.name, r.id));
  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            style={{
              color: "#f0c44a",
              margin: 0,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.06em",
            }}
          >
            Region Configurations
          </h3>
          <p style={{ color: "#8a8090", fontSize: 11, margin: "3px 0 0" }}>
            {regions.length} region{regions.length === 1 ? "" : "s"} defined
            {query.trim() ? ` · ${visible.length} shown` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ListSearch
            value={query}
            onChange={setQuery}
            placeholder="Filter by name or id…"
            ocid="admin.regions.search_input"
          />
          <Btn variant="gold" onClick={onAdd} ocid="admin.regions.add_button">
            + Add Region
          </Btn>
        </div>
      </div>
      <CatalogNote>
        Catalog only. Saving a region does not change map tiles, hazards, or
        combat. WorldExploration loads the list and matches player level, then
        discards battle effects and background color. Level min/max is an
        eligibility band, not a career cap.
      </CatalogNote>

      {loading && (
        <div
          data-ocid="admin.regions.loading_state"
          style={{
            color: "#8a8090",
            fontSize: 12,
            textAlign: "center",
            padding: 24,
          }}
        >
          Loading regions…
        </div>
      )}

      {!loading && regions.length === 0 && (
        <div
          data-ocid="admin.regions.empty_state"
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "#6a6070",
            fontSize: 13,
            border: `1px dashed ${C.dimmer}`,
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🗺️</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>No regions yet</div>
          <div style={{ fontSize: 11 }}>Create your first battle region</div>
        </div>
      )}

      {!loading && regions.length > 0 && visible.length === 0 && (
        <div
          data-ocid="admin.regions.no_match"
          style={{
            textAlign: "center",
            padding: "24px 0",
            color: "#6a6070",
            fontSize: 12,
          }}
        >
          No regions match “{query}”
        </div>
      )}

      {visible.map((r, i) => (
        <PanelCard key={r.id}>
          <div
            data-ocid={`admin.regions.item.${i + 1}`}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "10px 14px",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: r.backgroundColor,
                border: `2px solid ${C.goldDim}`,
                borderRadius: 6,
                flexShrink: 0,
                boxShadow: `0 0 8px ${r.backgroundColor}88`,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "#c0ccd8",
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 2,
                }}
              >
                {r.name || r.id}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    background: `${C.gold}18`,
                    border: `1px solid ${C.goldDim}`,
                    borderRadius: 20,
                    padding: "1px 7px",
                    fontSize: 10,
                    color: "#f0c44a",
                  }}
                >
                  Lv {String(r.levelMin)}–{String(r.levelMax)}
                </span>
                <span
                  style={{
                    background: `${C.blue}18`,
                    border: `1px solid ${C.blue}44`,
                    borderRadius: 20,
                    padding: "1px 7px",
                    fontSize: 10,
                    color: C.blue,
                  }}
                >
                  {r.battleEffects.length} effect
                  {r.battleEffects.length === 1 ? "" : "s"}
                </span>
                {r.battleEffects.slice(0, 2).map((fx) => (
                  <span key={fx.id} style={{ color: "#8a8090", fontSize: 10 }}>
                    {fx.name}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn
                variant="ghost"
                small
                onClick={() => onEdit(r.id)}
                ocid={`admin.regions.edit_button.${i + 1}`}
              >
                Edit
              </Btn>
              <Btn
                variant="red"
                small
                onClick={() => setConfirmId(r.id)}
                ocid={`admin.regions.delete_button.${i + 1}`}
              >
                ×
              </Btn>
            </div>
          </div>
        </PanelCard>
      ))}
      {confirmId && (
        <ConfirmDialog
          title={`Delete ${pending?.name || pending?.id || "region"}?`}
          body="This removes the live region template immediately. Enemies assigned to it lose that spawn region. This cannot be undone."
          ocidPrefix="admin.regions.delete"
          onCancel={() => setConfirmId(null)}
          onConfirm={() => {
            onDelete(confirmId);
            setConfirmId(null);
          }}
        />
      )}
    </div>
  );
};

// ── SpellEditor ──────────────────────────────────────────────────────────────────

const SPELL_EFFECT_TYPES = ["damage", "heal", "buff", "debuff", "dot", "aoe"];
const SPELL_EFFECT_CATEGORIES = [
  "damage",
  "heal",
  "drain",
  "defense",
  "pushback",
  "attract",
  "teleport",
  "aoe",
  "dot",
  "debuff",
  "buff",
  "cc",
];

const SpellEditor: React.FC<{
  initial: SpellConfig;
  onSave: (c: SpellConfig) => void;
  onCancel: () => void;
  saving: boolean;
  idLocked?: boolean;
}> = ({ initial, onSave, onCancel, saving, idLocked }) => {
  const [cfg, setCfg] = useState<SpellConfig>(initial);
  const set = <K extends keyof SpellConfig>(k: K, v: SpellConfig[K]) =>
    setCfg((p) => ({ ...p, [k]: v }));

  return (
    <div data-ocid="admin.spell_editor" style={{ padding: 20 }}>
      <p style={sectionHeadStyle}>Spell Configuration</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <Field
          label="ID"
          value={cfg.id}
          onChange={(v) => set("id", v)}
          ocid="admin.spell.id_input"
          placeholder="fireball"
          disabled={idLocked}
          hint={
            idLocked
              ? "ID is locked after create — changing it would orphan the live record."
              : undefined
          }
        />
        <Field
          label="Name"
          value={cfg.name}
          onChange={(v) => set("name", v)}
          ocid="admin.spell.name_input"
          placeholder="Fireball"
        />
      </div>

      <Field
        label="Description"
        value={cfg.description}
        onChange={(v) => set("description", v)}
        ocid="admin.spell.description_input"
        placeholder="Launches a ball of fire at the target"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr",
          gap: "0 16px",
          alignItems: "end",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.icon_input" style={labelStyle}>
            Icon
          </label>
          <input
            id="admin.spell.icon_input"
            type="text"
            value={cfg.iconEmoji}
            onChange={(e) => set("iconEmoji", e.target.value)}
            placeholder="⚡"
            data-ocid="admin.spell.icon_input"
            style={{ ...inputStyle(), textAlign: "center", fontSize: 20 }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.effecttype_select" style={labelStyle}>
            Effect Type
          </label>
          <select
            id="admin.spell.effecttype_select"
            value={cfg.effectType}
            onChange={(e) => set("effectType", e.target.value)}
            data-ocid="admin.spell.effecttype_select"
            style={inputStyle()}
          >
            {SPELL_EFFECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p style={{ ...sectionHeadStyle, marginTop: 4 }}>Stats</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "0 16px",
        }}
      >
        <StatRow
          label="AP Cost"
          value={cfg.apCost}
          onChange={(v) => set("apCost", v)}
          ocid="admin.spell.apcost_input"
        />
        <StatRow
          label="MP Cost"
          value={cfg.mpCost}
          onChange={(v) => set("mpCost", v)}
          ocid="admin.spell.mpcost_input"
        />
        <StatRow
          label="Damage"
          value={cfg.damage}
          onChange={(v) => set("damage", v)}
          ocid="admin.spell.damage_input"
        />
        <StatRow
          label="Range"
          value={cfg.range}
          onChange={(v) => set("range", v)}
          ocid="admin.spell.range_input"
        />
        <StatRow
          label="Cooldown"
          value={BigInt(cfg.cooldown ?? 0)}
          onChange={(v) => set("cooldown", Number(v))}
          ocid="admin.spell.cooldown_input"
        />
      </div>

      {/* Spell Type + Heal Amount + Physical */}
      <p style={{ ...sectionHeadStyle, marginTop: 4 }}>Spell Type</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0 16px",
          marginBottom: 10,
          alignItems: "end",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.spelltype_select" style={labelStyle}>
            Spell Type
          </label>
          <select
            id="admin.spell.spelltype_select"
            value={cfg.spellType ?? "damage"}
            onChange={(e) =>
              set("spellType", e.target.value as SpellConfig["spellType"])
            }
            data-ocid="admin.spell.spelltype_select"
            style={inputStyle()}
          >
            <option value="damage">Damage</option>
            <option value="heal">Heal (targets self)</option>
            <option value="drain">Drain (dmg enemy + heal self)</option>
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.healamount_input" style={labelStyle}>
            Heal Amount
          </label>
          <input
            id="admin.spell.healamount_input"
            type="number"
            min={0}
            value={cfg.healAmount ?? 0}
            onChange={(e) =>
              set("healAmount", Math.max(0, Number(e.target.value) || 0))
            }
            disabled={cfg.spellType === "damage"}
            data-ocid="admin.spell.healamount_input"
            style={{
              ...inputStyle(),
              opacity: cfg.spellType === "damage" ? 0.4 : 1,
            }}
          />
        </div>
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            background:
              "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
            border: `1px solid ${C.goldDim}`,
            borderRadius: 5,
          }}
        >
          <input
            id="admin.spell.isphysical_checkbox"
            type="checkbox"
            checked={cfg.isPhysical ?? false}
            onChange={(e) => set("isPhysical", e.target.checked)}
            data-ocid="admin.spell.isphysical_checkbox"
            style={{ accentColor: C.gold, width: 14, height: 14 }}
          />
          <label
            htmlFor="admin.spell.isphysical_checkbox"
            style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}
          >
            Physical Attack
          </label>
        </div>
      </div>

      {/* Usability + Level + Effect Category + Params */}
      <p style={{ ...sectionHeadStyle, marginTop: 4 }}>Usage &amp; Targeting</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "0 16px",
          marginBottom: 10,
          alignItems: "end",
        }}
      >
        {/* Usable by Player */}
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            background:
              "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
            border: `1px solid ${C.goldDim}`,
            borderRadius: 5,
          }}
        >
          <input
            id="admin.spell.usablebuplayer_checkbox"
            type="checkbox"
            checked={cfg.usableByPlayer ?? true}
            onChange={(e) => set("usableByPlayer", e.target.checked)}
            data-ocid="admin.spell.usablebuplayer_checkbox"
            style={{ accentColor: C.gold, width: 14, height: 14 }}
          />
          <label
            htmlFor="admin.spell.usablebuplayer_checkbox"
            style={{
              ...labelStyle,
              marginBottom: 0,
              cursor: "pointer",
              fontSize: 9,
            }}
          >
            Player Can Use
          </label>
        </div>
        {/* Usable by Enemy */}
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            background:
              "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
            border: `1px solid ${C.goldDim}`,
            borderRadius: 5,
          }}
        >
          <input
            id="admin.spell.usablebyenemy_checkbox"
            type="checkbox"
            checked={cfg.usableByEnemy ?? true}
            onChange={(e) => set("usableByEnemy", e.target.checked)}
            data-ocid="admin.spell.usablebyenemy_checkbox"
            style={{ accentColor: C.gold, width: 14, height: 14 }}
          />
          <label
            htmlFor="admin.spell.usablebyenemy_checkbox"
            style={{
              ...labelStyle,
              marginBottom: 0,
              cursor: "pointer",
              fontSize: 9,
            }}
          >
            Enemy Can Use
          </label>
        </div>
        {/* Hits Multiple Targets */}
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            background:
              "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
            border: `1px solid ${C.goldDim}`,
            borderRadius: 5,
          }}
        >
          <input
            id="admin.spell.hitsmultiple_checkbox"
            type="checkbox"
            checked={cfg.hitsMultiple ?? cfg.multiTarget ?? false}
            onChange={(e) => {
              set("hitsMultiple", e.target.checked);
              set("multiTarget", e.target.checked);
            }}
            data-ocid="admin.spell.hitsmultiple_checkbox"
            style={{ accentColor: C.gold, width: 14, height: 14 }}
          />
          <label
            htmlFor="admin.spell.hitsmultiple_checkbox"
            style={{
              ...labelStyle,
              marginBottom: 0,
              cursor: "pointer",
              fontSize: 9,
            }}
          >
            Hits Multiple Targets
          </label>
        </div>
        {/* Hits Allies Too — only shown when hitsMultiple is checked */}
        {(cfg.hitsMultiple ?? cfg.multiTarget) && (
          <div
            style={{
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              background: "rgba(180,0,0,0.1)",
              border: "1px solid rgba(180,0,0,0.4)",
              borderRadius: 5,
            }}
          >
            <input
              id="admin.spell.hitsallies_checkbox"
              type="checkbox"
              checked={cfg.hitsAllies ?? false}
              onChange={(e) => set("hitsAllies", e.target.checked)}
              data-ocid="admin.spell.hitsallies_checkbox"
              style={{ accentColor: "#dc2626", width: 14, height: 14 }}
            />
            <label
              htmlFor="admin.spell.hitsallies_checkbox"
              style={{
                ...labelStyle,
                marginBottom: 0,
                cursor: "pointer",
                fontSize: 9,
              }}
            >
              Also Hits Allies
            </label>
          </div>
        )}

        {/* ── Spell Property System (DOFUS-inspired) ───────────────────────── */}
        <div style={{ gridColumn: "1 / -1", marginBottom: 10 }}>
          <p
            style={{
              color: "#f0c44a",
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: "0 0 8px",
            }}
          >
            Spell Properties
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
            }}
          >
            {(
              [
                { key: "modifiableRange", label: "Modifiable Range" },
                { key: "lineOfSight", label: "Line of Sight" },
                { key: "linear", label: "Linear" },
                { key: "diagonal", label: "Diagonal" },
                { key: "freeCells", label: "Free Cells" },
                { key: "aoe", label: "Area of Effect" },
              ] as { key: keyof SpellConfig; label: string }[]
            ).map(({ key, label }) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 8px",
                  background:
                    "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                  border: `1px solid ${C.goldDim}`,
                  borderRadius: 4,
                }}
              >
                <input
                  id={`admin.spell.${key}_checkbox`}
                  type="checkbox"
                  checked={(cfg[key] as boolean | undefined) ?? false}
                  onChange={(e) => set(key, e.target.checked)}
                  data-ocid={`admin.spell.${key}_checkbox`}
                  style={{ accentColor: C.gold, width: 12, height: 12 }}
                />
                <label
                  htmlFor={`admin.spell.${key}_checkbox`}
                  style={{
                    ...labelStyle,
                    marginBottom: 0,
                    fontSize: 9,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Range inputs */}
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.minrange_input" style={labelStyle}>
            Min Range
          </label>
          <input
            id="admin.spell.minrange_input"
            type="number"
            min={0}
            max={10}
            value={cfg.minRange ?? 0}
            onChange={(e) =>
              set("minRange", Math.max(0, Number(e.target.value) || 0))
            }
            data-ocid="admin.spell.minrange_input"
            style={inputStyle()}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.maxrange_input" style={labelStyle}>
            Max Range
          </label>
          <input
            id="admin.spell.maxrange_input"
            type="number"
            min={0}
            max={20}
            value={cfg.maxRange ?? Number(cfg.range)}
            onChange={(e) =>
              set("maxRange", Math.max(0, Number(e.target.value) || 0))
            }
            data-ocid="admin.spell.maxrange_input"
            style={inputStyle()}
          />
        </div>

        {/* Hit Tiles / Range Pattern Editor — shown for all non-self spells */}
        {cfg.effectType !== "buff" && cfg.spellType !== "heal" && (
          <div style={{ gridColumn: "1 / -1", marginBottom: 10 }}>
            <p
              style={{
                color: "#f0c44a",
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0 0 6px",
              }}
            >
              {cfg.aoe ? "AoE" : "Range"} Hit Pattern (click tiles to toggle)
            </p>
            <p style={{ color: "#8a8090", fontSize: 9, margin: "0 0 8px" }}>
              Center tile (🟡) = caster position. Click others to mark hit tiles
              (red).{" "}
              {cfg.aoe
                ? "All marked tiles are hit around the target."
                : "Defines valid target offsets from caster."}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(11, 22px)",
                gap: 1,
              }}
            >
              {Array.from({ length: 11 }, (_, row) =>
                Array.from({ length: 11 }, (_, col) => {
                  const dx = col - 5;
                  const dy = row - 5;
                  const isCenter = dx === 0 && dy === 0;
                  const hitTiles: [number, number][] =
                    (cfg.hitTiles as [number, number][] | undefined) ?? [];
                  const isHit = hitTiles.some(
                    ([hx, hy]) => hx === dx && hy === dy,
                  );
                  return (
                    <button
                      type="button"
                      key={`aoe-${dx}-${dy}`}
                      onClick={() => {
                        if (isCenter) return;
                        const cur: [number, number][] = hitTiles;
                        const next: [number, number][] = isHit
                          ? cur.filter(([hx, hy]) => !(hx === dx && hy === dy))
                          : [...cur, [dx, dy] as [number, number]];
                        set("hitTiles", next);
                      }}
                      title={`(${dx},${dy})`}
                      style={{
                        width: 22,
                        height: 22,
                        background: isCenter
                          ? "#f1c40f"
                          : isHit
                            ? "#c0392b"
                            : "#0d0f1a",
                        border: `1px solid ${
                          isCenter ? "#e8b840" : isHit ? "#e74c3c" : C.goldDim
                        }`,
                        borderRadius: 2,
                        cursor: isCenter ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                        padding: 0,
                      }}
                    >
                      {isCenter ? "🟡" : isHit ? "●" : ""}
                    </button>
                  );
                }),
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 6,
                alignItems: "center",
              }}
            >
              <button
                type="button"
                data-ocid="admin.spell.hittiles_clear_button"
                onClick={() => set("hitTiles", [])}
                style={{
                  padding: "3px 10px",
                  background: "transparent",
                  border: `1px solid ${C.goldDim}`,
                  borderRadius: 3,
                  color: "#8a8090",
                  cursor: "pointer",
                  fontSize: 10,
                }}
              >
                Clear Pattern
              </button>
              <button
                type="button"
                data-ocid="admin.spell.hittiles_reset_button"
                onClick={() => {
                  const r = Math.max(1, cfg.minRange ?? 1);
                  const defaults: [number, number][] = [];
                  for (let dy2 = -r; dy2 <= r; dy2++) {
                    for (let dx2 = -r; dx2 <= r; dx2++) {
                      if (dx2 === 0 && dy2 === 0) continue;
                      if (Math.max(Math.abs(dx2), Math.abs(dy2)) <= r)
                        defaults.push([dx2, dy2]);
                    }
                  }
                  set("hitTiles", defaults);
                }}
                style={{
                  padding: "3px 10px",
                  background: "transparent",
                  border: `1px solid ${C.goldDim}`,
                  borderRadius: 3,
                  color: "#8a8090",
                  cursor: "pointer",
                  fontSize: 10,
                }}
              >
                Reset to Default
              </button>
              <span style={{ color: "#6a6070", fontSize: 9 }}>
                {(cfg.hitTiles as [number, number][] | undefined)?.length ?? 0}{" "}
                tiles selected
              </span>
            </div>
          </div>
        )}

        {/* Min Level */}
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.minlevel_input" style={labelStyle}>
            Min Level
          </label>
          <input
            id="admin.spell.minlevel_input"
            type="number"
            min={1}
            value={cfg.minLevel ?? 1}
            onChange={(e) =>
              set("minLevel", Math.max(1, Number(e.target.value) || 1))
            }
            data-ocid="admin.spell.minlevel_input"
            style={inputStyle()}
          />
        </div>
        {/* Effect Category */}
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.effectcategory_select" style={labelStyle}>
            Effect Category
          </label>
          <select
            id="admin.spell.effectcategory_select"
            value={cfg.effectCategory ?? "damage"}
            onChange={(e) =>
              set(
                "effectCategory",
                e.target.value as SpellConfig["effectCategory"],
              )
            }
            data-ocid="admin.spell.effectcategory_select"
            style={inputStyle()}
          >
            {SPELL_EFFECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Effect Params (JSON) */}
      <div style={{ marginBottom: 10 }}>
        <label htmlFor="admin.spell.effectparams_input" style={labelStyle}>
          Effect Params (JSON, optional)
        </label>
        <input
          id="admin.spell.effectparams_input"
          type="text"
          value={cfg.effectParams ?? ""}
          onChange={(e) => set("effectParams", e.target.value || null)}
          placeholder='{"pushDistance": 2}'
          data-ocid="admin.spell.effectparams_input"
          style={inputStyle()}
        />
      </div>

      {/* Buff fields */}
      <p style={{ ...sectionHeadStyle, marginTop: 4 }}>
        Buff Effect (self or ally)
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0 16px",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.buffstat_input" style={labelStyle}>
            Buff Stat
          </label>
          <select
            id="admin.spell.buffstat_input"
            value={cfg.buffStat ?? ""}
            onChange={(e) => set("buffStat", e.target.value || undefined)}
            data-ocid="admin.spell.buffstat_input"
            style={inputStyle()}
          >
            <option value="">None</option>
            {["dmg", "res", "sp", "mp", "ap", "chc", "healRecv"].map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.buffmodifier_input" style={labelStyle}>
            Buff Modifier
          </label>
          <input
            id="admin.spell.buffmodifier_input"
            type="number"
            step="0.01"
            value={cfg.buffModifier ?? 1}
            onChange={(e) => set("buffModifier", Number(e.target.value) || 1)}
            disabled={!cfg.buffStat}
            data-ocid="admin.spell.buffmodifier_input"
            style={{ ...inputStyle(), opacity: cfg.buffStat ? 1 : 0.4 }}
          />
          <p style={{ color: "#6a6070", fontSize: 9, margin: "2px 0 0" }}>
            1.0=no change, 1.4=+40%
          </p>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.buffduration_input" style={labelStyle}>
            Buff Duration (turns)
          </label>
          <input
            id="admin.spell.buffduration_input"
            type="number"
            min={0}
            value={cfg.buffDuration ?? 0}
            onChange={(e) =>
              set("buffDuration", Math.max(0, Number(e.target.value) || 0))
            }
            disabled={!cfg.buffStat}
            data-ocid="admin.spell.buffduration_input"
            style={{ ...inputStyle(), opacity: cfg.buffStat ? 1 : 0.4 }}
          />
        </div>
      </div>

      {/* Debuff fields */}
      <p style={{ ...sectionHeadStyle, marginTop: 4 }}>
        Debuff Effect (on target)
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0 16px",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.debuffstat_input" style={labelStyle}>
            Debuff Stat
          </label>
          <select
            id="admin.spell.debuffstat_input"
            value={cfg.debuffStat ?? ""}
            onChange={(e) => set("debuffStat", e.target.value || undefined)}
            data-ocid="admin.spell.debuffstat_input"
            style={inputStyle()}
          >
            <option value="">None</option>
            {["dmg", "res", "sp", "mp", "ap", "chc", "healRecv", "res_sp"].map(
              (s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ),
            )}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.debuffmodifier_input" style={labelStyle}>
            Debuff Modifier
          </label>
          <input
            id="admin.spell.debuffmodifier_input"
            type="number"
            step="0.01"
            value={cfg.debuffModifier ?? 1}
            onChange={(e) => set("debuffModifier", Number(e.target.value) || 1)}
            disabled={!cfg.debuffStat}
            data-ocid="admin.spell.debuffmodifier_input"
            style={{ ...inputStyle(), opacity: cfg.debuffStat ? 1 : 0.4 }}
          />
          <p style={{ color: "#6a6070", fontSize: 9, margin: "2px 0 0" }}>
            MP/AP: negative=reduce. Others: 0.7=-30%
          </p>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.debuffduration_input" style={labelStyle}>
            Debuff Duration (turns)
          </label>
          <input
            id="admin.spell.debuffduration_input"
            type="number"
            min={0}
            value={cfg.debuffDuration ?? 0}
            onChange={(e) =>
              set("debuffDuration", Math.max(0, Number(e.target.value) || 0))
            }
            disabled={!cfg.debuffStat}
            data-ocid="admin.spell.debuffduration_input"
            style={{ ...inputStyle(), opacity: cfg.debuffStat ? 1 : 0.4 }}
          />
        </div>
      </div>

      {/* DoT fields */}
      <p style={{ ...sectionHeadStyle, marginTop: 4 }}>
        Damage Over Time (DoT)
      </p>
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <input
          id="admin.spell.isdotspell_checkbox"
          type="checkbox"
          checked={cfg.isDotSpell ?? false}
          onChange={(e) => set("isDotSpell", e.target.checked)}
          data-ocid="admin.spell.isdotspell_checkbox"
          style={{ accentColor: C.gold, width: 12, height: 12 }}
        />
        <label htmlFor="admin.spell.isdotspell_checkbox" style={labelStyle}>
          Is DoT Spell (damage applied over turns, not upfront)
        </label>
      </div>
      {cfg.isDotSpell && (
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.dottype_select" style={labelStyle}>
            DoT Type
          </label>
          <select
            value={cfg.dotType ?? "poison"}
            onChange={(e) =>
              set(
                "dotType",
                e.target.value as
                  | "poison"
                  | "burn"
                  | "bleed"
                  | "venom"
                  | "other",
              )
            }
            data-ocid="admin.spell.dottype_select"
            style={{ ...inputStyle(), cursor: "pointer" }}
          >
            <option value="poison">Poison 🐍</option>
            <option value="burn">Burn 🔥</option>
            <option value="bleed">Bleed 🩸</option>
            <option value="venom">Venom 🐍</option>
            <option value="other">Other ☠️</option>
          </select>
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.dotdamage_input" style={labelStyle}>
            DoT Damage/Turn {cfg.isDotSpell ? "(main damage)" : "(extra DoT)"}
          </label>
          <input
            id="admin.spell.dotdamage_input"
            type="number"
            min={0}
            value={cfg.dotDamage ?? 0}
            onChange={(e) =>
              set("dotDamage", Math.max(0, Number(e.target.value) || 0))
            }
            data-ocid="admin.spell.dotdamage_input"
            style={inputStyle()}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="admin.spell.dotduration_input" style={labelStyle}>
            DoT Duration (turns)
          </label>
          <input
            id="admin.spell.dotduration_input"
            type="number"
            min={0}
            value={cfg.dotDuration ?? 0}
            onChange={(e) =>
              set("dotDuration", Math.max(0, Number(e.target.value) || 0))
            }
            data-ocid="admin.spell.dotduration_input"
            style={inputStyle()}
          />
        </div>
      </div>

      {/* Special Mechanics */}
      <p style={{ ...sectionHeadStyle, marginTop: 4 }}>Special Mechanics</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {(
          [
            { key: "isSwap", label: "Swap Positions" },
            { key: "isMirror", label: "Mirror Reflect" },
            { key: "isTimestep", label: "Timestep (AP/MP reset)" },
            { key: "isSacrifice", label: "Sacrifice (HP cost)" },
            { key: "isBarrier", label: "Barrier (block cell)" },
            { key: "isTrap", label: "Trap (triggered)" },
            { key: "isMark", label: "Mark (double dmg)" },
          ] as { key: keyof SpellConfig; label: string }[]
        ).map(({ key, label }) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 8px",
              background:
                "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
              border: `1px solid ${C.goldDim}`,
              borderRadius: 4,
            }}
          >
            <input
              id={`admin.spell.${key}_checkbox`}
              type="checkbox"
              checked={(cfg[key] as boolean | undefined) ?? false}
              onChange={(e) => set(key, e.target.checked)}
              data-ocid={`admin.spell.${key}_checkbox`}
              style={{ accentColor: C.gold, width: 12, height: 12 }}
            />
            <label
              htmlFor={`admin.spell.${key}_checkbox`}
              style={{
                ...labelStyle,
                marginBottom: 0,
                fontSize: 9,
                cursor: "pointer",
              }}
            >
              {label}
            </label>
          </div>
        ))}
      </div>

      {/* Preview card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background:
            "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          border: `1px solid ${C.goldDim}`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            background: `linear-gradient(135deg, ${C.bg3}, #2a0a1a)`,
            border: `2px solid ${C.gold}`,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          {cfg.iconEmoji || "❔"}
        </div>
        <div>
          <div style={{ color: "#f0c44a", fontWeight: 800, fontSize: 13 }}>
            {cfg.name || "Unnamed Spell"}
          </div>
          <div style={{ color: "#8a8090", fontSize: 11, marginTop: 2 }}>
            {cfg.description || "No description"}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {[
              [`⚡ ${String(cfg.apCost)} AP`, C.blue],
              [`💧 ${String(cfg.mpCost)} MP`, C.green],
              [`🗡️ ${String(cfg.damage)} dmg`, C.red],
              [`👁️ ${String(cfg.range)} rng`, C.gold],
            ].map(([label, color]) => (
              <span
                key={label as string}
                style={{
                  background: `${color as string}18`,
                  border: `1px solid ${color as string}44`,
                  borderRadius: 20,
                  padding: "1px 7px",
                  fontSize: 10,
                  color: color as string,
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn
          variant="gold"
          onClick={() => {
            if (!cfg.id.trim() || !cfg.name.trim()) {
              toast.error("Spell ID and name are required");
              return;
            }
            const spellErr = validateSpellConfig({
              id: cfg.id,
              name: cfg.name,
              apCost: Number(cfg.apCost),
              minRange: Number(cfg.minRange ?? 0),
              maxRange: Number(cfg.maxRange ?? cfg.range ?? 0),
              spellType: cfg.spellType ?? "damage",
              effectType: cfg.effectType,
              effectCategory: cfg.effectCategory ?? "damage",
              isSummon: cfg.isSummon,
              summonAI: cfg.summonAI,
              summonLifespan: cfg.summonLifespan,
              summonUnitDef: cfg.summonUnitDef,
            });
            if (spellErr) {
              toast.error(spellErr);
              return;
            }
            onSave(cfg);
          }}
          ocid="admin.spell.save_button"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Spell"}
        </Btn>
        <Btn
          variant="ghost"
          onClick={onCancel}
          ocid="admin.spell.cancel_button"
        >
          Cancel
        </Btn>
      </div>
    </div>
  );
};

// ── SpellList ──────────────────────────────────────────────────────────────

const SpellList: React.FC<{
  spells: SpellConfig[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ spells, loading, onAdd, onEdit, onDelete }) => {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const pending = spells.find((s) => s.id === confirmId);
  const visible = spells.filter((s) =>
    matchesQuery(query, s.name, s.id, s.effectType, s.spellType),
  );
  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            style={{
              color: "#f0c44a",
              margin: 0,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.06em",
            }}
          >
            Spell Configurations
          </h3>
          <p style={{ color: "#8a8090", fontSize: 11, margin: "3px 0 0" }}>
            {spells.length} spell{spells.length === 1 ? "" : "s"} configured
            {query.trim() ? ` · ${visible.length} shown` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ListSearch
            value={query}
            onChange={setQuery}
            placeholder="Filter by name, id, type…"
            ocid="admin.spells.search_input"
          />
          <Btn variant="gold" onClick={onAdd} ocid="admin.spells.add_button">
            + Add Spell
          </Btn>
        </div>
      </div>
      <CatalogNote>
        Cooldown and multi-target round-trip via adapter. Summon metadata is
        seeded on new drafts and saved when present, but this editor has no
        summon controls. Swap, Barrier, Trap, DoT, and buff numeric flags are
        frontend-only and drop on reload. minLevel is not enforced at hydrate.
      </CatalogNote>

      {loading && (
        <div
          data-ocid="admin.spells.loading_state"
          style={{
            color: "#8a8090",
            fontSize: 12,
            textAlign: "center",
            padding: 24,
          }}
        >
          Loading spells…
        </div>
      )}

      {!loading && spells.length === 0 && (
        <div
          data-ocid="admin.spells.empty_state"
          style={{
            textAlign: "center",
            padding: "40px 0",
            color: "#6a6070",
            fontSize: 13,
            border: `1px dashed ${C.dimmer}`,
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>No spells yet</div>
          <div style={{ fontSize: 11 }}>
            Add default spells for your characters
          </div>
        </div>
      )}

      {!loading && spells.length > 0 && visible.length === 0 && (
        <div
          data-ocid="admin.spells.no_match"
          style={{
            textAlign: "center",
            padding: "24px 0",
            color: "#6a6070",
            fontSize: 12,
          }}
        >
          No spells match “{query}”
        </div>
      )}

      {visible.map((s, i) => (
        <PanelCard key={s.id}>
          <div
            data-ocid={`admin.spells.item.${i + 1}`}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "10px 14px",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: `linear-gradient(135deg, ${C.bg3}, #2a0a1a)`,
                border: `2px solid ${C.goldDim}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              {s.iconEmoji || "⚡"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: "#c0ccd8",
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 2,
                }}
              >
                {s.name || s.id}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {[
                  [s.effectType, C.gold],
                  [`AP ${String(s.apCost)}`, C.blue],
                  [`DMG ${String(s.damage)}`, C.red],
                  [`RNG ${String(s.range)}`, C.green],
                ].map(([label, color]) => (
                  <span
                    key={label as string}
                    style={{
                      background: `${color as string}18`,
                      border: `1px solid ${color as string}44`,
                      borderRadius: 20,
                      padding: "1px 7px",
                      fontSize: 10,
                      color: color as string,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {label}
                  </span>
                ))}
                {s.description && (
                  <span style={{ color: "#6a6070", fontSize: 10 }}>
                    {s.description.slice(0, 40)}
                    {s.description.length > 40 ? "…" : ""}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn
                variant="ghost"
                small
                onClick={() => onEdit(s.id)}
                ocid={`admin.spells.edit_button.${i + 1}`}
              >
                Edit
              </Btn>
              <Btn
                variant="red"
                small
                onClick={() => setConfirmId(s.id)}
                ocid={`admin.spells.delete_button.${i + 1}`}
              >
                ×
              </Btn>
            </div>
          </div>
        </PanelCard>
      ))}
      {confirmId && (
        <ConfirmDialog
          title={`Delete ${pending?.name || pending?.id || "spell"}?`}
          body="This removes the live spell immediately. Boss pools and player unlocks that reference it will break until you recreate it. This cannot be undone."
          ocidPrefix="admin.spells.delete"
          onCancel={() => setConfirmId(null)}
          onConfirm={() => {
            onDelete(confirmId);
            setConfirmId(null);
          }}
        />
      )}
    </div>
  );
};

// ── TierConfigTab ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TIER_CFG: TierSpawnConfig = {
  tierSize: 10,
  sameTierPercent: 60,
  adjacentTierPercent: 20,
  twoAwayPercent: 10,
  threeOrMorePercent: 5,
};

const TierConfigTab: React.FC = () => {
  const { actor } = useActor();
  const [cfg, setCfg] = useState<TierSpawnConfig>(() => {
    try {
      const raw = localStorage.getItem("pbv_tier_spawn_config");
      if (raw) return { ...DEFAULT_TIER_CFG, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return DEFAULT_TIER_CFG;
  });

  const total =
    cfg.sameTierPercent +
    cfg.adjacentTierPercent +
    cfg.twoAwayPercent +
    cfg.threeOrMorePercent;
  const isValid = total === 100;

  const setNum = (k: keyof TierSpawnConfig, v: string) => {
    const n = Math.max(0, Number.parseInt(v) || 0);
    setCfg((p) => ({ ...p, [k]: n }));
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error("Percentages must sum to exactly 100%");
      return;
    }
    const tierErr = validateTierSpawnConfig({
      tierSize: Number(cfg.tierSize),
      sameTierPercent: Number(cfg.sameTierPercent),
      adjacentTierPercent: Number(cfg.adjacentTierPercent),
      twoAwayPercent: Number(cfg.twoAwayPercent),
      threeOrMorePercent: Number(cfg.threeOrMorePercent),
    });
    if (tierErr) {
      toast.error(tierErr);
      return;
    }
    if (!actor) {
      toast.error("Backend actor not available");
      return;
    }
    try {
      const result = await (
        actor as unknown as backendInterface
      ).adminSetTierSpawnConfig({
        ...cfg,
        tierSize: BigInt(cfg.tierSize),
      } as never);
      assertAdminCmdOk(result, "adminSetTierSpawnConfig");
      localStorage.setItem("pbv_tier_spawn_config", JSON.stringify(cfg));
      toast.success("Tier spawn config saved!");
    } catch (err) {
      toast.error(`Failed to save config: ${String(err)}`);
    }
  };

  // Preview table: probability breakdown for sample player levels
  const SAMPLE_LEVELS = [1, 10, 25, 50, 100, 200, 500];
  const ts = Math.max(1, cfg.tierSize);
  type PreviewRow = {
    level: number;
    tier: number;
    tierMin: number;
    tierMax: number;
    samePct: number;
    adjLow: string;
    adjHigh: string;
    twoLow: string;
    twoHigh: string;
    threePlus: string;
  };
  const previewRows: PreviewRow[] = SAMPLE_LEVELS.map((level) => {
    const tier = Math.floor((level - 1) / ts);
    const tierMin = tier * ts + 1;
    const tierMax = (tier + 1) * ts;
    const adjLow = Math.max(0, tier - 1);
    const adjHigh = tier + 1;
    const twoLow = Math.max(0, tier - 2);
    const twoHigh = tier + 2;
    return {
      level,
      tier: tier + 1,
      tierMin,
      tierMax,
      samePct: cfg.sameTierPercent,
      adjLow: `T${adjLow + 1}`,
      adjHigh: `T${adjHigh + 1}`,
      twoLow: `T${twoLow + 1}`,
      twoHigh: `T${twoHigh + 1}`,
      threePlus: `${cfg.threeOrMorePercent}%`,
    };
  });

  return (
    <div data-ocid="admin.tiers_tab" style={{ padding: 24 }}>
      <h3
        style={{
          color: "#f0c44a",
          margin: "0 0 4px",
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: "0.06em",
        }}
      >
        Enemy Tier Spawn System
      </h3>
      <p style={{ color: "#8a8090", fontSize: 11, margin: "0 0 20px" }}>
        Configure how likely players are to encounter same-tier vs
        higher/lower-tier enemies. All percentages must sum to 100.
      </p>

      {/* Config inputs */}
      <div
        style={{
          background: "linear-gradient(180deg,#13141c,#0e0f16)",
          border: `1px solid ${C.goldDim}`,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 16,
        }}
      >
        <p style={sectionHeadStyle}>Tier Configuration</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 20px",
          }}
        >
          {/* Tier size */}
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="tier.tiersize" style={labelStyle}>
              Tier Size (levels per tier)
            </label>
            <input
              id="tier.tiersize"
              type="number"
              min={1}
              max={100}
              value={cfg.tierSize}
              onChange={(e) => setNum("tierSize", e.target.value)}
              data-ocid="admin.tier.tiersize_input"
              style={inputStyle()}
            />
            <p style={{ color: "#6a6070", fontSize: 10, margin: "4px 0 0" }}>
              e.g. 10 means levels 1–10 = Tier 1, 11–20 = Tier 2, etc.
            </p>
          </div>

          {/* Same tier % */}
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="tier.same" style={labelStyle}>
              Same Tier % (default 60)
            </label>
            <input
              id="tier.same"
              type="number"
              min={0}
              max={100}
              value={cfg.sameTierPercent}
              onChange={(e) => setNum("sameTierPercent", e.target.value)}
              data-ocid="admin.tier.same_input"
              style={inputStyle(!isValid)}
            />
          </div>

          {/* Adjacent ±1 tier % */}
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="tier.adj" style={labelStyle}>
              ±1 Tier % (default 20, split ± evenly)
            </label>
            <input
              id="tier.adj"
              type="number"
              min={0}
              max={100}
              value={cfg.adjacentTierPercent}
              onChange={(e) => setNum("adjacentTierPercent", e.target.value)}
              data-ocid="admin.tier.adjacent_input"
              style={inputStyle(!isValid)}
            />
          </div>

          {/* ±2 tier % */}
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="tier.two" style={labelStyle}>
              ±2 Tiers % (default 10, split ± evenly)
            </label>
            <input
              id="tier.two"
              type="number"
              min={0}
              max={100}
              value={cfg.twoAwayPercent}
              onChange={(e) => setNum("twoAwayPercent", e.target.value)}
              data-ocid="admin.tier.twoaway_input"
              style={inputStyle(!isValid)}
            />
          </div>

          {/* ±3+ tiers % */}
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="tier.three" style={labelStyle}>
              ±3+ Tiers % (default 5)
            </label>
            <input
              id="tier.three"
              type="number"
              min={0}
              max={100}
              value={cfg.threeOrMorePercent}
              onChange={(e) => setNum("threeOrMorePercent", e.target.value)}
              data-ocid="admin.tier.threemore_input"
              style={inputStyle(!isValid)}
            />
          </div>

          {/* Total indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              marginBottom: 12,
              paddingBottom: 8,
            }}
          >
            <div
              style={{
                background: isValid ? `${C.green}22` : `${C.red}22`,
                border: `1px solid ${isValid ? C.green : C.red}`,
                borderRadius: 6,
                padding: "6px 14px",
                width: "100%",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  color: isValid ? C.green : C.red,
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                Total: {total}%{isValid ? " ✔" : " ✘ must be 100"}
              </span>
            </div>
          </div>
        </div>

        <Btn variant="gold" onClick={handleSave} ocid="admin.tier.save_button">
          Save Tier Config
        </Btn>
      </div>

      {/* Preview table */}
      <div
        style={{
          background: "linear-gradient(180deg,#13141c,#0e0f16)",
          border: `1px solid ${C.goldDim}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${C.goldDim}`,
          }}
        >
          <p style={{ ...sectionHeadStyle, marginBottom: 0 }}>
            Spawn Probability Preview
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}
          >
            <thead>
              <tr style={{ background: C.bg1 }}>
                {[
                  "Player Lvl",
                  "Tier",
                  "Tier Range",
                  "Same (%)",
                  "±1 Tiers",
                  "±2 Tiers",
                  "±3+ Tiers",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      color: "#f0c44a",
                      padding: "8px 12px",
                      textAlign: "left",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr
                  key={row.level}
                  style={{ background: i % 2 === 0 ? C.bg0 : C.bg2 }}
                >
                  <td
                    style={{
                      color: "#c0ccd8",
                      padding: "7px 12px",
                      fontWeight: 700,
                    }}
                  >
                    Lv {row.level}
                  </td>
                  <td style={{ color: "#f0c44a", padding: "7px 12px" }}>
                    T{row.tier}
                  </td>
                  <td style={{ color: "#8a8090", padding: "7px 12px" }}>
                    {row.tierMin}–{row.tierMax}
                  </td>
                  <td
                    style={{
                      color: "#56d18a",
                      padding: "7px 12px",
                      fontWeight: 700,
                    }}
                  >
                    {row.samePct}%
                  </td>
                  <td style={{ color: C.blue, padding: "7px 12px" }}>
                    {row.adjLow} / {row.adjHigh} (
                    {Math.floor(cfg.adjacentTierPercent / 2)}% each)
                  </td>
                  <td style={{ color: "#f0c44a", padding: "7px 12px" }}>
                    {row.twoLow} / {row.twoHigh} (
                    {Math.floor(cfg.twoAwayPercent / 2)}% each)
                  </td>
                  <td style={{ color: "#8a8090", padding: "7px 12px" }}>
                    {row.threePlus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── SettingsTab (Transfer Admin) ────────────────────────────────────────────────

const SettingsTab: React.FC = () => {
  const [targetPrincipal, setTargetPrincipal] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const assignRole = useAssignUserRole();

  const handleTransfer = () => {
    if (!targetPrincipal.trim()) {
      toast.error("Enter a Principal ID");
      return;
    }
    if (confirmText !== "TRANSFER") {
      toast.error("Type TRANSFER to confirm");
      return;
    }
    assignRole.mutate(
      { principalId: targetPrincipal.trim(), role: "admin" },
      {
        onSuccess: () => {
          toast.success(
            `Admin role granted to ${targetPrincipal.trim()}. Your admin access is unchanged.`,
          );
          setTargetPrincipal("");
          setConfirmText("");
        },
        onError: () => toast.error("Transfer failed — check the Principal ID"),
      },
    );
  };

  return (
    <div data-ocid="admin.settings_tab" style={{ padding: 20 }}>
      <h3
        style={{
          color: "#f0c44a",
          margin: "0 0 6px",
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: "0.06em",
        }}
      >
        Settings
      </h3>
      <p
        style={{
          color: "#8a8090",
          fontSize: 11,
          marginBottom: 24,
          lineHeight: 1.5,
        }}
      >
        Manage admin permissions and game settings.
      </p>
      <CatalogNote>
        Role transfer uses assignUserRole. Canister also has rollback
        (LevelUp/Game/Tier/Palette/BossRush), getAdminAuditLog, setAppVersion /
        setChangelog, and getBannedPrincipals — none of those have editors on
        this tab.
      </CatalogNote>

      <p style={sectionHeadStyle}>Transfer Admin Role</p>
      <div
        style={{
          background:
            "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          border: `1px solid ${C.red}44`,
          borderRadius: 8,
          padding: "16px 18px",
          marginBottom: 20,
        }}
      >
        <p
          style={{
            color: "#8a8090",
            fontSize: 11,
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          ⚠️ This grants another Internet Identity full admin control. It does
          not automatically remove your own admin role. Enter the Principal ID
          of the new admin and type{" "}
          <strong style={{ color: C.red }}>TRANSFER</strong> to confirm.
        </p>

        <Field
          label="Target Principal ID"
          value={targetPrincipal}
          onChange={setTargetPrincipal}
          ocid="admin.settings.principal_input"
          placeholder="aaaaa-bbbbb-ccccc-ddddd-cai"
        />

        <Field
          label='Confirm (type "TRANSFER")'
          value={confirmText}
          onChange={setConfirmText}
          ocid="admin.settings.confirm_input"
          placeholder="TRANSFER"
          err={confirmText.length > 0 && confirmText !== "TRANSFER"}
        />

        <Btn
          variant="red"
          onClick={handleTransfer}
          ocid="admin.settings.transfer_button"
          disabled={assignRole.isPending}
        >
          {assignRole.isPending ? "Transferring…" : "🛡️ Transfer Admin Role"}
        </Btn>
      </div>

      <p style={sectionHeadStyle}>Default Spells Preset</p>
      <p style={{ color: "#6a6070", fontSize: 11, marginBottom: 12 }}>
        Use the Spells tab to add, edit, or remove spells available to players.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <div
          style={{
            background:
              "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
            border: `1px solid ${C.goldDim}`,
            borderRadius: 6,
            padding: "10px 14px",
            fontSize: 11,
            color: "#8a8090",
          }}
        >
          Navigate to <strong style={{ color: C.gold }}>Spells</strong> in the
          sidebar to manage spell configurations.
        </div>
      </div>
      <LevelUpConfigPanel />
    </div>
  );
};

const DEFAULT_LEVEL_UP_DRAFT = {
  maxSpellRange: 5,
  spellRangeGrowthLevels: 10,
  spellFailBaseChance: 20,
  spellFailReductionPerLevel: 0.1,
  statGrowthPercent: 5,
  apMpLevelThreshold: 25,
  spellLevelingBaseCost: 10,
  spellLevelingCostMultiplier: 2,
  spellDmgGrowthPercent: 3,
};

// ── LevelUpConfigPanel (part of Settings) ─────────────────────────────────────────────
const LevelUpConfigPanel: React.FC = () => {
  const { actor } = useActor();
  const [cfg, setCfg] = React.useState(() => {
    try {
      const raw = localStorage.getItem("pbv_levelup_config");
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const apMp = Number(
          parsed.apMpLevelThreshold ??
            parsed.apMpGrowthEveryNLevels ??
            DEFAULT_LEVEL_UP_DRAFT.apMpLevelThreshold,
        );
        return {
          ...DEFAULT_LEVEL_UP_DRAFT,
          ...parsed,
          apMpLevelThreshold: apMp,
        };
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_LEVEL_UP_DRAFT };
  });
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!actor) return;
    let cancelled = false;
    (async () => {
      try {
        const remote = await (
          actor as unknown as backendInterface
        ).getLevelUpConfig();
        if (cancelled || !remote) return;
        setCfg((prev) => ({
          ...prev,
          maxSpellRange: Number(remote.maxSpellRange ?? prev.maxSpellRange),
          spellRangeGrowthLevels: Number(
            remote.spellRangeGrowthLevels ?? prev.spellRangeGrowthLevels,
          ),
          spellFailBaseChance: Number(
            remote.spellFailBaseChance ?? prev.spellFailBaseChance,
          ),
          spellFailReductionPerLevel: Number(
            remote.spellFailReductionPerLevel ??
              prev.spellFailReductionPerLevel,
          ),
          statGrowthPercent: Number(
            remote.statGrowthPercent ?? prev.statGrowthPercent,
          ),
          apMpLevelThreshold: Number(
            remote.apMpLevelThreshold ?? prev.apMpLevelThreshold,
          ),
          spellLevelingBaseCost: Number(
            remote.spellLevelingBaseCost ?? prev.spellLevelingBaseCost,
          ),
          spellLevelingCostMultiplier: Number(
            remote.spellLevelingCostMultiplier ??
              prev.spellLevelingCostMultiplier,
          ),
          spellDmgGrowthPercent: Number(
            remote.spellDmgGrowthPercent ?? prev.spellDmgGrowthPercent,
          ),
        }));
      } catch {
        /* keep localStorage draft */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [actor]);

  const handleSave = async () => {
    const payload = toBackendLevelUpConfig(cfg);
    const err = validateLevelUpConfig({
      statGrowthPercent: Number(payload.statGrowthPercent),
      apMpLevelThreshold: Number(payload.apMpLevelThreshold),
      spellLevelingBaseCost: Number(payload.spellLevelingBaseCost),
      spellLevelingCostMultiplier: payload.spellLevelingCostMultiplier,
      spellDmgGrowthPercent: Number(payload.spellDmgGrowthPercent),
      maxSpellRange: Number(payload.maxSpellRange),
      spellRangeGrowthLevels: Number(payload.spellRangeGrowthLevels),
      spellFailBaseChance: payload.spellFailBaseChance,
      spellFailReductionPerLevel: payload.spellFailReductionPerLevel,
    });
    if (err) {
      toast.error(err);
      return;
    }
    if (!actor) {
      toast.error("Backend actor not available");
      return;
    }
    try {
      const result = await (
        actor as unknown as backendInterface
      ).adminSetLevelUpConfig(payload);
      assertAdminCmdOk(result, "adminSetLevelUpConfig");
      localStorage.setItem("pbv_levelup_config", JSON.stringify(cfg));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (_e) {
      toast.error("Failed to save level-up config to backend");
    }
  };

  return (
    <div
      style={{
        background: "linear-gradient(180deg,#13141c,#0e0f16)",
        border: `1px solid ${C.goldDim}`,
        borderRadius: 8,
        padding: "16px 20px",
        marginTop: 20,
      }}
    >
      <p style={sectionHeadStyle}>Spell System Config</p>
      <p
        style={{
          color: "#6a6070",
          fontSize: 11,
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        All nine LevelUpConfig fields are editable. Save writes the full
        canister payload (no hardcoded growth/cost clobber). Live combat still
        hydrates fail/range from pbv_levelup_config until WorldExploration calls
        getLevelUpConfig. Cost multiplier is stored; upgradeSpell still charges
        base × 2^level. No player level cap.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="levelup.maxrange" style={labelStyle}>
            Max Spell Range
          </label>
          <input
            id="levelup.maxrange"
            type="number"
            min={1}
            max={20}
            value={cfg.maxSpellRange}
            onChange={(e) =>
              setCfg((p: typeof cfg) => ({
                ...p,
                maxSpellRange: Math.max(1, Number(e.target.value) || 5),
              }))
            }
            style={inputStyle()}
            data-ocid="admin.levelup.maxrange_input"
          />
          <p style={{ color: "#6a6070", fontSize: 10, margin: "3px 0 0" }}>
            Max range a spell can reach (default 5)
          </p>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="levelup.rangegrowth" style={labelStyle}>
            Range +1 Every N Levels
          </label>
          <input
            id="levelup.rangegrowth"
            type="number"
            min={1}
            value={cfg.spellRangeGrowthLevels}
            onChange={(e) =>
              setCfg((p: typeof cfg) => ({
                ...p,
                spellRangeGrowthLevels: Math.max(
                  1,
                  Number(e.target.value) || 10,
                ),
              }))
            }
            style={inputStyle()}
            data-ocid="admin.levelup.rangegrowth_input"
          />
          <p style={{ color: "#6a6070", fontSize: 10, margin: "3px 0 0" }}>
            Every N player levels, +1 to all spell ranges
          </p>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="levelup.failbase" style={labelStyle}>
            Base Spell Fail % (Lv1)
          </label>
          <input
            id="levelup.failbase"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={cfg.spellFailBaseChance}
            onChange={(e) =>
              setCfg((p: typeof cfg) => ({
                ...p,
                spellFailBaseChance: Math.max(0, Number(e.target.value) || 20),
              }))
            }
            style={inputStyle()}
            data-ocid="admin.levelup.failbase_input"
          />
          <p style={{ color: "#6a6070", fontSize: 10, margin: "3px 0 0" }}>
            Default 20% at level 1
          </p>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="levelup.failred" style={labelStyle}>
            Fail % Reduction/Level
          </label>
          <input
            id="levelup.failred"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={cfg.spellFailReductionPerLevel}
            onChange={(e) =>
              setCfg((p: typeof cfg) => ({
                ...p,
                spellFailReductionPerLevel: Math.max(
                  0,
                  Number(e.target.value) || 0.1,
                ),
              }))
            }
            style={inputStyle()}
            data-ocid="admin.levelup.failred_input"
          />
          <p style={{ color: "#6a6070", fontSize: 10, margin: "3px 0 0" }}>
            0.1 = −0.1% fail per player level. No career cap; do not treat 200
            as a ceiling.
          </p>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="levelup.statgrowth" style={labelStyle}>
            Stat Growth % / Level
          </label>
          <input
            id="levelup.statgrowth"
            type="number"
            min={1}
            max={50}
            value={cfg.statGrowthPercent}
            onChange={(e) =>
              setCfg((p: typeof cfg) => ({
                ...p,
                statGrowthPercent: Math.max(1, Number(e.target.value) || 5),
              }))
            }
            style={inputStyle()}
            data-ocid="admin.levelup.statgrowth_input"
          />
          <p style={{ color: "#6a6070", fontSize: 10, margin: "3px 0 0" }}>
            All stats grow this percent per character level (default 5)
          </p>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="levelup.apmp" style={labelStyle}>
            +1 AP/MP Every N Levels
          </label>
          <input
            id="levelup.apmp"
            type="number"
            min={1}
            max={100}
            value={cfg.apMpLevelThreshold}
            onChange={(e) =>
              setCfg((p: typeof cfg) => ({
                ...p,
                apMpLevelThreshold: Math.max(1, Number(e.target.value) || 25),
              }))
            }
            style={inputStyle()}
            data-ocid="admin.levelup.apmp_input"
          />
          <p style={{ color: "#6a6070", fontSize: 10, margin: "3px 0 0" }}>
            Canister field apMpLevelThreshold (default 25)
          </p>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="levelup.spellbase" style={labelStyle}>
            Spell Leveling Base Cost
          </label>
          <input
            id="levelup.spellbase"
            type="number"
            min={1}
            value={cfg.spellLevelingBaseCost}
            onChange={(e) =>
              setCfg((p: typeof cfg) => ({
                ...p,
                spellLevelingBaseCost: Math.max(
                  1,
                  Number(e.target.value) || 10,
                ),
              }))
            }
            style={inputStyle()}
            data-ocid="admin.levelup.spellbase_input"
          />
          <p style={{ color: "#6a6070", fontSize: 10, margin: "3px 0 0" }}>
            upgradeSpell charges base × 2^level (default 10)
          </p>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="levelup.spellmult" style={labelStyle}>
            Spell Cost Multiplier
          </label>
          <input
            id="levelup.spellmult"
            type="number"
            min={1}
            max={10}
            step={0.1}
            value={cfg.spellLevelingCostMultiplier}
            onChange={(e) =>
              setCfg((p: typeof cfg) => ({
                ...p,
                spellLevelingCostMultiplier: Math.max(
                  1,
                  Number(e.target.value) || 2,
                ),
              }))
            }
            style={inputStyle()}
            data-ocid="admin.levelup.spellmult_input"
          />
          <p style={{ color: "#6a6070", fontSize: 10, margin: "3px 0 0" }}>
            Stored on canister; live debit still uses 2^level
          </p>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="levelup.spelldmg" style={labelStyle}>
            Spell Damage Growth %
          </label>
          <input
            id="levelup.spelldmg"
            type="number"
            min={0}
            max={50}
            value={cfg.spellDmgGrowthPercent}
            onChange={(e) =>
              setCfg((p: typeof cfg) => ({
                ...p,
                spellDmgGrowthPercent: Math.max(0, Number(e.target.value) || 3),
              }))
            }
            style={inputStyle()}
            data-ocid="admin.levelup.spelldmg_input"
          />
          <p style={{ color: "#6a6070", fontSize: 10, margin: "3px 0 0" }}>
            Per spell-level damage increase (default 3)
          </p>
        </div>
      </div>
      <Btn variant="gold" onClick={handleSave} ocid="admin.levelup.save_button">
        {saved ? "Saved \u2713" : "Save Config"}
      </Btn>
    </div>
  );
};

const DEFAULT_PALETTE = ["#8b0000", "#c0392b", "#2c1a1a", "#4a1010"];

const VisualsTab: React.FC = () => {
  const { actor } = useActor();
  const stored = (() => {
    try {
      const v =
        localStorage.getItem("pbv_color_palette") ??
        localStorage.getItem("paperVertexPalette");
      if (v) {
        const arr = JSON.parse(v) as string[];
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {
      logDebugWarn("UI", "AdminDashboard palette load failed", String(e));
    }
    return [];
  })();

  const [slots, setSlots] = React.useState<
    { color: string; enabled: boolean }[]
  >(
    DEFAULT_PALETTE.map((c, i) => ({
      color: stored[i] ?? c,
      enabled: stored.length > 0 ? !!stored[i] : true,
    })),
  );
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const handleSave = async () => {
    const palette = slots.filter((s) => s.enabled).map((s) => s.color);
    const blob = JSON.stringify(palette);
    try {
      const result = await (
        actor as unknown as backendInterface
      ).adminSetColorPalette(blob);
      assertAdminCmdOk(result, "adminSetColorPalette");
      localStorage.setItem("paperVertexPalette", blob);
      localStorage.setItem("pbv_color_palette", blob);
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save color palette:", err);
      setSaveError("Save failed — check console");
      toast.error(`Failed to save color palette: ${String(err)}`);
    }
  };

  const handleReset = () => {
    localStorage.removeItem("paperVertexPalette");
    localStorage.removeItem("pbv_color_palette");
    setSlots(DEFAULT_PALETTE.map((c) => ({ color: c, enabled: true })));
  };

  const activePalette = slots.filter((s) => s.enabled).map((s) => s.color);

  return (
    <div data-ocid="admin.visuals_tab" style={{ padding: 20 }}>
      <h3
        style={{
          color: "#f0c44a",
          margin: "0 0 6px",
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: "0.06em",
        }}
      >
        Visuals
      </h3>
      <p
        style={{
          color: "#8a8090",
          fontSize: 11,
          marginBottom: 20,
          lineHeight: 1.5,
        }}
      >
        Control the visual theme of the paper vertex landscape around the
        isometric map.
      </p>
      <p style={sectionHeadStyle}>Map Paper Vertex Colors</p>
      <p
        style={{
          color: "#6a6070",
          fontSize: 11,
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        Up to 4 colors for the folded paper landscape around maps. Leave all
        unchecked for true random colors.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {slots.map((slot, i) => (
          <div
            key={`slot-${slot.color}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background:
                "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
              borderRadius: 6,
              padding: "8px 12px",
              border: `1px solid ${C.goldDim}`,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                flex: 1,
              }}
            >
              <input
                type="checkbox"
                checked={slot.enabled}
                onChange={(e) =>
                  setSlots((p) =>
                    p.map((s, idx) =>
                      idx === i ? { ...s, enabled: e.target.checked } : s,
                    ),
                  )
                }
                data-ocid={`admin.visuals.color_slot.${i + 1}`}
                style={{ accentColor: C.gold, width: 14, height: 14 }}
              />
              <span style={{ color: "#c0ccd8", fontSize: 11, width: 52 }}>
                Color {i + 1}
              </span>
            </label>
            <input
              type="color"
              value={slot.color}
              disabled={!slot.enabled}
              onChange={(e) =>
                setSlots((p) =>
                  p.map((s, idx) =>
                    idx === i ? { ...s, color: e.target.value } : s,
                  ),
                )
              }
              data-ocid={`admin.visuals.color_picker.${i + 1}`}
              style={{
                width: 40,
                height: 32,
                border: `1px solid ${C.gold}`,
                borderRadius: 4,
                cursor: slot.enabled ? "pointer" : "not-allowed",
                background: "transparent",
                padding: 2,
                opacity: slot.enabled ? 1 : 0.35,
              }}
            />
            <span
              style={{
                color: slot.enabled ? C.silver : C.dimmer,
                fontSize: 11,
                fontFamily: "monospace",
                width: 60,
              }}
            >
              {slot.enabled ? slot.color : "—"}
            </span>
          </div>
        ))}
      </div>
      <p style={{ ...sectionHeadStyle, marginTop: 8 }}>Live Preview</p>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          background:
            "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          borderRadius: 6,
          padding: 12,
          border: `1px solid ${C.goldDim}`,
        }}
      >
        {activePalette.length > 0 ? (
          activePalette.map((col) => (
            <div
              key={col}
              title={col}
              style={{
                width: 36,
                height: 36,
                borderRadius: 4,
                background: col,
                border: `1px solid ${C.goldDim}`,
                boxShadow: `0 0 6px ${col}88`,
              }}
            />
          ))
        ) : (
          <span style={{ color: "#6a6070", fontSize: 11 }}>
            True random — all slots disabled
          </span>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn
            variant="gold"
            onClick={handleSave}
            ocid="admin.visuals.save_button"
          >
            {saved ? "Saved ✓" : "Save Palette"}
          </Btn>
          <Btn
            variant="ghost"
            onClick={handleReset}
            ocid="admin.visuals.reset_button"
          >
            Reset editor to Random
          </Btn>
        </div>
        <p style={{ color: "#6a6070", fontSize: 10, margin: 0 }}>
          Reset only clears this editor and local cache. Click Save Palette to
          publish the canister-live fallback.
        </p>
        {saveError && (
          <p
            data-ocid="admin.visuals.save_error"
            style={{ color: "#e05050", fontSize: 11, margin: 0 }}
          >
            {saveError}
          </p>
        )}
      </div>
    </div>
  );
};

// ── ModifierEditor ─────────────────────────────────────────────────────────────────────

const LEGACY_MODIFIER_TYPES = [
  {
    value: "lava_fields",
    label: "Lava Fields — legacy id (no engine hook)",
  },
  { value: "ice_fields", label: "Ice Fields — legacy id (no engine hook)" },
  { value: "spike_pit", label: "Spike Pit — legacy id (no engine hook)" },
  { value: "custom", label: "Custom — free-text id (no engine hook)" },
];

const MODIFIER_TYPES = [
  ...listAdminModifierTypeOptions(),
  ...LEGACY_MODIFIER_TYPES,
];

const ModifierEditor: React.FC<{
  initial: MapModifierConfig;
  onSave: (c: MapModifierConfig) => void;
  onCancel: () => void;
  saving: boolean;
  idLocked?: boolean;
}> = ({ initial, onSave, onCancel, saving, idLocked }) => {
  const [cfg, setCfg] = React.useState<MapModifierConfig>(initial);
  const set = <K extends keyof MapModifierConfig>(
    k: K,
    v: MapModifierConfig[K],
  ) => setCfg((p) => ({ ...p, [k]: v }));

  return (
    <div data-ocid="admin.modifier_editor">
      <p style={sectionHeadStyle}>Modifier Configuration</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <Field
          label="ID"
          value={cfg.id}
          onChange={(v) => set("id", v)}
          ocid="admin.modifier.id_input"
          placeholder="slime_flood"
          disabled={idLocked}
          hint={
            idLocked
              ? "ID is locked after create — changing it would orphan the live record."
              : undefined
          }
        />
        <Field
          label="Name"
          value={cfg.name}
          onChange={(v) => set("name", v)}
          ocid="admin.modifier.name_input"
          placeholder="Slime Flood"
        />
      </div>
      <Field
        label="Description"
        value={cfg.description}
        onChange={(v) => set("description", v)}
        ocid="admin.modifier.description_input"
        placeholder="Double MP cost for all movement"
      />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="admin.modifier.type_select" style={labelStyle}>
            Modifier Type
          </label>
          <select
            id="admin.modifier.type_select"
            value={cfg.modifierType}
            onChange={(e) => set("modifierType", e.target.value)}
            data-ocid="admin.modifier.type_select"
            style={inputStyle()}
          >
            {MODIFIER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
            {!MODIFIER_TYPES.some((t) => t.value === cfg.modifierType) &&
              cfg.modifierType && (
                <option value={cfg.modifierType}>
                  {cfg.modifierType} — saved id (not in registry)
                </option>
              )}
          </select>
        </div>
      </div>
      {/* Global settings */}
      <div
        style={{
          background:
            "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          border: `1px solid ${C.goldDim}`,
          borderRadius: 5,
          padding: "10px 14px",
          marginBottom: 14,
        }}
      >
        <p style={{ ...sectionHeadStyle, margin: "0 0 8px" }}>
          Global Modifier Roll Settings
        </p>
        <p style={{ color: C.dim, fontSize: 10, margin: "0 0 8px" }}>
          Only this modifier&apos;s weight (triggerChance) persists on the
          canister. Global trigger % and second-modifier % are not Candid fields
          — reload resets them to engine defaults 20 / 50.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0 12px",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <label
              htmlFor="admin.modifier.globaltrigger_input"
              style={labelStyle}
            >
              Global Trigger % (any mod)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={cfg.globalTriggerChance ?? 20}
              onChange={(e) =>
                set(
                  "globalTriggerChance",
                  Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                )
              }
              data-ocid="admin.modifier.globaltrigger_input"
              style={{ ...inputStyle(), width: "100%" }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label htmlFor="admin.modifier.secondmod_input" style={labelStyle}>
              Second Modifier % (if first triggers)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={cfg.secondModifierChance ?? 50}
              onChange={(e) =>
                set(
                  "secondModifierChance",
                  Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                )
              }
              data-ocid="admin.modifier.secondmod_input"
              style={{ ...inputStyle(), width: "100%" }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label
              htmlFor="admin.modifier.triggerchance_input"
              style={labelStyle}
            >
              This Modifier Weight (%)
            </label>
            <input
              id="admin.modifier.triggerchance_input"
              type="number"
              min={0}
              max={100}
              value={cfg.triggerChance ?? 20}
              onChange={(e) =>
                set(
                  "triggerChance",
                  Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                )
              }
              data-ocid="admin.modifier.triggerchance_input"
              style={{ ...inputStyle(), width: "100%" }}
            />
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          background:
            "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          border: `1px solid ${C.goldDim}`,
          borderRadius: 5,
          padding: "7px 12px",
        }}
      >
        <input
          id="admin.modifier.active_checkbox"
          type="checkbox"
          checked={cfg.active}
          onChange={(e) => set("active", e.target.checked)}
          data-ocid="admin.modifier.active_checkbox"
          style={{ accentColor: C.gold, width: 14, height: 14 }}
        />
        <label
          htmlFor="admin.modifier.active_checkbox"
          style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}
        >
          Eligible for portal modifier roll
        </label>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn
          variant="gold"
          onClick={() => {
            if (!cfg.id.trim() || !cfg.name.trim()) {
              toast.error("Modifier ID and name are required");
              return;
            }
            onSave(cfg);
          }}
          ocid="admin.modifier.save_button"
        >
          {saving ? "Saving\u2026" : "Save Modifier"}
        </Btn>
        <Btn
          variant="ghost"
          onClick={onCancel}
          ocid="admin.modifier.cancel_button"
        >
          Cancel
        </Btn>
      </div>
    </div>
  );
};

const newAchievement = (): AchievementConfig => ({
  id: `achievement_${Date.now()}`,
  name: "",
  description: "",
  dokaReward: 100,
  condition: "first_battle_win",
  active: true,
});

const AchievementEditor: React.FC<{
  initial: AchievementConfig;
  onSave: (c: AchievementConfig) => void;
  onCancel: () => void;
  saving: boolean;
  idLocked?: boolean;
}> = ({ initial, onSave, onCancel, saving, idLocked }) => {
  const [cfg, setCfg] = React.useState<AchievementConfig>(initial);
  const set = <K extends keyof AchievementConfig>(
    k: K,
    v: AchievementConfig[K],
  ) => setCfg((p) => ({ ...p, [k]: v }));

  return (
    <div
      data-ocid="admin.achievement_editor"
      style={{
        background: "linear-gradient(180deg,#13141c,#0e0f16)",
        border: `1px solid ${C.goldDim}`,
        borderRadius: 8,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <p style={sectionHeadStyle}>Achievement Configuration</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <Field
          label="ID"
          value={cfg.id}
          onChange={(v) => set("id", v)}
          ocid="admin.achievement.id_input"
          placeholder="first_battle_win"
          disabled={idLocked}
          hint={
            idLocked
              ? "ID is locked after create — changing it would orphan the live record."
              : undefined
          }
        />
        <Field
          label="Name"
          value={cfg.name}
          onChange={(v) => set("name", v)}
          ocid="admin.achievement.name_input"
          placeholder="First Blood"
        />
      </div>
      <Field
        label="Description"
        value={cfg.description}
        onChange={(v) => set("description", v)}
        ocid="admin.achievement.desc_input"
        placeholder="Win your first battle"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle} htmlFor="ach_doka">
            Doka Reward
          </label>
          <input
            id="ach_doka"
            type="number"
            min={0}
            value={cfg.dokaReward}
            onChange={(e) =>
              set("dokaReward", Math.max(0, Number(e.target.value) || 0))
            }
            data-ocid="admin.achievement.doka_input"
            style={inputStyle()}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle} htmlFor="ach_condition">
            Condition
          </label>
          <select
            id="ach_condition"
            value={cfg.condition}
            onChange={(e) => set("condition", e.target.value)}
            data-ocid="admin.achievement.condition_select"
            style={
              { ...inputStyle(), appearance: "none" } as React.CSSProperties
            }
          >
            {KNOWN_ACHIEVEMENT_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div
        style={{
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <input
          id="ach_active"
          type="checkbox"
          checked={cfg.active}
          onChange={(e) => set("active", e.target.checked)}
          data-ocid="admin.achievement.active_checkbox"
          style={{ accentColor: C.gold, width: 14, height: 14 }}
        />
        <label htmlFor="ach_active" style={{ ...labelStyle, marginBottom: 0 }}>
          Active (visible to players)
        </label>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn
          variant="ghost"
          onClick={onCancel}
          ocid="admin.achievement.cancel_button"
        >
          Cancel
        </Btn>
        <Btn
          variant="gold"
          onClick={() => {
            if (!cfg.id.trim() || !cfg.name.trim()) {
              toast.error("Achievement ID and name are required");
              return;
            }
            const err = validateAchievementConfig(cfg);
            if (err) {
              toast.error(err);
              return;
            }
            onSave(cfg);
          }}
          ocid="admin.achievement.save_button"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Achievement"}
        </Btn>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<{ onBack: () => void; isAdmin?: boolean }> = ({
  onBack,
  isAdmin,
}) => {
  // II-principal based: isAdmin comes from getUserRole() query in App.tsx.
  // No password gate — the backend enforces access control by principal.
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [dashState, setDashState] = useState<AdminDashboardState>({
    tab: "enemies",
    editingEnemyId: null,
    editingRegionId: null,
    editingSpriteId: null,
    editingSpellId: null,
    editingModifierId: null,
    editingAchievementId: null,
    isDirty: false,
  });

  const enemyQ = useGetEnemyConfigs();
  const regionQ = useGetRegionConfigs();
  const spriteQ = useGetPlayerSpriteConfigs();
  const spellQ = useGetSpellConfigs();
  const modifierQ = useGetMapModifiers();
  const gameConfigQ = useGetGameConfig();

  const setEnemyMut = useAdminSetEnemyConfig();
  const delEnemyMut = useAdminDeleteEnemyConfig();
  const setRegionMut = useAdminSetRegionConfig();
  const delRegionMut = useAdminDeleteRegionConfig();
  const setSpriteMut = useAdminSetPlayerSpriteConfig();
  const delSpriteMut = useAdminDeletePlayerSpriteConfig();
  const setSpellMut = useAdminSetSpellConfig();
  const delSpellMut = useAdminDeleteSpellConfig();
  const setModifierMut = useAdminSetMapModifier();
  const delModifierMut = useAdminDeleteMapModifier();
  const setGameConfigMut = useAdminSetGameConfig();
  const achievementQ = useGetAchievementConfigs();
  const setAchievementMut = useAdminSetAchievementConfig();
  const delAchievementMut = useAdminDeleteAchievementConfig();
  const enemyNamesQ = useGetEnemyNames();
  const initDefaultNamesMut = useInitDefaultNames();
  const addEnemyNameMut = useAdminAddEnemyName();
  const delEnemyNameMut = useAdminDeleteEnemyName();
  const [newNameInput, setNewNameInput] = React.useState("");

  // Local state for game config editing
  const [gameConfigDraft, setGameConfigDraft] = useState<AdminGameConfig>({
    leaderBoostPercent: 10,
    dokaSpawnChance: 40,
    dokaSpawnBaseValue: 5,
  });
  const [gameConfigSaved, setGameConfigSaved] = useState(false);
  // Boss Rush controlled state
  const [bossRushConfig, setBossRushConfig] = useState<
    Record<string, boolean | number>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("bossRushConfig") || "{}");
    } catch {
      return {};
    }
  });
  const [bossRushSaved, setBossRushSaved] = useState(false);
  const [shopGrantPrincipalId, setShopGrantPrincipalId] = useState("");
  const [shopBanPrincipalId, setShopBanPrincipalId] = useState("");
  const [shopDokaAmount, setShopDokaAmount] = useState<number>(0);
  const [shopConfirm, setShopConfirm] = useState<
    null | "grant" | "ban" | "unban"
  >(null);
  const [pendingTab, setPendingTab] = useState<
    AdminDashboardState["tab"] | "close" | null
  >(null);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "modifier" | "achievement" | "name";
    id: string;
    label: string;
  } | null>(null);
  const [modifierQuery, setModifierQuery] = useState("");
  const [achievementQuery, setAchievementQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [bannedPrincipals, setBannedPrincipals] = useState<string[]>([]);
  const [bannedLoadError, setBannedLoadError] = useState<string | null>(null);

  const { actor: adminActor } = useActor();

  useEffect(() => {
    const stored = localStorage.getItem("bossRushConfig");
    if (stored) {
      try {
        setBossRushConfig(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
    (async () => {
      try {
        const result = await (
          adminActor as unknown as backendInterface
        ).getBossRushConfig();
        const cfg = result && Array.isArray(result) ? result[0] : result;
        if (cfg) {
          try {
            setBossRushConfig(JSON.parse(cfg as string));
          } catch (_) {}
        }
      } catch (err) {
        console.error("Failed to load boss rush config:", err);
      }
    })();
  }, [adminActor]);

  useEffect(() => {
    if (gameConfigQ.data) setGameConfigDraft(gameConfigQ.data);
  }, [gameConfigQ.data]);

  const loadBanned = useCallback(async () => {
    if (!adminActor || !isAdmin) return;
    try {
      const result = await (
        adminActor as unknown as backendInterface
      ).getBannedPrincipals();
      const list = readPrincipalListResult(result, "getBannedPrincipals");
      setBannedPrincipals(list);
      setBannedLoadError(null);
    } catch (err) {
      setBannedLoadError(err instanceof Error ? err.message : String(err));
    }
  }, [adminActor, isAdmin]);

  useEffect(() => {
    void loadBanned();
  }, [loadBanned]);

  const hasOpenEditor =
    dashState.editingEnemyId != null ||
    dashState.editingRegionId != null ||
    dashState.editingSpellId != null ||
    dashState.editingModifierId != null ||
    dashState.editingAchievementId != null ||
    dashState.editingSpriteId != null;

  const applyTab = (tab: AdminDashboardState["tab"]) =>
    setDashState((p) => ({
      ...p,
      tab,
      editingEnemyId: null,
      editingRegionId: null,
      editingSpriteId: null,
      editingSpellId: null,
      editingModifierId: null,
      editingAchievementId: null,
    }));

  const setTab = (tab: AdminDashboardState["tab"]) => {
    if (hasOpenEditor && tab !== dashState.tab) {
      setPendingTab(tab);
      return;
    }
    applyTab(tab);
  };

  const requestClose = () => {
    if (hasOpenEditor) {
      setPendingTab("close");
      return;
    }
    onBack();
  };

  const enemies = enemyQ.data ?? [];
  const regions = regionQ.data ?? [];
  const sprites = spriteQ.data ?? [];
  const spells = spellQ.data ?? [];
  const modifiers = modifierQ.data ?? [];
  const visibleModifiers = modifiers.filter((m) =>
    matchesQuery(modifierQuery, m.name, m.id, m.modifierType),
  );
  const achievements = achievementQ.data ?? [];
  const visibleAchievements = achievements.filter((a) =>
    matchesQuery(achievementQuery, a.name, a.id, a.condition),
  );
  const enemyNames = enemyNamesQ.data ?? [];
  const visibleEnemyNames = enemyNames.filter((n) =>
    matchesQuery(nameQuery, n),
  );

  const editingEnemy =
    dashState.editingEnemyId === "__new__"
      ? newEnemy()
      : (enemies.find((e) => e.id === dashState.editingEnemyId) ?? null);
  const editingRegion =
    dashState.editingRegionId === "__new__"
      ? newRegion()
      : (regions.find((r) => r.id === dashState.editingRegionId) ?? null);
  const editingSpell =
    dashState.editingSpellId === "__new__"
      ? newSpell()
      : (spells.find((s) => s.id === dashState.editingSpellId) ?? null);

  // ── Access gate: only the admin II-principal can proceed ─────────────────────
  if (!isAdmin) {
    return (
      <div
        data-ocid="admin.access_denied"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(5,6,14,0.97)",
          zIndex: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            background: "linear-gradient(180deg,#13141c,#0e0f16)",
            border: `1px solid ${C.gold}`,
            borderRadius: 12,
            padding: "36px 40px",
            minWidth: 340,
            maxWidth: 420,
            width: "90%",
            textAlign: "center",
            boxShadow:
              "0 0 60px rgba(192,57,43,0.2), 0 20px 40px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 16 }}>🛡️</div>
          <h2
            style={{
              color: "#f0c44a",
              margin: "0 0 12px",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Admin Access Required
          </h2>
          <p style={{ color: "#8a8090", fontSize: 13, marginBottom: 24 }}>
            Access is role-based. The first Internet Identity to call
            getUserRole becomes admin; Settings can grant more. Log in with an
            admin identity to continue.
          </p>
          <Btn
            variant="ghost"
            onClick={onBack}
            ocid="admin.access_denied.back_button"
          >
            ← Back to Game
          </Btn>
        </div>
      </div>
    );
  }

  // ── tab labels ────────────────────────────────────────────────────────────────
  const TABS: {
    key: AdminDashboardState["tab"];
    label: string;
    icon: string;
  }[] = [
    { key: "enemies", label: "Enemies", icon: "⚔️" },
    { key: "regions", label: "Regions", icon: "\uD83D\uDDFA\uFE0F" },
    { key: "sprites", label: "Player Sprites", icon: "\u265F\uFE0F" },
    { key: "spells", label: "Spells", icon: "\u26A1" },
    { key: "modifiers", label: "Map Modifiers", icon: "\uD83C\uDF00" },
    { key: "tiers", label: "Enemy Tiers", icon: "\uD83C\uDFAF" },
    { key: "visuals", label: "Visuals", icon: "\uD83C\uDFA8" },
    { key: "settings", label: "Settings", icon: "\u2699\uFE0F" },
    { key: "purchases", label: "Purchases", icon: "\uD83E\uDDFE" },
    { key: "achievements", label: "Achievements", icon: "\uD83C\uDFC6" },
    { key: "names", label: "Enemy Names", icon: "\uD83D\uDCDB" },
    { key: "bosses", label: "Bosses", icon: "👹" },
    { key: "ads", label: "Ad Boxes", icon: "📢" },
    { key: "shop", label: "Shop", icon: "🛒" },
    { key: "bossRush", label: "Boss Rush", icon: "⚔️" },
  ];

  const anyPending =
    setEnemyMut.isPending ||
    delEnemyMut.isPending ||
    setRegionMut.isPending ||
    delRegionMut.isPending ||
    setSpriteMut.isPending ||
    delSpriteMut.isPending ||
    setSpellMut.isPending ||
    delSpellMut.isPending ||
    setModifierMut.isPending ||
    delModifierMut.isPending;

  // ── dashboard ─────────────────────────────────────────────────────────────────
  return (
    <div
      data-ocid="admin.dashboard"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,6,14,0.97)",
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {saveStatus && (
        <div
          style={{
            position: "fixed",
            top: 60,
            right: 16,
            zIndex: 9999,
            background: saveStatus.includes("failed") ? "#8B0000" : "#006400",
            color: "white",
            padding: "8px 16px",
            borderRadius: 4,
            fontSize: 13,
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          {saveStatus}
        </div>
      )}
      {pendingTab && (
        <ConfirmDialog
          title="Leave this editor?"
          body="Unsaved edits in the open form will be discarded. Save first if you want to keep them."
          confirmLabel={
            pendingTab === "close" ? "Leave dashboard" : "Leave editor"
          }
          ocidPrefix="admin.unsaved"
          onCancel={() => setPendingTab(null)}
          onConfirm={() => {
            const next = pendingTab;
            setPendingTab(null);
            if (next === "close") onBack();
            else applyTab(next);
          }}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title={`Delete ${pendingDelete.label}?`}
          body={
            pendingDelete.kind === "name"
              ? "This removes the name from the live enemy-name pool immediately."
              : "This removes the live configuration immediately. This cannot be undone."
          }
          ocidPrefix={`admin.${pendingDelete.kind}s.delete`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const { kind, id } = pendingDelete;
            setPendingDelete(null);
            if (kind === "modifier") {
              delModifierMut.mutate(id, {
                onSuccess: () => toast.success("Modifier deleted"),
                onError: () => toast.error("Failed to delete modifier"),
              });
            } else if (kind === "achievement") {
              delAchievementMut.mutate(id, {
                onSuccess: () => toast.success("Achievement deleted"),
                onError: () => toast.error("Failed to delete"),
              });
            } else {
              delEnemyNameMut.mutate(id, {
                onSuccess: () => toast.success(`Removed "${id}"`),
                onError: () => toast.error("Failed to remove name"),
              });
            }
          }}
        />
      )}
      {shopConfirm === "grant" && (
        <ConfirmDialog
          title={`Grant ${shopDokaAmount} Doka?`}
          body={`This credits ${shopDokaAmount} Doka to ${shopGrantPrincipalId} immediately. There is no undo.`}
          confirmLabel="Grant Doka"
          ocidPrefix="admin.shop.grant"
          onCancel={() => setShopConfirm(null)}
          onConfirm={() => {
            setShopConfirm(null);
            void (async () => {
              try {
                const result = await (
                  adminActor as unknown as backendInterface
                ).adminAddDokaToUser(
                  Principal.fromText(shopGrantPrincipalId),
                  BigInt(Number(shopDokaAmount) || 0),
                  null,
                );
                assertAdminCmdOk(result, "adminAddDokaToUser");
                toast.success(
                  `Granted ${shopDokaAmount} Doka to ${shopGrantPrincipalId}`,
                );
                setSaveStatus("Saved");
                setTimeout(() => setSaveStatus(null), 3000);
              } catch (err) {
                toast.error(`Failed to grant Doka: ${String(err)}`);
                setSaveStatus(`Save failed: ${String(err)}`);
              }
            })();
          }}
        />
      )}
      {shopConfirm === "ban" && (
        <ConfirmDialog
          title={`Ban ${shopBanPrincipalId}?`}
          body="Banned principals fail purchases, buffs, achievement claims, boss rush, and Doka awards. Existing achievement progress is kept so claimed rewards cannot be claimed again after unban."
          confirmLabel="Ban player"
          ocidPrefix="admin.shop.ban"
          onCancel={() => setShopConfirm(null)}
          onConfirm={() => {
            setShopConfirm(null);
            void (async () => {
              try {
                const result = await (
                  adminActor as unknown as backendInterface
                ).adminBanAccount(Principal.fromText(shopBanPrincipalId));
                assertAdminCmdOk(result, "adminBanAccount");
                toast.success(`Banned ${shopBanPrincipalId}`);
                setSaveStatus("Saved");
                setTimeout(() => setSaveStatus(null), 3000);
                void loadBanned();
              } catch (err) {
                toast.error(`Failed to ban player: ${String(err)}`);
                setSaveStatus(`Save failed: ${String(err)}`);
              }
            })();
          }}
        />
      )}
      {shopConfirm === "unban" && (
        <ConfirmDialog
          title={`Unban ${shopBanPrincipalId}?`}
          body="This restores purchases, buffs, achievement claims, boss rush, and Doka awards for this principal. Achievement progress was kept on ban, so claimed rewards stay claimed."
          confirmLabel="Unban player"
          ocidPrefix="admin.shop.unban"
          onCancel={() => setShopConfirm(null)}
          onConfirm={() => {
            setShopConfirm(null);
            void (async () => {
              try {
                const result = await (
                  adminActor as unknown as backendInterface
                ).adminUnbanAccount(Principal.fromText(shopBanPrincipalId));
                assertAdminCmdOk(result, "adminUnbanAccount");
                toast.success(`Unbanned ${shopBanPrincipalId}`);
                setSaveStatus("Saved");
                setTimeout(() => setSaveStatus(null), 3000);
                void loadBanned();
              } catch (err) {
                toast.error(`Failed to unban player: ${String(err)}`);
                setSaveStatus(`Save failed: ${String(err)}`);
              }
            })();
          }}
        />
      )}
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          height: 52,
          flexShrink: 0,
          background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
          borderBottom: `1px solid ${C.goldDim}`,
          boxShadow: "0 2px 16px rgba(192,57,43,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 18,
              filter: "drop-shadow(0 0 6px rgba(192,57,43,0.5))",
            }}
          >
            🛡️
          </span>
          <div>
            <span
              style={{
                color: "#f0c44a",
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Admin Dashboard
            </span>
            <span
              style={{
                color: "#8a8090",
                fontSize: 10,
                marginLeft: 10,
                letterSpacing: "0.06em",
              }}
            >
              ÆSTRALTØ
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {anyPending && (
            <span
              data-ocid="admin.loading_state"
              style={{
                color: "#f0c44a",
                fontSize: 11,
                letterSpacing: "0.06em",
                animation: "pulse 1.5s infinite",
              }}
            >
              ● Saving…
            </span>
          )}
          <Btn variant="ghost" onClick={requestClose} ocid="admin.close_button">
            ← Back to Game
          </Btn>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar tabs */}
        <div
          style={{
            width: 180,
            flexShrink: 0,
            background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
            borderRight: `1px solid ${C.goldDim}`,
            padding: "16px 0",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            overflowY: "auto",
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              data-ocid={`admin.tab.${t.key}`}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                cursor: "pointer",
                border: "none",
                borderLeft: `3px solid ${
                  dashState.tab === t.key ? C.gold : "transparent"
                }`,
                background:
                  dashState.tab === t.key
                    ? `linear-gradient(90deg, ${C.gold}14, transparent)`
                    : "transparent",
                color: dashState.tab === t.key ? C.goldBright : C.dim,
                fontSize: 12,
                fontWeight: dashState.tab === t.key ? 700 : 500,
                letterSpacing: "0.05em",
                textAlign: "left",
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                transition: "all 0.15s",
                width: "100%",
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}

          {/* Stats summary */}
          <div
            style={{
              marginTop: "auto",
              padding: "16px 20px 8px",
              borderTop: `1px solid ${C.goldDim}`,
            }}
          >
            {[
              ["Enemies", enemies.length],
              ["Regions", regions.length],
              ["Sprites", sprites.length],
              ["Spells", spells.length],
              ["Achievements", (achievementQ.data ?? []).length],
              ["Modifiers", modifiers.length],
            ].map(([label, count]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <span style={{ color: "#8a8090", fontSize: 10 }}>{label}</span>
                <span
                  style={{
                    color: "#f0c44a",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content pane */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            background:
              "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          }}
        >
          {/* ENEMIES */}
          {dashState.tab === "enemies" &&
            (enemyQ.isError ? (
              <TabErrorBanner
                tabName="Enemies"
                onRetry={() => enemyQ.refetch()}
              />
            ) : editingEnemy ? (
              <EnemyEditor
                initial={editingEnemy}
                regions={regions}
                idLocked={dashState.editingEnemyId !== "__new__"}
                saving={setEnemyMut.isPending}
                onSave={(cfg) => {
                  setEnemyMut.mutate(cfg, {
                    onSuccess: () => {
                      toast.success(`Enemy "${cfg.name || cfg.id}" saved`);
                      setDashState((p) => ({ ...p, editingEnemyId: null }));
                    },
                    onError: () => toast.error("Failed to save enemy"),
                  });
                }}
                onCancel={() =>
                  setDashState((p) => ({ ...p, editingEnemyId: null }))
                }
              />
            ) : (
              <EnemyList
                enemies={enemies}
                loading={enemyQ.isLoading}
                onAdd={() =>
                  setDashState((p) => ({
                    ...p,
                    editingEnemyId: "__new__",
                  }))
                }
                onEdit={(id) =>
                  setDashState((p) => ({ ...p, editingEnemyId: id }))
                }
                onDelete={(id) => {
                  delEnemyMut.mutate(id, {
                    onSuccess: () => toast.success("Enemy deleted"),
                    onError: () => toast.error("Failed to delete enemy"),
                  });
                }}
              />
            ))}

          {/* REGIONS */}
          {dashState.tab === "regions" &&
            (regionQ.isError ? (
              <TabErrorBanner
                tabName="Regions"
                onRetry={() => regionQ.refetch()}
              />
            ) : editingRegion ? (
              <RegionEditor
                initial={editingRegion}
                idLocked={dashState.editingRegionId !== "__new__"}
                saving={setRegionMut.isPending}
                onSave={(cfg) => {
                  setRegionMut.mutate(cfg, {
                    onSuccess: () => {
                      toast.success(`Region "${cfg.name || cfg.id}" saved`);
                      setDashState((p) => ({ ...p, editingRegionId: null }));
                    },
                    onError: () => toast.error("Failed to save region"),
                  });
                }}
                onCancel={() =>
                  setDashState((p) => ({ ...p, editingRegionId: null }))
                }
              />
            ) : (
              <RegionList
                regions={regions}
                loading={regionQ.isLoading}
                onAdd={() =>
                  setDashState((p) => ({
                    ...p,
                    editingRegionId: "__new__",
                  }))
                }
                onEdit={(id) =>
                  setDashState((p) => ({ ...p, editingRegionId: id }))
                }
                onDelete={(id) => {
                  delRegionMut.mutate(id, {
                    onSuccess: () => toast.success("Region deleted"),
                    onError: () => toast.error("Failed to delete region"),
                  });
                }}
              />
            ))}

          {/* SPRITES — DOFUS two-column panel */}
          {dashState.tab === "sprites" &&
            (spriteQ.isError ? (
              <TabErrorBanner
                tabName="Player Sprites"
                onRetry={() => spriteQ.refetch()}
              />
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <SpriteList
                  sprites={sprites}
                  loading={spriteQ.isLoading}
                  saving={setSpriteMut.isPending || delSpriteMut.isPending}
                  onEditorOpenChange={(id) =>
                    setDashState((p) =>
                      p.editingSpriteId === id
                        ? p
                        : { ...p, editingSpriteId: id },
                    )
                  }
                  onSave={(cfg) => {
                    const walkErr =
                      validateWalkFrameUrls(cfg.walkFramesFront) ??
                      validateWalkFrameUrls(cfg.walkFramesRight) ??
                      validateWalkFrameUrls(cfg.walkFramesLeft) ??
                      validateWalkFrameUrls(cfg.walkFramesBack) ??
                      validateOptionalUrl("frontUrl", cfg.frontUrl[0] ?? "") ??
                      validateOptionalUrl("rightUrl", cfg.rightUrl[0] ?? "") ??
                      validateOptionalUrl("leftUrl", cfg.leftUrl[0] ?? "") ??
                      validateOptionalUrl("backUrl", cfg.backUrl[0] ?? "");
                    if (walkErr) {
                      toast.error(walkErr);
                      return;
                    }
                    setSpriteMut.mutate(cfg, {
                      onSuccess: () =>
                        toast.success(
                          `Character "${cfg.name || cfg.id}" saved`,
                        ),
                      onError: () => toast.error("Failed to save character"),
                    });
                  }}
                  onDelete={(id) => {
                    delSpriteMut.mutate(id, {
                      onSuccess: () => toast.success("Character deleted"),
                      onError: () => toast.error("Failed to delete character"),
                    });
                  }}
                />
              </div>
            ))}

          {/* SPELLS */}
          {dashState.tab === "spells" &&
            (spellQ.isError ? (
              <TabErrorBanner
                tabName="Spells"
                onRetry={() => spellQ.refetch()}
              />
            ) : editingSpell ? (
              <SpellEditor
                initial={editingSpell}
                idLocked={dashState.editingSpellId !== "__new__"}
                saving={setSpellMut.isPending}
                onSave={(cfg) => {
                  setSpellMut.mutate(cfg, {
                    onSuccess: () => {
                      toast.success(`Spell "${cfg.name || cfg.id}" saved`);
                      setDashState((p) => ({ ...p, editingSpellId: null }));
                    },
                    onError: () => toast.error("Failed to save spell"),
                  });
                }}
                onCancel={() =>
                  setDashState((p) => ({ ...p, editingSpellId: null }))
                }
              />
            ) : (
              <SpellList
                spells={spells}
                loading={spellQ.isLoading}
                onAdd={() =>
                  setDashState((p) => ({ ...p, editingSpellId: "__new__" }))
                }
                onEdit={(id) =>
                  setDashState((p) => ({ ...p, editingSpellId: id }))
                }
                onDelete={(id) => {
                  delSpellMut.mutate(id, {
                    onSuccess: () => toast.success("Spell deleted"),
                    onError: () => toast.error("Failed to delete spell"),
                  });
                }}
              />
            ))}

          {/* SETTINGS */}
          {dashState.tab === "settings" && <SettingsTab />}

          {/* VISUALS */}
          {dashState.tab === "visuals" && <VisualsTab />}

          {/* ENEMY TIERS */}
          {dashState.tab === "tiers" && <TierConfigTab />}

          {/* PURCHASES */}
          {dashState.tab === "purchases" && <AdminGameKeyPurchases />}

          {/* MAP MODIFIERS */}
          {dashState.tab === "modifiers" && (
            <div data-ocid="admin.modifiers_tab" style={{ padding: 20 }}>
              {modifierQ.isError && (
                <TabErrorBanner
                  tabName="Map Modifiers"
                  onRetry={() => modifierQ.refetch()}
                />
              )}
              <CatalogNote>
                Active means eligible for the portal roll, not always-on every
                map. Registry ids are selectable. Global/second chances shown in
                the editor are not stored on MapModifierConfig.
              </CatalogNote>
              {/* Doka Spawn Config */}
              <div
                data-ocid="admin.doka_spawn_config"
                style={{
                  background:
                    "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                  border: `1px solid ${C.goldDim}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  marginBottom: 18,
                }}
              >
                <p style={sectionHeadStyle}>Ground Doka &amp; Leader Config</p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0 16px",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <label htmlFor="doka_spawn_chance" style={labelStyle}>
                      Spawn Chance (%)
                    </label>
                    <input
                      id="doka_spawn_chance"
                      type="number"
                      min={0}
                      max={100}
                      value={gameConfigDraft.dokaSpawnChance}
                      onChange={(e) =>
                        setGameConfigDraft((p) => ({
                          ...p,
                          dokaSpawnChance: Math.max(
                            0,
                            Math.min(100, Number(e.target.value) || 0),
                          ),
                        }))
                      }
                      data-ocid="admin.doka.spawn_chance_input"
                      style={inputStyle()}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label htmlFor="doka_spawn_base" style={labelStyle}>
                      Base Doka Value
                    </label>
                    <input
                      id="doka_spawn_base"
                      type="number"
                      min={1}
                      value={gameConfigDraft.dokaSpawnBaseValue}
                      onChange={(e) =>
                        setGameConfigDraft((p) => ({
                          ...p,
                          dokaSpawnBaseValue: Math.max(
                            1,
                            Math.min(10000, Number(e.target.value) || 1),
                          ),
                        }))
                      }
                      data-ocid="admin.doka.spawn_base_input"
                      style={inputStyle()}
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label htmlFor="leader_boost" style={labelStyle}>
                      Leader Boost per Death (%)
                    </label>
                    <input
                      id="leader_boost"
                      type="number"
                      min={0}
                      value={gameConfigDraft.leaderBoostPercent}
                      onChange={(e) =>
                        setGameConfigDraft((p) => ({
                          ...p,
                          leaderBoostPercent: Math.max(
                            0,
                            Math.min(100, Number(e.target.value) || 0),
                          ),
                        }))
                      }
                      data-ocid="admin.doka.leader_boost_input"
                      style={inputStyle()}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Btn
                    variant="gold"
                    onClick={() => {
                      const gameErr = validateGameConfig(gameConfigDraft);
                      if (gameErr) {
                        toast.error(gameErr);
                        return;
                      }
                      setGameConfigMut.mutate(gameConfigDraft, {
                        onSuccess: () => {
                          setGameConfigSaved(true);
                          setTimeout(() => setGameConfigSaved(false), 2000);
                        },
                        onError: () =>
                          toast.error("Failed to save game config"),
                      });
                    }}
                    ocid="admin.doka.save_config_button"
                    disabled={setGameConfigMut.isPending}
                  >
                    {setGameConfigMut.isPending ? "Saving…" : "Save Config"}
                  </Btn>
                  {gameConfigSaved && (
                    <span
                      style={{
                        color: "#56d18a",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      ✓ Saved!
                    </span>
                  )}
                </div>
              </div>

              {/* Global chance info box */}
              <div
                style={{
                  background:
                    "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                  border: `1px solid ${C.goldDim}`,
                  borderRadius: 7,
                  padding: "10px 14px",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18 }}>🌀</span>
                <div>
                  <div
                    style={{
                      color: "#f0c44a",
                      fontWeight: 700,
                      fontSize: 12,
                      marginBottom: 2,
                    }}
                  >
                    Global Modifier System
                  </div>
                  <div style={{ color: "#8a8090", fontSize: 11 }}>
                    Each active modifier has its own trigger chance (%). When
                    the player enters a new map through a portal, each modifier
                    independently rolls against its chance. Default: 20%. Set a
                    modifier's trigger chance in the editor below.
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3
                    style={{
                      color: "#f0c44a",
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                    }}
                  >
                    Map Modifiers
                  </h3>
                  <p
                    style={{
                      color: "#8a8090",
                      fontSize: 11,
                      margin: "3px 0 0",
                    }}
                  >
                    {modifiers.length} modifier
                    {modifiers.length === 1 ? "" : "s"} defined
                    {modifierQuery.trim()
                      ? ` · ${visibleModifiers.length} shown`
                      : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <ListSearch
                    value={modifierQuery}
                    onChange={setModifierQuery}
                    placeholder="Filter modifiers…"
                    ocid="admin.modifiers.search_input"
                  />
                  <Btn
                    variant="gold"
                    onClick={() =>
                      setDashState((p) => ({
                        ...p,
                        editingModifierId: "__new__",
                      }))
                    }
                    ocid="admin.modifiers.add_button"
                  >
                    + Add Modifier
                  </Btn>
                </div>
              </div>

              {dashState.editingModifierId ? (
                <div
                  style={{
                    background: "linear-gradient(180deg,#13141c,#0e0f16)",
                    border: `1px solid ${C.goldDim}`,
                    borderRadius: 8,
                    padding: 20,
                  }}
                >
                  <ModifierEditor
                    idLocked={dashState.editingModifierId !== "__new__"}
                    initial={
                      dashState.editingModifierId === "__new__"
                        ? {
                            id: `mod_${Date.now()}`,
                            name: "",
                            description: "",
                            modifierType: "slime_flood",
                            active: true,
                          }
                        : (modifiers.find(
                            (m) => m.id === dashState.editingModifierId,
                          ) ?? {
                            id: `mod_${Date.now()}`,
                            name: "",
                            description: "",
                            modifierType: "slime_flood",
                            active: true,
                          })
                    }
                    saving={setModifierMut.isPending}
                    onSave={(cfg) => {
                      setModifierMut.mutate(cfg, {
                        onSuccess: () => {
                          toast.success(`Modifier "${cfg.name}" saved`);
                          setDashState((p) => ({
                            ...p,
                            editingModifierId: null,
                          }));
                        },
                        onError: () => toast.error("Failed to save modifier"),
                      });
                    }}
                    onCancel={() =>
                      setDashState((p) => ({
                        ...p,
                        editingModifierId: null,
                      }))
                    }
                  />
                </div>
              ) : (
                <div>
                  {modifierQ.isLoading && (
                    <div
                      style={{
                        color: "#8a8090",
                        fontSize: 12,
                        textAlign: "center",
                        padding: 24,
                      }}
                    >
                      Loading modifiers\u2026
                    </div>
                  )}
                  {!modifierQ.isLoading && modifiers.length === 0 && (
                    <div
                      data-ocid="admin.modifiers.empty_state"
                      style={{
                        textAlign: "center",
                        padding: "40px 0",
                        color: "#6a6070",
                        fontSize: 13,
                        border: `1px dashed ${C.dimmer}`,
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>
                        \uD83C\uDF00
                      </div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        No modifiers yet
                      </div>
                      <div style={{ fontSize: 11 }}>
                        Add Slime Flood, Paper Windstorm, or custom modifiers
                      </div>
                    </div>
                  )}
                  {!modifierQ.isLoading &&
                    modifiers.length > 0 &&
                    visibleModifiers.length === 0 && (
                      <div
                        data-ocid="admin.modifiers.no_match"
                        style={{
                          textAlign: "center",
                          padding: "24px 0",
                          color: "#6a6070",
                          fontSize: 12,
                        }}
                      >
                        No modifiers match “{modifierQuery}”
                      </div>
                    )}
                  {visibleModifiers.map((mod, i) => (
                    <PanelCard key={mod.id}>
                      <div
                        data-ocid={`admin.modifiers.item.${i + 1}`}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          padding: "10px 14px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              color: "#c0ccd8",
                              fontWeight: 700,
                              fontSize: 13,
                              marginBottom: 2,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            {mod.name || mod.id}
                            <span
                              style={{
                                background: mod.active
                                  ? `${C.green}22`
                                  : `${C.red}22`,
                                border: `1px solid ${
                                  mod.active ? C.green : C.red
                                }44`,
                                color: mod.active ? C.green : C.red,
                                fontSize: 9,
                                padding: "1px 6px",
                                borderRadius: 20,
                              }}
                            >
                              {mod.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div style={{ color: "#8a8090", fontSize: 11 }}>
                            {mod.description}
                          </div>
                          <div
                            style={{
                              background: `${C.gold}18`,
                              border: `1px solid ${C.goldDim}`,
                              borderRadius: 20,
                              padding: "1px 7px",
                              fontSize: 10,
                              color: "#f0c44a",
                              display: "inline-block",
                              marginTop: 4,
                            }}
                          >
                            {mod.modifierType}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Btn
                            variant="ghost"
                            small
                            onClick={() =>
                              setDashState((p) => ({
                                ...p,
                                editingModifierId: mod.id,
                              }))
                            }
                            ocid={`admin.modifiers.edit_button.${i + 1}`}
                          >
                            Edit
                          </Btn>
                          <Btn
                            variant="red"
                            small
                            onClick={() =>
                              setPendingDelete({
                                kind: "modifier",
                                id: mod.id,
                                label: mod.name || mod.id,
                              })
                            }
                            ocid={`admin.modifiers.delete_button.${i + 1}`}
                          >
                            \u00D7
                          </Btn>
                        </div>
                      </div>
                    </PanelCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACHIEVEMENTS */}
          {dashState.tab === "achievements" && (
            <div data-ocid="admin.achievements_tab" style={{ padding: 20 }}>
              {achievementQ.isError && (
                <TabErrorBanner
                  tabName="Achievements"
                  onRetry={() => achievementQ.refetch()}
                />
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div>
                  <h3
                    style={{
                      color: "#f0c44a",
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                    }}
                  >
                    Achievements
                  </h3>
                  <p
                    style={{
                      color: "#8a8090",
                      fontSize: 11,
                      margin: "4px 0 0",
                    }}
                  >
                    Configure player achievements and Doka rewards
                    {achievementQuery.trim()
                      ? ` · ${visibleAchievements.length} shown`
                      : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <ListSearch
                    value={achievementQuery}
                    onChange={setAchievementQuery}
                    placeholder="Filter achievements…"
                    ocid="admin.achievements.search_input"
                  />
                  <Btn
                    variant="gold"
                    small
                    ocid="admin.achievements.add_button"
                    onClick={() =>
                      setDashState((p) => ({
                        ...p,
                        editingAchievementId: "__new__",
                      }))
                    }
                  >
                    + New Achievement
                  </Btn>
                </div>
              </div>

              {/* Editor */}
              {dashState.editingAchievementId && (
                <AchievementEditor
                  idLocked={dashState.editingAchievementId !== "__new__"}
                  initial={
                    dashState.editingAchievementId === "__new__"
                      ? newAchievement()
                      : ((achievementQ.data ?? []).find(
                          (a) => a.id === dashState.editingAchievementId,
                        ) ?? newAchievement())
                  }
                  onSave={(cfg) =>
                    setAchievementMut.mutate(cfg, {
                      onSuccess: () => {
                        toast.success("Achievement saved");
                        setDashState((p) => ({
                          ...p,
                          editingAchievementId: null,
                        }));
                      },
                      onError: () => toast.error("Failed to save achievement"),
                    })
                  }
                  onCancel={() =>
                    setDashState((p) => ({ ...p, editingAchievementId: null }))
                  }
                  saving={setAchievementMut.isPending}
                />
              )}

              {!dashState.editingAchievementId && (
                <div>
                  {achievementQ.isLoading && (
                    <div
                      data-ocid="admin.achievements.loading_state"
                      style={{ padding: 40, textAlign: "center", color: C.dim }}
                    >
                      Loading…
                    </div>
                  )}
                  {!achievementQ.isLoading && achievements.length === 0 && (
                    <div
                      data-ocid="admin.achievements.empty_state"
                      style={{
                        textAlign: "center",
                        padding: "40px 0",
                        color: "#6a6070",
                        fontSize: 13,
                        border: `1px dashed ${C.dimmer}`,
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        No achievements yet
                      </div>
                      <div style={{ fontSize: 11 }}>
                        Add achievements with Doka rewards for players to unlock
                      </div>
                    </div>
                  )}
                  {!achievementQ.isLoading &&
                    achievements.length > 0 &&
                    visibleAchievements.length === 0 && (
                      <div
                        data-ocid="admin.achievements.no_match"
                        style={{
                          textAlign: "center",
                          padding: "24px 0",
                          color: "#6a6070",
                          fontSize: 12,
                        }}
                      >
                        No achievements match “{achievementQuery}”
                      </div>
                    )}
                  {visibleAchievements.map((ach, i) => (
                    <PanelCard key={ach.id}>
                      <div
                        data-ocid={`admin.achievements.item.${i + 1}`}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          padding: "10px 14px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              color: "#c0ccd8",
                              fontWeight: 700,
                              fontSize: 13,
                              marginBottom: 2,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            {ach.name}
                            <span
                              style={{
                                background: ach.active
                                  ? `${C.green}22`
                                  : `${C.red}22`,
                                border: `1px solid ${ach.active ? C.green : C.red}44`,
                                color: ach.active ? C.green : C.red,
                                fontSize: 9,
                                padding: "1px 6px",
                                borderRadius: 20,
                              }}
                            >
                              {ach.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div
                            style={{
                              color: "#8a8090",
                              fontSize: 11,
                              marginBottom: 4,
                            }}
                          >
                            {ach.description}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <span
                              style={{
                                background: `${C.gold}18`,
                                border: `1px solid ${C.goldDim}`,
                                borderRadius: 20,
                                padding: "1px 7px",
                                fontSize: 10,
                                color: "#f0c44a",
                              }}
                            >
                              🪙 {ach.dokaReward.toLocaleString()} Doka
                            </span>
                            <span
                              style={{
                                background: "rgba(74,154,223,0.12)",
                                border: "1px solid rgba(74,154,223,0.3)",
                                borderRadius: 20,
                                padding: "1px 7px",
                                fontSize: 10,
                                color: C.blue,
                              }}
                            >
                              {ach.condition}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Btn
                            variant="ghost"
                            small
                            onClick={() =>
                              setDashState((p) => ({
                                ...p,
                                editingAchievementId: ach.id,
                              }))
                            }
                            ocid={`admin.achievements.edit_button.${i + 1}`}
                          >
                            Edit
                          </Btn>
                          <Btn
                            variant="red"
                            small
                            onClick={() =>
                              setPendingDelete({
                                kind: "achievement",
                                id: ach.id,
                                label: ach.name || ach.id,
                              })
                            }
                            ocid={`admin.achievements.delete_button.${i + 1}`}
                          >
                            ×
                          </Btn>
                        </div>
                      </div>
                    </PanelCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ENEMY NAMES */}

          {dashState.tab === "bosses" && <BossesTab spells={spells} />}

          {dashState.tab === "ads" && (
            <div data-ocid="admin.ads_tab" style={{ padding: 20 }}>
              <h3
                style={{
                  color: C.gold,
                  margin: "0 0 6px",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                }}
              >
                Advertisement Boxes
              </h3>
              <p
                style={{
                  color: C.dim,
                  fontSize: 11,
                  marginBottom: 18,
                  lineHeight: 1.5,
                }}
              >
                Three landing-page slots. Empty image + empty link is valid: the
                box stays hidden. Save requires both URLs; use Clear to revert
                to the hidden default.
              </p>
              <AdBoxEditor index={0} />
              <AdBoxEditor index={1} />
              <AdBoxEditor index={2} />
            </div>
          )}

          {dashState.tab === "shop" && (
            <div data-ocid="admin.shop_tab" style={{ padding: 20 }}>
              <h3
                style={{
                  color: C.gold,
                  margin: "0 0 6px",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                }}
              >
                Shop / Wallet Ops
              </h3>
              <CatalogNote>
                Players buy Doka with a Mollie payment + GameKey request.
                Incoming requests live on the Purchases tab. Grant and ban use
                separate principal fields and write live — there is no undo.
              </CatalogNote>
              <div
                style={{
                  background:
                    "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                  border: `1px solid ${C.goldDim}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <p style={sectionHeadStyle}>GameKey / Mollie</p>
                <p style={{ color: C.dim, fontSize: 11, margin: 0 }}>
                  Multi-tier Doka packages are retired. Players pay any euro
                  amount on Mollie, submit a request, and redeem a 120-character
                  GameKey after you approve it on Purchases (1000 Doka = 10€).
                </p>
              </div>
              <div
                style={{
                  background:
                    "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                  border: `1px solid ${C.goldDim}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <p style={sectionHeadStyle}>Manual Doka Grant</p>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <Field
                      label="Grant principal"
                      value={shopGrantPrincipalId}
                      onChange={setShopGrantPrincipalId}
                      ocid="admin.shop.grant_principal_input"
                      placeholder="Principal to credit"
                    />
                  </div>
                  <div style={{ width: 120 }}>
                    <Field
                      label="Amount"
                      type="number"
                      value={String(shopDokaAmount)}
                      onChange={(v) =>
                        setShopDokaAmount(Number.parseInt(v) || 0)
                      }
                      ocid="admin.shop.grant_amount_input"
                    />
                  </div>
                  <Btn
                    variant="gold"
                    onClick={() => {
                      const grantErr = validateDokaGrant(shopDokaAmount);
                      if (!shopGrantPrincipalId || grantErr) {
                        toast.error(grantErr ?? "Enter a principal and amount");
                        return;
                      }
                      if (shopDokaAmount > MAX_DOKA_GRANT) {
                        toast.error("Grant amount exceeds maximum");
                        return;
                      }
                      setShopConfirm("grant");
                    }}
                    ocid="admin.shop.grant_button"
                  >
                    Grant
                  </Btn>
                </div>
              </div>
              <div
                style={{
                  background:
                    "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                  border: `1px solid ${C.red}44`,
                  borderRadius: 8,
                  padding: "14px 16px",
                }}
              >
                <p style={sectionHeadStyle}>Ban / Unban Player</p>
                <p
                  style={{
                    color: C.dim,
                    fontSize: 10,
                    margin: "0 0 10px",
                    lineHeight: 1.45,
                  }}
                >
                  Separate from the grant field so a credit cannot become a ban.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <Field
                      label="Ban / unban principal"
                      value={shopBanPrincipalId}
                      onChange={setShopBanPrincipalId}
                      ocid="admin.shop.ban_principal_input"
                      placeholder="Principal to ban or unban"
                    />
                  </div>
                  <Btn
                    variant="red"
                    onClick={() => {
                      if (!shopBanPrincipalId) {
                        toast.error("Enter a principal ID");
                        return;
                      }
                      setShopConfirm("ban");
                    }}
                    ocid="admin.shop.ban_button"
                  >
                    Ban
                  </Btn>
                  <Btn
                    variant="blue"
                    onClick={() => {
                      if (!shopBanPrincipalId) {
                        toast.error("Enter a principal ID");
                        return;
                      }
                      setShopConfirm("unban");
                    }}
                    ocid="admin.shop.unban_button"
                  >
                    Unban
                  </Btn>
                </div>
              </div>
              <div
                style={{
                  background:
                    "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                  border: `1px solid ${C.goldDim}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  marginTop: 16,
                }}
              >
                <p style={sectionHeadStyle}>Banned principals</p>
                <p
                  style={{
                    color: C.dim,
                    fontSize: 10,
                    margin: "0 0 10px",
                    lineHeight: 1.45,
                  }}
                >
                  Live list from getBannedPrincipals. Click a principal to fill
                  the unban field. Empty is valid — nobody is banned.
                </p>
                {bannedLoadError && (
                  <p
                    data-ocid="admin.shop.banned.error"
                    style={{ color: C.red, fontSize: 11, margin: "0 0 8px" }}
                  >
                    {bannedLoadError}
                  </p>
                )}
                {!bannedLoadError && bannedPrincipals.length === 0 && (
                  <p
                    data-ocid="admin.shop.banned.empty"
                    style={{ color: C.green, fontSize: 11, margin: 0 }}
                  >
                    No banned principals (valid default)
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {bannedPrincipals.map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      data-ocid={`admin.shop.banned.pick_button.${i + 1}`}
                      onClick={() => setShopBanPrincipalId(p)}
                      style={{
                        background: `${C.red}18`,
                        border: `1px solid ${C.red}44`,
                        color: C.silver,
                        borderRadius: 20,
                        padding: "4px 10px",
                        fontSize: 10,
                        cursor: "pointer",
                        maxWidth: 280,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={p}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {dashState.tab === "bossRush" && (
            <div data-ocid="admin.boss_rush_tab" style={{ padding: 20 }}>
              <h3
                style={{
                  color: C.gold,
                  margin: "0 0 6px",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                }}
              >
                Boss Rush Configuration
              </h3>
              <CatalogNote>
                Enable/reward toggles write opaque JSON. Live rooms come from
                BOSS_RUSH_ROOMS; only parsed.rewardMultiplier is read. Room 10
                lists Weeping Pawn; live room 9 uses weeping_pawn_2. Canister
                save publishes immediately — this is not a browser draft.
              </CatalogNote>
              {[
                { room: 1, a: "Pale Archbishop", b: "Weeping Pawn" },
                { room: 2, a: "Crimson Countess", b: "Fetid Rook" },
                { room: 3, a: "Bone Cavalier", b: "Lord of Static" },
                { room: 4, a: "Starborn Queen", b: "Enthroned Void" },
                { room: 5, a: "Void Grandmaster", b: "Mirror Sovereign" },
                { room: 6, a: "Chessboard Lich", b: "Pale Archivist" },
                { room: 7, a: "Eternal Pawn King", b: "Final Pawn" },
                { room: 8, a: "Midnight Bishop", b: "Twin Monarchs" },
                { room: 9, a: "Alabaster Fortress", b: "Broodmother Rook" },
                { room: 10, a: "Starved Vampire Pawn", b: "Weeping Pawn" },
              ].map(({ room, a, b }) => {
                const enabledKey = `room_${room}_enabled`;
                const rewardKey = `room_${room}_reward`;
                const isEnabled = bossRushConfig[enabledKey] !== false;
                const rewardVal =
                  typeof bossRushConfig[rewardKey] === "number"
                    ? (bossRushConfig[rewardKey] as number)
                    : room;
                return (
                  <div
                    key={room}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      marginBottom: 8,
                      background:
                        "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                      border: `1px solid ${C.goldDim}`,
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ color: C.dim, width: 28, fontSize: 11 }}>
                      R{room}
                    </span>
                    <span style={{ flex: 1, fontSize: 12, color: C.silver }}>
                      {a} + {b}
                    </span>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        color: C.dim,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) =>
                          setBossRushConfig((prev) => ({
                            ...prev,
                            [enabledKey]: e.target.checked,
                          }))
                        }
                        style={{ accentColor: C.gold }}
                      />
                      Enabled
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        color: C.dim,
                      }}
                    >
                      Reward
                      <input
                        type="number"
                        value={rewardVal}
                        step={0.5}
                        min={0.5}
                        style={{ ...inputStyle(), width: 64, margin: 0 }}
                        onChange={(e) =>
                          setBossRushConfig((prev) => ({
                            ...prev,
                            [rewardKey]:
                              Number.parseFloat(e.target.value) || 1.0,
                          }))
                        }
                      />
                      x
                    </label>
                  </div>
                );
              })}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <Btn
                  variant="gold"
                  ocid="admin.boss_rush_save_button"
                  onClick={() => {
                    void (async () => {
                      try {
                        const blob = JSON.stringify(bossRushConfig);
                        const result = await (
                          adminActor as unknown as backendInterface
                        ).adminSetBossRushConfig(blob);
                        assertAdminCmdOk(result, "adminSetBossRushConfig");
                        localStorage.setItem("bossRushConfig", blob);
                        toast.success("Boss Rush config published (live)");
                        setSaveStatus("Saved");
                        setTimeout(() => setSaveStatus(null), 3000);
                        setBossRushSaved(true);
                        setTimeout(() => setBossRushSaved(false), 2000);
                      } catch (err) {
                        console.error("Failed to save boss rush config:", err);
                        toast.error("Failed to save Boss Rush config");
                        setSaveStatus(`Save failed: ${String(err)}`);
                      }
                    })();
                  }}
                >
                  Publish Boss Rush
                </Btn>
                {bossRushSaved && (
                  <span
                    style={{ color: C.green, fontSize: 11, fontWeight: 700 }}
                  >
                    Live save committed
                  </span>
                )}
              </div>
            </div>
          )}

          {dashState.tab === "names" && (
            <div data-ocid="admin.names_tab" style={{ padding: 20 }}>
              {enemyNamesQ.isError && (
                <TabErrorBanner
                  tabName="Enemy Names"
                  onRetry={() => enemyNamesQ.refetch()}
                />
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 20,
                }}
              >
                <div>
                  <h3
                    style={{
                      color: "#f0c44a",
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                    }}
                  >
                    Enemy Names
                  </h3>
                  <p
                    style={{
                      color: "#8a8090",
                      fontSize: 11,
                      margin: "4px 0 0",
                    }}
                  >
                    Ancient names assigned to enemies — max 1 per enemy per map.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <ListSearch
                    value={nameQuery}
                    onChange={setNameQuery}
                    placeholder="Filter names…"
                    ocid="admin.names.search_input"
                  />
                  <div
                    style={{
                      background: `${C.gold}18`,
                      border: `1px solid ${C.goldDim}`,
                      borderRadius: 20,
                      padding: "4px 12px",
                      fontSize: 11,
                      color: "#f0c44a",
                      fontWeight: 700,
                    }}
                  >
                    {enemyNames.length} names
                    {nameQuery.trim() ? ` · ${visibleEnemyNames.length}` : ""}
                  </div>
                  {enemyNames.length === 0 && !enemyNamesQ.isLoading && (
                    <Btn
                      variant="gold"
                      small
                      onClick={() => initDefaultNamesMut.mutate()}
                      ocid="admin.names.init_defaults_button"
                    >
                      Load Defaults
                    </Btn>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <input
                  data-ocid="admin.names.input"
                  type="text"
                  placeholder="Enter ancient name…"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newNameInput.trim()) {
                      addEnemyNameMut.mutate(newNameInput.trim(), {
                        onSuccess: () => {
                          toast.success(`Added "${newNameInput.trim()}"`);
                          setNewNameInput("");
                        },
                        onError: () => toast.error("Failed to add name"),
                      });
                    }
                  }}
                  style={{
                    flex: 1,
                    background:
                      "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
                    border: `1px solid ${C.goldDim}`,
                    borderRadius: 6,
                    padding: "8px 12px",
                    color: "#c0ccd8",
                    fontSize: 13,
                    fontFamily: "'Space Grotesk', system-ui, sans-serif",
                    outline: "none",
                  }}
                />
                <Btn
                  variant="gold"
                  small
                  onClick={() => {
                    if (newNameInput.trim()) {
                      addEnemyNameMut.mutate(newNameInput.trim(), {
                        onSuccess: () => {
                          toast.success(`Added "${newNameInput.trim()}"`);
                          setNewNameInput("");
                        },
                        onError: () => toast.error("Failed to add name"),
                      });
                    }
                  }}
                  ocid="admin.names.add_button"
                >
                  + Add Name
                </Btn>
              </div>
              {enemyNamesQ.isLoading && (
                <div
                  data-ocid="admin.names.loading_state"
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "#8a8090",
                    fontSize: 13,
                  }}
                >
                  Loading names…
                </div>
              )}
              {!enemyNamesQ.isLoading && enemyNames.length === 0 && (
                <div
                  data-ocid="admin.names.empty_state"
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#6a6070",
                    fontSize: 13,
                    border: `1px dashed ${C.dimmer}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📛</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    No enemy names yet
                  </div>
                  <div style={{ fontSize: 11 }}>
                    Click &ldquo;Load Defaults&rdquo; to pre-fill with 90
                    ancient names.
                  </div>
                </div>
              )}
              {enemyNames.length > 0 && visibleEnemyNames.length === 0 && (
                <div
                  data-ocid="admin.names.no_match"
                  style={{
                    textAlign: "center",
                    padding: "24px 0",
                    color: "#6a6070",
                    fontSize: 12,
                  }}
                >
                  No names match “{nameQuery}”
                </div>
              )}
              {visibleEnemyNames.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {visibleEnemyNames.map((name, i) => (
                    <div
                      key={name}
                      data-ocid={`admin.names.item.${i + 1}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background:
                          "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
                        border: `1px solid ${C.goldDim}`,
                        borderRadius: 20,
                        padding: "4px 10px 4px 14px",
                        fontSize: 12,
                        color: "#c0ccd8",
                        fontWeight: 600,
                      }}
                    >
                      {name}
                      <button
                        type="button"
                        data-ocid={`admin.names.delete_button.${i + 1}`}
                        onClick={() =>
                          setPendingDelete({
                            kind: "name",
                            id: name,
                            label: name,
                          })
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#d8463f",
                          fontSize: 14,
                          lineHeight: 1,
                          padding: 0,
                          fontWeight: 700,
                        }}
                        aria-label={`Remove ${name}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── BossesTab — admin editor for all 12 boss configurations ──────────────────

const ABILITY_LABELS: Record<BossAbility, string> = {
  [BossAbility.REFLECT_SHIELD]: "Reflect Shield (30% dmg reflect)",
  [BossAbility.SPAWN_MINIONS]: "Spawn Minions",
  [BossAbility.LAVA_TRAIL]: "Lava Trail on Move",
  [BossAbility.TELEPORT_ADJACENT]: "Teleport Adjacent to Player",
  [BossAbility.ILLUSION_SPLIT]: "Illusion Split (3 copies)",
  [BossAbility.KNIGHT_JUMP_IGNORE_WALLS]: "Knight Jump (ignore walls)",
  [BossAbility.SPIKE_ON_LAND]: "Spike on Landing",
  [BossAbility.CURSE_ON_HIT]: "Curse on Hit (25% chance)",
  [BossAbility.PROMOTE_QUEEN]: "Promote to Queen (Phase 2)",
  [BossAbility.ATTACK_ALL_LINES]: "Attack All Queen Lines",
  [BossAbility.VOID_TILES]: "Void Tiles (4 per phase)",
  [BossAbility.COMPOUNDING_ROT]: "Compounding Rot DoT",
  [BossAbility.SPLIT_ROOKS]: "Split into Two Rooks",
  [BossAbility.ADVANCE_PER_TURN]: "Advance Per Turn",
  [BossAbility.AP_DRAIN]: "Drain 1 AP from Player",
  [BossAbility.TWIN_FLANK]: "Twin Flank from Both Diagonals",
  [BossAbility.MERGE_BISHOPS]: "Merge Bishops (Phase 2)",
  [BossAbility.MAGIC_REFLECT]: "Reflect All Magic Damage",
  [BossAbility.LARVAE_SPAWN]: "Spawn Larvae",
  [BossAbility.SHELL_ARMOR]: "Shell Armor (50% dmg while larvae alive)",
  [BossAbility.LARVAE_EXPLODE]: "Larvae Explode on Contact (poison)",
  [BossAbility.SHOCK_TILES]: "Shock Tiles on Move",
  [BossAbility.CHAIN_LIGHTNING]: "Chain Lightning (Phase 2)",
  [BossAbility.INVINCIBLE_PHASE]: "Invincible Phase (5 turns)",
  [BossAbility.GHOST_SUMMON]: "Ghost Summon (all 11 bosses at 1HP)",
  [BossAbility.RESONANCE_SHOCKWAVE]: "Resonance Shockwave",
  [BossAbility.BOARD_SHRINK]: "Board Shrink",
  [BossAbility.MAP_ROTATE]: "Map Rotate 90 degrees",
  [BossAbility.MIRROR_INVERT]: "Mirror Invert",
  [BossAbility.BOARD_CLAIM]: "Board Claim",
  [BossAbility.SPELL_MIRROR]: "Spell Mirror",
  [BossAbility.COMBO_REPLAY]: "Combo Replay",
  [BossAbility.LIFE_DRAIN]: "Life Drain",
  [BossAbility.VAMPIRIC_AOE]: "Vampiric AoE",
  [BossAbility.EXSANGUINATED_DEBUFF]: "Exsanguinated Debuff",
  [BossAbility.INK_VEIL]: "Ink Veil",
  [BossAbility.SCROLL_SUMMON]: "Scroll Summon",
  [BossAbility.GLYPH_TRAP]: "Glyph Trap",
  [BossAbility.PAGES_OF_DOOM]: "Pages of Doom",
  [BossAbility.DAWN_BUFF]: "Dawn Buff",
  [BossAbility.DUSK_DOT]: "Dusk DoT",
  [BossAbility.MONARCH_ABSORB]: "Monarch Absorb",
  [BossAbility.ANCHOR_TILES]: "Anchor Tiles",
  [BossAbility.PHANTOM_SPAWN]: "Phantom Spawn",
  [BossAbility.AP_DRAIN_PASSIVE]: "AP Drain Passive",
  [BossAbility.DAMAGE_IMMUNE]: "Damage Immune",
};

const ALL_ABILITIES = Object.values(BossAbility);

function PhaseEditor({
  phase,
  onChange,
  spells,
  label,
}: {
  phase: BossPhaseConfig;
  onChange: (p: BossPhaseConfig) => void;
  spells: SpellConfig[];
  label: string;
}) {
  const [abilityQuery, setAbilityQuery] = React.useState("");
  const visibleAbilities = ALL_ABILITIES.filter((a) =>
    matchesQuery(abilityQuery, a, ABILITY_LABELS[a]),
  );

  const toggleAbility = (a: BossAbility) => {
    const has = phase.specialAbilities.includes(a);
    onChange({
      ...phase,
      specialAbilities: has
        ? phase.specialAbilities.filter((x) => x !== a)
        : [...phase.specialAbilities, a],
    });
  };

  const toggleSpell = (id: string) => {
    const has = phase.spellPoolIds.includes(id);
    onChange({
      ...phase,
      spellPoolIds: has
        ? phase.spellPoolIds.filter((s) => s !== id)
        : [...phase.spellPoolIds, id],
    });
  };

  return (
    <div
      style={{
        background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
        border: `1px solid ${C.goldDim}`,
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      <p style={sectionHeadStyle}>{label}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div>
          <span style={labelStyle}>
            HP Threshold % (phase 2 triggers below)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            aria-label="HP Threshold"
            value={Math.round(phase.hpThreshold * 100)}
            onChange={(e) =>
              onChange({
                ...phase,
                hpThreshold:
                  Math.max(0, Math.min(100, Number(e.target.value))) / 100,
              })
            }
            style={inputStyle()}
          />
        </div>
        <div>
          <span style={labelStyle}>Stat Multiplier on Entry</span>
          <input
            type="number"
            min={1}
            step={0.1}
            aria-label="Stat Multiplier"
            value={phase.statMultiplier}
            onChange={(e) =>
              onChange({
                ...phase,
                statMultiplier: Math.max(0.1, Number(e.target.value)),
              })
            }
            style={inputStyle()}
          />
        </div>
        <div>
          <span style={labelStyle}>Summon Count</span>
          <input
            type="number"
            min={0}
            value={phase.summonCount}
            onChange={(e) =>
              onChange({
                ...phase,
                summonCount: Math.max(0, Number.parseInt(e.target.value) || 0),
              })
            }
            style={inputStyle()}
          />
        </div>
      </div>

      <p style={{ ...labelStyle, marginBottom: 6 }}>Special Abilities</p>
      <div style={{ marginBottom: 8 }}>
        <ListSearch
          value={abilityQuery}
          onChange={setAbilityQuery}
          placeholder="Filter abilities…"
          ocid="admin.bosses.ability_search"
        />
      </div>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}
      >
        {visibleAbilities.map((a) => {
          const active = phase.specialAbilities.includes(a);
          return (
            <button
              key={a}
              type="button"
              onClick={() => toggleAbility(a)}
              style={{
                padding: "3px 10px",
                borderRadius: 20,
                border: `1px solid ${active ? C.gold : C.dimmer}`,
                background: active ? C.goldDim : "transparent",
                color: active ? C.goldBright : C.dim,
                fontSize: 10,
                cursor: "pointer",
                fontWeight: active ? 700 : 400,
              }}
            >
              {ABILITY_LABELS[a]}
            </button>
          );
        })}
      </div>

      {spells.length > 0 && (
        <>
          <p style={{ ...labelStyle, marginBottom: 6 }}>Spell Pool</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {spells.map((s) => {
              const active = phase.spellPoolIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSpell(s.id)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 20,
                    border: `1px solid ${active ? C.blue : C.dimmer}`,
                    background: active ? `${C.blue}22` : "transparent",
                    color: active ? C.blue : C.dim,
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  {s.iconEmoji} {s.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const BOSS_PIECE_TYPES = [
  "bishop",
  "rook",
  "king",
  "knight",
  "pawn",
  "queen",
] as const;

const BossesTab: React.FC<{ spells: SpellConfig[] }> = ({ spells }) => {
  const { data: bossConfigs = DEFAULT_BOSS_CONFIGS, refetch } =
    useGetAllBossConfigs();
  const setBossConfig = useSetBossConfig();
  const _deleteBossConfig = useDeleteBossConfig();

  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, BossConfig>>({});
  const [confirmResetId, setConfirmResetId] = React.useState<string | null>(
    null,
  );
  const [query, setQuery] = React.useState("");

  const getDraft = (id: string): BossConfig => {
    if (drafts[id]) return drafts[id];
    return (
      bossConfigs.find((b) => b.id === id) ??
      DEFAULT_BOSS_CONFIGS.find((b) => b.id === id) ??
      DEFAULT_BOSS_CONFIGS[0]
    );
  };

  const updateDraft = (id: string, update: Partial<BossConfig>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...getDraft(id), ...update } }));
  };

  const handleSave = (id: string) => {
    setBossConfig.mutate(getDraft(id), {
      onSuccess: () => {
        toast.success(
          `Boss "${getDraft(id).name}" draft saved in this browser only — not canister-live`,
        );
        refetch();
      },
      onError: () => toast.error("Failed to save boss config"),
    });
  };

  const handleReset = (id: string) => {
    const def = DEFAULT_BOSS_CONFIGS.find((b) => b.id === id);
    if (!def) return;
    setBossConfig.mutate(def, {
      onSuccess: () => {
        setDrafts((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
        toast.success("Boss reset to defaults");
        refetch();
      },
    });
  };

  const visibleBossIds = BOSS_IDS.filter((bossId) => {
    const draft = getDraft(bossId);
    return matchesQuery(query, draft.name, bossId, draft.pieceType);
  });

  return (
    <div
      data-ocid="admin.bosses_tab"
      style={{ padding: 20, overflowY: "auto", maxHeight: "100%" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <span style={{ fontSize: 22 }}>👹</span>
        <div>
          <h2
            style={{
              color: "#f0c44a",
              margin: 0,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Boss Editor
          </h2>
          <p style={{ color: "#8a8090", margin: 0, fontSize: 11 }}>
            Browser-local drafts only (pbv_boss_configs). Not canister-live. A
            saved draft is not the live encounter until a backend writer exists.
            Changes apply on this browser's next boss encounter.
          </p>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <ListSearch
          value={query}
          onChange={setQuery}
          placeholder="Filter bosses…"
          ocid="admin.bosses.search_input"
        />
      </div>

      {confirmResetId && (
        <ConfirmDialog
          title={`Reset ${getDraft(confirmResetId).name}?`}
          body="This overwrites the browser-local draft with shipped defaults. It is still not canister-live."
          confirmLabel="Reset draft"
          ocidPrefix="admin.bosses.reset"
          onCancel={() => setConfirmResetId(null)}
          onConfirm={() => {
            const id = confirmResetId;
            setConfirmResetId(null);
            handleReset(id);
          }}
        />
      )}

      {query.trim() && visibleBossIds.length === 0 && (
        <div
          data-ocid="admin.bosses.no_match"
          style={{
            textAlign: "center",
            padding: "24px 0",
            color: "#6a6070",
            fontSize: 12,
          }}
        >
          No bosses match “{query}”
        </div>
      )}

      {visibleBossIds.map((bossId, idx) => {
        const draft = getDraft(bossId);
        const isOpen = expandedId === bossId;

        return (
          <PanelCard key={bossId}>
            {/* Row header */}
            <button
              type="button"
              data-ocid={`admin.bosses.item.${idx + 1}`}
              onClick={() => setExpandedId(isOpen ? null : bossId)}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "12px 16px",
                gap: 12,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 20 }}>{draft.iconEmoji}</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{ color: "#f0c44a", fontWeight: 700, fontSize: 13 }}
                >
                  {draft.name}
                </div>
                <div style={{ color: "#8a8090", fontSize: 10, marginTop: 2 }}>
                  {draft.pieceType.charAt(0).toUpperCase() +
                    draft.pieceType.slice(1)}
                  {" — "}
                  Phase 2 @ {Math.round(draft.phase2.hpThreshold * 100)}% HP
                  {" — "}
                  {draft.rewardDokaMultiplier}x Doka /{" "}
                  {draft.rewardXpMultiplier}x XP
                </div>
              </div>
              {/* Portal color swatch */}
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: draft.portalColor,
                  border: `2px solid ${C.goldDim}`,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#8a8090", fontSize: 16 }}>
                {isOpen ? "▲" : "▼"}
              </span>
            </button>

            {isOpen && (
              <div style={{ padding: "0 16px 16px" }}>
                {/* Basic info */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <Field
                    label="Name"
                    value={draft.name}
                    onChange={(v) => updateDraft(bossId, { name: v })}
                    ocid={`admin.bosses.name.${idx + 1}`}
                  />
                  <div>
                    <span style={labelStyle}>Piece Type</span>
                    <select
                      value={draft.pieceType}
                      onChange={(e) =>
                        updateDraft(bossId, {
                          pieceType: e.target.value as ChessPieceType,
                        })
                      }
                      style={inputStyle()}
                    >
                      {BOSS_PIECE_TYPES.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt.charAt(0).toUpperCase() + pt.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Field
                    label="Icon Emoji"
                    value={draft.iconEmoji}
                    onChange={(v) => updateDraft(bossId, { iconEmoji: v })}
                  />
                  <Field
                    label="Portal Color (hex)"
                    value={draft.portalColor}
                    onChange={(v) => updateDraft(bossId, { portalColor: v })}
                  />
                  <div>
                    <span style={labelStyle}>Doka Reward Multiplier</span>
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={draft.rewardDokaMultiplier}
                      onChange={(e) =>
                        updateDraft(bossId, {
                          rewardDokaMultiplier: Math.max(
                            1,
                            Number(e.target.value),
                          ),
                        })
                      }
                      style={inputStyle()}
                    />
                  </div>
                  <div>
                    <span style={labelStyle}>XP Reward Multiplier</span>
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={draft.rewardXpMultiplier}
                      onChange={(e) =>
                        updateDraft(bossId, {
                          rewardXpMultiplier: Math.max(
                            1,
                            Number(e.target.value),
                          ),
                        })
                      }
                      style={inputStyle()}
                    />
                  </div>
                </div>

                {/* Base stats */}
                <p style={sectionHeadStyle}>Base Stats</p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {(
                    [
                      "hp",
                      "ap",
                      "mp",
                      "atk",
                      "res",
                      "sp",
                      "init",
                      "chc",
                    ] as const
                  ).map((stat) => (
                    <div key={stat}>
                      <span style={labelStyle}>{stat.toUpperCase()}</span>
                      <input
                        type="number"
                        min={1}
                        value={draft.baseStats[stat]}
                        onChange={(e) =>
                          updateDraft(bossId, {
                            baseStats: {
                              ...draft.baseStats,
                              [stat]: Math.max(
                                1,
                                Number.parseInt(e.target.value) || 1,
                              ),
                            },
                          })
                        }
                        style={inputStyle()}
                      />
                    </div>
                  ))}
                </div>

                {/* Phase editors */}
                <PhaseEditor
                  label="Phase 1"
                  phase={draft.phase1}
                  onChange={(p) => updateDraft(bossId, { phase1: p })}
                  spells={spells}
                />
                <PhaseEditor
                  label="Phase 2"
                  phase={draft.phase2}
                  onChange={(p) => updateDraft(bossId, { phase2: p })}
                  spells={spells}
                />

                {/* Lore text */}
                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>
                    Lore Text (shown in battle log)
                  </span>
                  <textarea
                    value={draft.loreText}
                    onChange={(e) =>
                      updateDraft(bossId, { loreText: e.target.value })
                    }
                    rows={2}
                    style={{ ...inputStyle(), resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn
                    variant="gold"
                    onClick={() => handleSave(bossId)}
                    ocid={`admin.bosses.save_button.${idx + 1}`}
                  >
                    Save browser draft
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => setConfirmResetId(bossId)}
                    ocid={`admin.bosses.reset_button.${idx + 1}`}
                  >
                    Reset to Defaults
                  </Btn>
                </div>
              </div>
            )}
          </PanelCard>
        );
      })}
    </div>
  );
};

function AdBoxEditor({ index }: { index: number }) {
  const { actor } = useActor();
  const [imageUrl, setImageUrl] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [confirmClear, setConfirmClear] = React.useState(false);
  React.useEffect(() => {
    if (actor) {
      (
        actor as unknown as {
          getAdBoxes: () => Promise<Array<[string, string, boolean]>>;
        }
      )
        .getAdBoxes()
        .then((boxes) => {
          if (boxes[index]) {
            setImageUrl(boxes[index][0]);
            setLinkUrl(boxes[index][1]);
          }
        })
        .catch(() => {});
    }
  }, [actor, index]);
  const save = async () => {
    const adErr = validateAdBox(index, imageUrl, linkUrl);
    if (adErr) {
      setStatus("Error");
      toast.error(adErr);
      return;
    }
    try {
      const result = await (actor as unknown as backendInterface).adminSetAdBox(
        BigInt(index),
        imageUrl,
        linkUrl,
      );
      assertAdminCmdOk(result, "adminSetAdBox");
      setStatus("Saved");
      setTimeout(() => setStatus(""), 2000);
    } catch {
      setStatus("Error");
    }
  };
  const clear = async () => {
    try {
      const result = await (
        actor as unknown as backendInterface
      ).adminClearAdBox(BigInt(index));
      assertAdminCmdOk(result, "adminClearAdBox");
      setImageUrl("");
      setLinkUrl("");
      setStatus("Hidden default");
      setTimeout(() => setStatus(""), 2000);
    } catch {
      setStatus("Error");
    }
  };
  const hasCustom = Boolean(imageUrl.trim() || linkUrl.trim());
  return (
    <div
      style={{
        background:
          "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
        border: `1px solid ${C.goldDim}`,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {confirmClear && (
        <ConfirmDialog
          title={`Clear ad box ${index + 1}?`}
          body="This hides the landing-page slot immediately (valid default). The custom image and link are removed."
          confirmLabel="Clear to hidden default"
          ocidPrefix={`admin.ads.clear.${index + 1}`}
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            setConfirmClear(false);
            void clear();
          }}
        />
      )}
      <h3
        style={{
          color: C.gold,
          margin: "0 0 8px",
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        Ad Box {index + 1}
      </h3>
      <p
        data-ocid={`admin.ads.visual_status.${index + 1}`}
        style={{
          color: hasCustom ? C.gold : C.green,
          fontSize: 10,
          fontWeight: 700,
          margin: "0 0 8px",
        }}
      >
        {hasCustom
          ? "Custom Visual — override URLs set"
          : "No custom ad — box hidden (valid default)"}
      </p>
      <p style={{ color: C.dimmer, fontSize: 10, margin: "0 0 10px" }}>
        Hosted PNG/WebP, landscape ~4:3, https only. Paste URLs before Save.
        Empty is valid — use Clear, do not treat empty as an error.
      </p>
      {imageUrl && !unsafeUrl(imageUrl) && (
        <img
          src={imageUrl}
          alt="preview"
          style={{
            width: 200,
            height: 150,
            objectFit: "cover",
            borderRadius: 4,
            marginBottom: 8,
            display: "block",
            border: `1px solid ${C.goldDim}`,
          }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL (https://…) — optional"
          style={inputStyle()}
        />
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Click-through URL (https://…) — optional"
          style={inputStyle()}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn variant="gold" small onClick={() => void save()}>
            Save
          </Btn>
          <Btn variant="ghost" small onClick={() => setConfirmClear(true)}>
            Clear to default
          </Btn>
          {status && (
            <span
              style={{
                color: status.includes("Error") ? C.red : C.green,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
