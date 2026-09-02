import { Principal } from "@dfinity/principal";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import type { backendInterface } from "../backend";
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
  useGetPurchaseRecords,
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
  MAX_DOKA_GRANT,
  unsafeUrl,
  validateAdBox,
  validateDokaGrant,
  validateGameConfig,
  validateLevelUpConfig,
  validateOptionalUrl,
  validateTierSpawnConfig,
  validateWalkFrameUrls,
} from "../utils/adminSafety";
import { logDebugWarn } from "../utils/debugLogger";

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
});

const newEnemy = (): EnemyConfig => ({
  id: `enemy_${Date.now()}`,
  name: "",
  hp: BigInt(50),
  ap: BigInt(6),
  mp: BigInt(3),
  initStat: BigInt(8),
  levelMin: BigInt(1),
  levelMax: BigInt(5),
  regions: [],
  spriteUrl: [],
});

const newRegion = (): RegionConfig => ({
  id: `region_${Date.now()}`,
  name: "",
  levelMin: BigInt(1),
  levelMax: BigInt(5),
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

  return (
    <div data-ocid="admin.enemy_editor" style={{ padding: 20 }}>
      <EnemyPresets currentConfig={cfg} onLoad={(loaded) => setCfg(loaded)} />
      <p style={sectionHeadStyle}>Enemy Configuration</p>

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

      <div style={{ marginBottom: 10 }}>
        <label htmlFor="admin.enemy.sprite_input" style={labelStyle}>
          Custom Visual Override
        </label>
        <p style={{ color: "#6a6070", fontSize: 10, margin: "0 0 6px" }}>
          Default Pixel Visual — Active fallback when this field is empty. Leave
          blank to keep the chess-piece sprite. PNG or WebP, square, pixel art
          recommended (no upload yet — paste a hosted URL).
        </p>
        <input
          id="admin.enemy.sprite_input"
          type="text"
          value={cfg.spriteUrl[0] ?? ""}
          onChange={(e) =>
            set("spriteUrl", e.target.value ? [e.target.value] : [])
          }
          placeholder="https://… (optional custom override)"
          data-ocid="admin.enemy.sprite_input"
          style={inputStyle()}
        />
        <p
          data-ocid="admin.enemy.visual_status"
          style={{
            color: cfg.spriteUrl[0] ? C.gold : C.green,
            fontSize: 10,
            margin: "4px 0 0",
            fontWeight: 700,
          }}
        >
          {cfg.spriteUrl[0]
            ? "Custom Visual — 1 override URL"
            : "Default Pixel Visual — Active fallback"}
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
            {previewUrl ? (
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
          Custom Visual Override — paste hosted PNG/WebP URLs (square pixel art,
          one frame per facing). Empty URLs are valid: the chess-piece Default
          Pixel Visual stays the active fallback. No file upload yet.
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
}> = ({ sprites, loading, saving, onSave, onDelete }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingCfg, setEditingCfg] = useState<PlayerSpriteConfig | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

          {sprites.map((s, i) => {
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
  const pending = enemies.find((e) => e.id === confirmId);
  return (
    <div style={{ padding: 20 }}>
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
            Enemy Configurations
          </h3>
          <p style={{ color: "#8a8090", fontSize: 11, margin: "3px 0 0" }}>
            {enemies.length} enemi{enemies.length === 1 ? "y" : "es"} configured
          </p>
        </div>
        <Btn variant="gold" onClick={onAdd} ocid="admin.enemies.add_button">
          + Add Enemy
        </Btn>
      </div>

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

      {enemies.map((e, i) => (
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
                    e.spriteUrl[0] ? "Custom visual" : "Default pixel visual",
                    e.spriteUrl[0] ? C.gold : C.green,
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
      ))}
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
  const pending = regions.find((r) => r.id === confirmId);
  return (
    <div style={{ padding: 20 }}>
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
            Region Configurations
          </h3>
          <p style={{ color: "#8a8090", fontSize: 11, margin: "3px 0 0" }}>
            {regions.length} region{regions.length === 1 ? "" : "s"} defined
          </p>
        </div>
        <Btn variant="gold" onClick={onAdd} ocid="admin.regions.add_button">
          + Add Region
        </Btn>
      </div>

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

      {regions.map((r, i) => (
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
  const pending = spells.find((s) => s.id === confirmId);
  return (
    <div style={{ padding: 20 }}>
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
            Spell Configurations
          </h3>
          <p style={{ color: "#8a8090", fontSize: 11, margin: "3px 0 0" }}>
            {spells.length} spell{spells.length === 1 ? "" : "s"} configured
          </p>
        </div>
        <Btn variant="gold" onClick={onAdd} ocid="admin.spells.add_button">
          + Add Spell
        </Btn>
      </div>

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

      {spells.map((s, i) => (
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
    try {
      localStorage.setItem("pbv_tier_spawn_config", JSON.stringify(cfg));
      if (actor) {
        await (actor as unknown as backendInterface).adminSetTierSpawnConfig({
          ...cfg,
          tierSize: BigInt(cfg.tierSize),
        } as any);
      }
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
            "Admin role transferred! The new admin must log in to activate.",
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

// ── LevelUpConfigPanel (part of Settings) ─────────────────────────────────────────────
const LevelUpConfigPanel: React.FC = () => {
  const { actor } = useActor();
  const [cfg, setCfg] = React.useState(() => {
    try {
      const raw = localStorage.getItem("pbv_levelup_config");
      if (raw)
        return {
          maxSpellRange: 5,
          spellRangeGrowthLevels: 10,
          spellFailBaseChance: 20,
          spellFailReductionPerLevel: 0.1,
          ...JSON.parse(raw),
        };
    } catch {
      /* ignore */
    }
    return {
      maxSpellRange: 5,
      spellRangeGrowthLevels: 10,
      spellFailBaseChance: 20,
      spellFailReductionPerLevel: 0.1,
    };
  });
  const [saved, setSaved] = React.useState(false);

  const handleSave = async () => {
    const err = validateLevelUpConfig({
      statGrowthPercent: Number(cfg.statGrowthPercent ?? 5),
      apMpLevelThreshold: Number(cfg.apMpLevelThreshold ?? 25),
      spellLevelingBaseCost: Number(cfg.spellLevelingBaseCost ?? 10),
      spellLevelingCostMultiplier: Number(cfg.spellLevelingCostMultiplier ?? 2),
      spellDmgGrowthPercent: Number(cfg.spellDmgGrowthPercent ?? 3),
      maxSpellRange: Number(cfg.maxSpellRange ?? 5),
      spellRangeGrowthLevels: Number(cfg.spellRangeGrowthLevels ?? 10),
      spellFailBaseChance: Number(cfg.spellFailBaseChance ?? 20),
      spellFailReductionPerLevel: Number(cfg.spellFailReductionPerLevel ?? 0.1),
    });
    if (err) {
      toast.error(err);
      return;
    }
    localStorage.setItem("pbv_levelup_config", JSON.stringify(cfg));
    try {
      if (actor) {
        await (actor as unknown as backendInterface).adminSetLevelUpConfig({
          maxSpellRange: BigInt(cfg.maxSpellRange),
          spellRangeGrowthLevels: BigInt(cfg.spellRangeGrowthLevels),
          spellFailBaseChance: cfg.spellFailBaseChance,
          spellFailReductionPerLevel: cfg.spellFailReductionPerLevel,
          statGrowthPercent: BigInt(5),
          apMpLevelThreshold: BigInt(25),
          spellLevelingBaseCost: BigInt(10),
          spellLevelingCostMultiplier: 2,
          spellDmgGrowthPercent: BigInt(3),
        });
      }
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
            0.1 = reaches 0% at level 200
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
    localStorage.setItem("paperVertexPalette", JSON.stringify(palette));
    localStorage.setItem("pbv_color_palette", JSON.stringify(palette));
    try {
      await (actor as unknown as backendInterface).adminSetColorPalette(
        JSON.stringify(palette),
      );
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
            Reset to Random
          </Btn>
        </div>
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

const MODIFIER_TYPES = [
  { value: "slime_flood", label: "Slime Flood — Double MP cost movement" },
  { value: "paper_windstorm", label: "Paper Windstorm — 50% miss on ranged" },
  { value: "gravity_well", label: "Gravity Well — Push/pull double range" },
  { value: "blood_moon", label: "Blood Moon — +25% dmg, -25% heal" },
  { value: "fog_of_war", label: "Fog of War — Enemies hidden beyond 3 tiles" },
  { value: "thorned_ground", label: "Thorned Ground — 5 dmg per extra tile" },
  {
    value: "arcane_surge",
    label: "Arcane Surge — -1 AP cost, +15% fail chance",
  },
  { value: "mirror_field", label: "Mirror Field — 20% reflect single-target" },
  {
    value: "frozen_terrain",
    label: "Frozen Terrain — Double MP cost + LoS +1 range",
  },
  { value: "plague_zone", label: "Plague Zone — -2 HP every turn start" },
  { value: "time_warp", label: "Time Warp — 15s timer instead of 30s" },
  { value: "void_rift", label: "Void Rift — Random tile teleports + -3 HP" },
  // EXP5: Hazard tile modifiers
  { value: "lava_fields", label: "Lava Fields — Spawn 3-8 lava hazard tiles" },
  { value: "ice_fields", label: "Ice Fields — Spawn 3-8 ice hazard tiles" },
  { value: "spike_pit", label: "Spike Pit — Spawn 3-8 spike hazard tiles" },
  { value: "custom", label: "Custom" },
];

const ModifierEditor: React.FC<{
  initial: MapModifierConfig;
  onSave: (c: MapModifierConfig) => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ initial, onSave, onCancel, saving }) => {
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
          Active on all maps
        </label>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn
          variant="gold"
          onClick={() => onSave(cfg)}
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

const ACHIEVEMENT_CONDITIONS = [
  "first_battle_win",
  "survive_1hp",
  "spell_level_5",
  "doka_1000",
  "explore_25_maps",
  "betrayal_witness",
  "leader_slayer",
  "jackpot_heal",
  "loot_10_doka",
  "double_betrayal",
  "level_10",
  "spell_master_8",
  "critical_5_in_battle",
  "pacifist_run",
  "doka_10000",
];

const AchievementEditor: React.FC<{
  initial: AchievementConfig;
  onSave: (c: AchievementConfig) => void;
  onCancel: () => void;
  saving: boolean;
}> = ({ initial, onSave, onCancel, saving }) => {
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
            {ACHIEVEMENT_CONDITIONS.map((c) => (
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
  const purchaseQ = useGetPurchaseRecords();
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
  const [shopPrincipalId, setShopPrincipalId] = useState("");
  const [shopDokaAmount, setShopDokaAmount] = useState<number>(0);
  const [shopConfirm, setShopConfirm] = useState<null | "grant" | "ban">(null);
  const [pendingTab, setPendingTab] = useState<
    AdminDashboardState["tab"] | "close" | null
  >(null);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "modifier" | "achievement" | "name";
    id: string;
    label: string;
  } | null>(null);

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

  const hasOpenEditor =
    dashState.editingEnemyId != null ||
    dashState.editingRegionId != null ||
    dashState.editingSpellId != null ||
    dashState.editingModifierId != null ||
    dashState.editingAchievementId != null;

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
            Only the first player who logged in has admin access. Log in with
            the admin Internet Identity to use this dashboard.
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
          body={`This credits ${shopDokaAmount} Doka to ${shopPrincipalId} immediately. There is no undo.`}
          confirmLabel="Grant Doka"
          ocidPrefix="admin.shop.grant"
          onCancel={() => setShopConfirm(null)}
          onConfirm={() => {
            setShopConfirm(null);
            void (async () => {
              try {
                await (
                  adminActor as unknown as backendInterface
                ).adminAddDokaToUser(
                  Principal.fromText(shopPrincipalId),
                  BigInt(Number(shopDokaAmount) || 0),
                  null,
                );
                toast.success(
                  `Granted ${shopDokaAmount} Doka to ${shopPrincipalId}`,
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
          title={`Ban ${shopPrincipalId}?`}
          body="Banned principals fail purchases, buffs, achievement claims, boss rush, and Doka awards. Achievement progress for this principal is cleared."
          confirmLabel="Ban player"
          ocidPrefix="admin.shop.ban"
          onCancel={() => setShopConfirm(null)}
          onConfirm={() => {
            setShopConfirm(null);
            void (async () => {
              try {
                await (
                  adminActor as unknown as backendInterface
                ).adminBanAccount(Principal.fromText(shopPrincipalId));
                toast.success(`Banned ${shopPrincipalId}`);
                setSaveStatus("Saved");
                setTimeout(() => setSaveStatus(null), 3000);
              } catch (err) {
                toast.error(`Failed to ban player: ${String(err)}`);
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
          {dashState.tab === "purchases" && (
            <div data-ocid="admin.purchases_tab" style={{ padding: 20 }}>
              {purchaseQ.isError && (
                <TabErrorBanner
                  tabName="Purchases"
                  onRetry={() => purchaseQ.refetch()}
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
                    Purchase Records
                  </h3>
                  <p
                    style={{
                      color: "#8a8090",
                      fontSize: 11,
                      margin: "4px 0 0",
                    }}
                  >
                    All Doka shop orders, customer data &amp; proof-of-address
                    documents
                  </p>
                </div>
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
                  {purchaseQ.data?.length ?? 0} records
                </div>
              </div>

              {purchaseQ.isLoading && (
                <div
                  data-ocid="admin.purchases.loading_state"
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "#8a8090",
                    fontSize: 13,
                  }}
                >
                  Loading purchase records…
                </div>
              )}

              {!purchaseQ.isLoading && (purchaseQ.data?.length ?? 0) === 0 && (
                <div
                  data-ocid="admin.purchases.empty_state"
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#6a6070",
                    fontSize: 13,
                    border: `1px dashed ${C.dimmer}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    No purchase records yet
                  </div>
                  <div style={{ fontSize: 11 }}>
                    Records appear here once players make purchases
                  </div>
                </div>
              )}

              {(purchaseQ.data ?? []).length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 11,
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.goldDim}` }}>
                        {[
                          "#",
                          "Customer",
                          "Email",
                          "Address",
                          "Amount",
                          "Price",
                          "Status",
                          "Date",
                          "Proof",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              color: "#f0c44a",
                              fontWeight: 800,
                              textAlign: "left",
                              padding: "8px 10px",
                              letterSpacing: "0.08em",
                              fontSize: 9,
                              textTransform: "uppercase",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(purchaseQ.data ?? []).map((rec, i) => (
                        <tr
                          key={rec.id ?? i}
                          data-ocid={`admin.purchases.item.${i + 1}`}
                          style={{
                            borderBottom: `1px solid ${C.goldDim}22`,
                            background: i % 2 === 0 ? C.bg0 : C.bg1,
                          }}
                        >
                          <td
                            style={{
                              padding: "8px 10px",
                              color: "#8a8090",
                              fontWeight: 700,
                            }}
                          >
                            {i + 1}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              color: "#c0ccd8",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {[
                              rec.customerData?.firstName,
                              rec.customerData?.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </td>
                          <td style={{ padding: "8px 10px", color: C.dim }}>
                            {rec.customerData?.email || "—"}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              color: "#8a8090",
                              maxWidth: 160,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {[
                              rec.customerData?.address,
                              rec.customerData?.city,
                              rec.customerData?.postalCode,
                              rec.customerData?.country,
                            ]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              color: "#f0c44a",
                              fontWeight: 700,
                              textAlign: "right",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {rec.dokaAmount?.toLocaleString() ?? "—"} 💰
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              color: "#c0ccd8",
                              textAlign: "right",
                              whiteSpace: "nowrap",
                            }}
                          >
                            €{rec.priceEur ?? "—"}
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span
                              style={{
                                background:
                                  rec.status === "paid" ||
                                  rec.status === "completed"
                                    ? `${C.green}22`
                                    : `${C.gold}22`,
                                border: `1px solid ${
                                  rec.status === "paid" ||
                                  rec.status === "completed"
                                    ? C.green
                                    : C.gold
                                }44`,
                                color:
                                  rec.status === "paid" ||
                                  rec.status === "completed"
                                    ? C.green
                                    : C.gold,
                                fontSize: 9,
                                padding: "2px 7px",
                                borderRadius: 20,
                                fontWeight: 700,
                              }}
                            >
                              {rec.status ?? "pending"}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "8px 10px",
                              color: "#8a8090",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {rec.timestamp
                              ? new Date(rec.timestamp).toLocaleString(
                                  "en-GB",
                                  { dateStyle: "short", timeStyle: "short" },
                                )
                              : "—"}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            {rec.proofFileUrl ||
                            rec.proofOfAddressBase64 ||
                            rec.proofOfAddressName?.startsWith("http") ? (
                              <button
                                type="button"
                                data-ocid={`admin.purchases.view_proof_button.${i + 1}`}
                                onClick={() => {
                                  if (rec.proofFileUrl) {
                                    window.open(
                                      rec.proofFileUrl,
                                      "_blank",
                                      "noopener,noreferrer",
                                    );
                                    return;
                                  }
                                  if (
                                    rec.proofOfAddressName?.startsWith("http")
                                  ) {
                                    window.open(
                                      rec.proofOfAddressName,
                                      "_blank",
                                      "noopener,noreferrer",
                                    );
                                    return;
                                  }
                                  const mime = rec.proofOfAddressName?.endsWith(
                                    ".pdf",
                                  )
                                    ? "application/pdf"
                                    : "image/jpeg";
                                  const url = `data:${mime};base64,${rec.proofOfAddressBase64}`;
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download =
                                    rec.proofOfAddressName ??
                                    `proof_${rec.id ?? i}.jpg`;
                                  a.click();
                                }}
                                style={{
                                  background: `${C.blue}22`,
                                  border: `1px solid ${C.blue}55`,
                                  borderRadius: 4,
                                  color: C.blue,
                                  fontSize: 10,
                                  padding: "3px 8px",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                📄 View
                              </button>
                            ) : (
                              <span style={{ color: "#6a6070", fontSize: 10 }}>
                                None
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MAP MODIFIERS */}
          {dashState.tab === "modifiers" && (
            <div data-ocid="admin.modifiers_tab" style={{ padding: 20 }}>
              {modifierQ.isError && (
                <TabErrorBanner
                  tabName="Map Modifiers"
                  onRetry={() => modifierQ.refetch()}
                />
              )}
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
                  </p>
                </div>
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
                  {modifiers.map((mod, i) => (
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
                  </p>
                </div>
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

              {/* Editor */}
              {dashState.editingAchievementId && (
                <AchievementEditor
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
                  {!achievementQ.isLoading &&
                    (achievementQ.data ?? []).length === 0 && (
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
                          Add achievements with Doka rewards for players to
                          unlock
                        </div>
                      </div>
                    )}
                  {(achievementQ.data ?? []).map((ach, i) => (
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
            <div style={{ padding: "24px" }}>
              <h2
                style={{
                  color: "#ff4444",
                  fontSize: "20px",
                  marginBottom: "24px",
                }}
              >
                Advertisement Boxes
              </h2>
              <p
                style={{
                  color: "#aaa",
                  marginBottom: "24px",
                  fontSize: "14px",
                }}
              >
                These 3 ad boxes appear on the login page. Upload an image URL
                and click-through link for each box you want to show.
              </p>
              <AdBoxEditor index={0} />
              <AdBoxEditor index={1} />
              <AdBoxEditor index={2} />
            </div>
          )}

          {dashState.tab === "shop" && (
            <div data-ocid="admin.shop_tab" className="p-4 space-y-6">
              <h2 className="text-xl font-bold text-red-400">
                Shop Administration
              </h2>
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="font-semibold mb-2">Payment Links</h3>
                <p className="text-gray-400 text-sm">
                  Configure payment links in the shop settings below.
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="font-semibold mb-2">Manual Doka Grant</h3>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-gray-700 px-3 py-2 rounded text-sm"
                    placeholder="Principal ID"
                    value={shopPrincipalId}
                    onChange={(e) => setShopPrincipalId(e.target.value)}
                  />
                  <input
                    className="w-24 bg-gray-700 px-3 py-2 rounded text-sm"
                    placeholder="Amount"
                    type="number"
                    value={shopDokaAmount}
                    onChange={(e) =>
                      setShopDokaAmount(Number.parseInt(e.target.value) || 0)
                    }
                  />
                  <button
                    type="button"
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
                    onClick={() => {
                      const grantErr = validateDokaGrant(shopDokaAmount);
                      if (!shopPrincipalId || grantErr) {
                        toast.error(grantErr ?? "Enter a principal and amount");
                        return;
                      }
                      if (shopDokaAmount > MAX_DOKA_GRANT) {
                        toast.error("Grant amount exceeds maximum");
                        return;
                      }
                      setShopConfirm("grant");
                    }}
                  >
                    Grant
                  </button>
                </div>
              </div>
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="font-semibold mb-2">Ban / Unban Player</h3>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-gray-700 px-3 py-2 rounded text-sm"
                    placeholder="Principal ID"
                    value={shopPrincipalId}
                    onChange={(e) => setShopPrincipalId(e.target.value)}
                  />
                  <button
                    type="button"
                    className="bg-red-800 hover:bg-red-900 px-4 py-2 rounded text-sm"
                    onClick={() => {
                      if (!shopPrincipalId) {
                        toast.error("Enter a principal ID");
                        return;
                      }
                      setShopConfirm("ban");
                    }}
                  >
                    Ban
                  </button>
                  <button
                    type="button"
                    className="bg-green-800 hover:bg-green-900 px-4 py-2 rounded text-sm"
                    onClick={() => {
                      if (!shopPrincipalId) {
                        toast.error("Enter a principal ID");
                        return;
                      }
                      (async () => {
                        try {
                          await (
                            adminActor as unknown as backendInterface
                          ).adminUnbanAccount(
                            Principal.fromText(shopPrincipalId),
                          );
                          toast.success(`Unbanned ${shopPrincipalId}`);
                          setSaveStatus("Saved");
                          setTimeout(() => setSaveStatus(null), 3000);
                        } catch (err) {
                          toast.error(`Failed to unban player: ${String(err)}`);
                          setSaveStatus(`Save failed: ${String(err)}`);
                        }
                      })();
                    }}
                  >
                    Unban
                  </button>
                </div>
              </div>
            </div>
          )}

          {dashState.tab === "bossRush" && (
            <div data-ocid="admin.boss_rush_tab" className="p-4 space-y-4">
              <h2 className="text-xl font-bold text-red-400">
                Boss Rush Configuration
              </h2>
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
                    className="bg-gray-800 p-3 rounded flex items-center gap-4"
                  >
                    <span className="text-gray-400 w-8">R{room}</span>
                    <span className="flex-1 text-sm">
                      {a} + {b}
                    </span>
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) =>
                          setBossRushConfig((prev) => ({
                            ...prev,
                            [enabledKey]: e.target.checked,
                          }))
                        }
                      />
                      Enabled
                    </label>
                    <label className="flex items-center gap-1 text-sm">
                      Reward:{" "}
                      <input
                        type="number"
                        value={rewardVal}
                        step={0.5}
                        min={0.5}
                        className="w-16 bg-gray-700 px-2 py-1 rounded text-sm"
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
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  data-ocid="admin.boss_rush_save_button"
                  className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded text-sm font-semibold"
                  onClick={() => {
                    localStorage.setItem(
                      "bossRushConfig",
                      JSON.stringify(bossRushConfig),
                    );
                    (async () => {
                      try {
                        await (
                          adminActor as unknown as backendInterface
                        ).adminSetBossRushConfig(
                          JSON.stringify(bossRushConfig),
                        );
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
                  Save Boss Rush Config
                </button>
                {bossRushSaved && (
                  <span className="text-green-400 text-sm">Saved!</span>
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
                    {enemyNamesQ.data?.length ?? 0} names
                  </div>
                  {(enemyNamesQ.data?.length ?? 0) === 0 &&
                    !enemyNamesQ.isLoading && (
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
              {!enemyNamesQ.isLoading &&
                (enemyNamesQ.data?.length ?? 0) === 0 && (
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
              {(enemyNamesQ.data?.length ?? 0) > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(enemyNamesQ.data ?? []).map((name, i) => (
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
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}
      >
        {ALL_ABILITIES.map((a) => {
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
        toast.success(`Boss "${getDraft(id).name}" saved!`);
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

      {BOSS_IDS.map((bossId, idx) => {
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
                    Save Boss
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => handleReset(bossId)}
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
      await (
        actor as unknown as {
          adminSetAdBox: (
            i: bigint,
            img: string,
            link: string,
          ) => Promise<void>;
        }
      ).adminSetAdBox(BigInt(index), imageUrl, linkUrl);
      setStatus("Saved!");
      setTimeout(() => setStatus(""), 2000);
    } catch {
      setStatus("Error");
    }
  };
  const clear = async () => {
    try {
      await (
        actor as unknown as { adminClearAdBox: (i: bigint) => Promise<void> }
      ).adminClearAdBox(BigInt(index));
      setImageUrl("");
      setLinkUrl("");
      setStatus("Cleared!");
      setTimeout(() => setStatus(""), 2000);
    } catch {
      setStatus("Error");
    }
  };
  return (
    <div
      style={{
        background: "#1a0505",
        border: "1px solid #4a0a0a",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
      }}
    >
      <h3 style={{ color: "#ff6666", marginBottom: "12px" }}>
        Ad Box {index + 1}
      </h3>
      {imageUrl && !unsafeUrl(imageUrl) && (
        <img
          src={imageUrl}
          alt="preview"
          style={{
            width: "200px",
            height: "150px",
            objectFit: "cover",
            borderRadius: "4px",
            marginBottom: "8px",
            display: "block",
          }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Image URL (https://...)"
          style={{
            background: "#0d0505",
            border: "1px solid #4a0a0a",
            color: "#fff",
            padding: "8px",
            borderRadius: "4px",
            fontSize: "13px",
          }}
        />
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="Click-through URL (https://...)"
          style={{
            background: "#0d0505",
            border: "1px solid #4a0a0a",
            color: "#fff",
            padding: "8px",
            borderRadius: "4px",
            fontSize: "13px",
          }}
        />
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={save}
            style={{
              background: "#6b0000",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={clear}
            style={{
              background: "#333",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Clear
          </button>
          {status && (
            <span
              style={{
                color: status.includes("Error") ? "#ff4444" : "#44ff44",
                fontSize: "12px",
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
