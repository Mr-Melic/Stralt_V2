import { u as useActor, a as useQuery, r as readPurchasesResult, D as DEFAULT_BOSS_CONFIGS, b as reactExports, c as useGetEnemyConfigs, d as useGetRegionConfigs, e as useGetPlayerSpriteConfigs, f as useGetSpellConfigs, g as useGetMapModifiers, h as useGetGameConfig, i as useAdminSetEnemyConfig, j as useAdminDeleteEnemyConfig, k as useAdminSetRegionConfig, l as useAdminDeleteRegionConfig, m as useAdminSetPlayerSpriteConfig, n as useAdminDeletePlayerSpriteConfig, o as useAdminSetSpellConfig, p as useAdminDeleteSpellConfig, q as useAdminSetMapModifier, s as useAdminDeleteMapModifier, t as useAdminSetGameConfig, v as useGetAchievementConfigs, w as useAdminSetAchievementConfig, x as useAdminDeleteAchievementConfig, y as useGetEnemyNames, z as useInitDefaultNames, A as useAdminAddEnemyName, B as useAdminDeleteEnemyName, R as React, C as jsxRuntimeExports, E as ue, P as Principal, F as validateWalkFrameUrls, G as validateOptionalUrl, H as validateGameConfig, M as MAX_DOKA_GRANT, I as useAssignUserRole, J as logDebugWarn, K as useSetBossConfig, L as useDeleteBossConfig, N as BOSS_IDS, O as unsafeUrl, Q as validateDokaGrant, S as validateTierSpawnConfig, T as validateAdBox, U as validateLevelUpConfig, V as BossAbility } from "./index-DeFAK0N0.js";
function withTimeout(promise, ms = 1e4) {
  return Promise.race([
    promise,
    new Promise(
      (_, reject) => setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms)
    )
  ]);
}
function useGetPurchaseRecords() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["purchaseRecords"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const result = await withTimeout(actor.getPurchases());
        return readPurchasesResult(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/unauthorized/i.test(msg)) throw e;
        return [];
      }
    },
    enabled: !!actor && !actorFetching,
    staleTime: 3e4,
    gcTime: 12e4
  });
}
const BOSS_CONFIG_KEY = "pbv_boss_configs";
function loadBossConfigs() {
  try {
    const raw = localStorage.getItem(BOSS_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return DEFAULT_BOSS_CONFIGS;
}
function useGetAllBossConfigs() {
  return useQuery({
    queryKey: ["bossConfigs"],
    queryFn: () => loadBossConfigs(),
    staleTime: 3e4,
    gcTime: 12e4
  });
}
const newSpell = () => ({
  id: `spell_${Date.now()}`,
  name: "",
  description: "",
  iconEmoji: "⚡",
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
  buffStat: void 0,
  buffModifier: void 0,
  buffDuration: void 0,
  debuffStat: void 0,
  debuffModifier: void 0,
  debuffDuration: void 0,
  dotDamage: void 0,
  dotDuration: void 0,
  isSwap: false,
  isMirror: false,
  isTimestep: false,
  isSacrifice: false,
  isBarrier: false,
  isTrap: false,
  isMark: false
});
const newEnemy = () => ({
  id: `enemy_${Date.now()}`,
  name: "",
  hp: BigInt(50),
  ap: BigInt(6),
  mp: BigInt(3),
  initStat: BigInt(8),
  levelMin: BigInt(1),
  levelMax: BigInt(5),
  regions: [],
  spriteUrl: []
});
const newRegion = () => ({
  id: `region_${Date.now()}`,
  name: "",
  levelMin: BigInt(1),
  levelMax: BigInt(5),
  battleEffects: [],
  backgroundColor: "#0d0f1a"
});
const newSprite = () => ({
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
  walkFramesBack: []
});
const newBattleEffect = () => ({
  id: `fx_${Date.now()}`,
  name: "",
  description: "",
  effectType: { damage: null },
  value: BigInt(0)
});
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
  dimmer: "#5a5060"
};
const inputStyle = (err) => ({
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
  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04)"
});
const labelStyle = {
  color: "#d8463f",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 4,
  display: "block",
  fontFamily: "'Saira', system-ui, sans-serif"
};
const sectionHeadStyle = {
  color: "#d8463f",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  marginBottom: 10,
  paddingBottom: 5,
  borderBottom: "1px solid rgba(216,70,63,0.25)",
  fontFamily: "'Saira', system-ui, sans-serif"
};
function Btn({
  variant,
  children,
  onClick,
  ocid,
  small,
  type = "button",
  disabled
}) {
  const base = "inline-flex items-center justify-center gap-1.5 border-none cursor-pointer transition-all duration-150 ease-in-out font-bold uppercase tracking-wider";
  const size = small ? "px-2.5 py-1 text-[10px] rounded-lg" : "px-4 py-1.5 text-[11px] rounded-xl";
  const cls = variant === "gold" || variant === "red" ? `${base} ${size} stone-btn-crimson` : variant === "blue" ? `${base} ${size} stone-btn-slate text-[#86c4ff]` : `${base} ${size} bg-transparent text-[#5a6a7a] border border-[rgba(192,57,43,0.27)] hover:text-[#cdbfd2]`;
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type,
      onClick,
      "data-ocid": ocid,
      className: cls,
      disabled,
      style: disabled ? { opacity: 0.55, cursor: "not-allowed" } : void 0,
      children
    }
  );
}
function ConfirmDialog({
  title,
  body,
  confirmLabel = "Delete",
  ocidPrefix,
  onCancel,
  onConfirm
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      "data-ocid": `${ocidPrefix}.dialog`,
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(5,6,14,0.85)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          style: {
            background: "linear-gradient(180deg,#13141c,#0e0f16)",
            border: `1px solid ${C.red}`,
            borderRadius: 10,
            padding: "28px 32px",
            minWidth: 320,
            maxWidth: 420,
            boxShadow: "0 0 40px rgba(192,57,43,0.25)",
            fontFamily: "'Space Grotesk', system-ui, sans-serif"
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 28, textAlign: "center", marginBottom: 12 }, children: "⚠️" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h3",
              {
                style: {
                  color: "#f0c44a",
                  textAlign: "center",
                  margin: "0 0 10px",
                  fontSize: 15,
                  fontWeight: 800
                },
                children: title
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "p",
              {
                style: {
                  color: "#8a8090",
                  fontSize: 12,
                  textAlign: "center",
                  marginBottom: 20,
                  lineHeight: 1.5
                },
                children: body
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "center" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Btn,
                {
                  variant: "ghost",
                  onClick: onCancel,
                  ocid: `${ocidPrefix}.cancel_button`,
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Btn,
                {
                  variant: "red",
                  onClick: onConfirm,
                  ocid: `${ocidPrefix}.confirm_button`,
                  children: confirmLabel
                }
              )
            ] })
          ]
        }
      )
    }
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
  hint
}) {
  const id = ocid ?? label.toLowerCase().replace(/\s+/g, "-");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: id, style: labelStyle, children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        id,
        type,
        value,
        onChange: (e) => onChange(e.target.value),
        placeholder,
        "data-ocid": ocid,
        disabled,
        className: "stone-inset w-full px-2.5 py-1.5 text-xs text-[#c0ccd8] font-['Saira',system-ui,sans-serif]",
        style: {
          border: `1px solid ${err ? "#c0392b" : "transparent"}`,
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? "not-allowed" : void 0
        }
      }
    ),
    hint && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6a6070", fontSize: 10, margin: "3px 0 0" }, children: hint })
  ] });
}
function StatRow({
  label,
  value,
  onChange,
  ocid
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-2 px-3 py-1.5 rounded-lg stone-inset border border-[rgba(192,57,43,0.15)]", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold uppercase tracking-wider text-[#d8463f] w-[72px] shrink-0 font-['Saira',system-ui,sans-serif]", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type: "number",
        value: String(value),
        min: 0,
        onChange: (e) => onChange(BigInt(Math.max(0, Number.parseInt(e.target.value) || 0))),
        "data-ocid": ocid,
        className: "flex-1 bg-transparent border-none text-[13px] font-semibold text-[#c0ccd8] outline-none font-['Saira',system-ui,sans-serif]"
      }
    )
  ] });
}
function PanelCard({ children }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "stone-frame mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "stone-well p-3", children }) });
}
const TabErrorBanner = ({ tabName, onRetry }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
  "div",
  {
    "data-ocid": "admin.tab.error_state",
    style: {
      background: "#1a0505",
      border: "1px solid #8b1a14",
      borderRadius: 8,
      padding: "14px 18px",
      margin: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#f87171", fontSize: 12, fontWeight: 600 }, children: [
        "⚠️ Failed to load ",
        tabName,
        " data. The backend may be unavailable."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          "data-ocid": "admin.tab.retry_button",
          onClick: onRetry,
          style: {
            background: "#8b1a14",
            border: "none",
            borderRadius: 5,
            color: "#fde",
            fontSize: 10,
            fontWeight: 700,
            padding: "5px 12px",
            cursor: "pointer",
            letterSpacing: "0.06em",
            textTransform: "uppercase"
          },
          children: "Retry"
        }
      )
    ]
  }
);
const MAX_PRESETS = 10;
const PRESETS_KEY = "enemyPresets";
function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return [];
}
function savePresets(presets) {
  try {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify(presets.slice(0, MAX_PRESETS))
    );
  } catch {
  }
}
const EnemyPresets = ({ currentConfig, onLoad }) => {
  const [presets, setPresets] = React.useState(loadPresets);
  const [presetName, setPresetName] = React.useState("");
  const handleSave = () => {
    const name = presetName.trim();
    if (!name) return;
    const next = [
      ...presets.filter((p) => p.name !== name),
      { id: `preset_${Date.now()}`, name, config: { ...currentConfig } }
    ].slice(-MAX_PRESETS);
    setPresets(next);
    savePresets(next);
    setPresetName("");
  };
  const handleDelete = (id) => {
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    savePresets(next);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      style: {
        background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
        border: `1px solid ${C.goldDim}`,
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 16
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Enemy Stat Presets" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "flex",
              gap: 8,
              marginBottom: 10,
              alignItems: "center"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  value: presetName,
                  onChange: (e) => setPresetName(e.target.value),
                  placeholder: "Preset name\\u2026",
                  "data-ocid": "admin.enemy.preset_name_input",
                  style: { ...inputStyle(), flex: 1, marginBottom: 0 },
                  onKeyDown: (e) => {
                    if (e.key === "Enter") handleSave();
                  }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Btn,
                {
                  variant: "blue",
                  small: true,
                  onClick: handleSave,
                  ocid: "admin.enemy.save_preset_button",
                  children: "Save as Preset"
                }
              )
            ]
          }
        ),
        presets.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6a6070", fontSize: 11 }, children: "No presets saved yet." }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: presets.map((p, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            "data-ocid": `admin.enemy.preset.item.${i + 1}`,
            style: {
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
              border: `1px solid ${C.goldDim}`,
              borderRadius: 5,
              padding: "4px 10px"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#c0ccd8", fontSize: 11, fontWeight: 700 }, children: p.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  "data-ocid": `admin.enemy.preset.load_button.${i + 1}`,
                  onClick: () => onLoad({ ...p.config }),
                  style: {
                    background: `${C.blue}22`,
                    border: `1px solid ${C.blue}44`,
                    borderRadius: 3,
                    color: C.blue,
                    fontSize: 9,
                    padding: "2px 7px",
                    cursor: "pointer",
                    fontWeight: 700,
                    textTransform: "uppercase"
                  },
                  children: "Load"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  "data-ocid": `admin.enemy.preset.delete_button.${i + 1}`,
                  onClick: () => handleDelete(p.id),
                  style: {
                    background: C.red,
                    border: "none",
                    borderRadius: 3,
                    color: "#fde",
                    fontSize: 9,
                    padding: "2px 7px",
                    cursor: "pointer",
                    fontWeight: 700
                  },
                  children: "×"
                }
              )
            ]
          },
          p.id
        )) })
      ]
    }
  );
};
const EnemyEditor = ({ initial, regions, onSave, onCancel, saving, idLocked }) => {
  const [cfg, setCfg] = reactExports.useState(initial);
  const set = (k, v) => setCfg((p) => ({ ...p, [k]: v }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.enemy_editor", style: { padding: 20 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(EnemyPresets, { currentConfig: cfg, onLoad: (loaded) => setCfg(loaded) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Enemy Configuration" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              label: "ID",
              value: cfg.id,
              onChange: (v) => set("id", v),
              ocid: "admin.enemy.id_input",
              placeholder: "unique-id",
              disabled: idLocked,
              hint: idLocked ? "ID is locked after create — changing it would orphan the live record." : void 0
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              label: "Name",
              value: cfg.name,
              onChange: (v) => set("name", v),
              ocid: "admin.enemy.name_input",
              placeholder: "Shadow Knight"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginTop: 4 }, children: "Stats" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "HP",
              value: cfg.hp,
              onChange: (v) => set("hp", v),
              ocid: "admin.enemy.hp_input"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "AP",
              value: cfg.ap,
              onChange: (v) => set("ap", v),
              ocid: "admin.enemy.ap_input"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "MP",
              value: cfg.mp,
              onChange: (v) => set("mp", v),
              ocid: "admin.enemy.mp_input"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "Init",
              value: cfg.initStat,
              onChange: (v) => set("initStat", v),
              ocid: "admin.enemy.initstat_input"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "Level Min",
              value: cfg.levelMin,
              onChange: (v) => set("levelMin", v),
              ocid: "admin.enemy.levelmin_input"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "Level Max",
              value: cfg.levelMax,
              onChange: (v) => set("levelMax", v),
              ocid: "admin.enemy.levelmax_input"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.enemy.sprite_input", style: labelStyle, children: "Custom Visual Override" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6a6070", fontSize: 10, margin: "0 0 6px" }, children: "Default Pixel Visual — Active fallback when this field is empty. Leave blank to keep the chess-piece sprite. PNG or WebP, square, pixel art recommended (no upload yet — paste a hosted URL)." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          id: "admin.enemy.sprite_input",
          type: "text",
          value: cfg.spriteUrl[0] ?? "",
          onChange: (e) => set("spriteUrl", e.target.value ? [e.target.value] : []),
          placeholder: "https://… (optional custom override)",
          "data-ocid": "admin.enemy.sprite_input",
          style: inputStyle()
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "p",
        {
          "data-ocid": "admin.enemy.visual_status",
          style: {
            color: cfg.spriteUrl[0] ? C.gold : C.green,
            fontSize: 10,
            margin: "4px 0 0",
            fontWeight: 700
          },
          children: cfg.spriteUrl[0] ? "Custom Visual — 1 override URL" : "Default Pixel Visual — Active fallback"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { ...sectionHeadStyle, marginTop: 8 }, children: [
      "Regions (",
      cfg.regions.length,
      " selected)"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
          background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          borderRadius: 6,
          padding: "10px 12px",
          border: `1px solid ${C.goldDim}`
        },
        children: [
          regions.map((r) => {
            const checked = cfg.regions.includes(r.id);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "label",
              {
                style: {
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
                  transition: "all 0.15s"
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked,
                      onChange: () => set(
                        "regions",
                        checked ? cfg.regions.filter((x) => x !== r.id) : [...cfg.regions, r.id]
                      ),
                      style: { accentColor: C.gold, width: 13, height: 13 }
                    }
                  ),
                  r.name || r.id
                ]
              },
              r.id
            );
          }),
          regions.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#6a6070", fontSize: 11 }, children: "No regions configured yet — add some first" })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Btn,
        {
          variant: "gold",
          onClick: () => {
            if (!cfg.id.trim() || !cfg.name.trim()) {
              ue.error("Enemy ID and name are required");
              return;
            }
            onSave(cfg);
          },
          ocid: "admin.enemy.save_button",
          disabled: saving,
          children: saving ? "Saving…" : "Save Enemy"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Btn,
        {
          variant: "ghost",
          onClick: onCancel,
          ocid: "admin.enemy.cancel_button",
          children: "Cancel"
        }
      )
    ] })
  ] });
};
const RegionEditor = ({ initial, onSave, onCancel, saving, idLocked }) => {
  const [cfg, setCfg] = reactExports.useState(initial);
  const [newFx, setNewFx] = reactExports.useState(newBattleEffect());
  const set = (k, v) => setCfg((p) => ({ ...p, [k]: v }));
  const addEffect = () => {
    if (!newFx.name.trim()) return;
    set("battleEffects", [
      ...cfg.battleEffects,
      { ...newFx, id: `fx_${Date.now()}` }
    ]);
    setNewFx(newBattleEffect());
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.region_editor", style: { padding: 20 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Region Configuration" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              label: "ID",
              value: cfg.id,
              onChange: (v) => set("id", v),
              ocid: "admin.region.id_input",
              placeholder: "frozen-wastes",
              disabled: idLocked,
              hint: idLocked ? "ID is locked after create — changing it would orphan the live record." : void 0
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              label: "Name",
              value: cfg.name,
              onChange: (v) => set("name", v),
              ocid: "admin.region.name_input",
              placeholder: "Frozen Wastes"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0 16px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "Level Min",
              value: cfg.levelMin,
              onChange: (v) => set("levelMin", v),
              ocid: "admin.region.levelmin_input"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "Level Max",
              value: cfg.levelMax,
              onChange: (v) => set("levelMax", v),
              ocid: "admin.region.levelmax_input"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.region.bgcolor_input", style: labelStyle, children: "Background Color" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "admin.region.bgcolor_input",
                  type: "color",
                  value: cfg.backgroundColor,
                  onChange: (e) => set("backgroundColor", e.target.value),
                  "data-ocid": "admin.region.bgcolor_input",
                  style: {
                    width: 36,
                    height: 36,
                    border: `1px solid ${C.goldDim}`,
                    borderRadius: 5,
                    cursor: "pointer",
                    background: "transparent",
                    padding: 2
                  }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#c0ccd8", fontSize: 12 }, children: cfg.backgroundColor })
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { ...sectionHeadStyle, marginTop: 8 }, children: [
      "Battle Effects (",
      cfg.battleEffects.length,
      ")"
    ] }),
    cfg.battleEffects.map((fx, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 6,
          background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          padding: "7px 12px",
          borderRadius: 6,
          border: `1px solid ${C.goldDim}`
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                flex: 1,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    style: {
                      color: "#f0c44a",
                      fontWeight: 700,
                      fontSize: 12
                    },
                    children: fx.name
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    style: {
                      background: `${C.gold}22`,
                      border: `1px solid ${C.goldDim}`,
                      borderRadius: 20,
                      padding: "1px 7px",
                      fontSize: 10,
                      color: "#f0c44a",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase"
                    },
                    children: Object.keys(fx.effectType)[0]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#8a8090", fontSize: 11 }, children: [
                  "+",
                  String(fx.value)
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => set(
                "battleEffects",
                cfg.battleEffects.filter((_, idx) => idx !== i)
              ),
              "data-ocid": `admin.region.effect.delete_button.${i + 1}`,
              style: {
                background: C.red,
                border: "none",
                borderRadius: 4,
                color: "#fde",
                padding: "3px 10px",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 700
              },
              children: "×"
            }
          )
        ]
      },
      fx.id
    )),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto",
          gap: 8,
          alignItems: "end",
          marginTop: 6,
          background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          padding: "10px 12px",
          borderRadius: 6,
          border: `1px solid ${C.goldDim}`,
          marginBottom: 16
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.region.effect.name_input", style: labelStyle, children: "Effect Name" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.region.effect.name_input",
                type: "text",
                value: newFx.name,
                onChange: (e) => setNewFx((p) => ({ ...p, name: e.target.value })),
                placeholder: "e.g. Frost Burn",
                "data-ocid": "admin.region.effect.name_input",
                style: inputStyle()
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.region.effect.type_select", style: labelStyle, children: "Type" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                id: "admin.region.effect.type_select",
                value: Object.keys(newFx.effectType)[0],
                onChange: (e) => setNewFx((p) => ({
                  ...p,
                  effectType: {
                    [e.target.value]: null
                  }
                })),
                "data-ocid": "admin.region.effect.type_select",
                style: {
                  background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                  border: `1px solid ${C.goldDim}`,
                  borderRadius: 5,
                  color: "#c0ccd8",
                  padding: "7px 10px",
                  fontSize: 12,
                  outline: "none"
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "damage", children: "Damage" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "buff", children: "Buff" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "debuff", children: "Debuff" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.region.effect.value_input", style: labelStyle, children: "Value" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.region.effect.value_input",
                type: "number",
                value: String(newFx.value),
                min: 0,
                onChange: (e) => setNewFx((p) => ({
                  ...p,
                  value: BigInt(
                    Math.max(0, Number.parseInt(e.target.value) || 0)
                  )
                })),
                "data-ocid": "admin.region.effect.value_input",
                style: { ...inputStyle(), width: 70 }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Btn,
            {
              variant: "blue",
              onClick: addEffect,
              ocid: "admin.region.effect.add_button",
              children: "+ Add"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Btn,
        {
          variant: "gold",
          onClick: () => {
            if (!cfg.id.trim() || !cfg.name.trim()) {
              ue.error("Region ID and name are required");
              return;
            }
            onSave(cfg);
          },
          ocid: "admin.region.save_button",
          disabled: saving,
          children: saving ? "Saving…" : "Save Region"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Btn,
        {
          variant: "ghost",
          onClick: onCancel,
          ocid: "admin.region.cancel_button",
          children: "Cancel"
        }
      )
    ] })
  ] });
};
const PIECE_TYPES = [
  "king",
  "queen",
  "rook",
  "bishop",
  "knight",
  "pawn",
  "custom"
];
function WalkFrameSection({
  label,
  frames,
  onChange,
  ocidPrefix
}) {
  const [open, setOpen] = React.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      style: {
        marginBottom: 10,
        border: `1px solid ${C.goldDim}`,
        borderRadius: 6,
        overflow: "hidden",
        background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => setOpen((p) => !p),
            "data-ocid": `${ocidPrefix}.toggle`,
            style: {
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
              fontFamily: "'Space Grotesk', system-ui, sans-serif"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                label,
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    style: {
                      background: `${C.gold}22`,
                      border: `1px solid ${C.goldDim}`,
                      borderRadius: 10,
                      padding: "0 6px",
                      fontSize: 9,
                      marginLeft: 4
                    },
                    children: frames.length
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, opacity: 0.6 }, children: open ? "▲" : "▼" })
            ]
          }
        ),
        open && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "0 12px 10px" }, children: [
          frames.map((url, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                display: "flex",
                gap: 6,
                alignItems: "center",
                marginBottom: 6
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "span",
                  {
                    style: {
                      color: "#6a6070",
                      fontSize: 10,
                      width: 56,
                      flexShrink: 0
                    },
                    children: [
                      "Frame ",
                      idx + 1
                    ]
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "text",
                    value: url,
                    onChange: (e) => {
                      const next = [...frames];
                      next[idx] = e.target.value;
                      onChange(next);
                    },
                    placeholder: "https://…",
                    "data-ocid": `${ocidPrefix}.frame_input.${idx + 1}`,
                    style: { ...inputStyle(), flex: 1, marginBottom: 0 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => onChange(frames.filter((_, i) => i !== idx)),
                    "data-ocid": `${ocidPrefix}.frame_delete.${idx + 1}`,
                    style: {
                      background: C.red,
                      border: "none",
                      borderRadius: 4,
                      color: "#fde",
                      padding: "4px 9px",
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 700,
                      flexShrink: 0
                    },
                    children: "×"
                  }
                )
              ]
            },
            `${ocidPrefix}-frame-${idx}`
          )),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: () => onChange([...frames, ""]),
              "data-ocid": `${ocidPrefix}.add_frame_button`,
              style: {
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
                marginTop: 2
              },
              children: "+ Add Frame"
            }
          )
        ] })
      ]
    }
  );
}
const SpriteEditorForm = ({ initial, onSave, onCancel, saving }) => {
  const [cfg, setCfg] = reactExports.useState(initial);
  const set = (k, v) => setCfg((p) => ({ ...p, [k]: v }));
  const setOpt = (k, v) => set(k, v ? [v] : []);
  const previewUrl = cfg.frontUrl[0] ?? "";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": "admin.sprite_editor",
      style: { display: "flex", flexDirection: "column", height: "100%" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflowY: "auto", padding: "18px 20px 8px" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Character Details" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 16px"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Field,
                  {
                    label: "Name",
                    value: cfg.name,
                    onChange: (v) => set("name", v),
                    ocid: "admin.sprite.name_input",
                    placeholder: "Dark Pawn"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.sprite.piecetype_select", style: labelStyle, children: "Piece Type" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "select",
                    {
                      id: "admin.sprite.piecetype_select",
                      value: cfg.characterPieceType,
                      onChange: (e) => set("characterPieceType", e.target.value),
                      "data-ocid": "admin.sprite.piecetype_select",
                      style: inputStyle(),
                      children: PIECE_TYPES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, children: t.charAt(0).toUpperCase() + t.slice(1) }, t))
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                marginBottom: 14,
                background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                border: `1px solid ${C.goldDim}`,
                borderRadius: 8,
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 16
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    style: {
                      width: 72,
                      height: 72,
                      border: `2px solid ${C.goldDim}`,
                      borderRadius: 6,
                      background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0
                    },
                    children: previewUrl ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "img",
                      {
                        src: previewUrl,
                        alt: "preview",
                        style: {
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          imageRendering: "pixelated"
                        },
                        onError: (e) => {
                          e.target.style.display = "none";
                        }
                      }
                    ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "span",
                      {
                        "data-ocid": "admin.sprite.default_visual_status",
                        style: {
                          color: C.green,
                          fontSize: 9,
                          textAlign: "center",
                          padding: 4
                        },
                        children: "Default Pixel Visual — Active fallback"
                      }
                    )
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      style: {
                        color: "#c0ccd8",
                        fontWeight: 700,
                        fontSize: 13,
                        marginBottom: 4
                      },
                      children: cfg.name || "Unnamed Character"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#8a8090", fontSize: 10 }, children: cfg.characterPieceType.charAt(0).toUpperCase() + cfg.characterPieceType.slice(1) })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginTop: 4 }, children: "Direction Sprites" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              style: {
                color: "#6a6070",
                fontSize: 10,
                margin: "0 0 8px",
                lineHeight: 1.45
              },
              children: "Custom Visual Override — paste hosted PNG/WebP URLs (square pixel art, one frame per facing). Empty URLs are valid: the chess-piece Default Pixel Visual stays the active fallback. No file upload yet."
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 16px"
              },
              children: [
                ["Front URL", "frontUrl"],
                ["Right URL", "rightUrl"],
                ["Left URL", "leftUrl"],
                ["Back URL", "backUrl"]
              ].map(([label, k]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: `admin.sprite.${k}_input`, style: labelStyle, children: label }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: `admin.sprite.${k}_input`,
                    type: "text",
                    value: cfg[k][0] ?? "",
                    onChange: (e) => setOpt(k, e.target.value),
                    placeholder: "https://… (optional)",
                    "data-ocid": `admin.sprite.${k}_input`,
                    style: inputStyle()
                  }
                )
              ] }, k))
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginTop: 4 }, children: "Walk Animation Frames" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 16px"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  WalkFrameSection,
                  {
                    label: "Front Walk",
                    frames: cfg.walkFramesFront,
                    onChange: (v) => set("walkFramesFront", v),
                    ocidPrefix: "admin.sprite.walk_front"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  WalkFrameSection,
                  {
                    label: "Right Walk",
                    frames: cfg.walkFramesRight,
                    onChange: (v) => set("walkFramesRight", v),
                    ocidPrefix: "admin.sprite.walk_right"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  WalkFrameSection,
                  {
                    label: "Left Walk",
                    frames: cfg.walkFramesLeft,
                    onChange: (v) => set("walkFramesLeft", v),
                    ocidPrefix: "admin.sprite.walk_left"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  WalkFrameSection,
                  {
                    label: "Back Walk",
                    frames: cfg.walkFramesBack,
                    onChange: (v) => set("walkFramesBack", v),
                    ocidPrefix: "admin.sprite.walk_back"
                  }
                )
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              flexShrink: 0,
              borderTop: `1px solid ${C.goldDim}`,
              padding: "12px 20px",
              display: "flex",
              gap: 10,
              background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
              justifyContent: "flex-end"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Btn,
                {
                  variant: "ghost",
                  onClick: onCancel,
                  ocid: "admin.sprite.cancel_button",
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Btn,
                {
                  variant: "gold",
                  onClick: () => onSave(cfg),
                  ocid: "admin.sprite.save_button",
                  disabled: saving,
                  children: saving ? "Saving…" : "Save Character"
                }
              )
            ]
          }
        )
      ]
    }
  );
};
const PIECE_ICONS = {
  king: "♔",
  queen: "♕",
  rook: "♖",
  bishop: "♗",
  knight: "♘",
  pawn: "♙"
};
const SpriteList = ({ sprites, loading, saving, onSave, onDelete }) => {
  const [selectedId, setSelectedId] = reactExports.useState(null);
  const [editingCfg, setEditingCfg] = reactExports.useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = reactExports.useState(null);
  const selectSprite = (s) => {
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
  const handleSave = (cfg) => {
    onSave(cfg);
    setSelectedId(null);
    setEditingCfg(null);
  };
  const handleDeleteConfirm = (id) => {
    onDelete(id);
    setConfirmDeleteId(null);
    if (selectedId === id) {
      setSelectedId(null);
      setEditingCfg(null);
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": "admin.sprites_panel",
      style: {
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        height: "100%",
        overflow: "hidden"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
              borderRight: `1px solid ${C.goldDim}`,
              overflow: "hidden"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px 10px",
                    borderBottom: `1px solid ${C.goldDim}`,
                    flexShrink: 0
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "h3",
                      {
                        style: {
                          color: "#f0c44a",
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase"
                        },
                        children: "Characters"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Btn,
                      {
                        variant: "gold",
                        small: true,
                        onClick: createNew,
                        ocid: "admin.sprites.add_button",
                        children: "+ New"
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflowY: "auto", padding: "8px 0" }, children: [
                loading && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    "data-ocid": "admin.sprites.loading_state",
                    style: {
                      color: "#8a8090",
                      fontSize: 11,
                      textAlign: "center",
                      padding: 24
                    },
                    children: "Loading…"
                  }
                ),
                !loading && sprites.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    "data-ocid": "admin.sprites.empty_state",
                    style: {
                      textAlign: "center",
                      padding: "32px 16px",
                      color: "#6a6070",
                      fontSize: 12
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 26, marginBottom: 8 }, children: "♟️" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, marginBottom: 4, color: C.dim }, children: "No characters yet" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10 }, children: 'Click "+ New" to add one' })
                    ]
                  }
                ),
                sprites.map((s, i) => {
                  const isActive = selectedId === s.id;
                  const thumb = s.frontUrl[0];
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      "data-ocid": `admin.sprites.item.${i + 1}`,
                      onClick: () => selectSprite(s),
                      onKeyDown: (e) => {
                        if (e.key === "Enter" || e.key === " ") selectSprite(s);
                      },
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 16px",
                        cursor: "pointer",
                        width: "100%",
                        border: "none",
                        borderLeft: `3px solid ${isActive ? C.gold : "transparent"}`,
                        background: isActive ? `linear-gradient(90deg, ${C.gold}16, transparent)` : "transparent",
                        transition: "background 0.15s, border-color 0.15s",
                        textAlign: "left",
                        font: "inherit"
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "div",
                          {
                            style: {
                              width: 36,
                              height: 36,
                              border: `1px solid ${isActive ? C.gold : C.goldDim}`,
                              borderRadius: 6,
                              background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              flexShrink: 0
                            },
                            children: thumb ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "img",
                              {
                                src: thumb,
                                alt: "",
                                style: {
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                  imageRendering: "pixelated"
                                }
                              }
                            ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#f0c44a", fontSize: 18 }, children: PIECE_ICONS[s.characterPieceType] ?? "♙" })
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "div",
                            {
                              style: {
                                color: isActive ? C.goldBright : C.silver,
                                fontWeight: 700,
                                fontSize: 12,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              },
                              children: s.name || "Unnamed"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "div",
                            {
                              style: {
                                display: "inline-block",
                                background: `${C.gold}18`,
                                border: `1px solid ${C.goldDim}`,
                                borderRadius: 10,
                                padding: "1px 7px",
                                fontSize: 9,
                                color: "#f0c44a",
                                textTransform: "capitalize",
                                letterSpacing: "0.05em",
                                marginTop: 2
                              },
                              children: s.characterPieceType
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "div",
                          {
                            style: { display: "flex", gap: 4, flexShrink: 0 },
                            onClick: (e) => e.stopPropagation(),
                            onKeyDown: (e) => e.stopPropagation(),
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => selectSprite(s),
                                  "data-ocid": `admin.sprites.edit_button.${i + 1}`,
                                  title: "Edit",
                                  style: {
                                    background: "transparent",
                                    border: `1px solid ${C.goldDim}`,
                                    borderRadius: 4,
                                    color: "#8a8090",
                                    padding: "3px 7px",
                                    fontSize: 11,
                                    cursor: "pointer"
                                  },
                                  children: "✏"
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => setConfirmDeleteId(s.id),
                                  "data-ocid": `admin.sprites.delete_button.${i + 1}`,
                                  title: "Delete",
                                  style: {
                                    background: C.red,
                                    border: "none",
                                    borderRadius: 4,
                                    color: "#fde",
                                    padding: "3px 7px",
                                    fontSize: 11,
                                    cursor: "pointer",
                                    fontWeight: 700
                                  },
                                  children: "×"
                                }
                              )
                            ]
                          }
                        )
                      ]
                    },
                    s.id
                  );
                })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)"
            },
            children: editingCfg ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              SpriteEditorForm,
              {
                initial: editingCfg,
                saving,
                onSave: handleSave,
                onCancel: handleCancel
              }
            ) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                "data-ocid": "admin.sprites.placeholder",
                style: {
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6a6070",
                  gap: 12
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 42 }, children: "♟️" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 700, color: C.dim }, children: "Select a character or create new" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11 }, children: "Use the list on the left to get started" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      onClick: createNew,
                      "data-ocid": "admin.sprites.placeholder_add_button",
                      style: {
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
                        boxShadow: "0 2px 12px rgba(192,57,43,0.3)"
                      },
                      children: "+ New Character"
                    }
                  )
                ]
              }
            )
          }
        ),
        confirmDeleteId && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            title: "Delete Character?",
            body: "This removes the sprite override. Characters without a custom visual keep the Default Pixel Visual. This cannot be undone.",
            ocidPrefix: "admin.sprites.delete",
            onCancel: () => setConfirmDeleteId(null),
            onConfirm: () => handleDeleteConfirm(confirmDeleteId)
          }
        )
      ]
    }
  );
};
const EnemyList = ({ enemies, loading, onAdd, onEdit, onDelete }) => {
  const [confirmId, setConfirmId] = reactExports.useState(null);
  const pending = enemies.find((e) => e.id === confirmId);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 20 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h3",
              {
                style: {
                  color: "#f0c44a",
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.06em"
                },
                children: "Enemy Configurations"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { color: "#8a8090", fontSize: 11, margin: "3px 0 0" }, children: [
              enemies.length,
              " enemi",
              enemies.length === 1 ? "y" : "es",
              " configured"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Btn, { variant: "gold", onClick: onAdd, ocid: "admin.enemies.add_button", children: "+ Add Enemy" })
        ]
      }
    ),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        "data-ocid": "admin.enemies.loading_state",
        style: {
          color: "#8a8090",
          fontSize: 12,
          textAlign: "center",
          padding: 24
        },
        children: "Loading enemies…"
      }
    ),
    !loading && enemies.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "admin.enemies.empty_state",
        style: {
          textAlign: "center",
          padding: "40px 0",
          color: "#6a6070",
          fontSize: 13,
          border: `1px dashed ${C.dimmer}`,
          borderRadius: 8
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 28, marginBottom: 8 }, children: "⚔️" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, marginBottom: 4 }, children: "No enemies yet" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11 }, children: "Add your first enemy configuration above" })
        ]
      }
    ),
    enemies.map((e, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(PanelCard, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": `admin.enemies.item.${i + 1}`,
        style: {
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "10px 14px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              style: {
                width: 36,
                height: 36,
                background: `linear-gradient(135deg, ${C.bg0}, ${C.bg3})`,
                border: `1px solid ${C.goldDim}`,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0
              },
              children: "👾"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                style: {
                  color: "#c0ccd8",
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 2
                },
                children: e.name || e.id
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                style: {
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center"
                },
                children: [
                  [
                    `Lv ${String(e.levelMin)}–${String(e.levelMax)}`,
                    C.goldBright
                  ],
                  [`HP ${String(e.hp)}`, C.red],
                  [`AP ${String(e.ap)}`, C.blue],
                  [`MP ${String(e.mp)}`, C.green],
                  [`Init ${String(e.initStat)}`, C.dim],
                  [
                    e.spriteUrl[0] ? "Custom visual" : "Default pixel visual",
                    e.spriteUrl[0] ? C.gold : C.green
                  ]
                ].map(([label, color]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    style: {
                      background: `${color}18`,
                      border: `1px solid ${color}44`,
                      borderRadius: 20,
                      padding: "1px 7px",
                      fontSize: 10,
                      color,
                      letterSpacing: "0.04em"
                    },
                    children: label
                  },
                  label
                ))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Btn,
              {
                variant: "ghost",
                small: true,
                onClick: () => onEdit(e.id),
                ocid: `admin.enemies.edit_button.${i + 1}`,
                children: "Edit"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Btn,
              {
                variant: "red",
                small: true,
                onClick: () => setConfirmId(e.id),
                ocid: `admin.enemies.delete_button.${i + 1}`,
                children: "×"
              }
            )
          ] })
        ]
      }
    ) }, e.id)),
    confirmId && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        title: `Delete ${(pending == null ? void 0 : pending.name) || (pending == null ? void 0 : pending.id) || "enemy"}?`,
        body: "This removes the live enemy template immediately. Players can encounter it until you recreate it. This cannot be undone.",
        ocidPrefix: "admin.enemies.delete",
        onCancel: () => setConfirmId(null),
        onConfirm: () => {
          onDelete(confirmId);
          setConfirmId(null);
        }
      }
    )
  ] });
};
const RegionList = ({ regions, loading, onAdd, onEdit, onDelete }) => {
  const [confirmId, setConfirmId] = reactExports.useState(null);
  const pending = regions.find((r) => r.id === confirmId);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 20 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h3",
              {
                style: {
                  color: "#f0c44a",
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.06em"
                },
                children: "Region Configurations"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { color: "#8a8090", fontSize: 11, margin: "3px 0 0" }, children: [
              regions.length,
              " region",
              regions.length === 1 ? "" : "s",
              " defined"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Btn, { variant: "gold", onClick: onAdd, ocid: "admin.regions.add_button", children: "+ Add Region" })
        ]
      }
    ),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        "data-ocid": "admin.regions.loading_state",
        style: {
          color: "#8a8090",
          fontSize: 12,
          textAlign: "center",
          padding: 24
        },
        children: "Loading regions…"
      }
    ),
    !loading && regions.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "admin.regions.empty_state",
        style: {
          textAlign: "center",
          padding: "40px 0",
          color: "#6a6070",
          fontSize: 13,
          border: `1px dashed ${C.dimmer}`,
          borderRadius: 8
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 28, marginBottom: 8 }, children: "🗺️" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, marginBottom: 4 }, children: "No regions yet" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11 }, children: "Create your first battle region" })
        ]
      }
    ),
    regions.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(PanelCard, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": `admin.regions.item.${i + 1}`,
        style: {
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "10px 14px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              style: {
                width: 36,
                height: 36,
                background: r.backgroundColor,
                border: `2px solid ${C.goldDim}`,
                borderRadius: 6,
                flexShrink: 0,
                boxShadow: `0 0 8px ${r.backgroundColor}88`
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                style: {
                  color: "#c0ccd8",
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 2
                },
                children: r.name || r.id
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center"
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "span",
                    {
                      style: {
                        background: `${C.gold}18`,
                        border: `1px solid ${C.goldDim}`,
                        borderRadius: 20,
                        padding: "1px 7px",
                        fontSize: 10,
                        color: "#f0c44a"
                      },
                      children: [
                        "Lv ",
                        String(r.levelMin),
                        "–",
                        String(r.levelMax)
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "span",
                    {
                      style: {
                        background: `${C.blue}18`,
                        border: `1px solid ${C.blue}44`,
                        borderRadius: 20,
                        padding: "1px 7px",
                        fontSize: 10,
                        color: C.blue
                      },
                      children: [
                        r.battleEffects.length,
                        " effect",
                        r.battleEffects.length === 1 ? "" : "s"
                      ]
                    }
                  ),
                  r.battleEffects.slice(0, 2).map((fx) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#8a8090", fontSize: 10 }, children: fx.name }, fx.id))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Btn,
              {
                variant: "ghost",
                small: true,
                onClick: () => onEdit(r.id),
                ocid: `admin.regions.edit_button.${i + 1}`,
                children: "Edit"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Btn,
              {
                variant: "red",
                small: true,
                onClick: () => setConfirmId(r.id),
                ocid: `admin.regions.delete_button.${i + 1}`,
                children: "×"
              }
            )
          ] })
        ]
      }
    ) }, r.id)),
    confirmId && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        title: `Delete ${(pending == null ? void 0 : pending.name) || (pending == null ? void 0 : pending.id) || "region"}?`,
        body: "This removes the live region template immediately. Enemies assigned to it lose that spawn region. This cannot be undone.",
        ocidPrefix: "admin.regions.delete",
        onCancel: () => setConfirmId(null),
        onConfirm: () => {
          onDelete(confirmId);
          setConfirmId(null);
        }
      }
    )
  ] });
};
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
  "cc"
];
const SpellEditor = ({ initial, onSave, onCancel, saving, idLocked }) => {
  var _a;
  const [cfg, setCfg] = reactExports.useState(initial);
  const set = (k, v) => setCfg((p) => ({ ...p, [k]: v }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.spell_editor", style: { padding: 20 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Spell Configuration" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              label: "ID",
              value: cfg.id,
              onChange: (v) => set("id", v),
              ocid: "admin.spell.id_input",
              placeholder: "fireball",
              disabled: idLocked,
              hint: idLocked ? "ID is locked after create — changing it would orphan the live record." : void 0
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              label: "Name",
              value: cfg.name,
              onChange: (v) => set("name", v),
              ocid: "admin.spell.name_input",
              placeholder: "Fireball"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Field,
      {
        label: "Description",
        value: cfg.description,
        onChange: (v) => set("description", v),
        ocid: "admin.spell.description_input",
        placeholder: "Launches a ball of fire at the target"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "80px 1fr",
          gap: "0 16px",
          alignItems: "end"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.icon_input", style: labelStyle, children: "Icon" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.spell.icon_input",
                type: "text",
                value: cfg.iconEmoji,
                onChange: (e) => set("iconEmoji", e.target.value),
                placeholder: "⚡",
                "data-ocid": "admin.spell.icon_input",
                style: { ...inputStyle(), textAlign: "center", fontSize: 20 }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.effecttype_select", style: labelStyle, children: "Effect Type" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                id: "admin.spell.effecttype_select",
                value: cfg.effectType,
                onChange: (e) => set("effectType", e.target.value),
                "data-ocid": "admin.spell.effecttype_select",
                style: inputStyle(),
                children: SPELL_EFFECT_TYPES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, children: t.charAt(0).toUpperCase() + t.slice(1) }, t))
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginTop: 4 }, children: "Stats" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "0 16px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "AP Cost",
              value: cfg.apCost,
              onChange: (v) => set("apCost", v),
              ocid: "admin.spell.apcost_input"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "MP Cost",
              value: cfg.mpCost,
              onChange: (v) => set("mpCost", v),
              ocid: "admin.spell.mpcost_input"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "Damage",
              value: cfg.damage,
              onChange: (v) => set("damage", v),
              ocid: "admin.spell.damage_input"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "Range",
              value: cfg.range,
              onChange: (v) => set("range", v),
              ocid: "admin.spell.range_input"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            StatRow,
            {
              label: "Cooldown",
              value: BigInt(cfg.cooldown ?? 0),
              onChange: (v) => set("cooldown", Number(v)),
              ocid: "admin.spell.cooldown_input"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginTop: 4 }, children: "Spell Type" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0 16px",
          marginBottom: 10,
          alignItems: "end"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.spelltype_select", style: labelStyle, children: "Spell Type" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                id: "admin.spell.spelltype_select",
                value: cfg.spellType ?? "damage",
                onChange: (e) => set("spellType", e.target.value),
                "data-ocid": "admin.spell.spelltype_select",
                style: inputStyle(),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "damage", children: "Damage" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "heal", children: "Heal (targets self)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "drain", children: "Drain (dmg enemy + heal self)" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.healamount_input", style: labelStyle, children: "Heal Amount" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.spell.healamount_input",
                type: "number",
                min: 0,
                value: cfg.healAmount ?? 0,
                onChange: (e) => set("healAmount", Math.max(0, Number(e.target.value) || 0)),
                disabled: cfg.spellType === "damage",
                "data-ocid": "admin.spell.healamount_input",
                style: {
                  ...inputStyle(),
                  opacity: cfg.spellType === "damage" ? 0.4 : 1
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                border: `1px solid ${C.goldDim}`,
                borderRadius: 5
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "admin.spell.isphysical_checkbox",
                    type: "checkbox",
                    checked: cfg.isPhysical ?? false,
                    onChange: (e) => set("isPhysical", e.target.checked),
                    "data-ocid": "admin.spell.isphysical_checkbox",
                    style: { accentColor: C.gold, width: 14, height: 14 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "label",
                  {
                    htmlFor: "admin.spell.isphysical_checkbox",
                    style: { ...labelStyle, marginBottom: 0, cursor: "pointer" },
                    children: "Physical Attack"
                  }
                )
              ]
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginTop: 4 }, children: "Usage & Targeting" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "0 16px",
          marginBottom: 10,
          alignItems: "end"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                border: `1px solid ${C.goldDim}`,
                borderRadius: 5
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "admin.spell.usablebuplayer_checkbox",
                    type: "checkbox",
                    checked: cfg.usableByPlayer ?? true,
                    onChange: (e) => set("usableByPlayer", e.target.checked),
                    "data-ocid": "admin.spell.usablebuplayer_checkbox",
                    style: { accentColor: C.gold, width: 14, height: 14 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "label",
                  {
                    htmlFor: "admin.spell.usablebuplayer_checkbox",
                    style: {
                      ...labelStyle,
                      marginBottom: 0,
                      cursor: "pointer",
                      fontSize: 9
                    },
                    children: "Player Can Use"
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                border: `1px solid ${C.goldDim}`,
                borderRadius: 5
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "admin.spell.usablebyenemy_checkbox",
                    type: "checkbox",
                    checked: cfg.usableByEnemy ?? true,
                    onChange: (e) => set("usableByEnemy", e.target.checked),
                    "data-ocid": "admin.spell.usablebyenemy_checkbox",
                    style: { accentColor: C.gold, width: 14, height: 14 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "label",
                  {
                    htmlFor: "admin.spell.usablebyenemy_checkbox",
                    style: {
                      ...labelStyle,
                      marginBottom: 0,
                      cursor: "pointer",
                      fontSize: 9
                    },
                    children: "Enemy Can Use"
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                border: `1px solid ${C.goldDim}`,
                borderRadius: 5
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "admin.spell.hitsmultiple_checkbox",
                    type: "checkbox",
                    checked: cfg.hitsMultiple ?? cfg.multiTarget ?? false,
                    onChange: (e) => {
                      set("hitsMultiple", e.target.checked);
                      set("multiTarget", e.target.checked);
                    },
                    "data-ocid": "admin.spell.hitsmultiple_checkbox",
                    style: { accentColor: C.gold, width: 14, height: 14 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "label",
                  {
                    htmlFor: "admin.spell.hitsmultiple_checkbox",
                    style: {
                      ...labelStyle,
                      marginBottom: 0,
                      cursor: "pointer",
                      fontSize: 9
                    },
                    children: "Hits Multiple Targets"
                  }
                )
              ]
            }
          ),
          (cfg.hitsMultiple ?? cfg.multiTarget) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                background: "rgba(180,0,0,0.1)",
                border: "1px solid rgba(180,0,0,0.4)",
                borderRadius: 5
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "admin.spell.hitsallies_checkbox",
                    type: "checkbox",
                    checked: cfg.hitsAllies ?? false,
                    onChange: (e) => set("hitsAllies", e.target.checked),
                    "data-ocid": "admin.spell.hitsallies_checkbox",
                    style: { accentColor: "#dc2626", width: 14, height: 14 }
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "label",
                  {
                    htmlFor: "admin.spell.hitsallies_checkbox",
                    style: {
                      ...labelStyle,
                      marginBottom: 0,
                      cursor: "pointer",
                      fontSize: 9
                    },
                    children: "Also Hits Allies"
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "1 / -1", marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "p",
              {
                style: {
                  color: "#f0c44a",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: "0 0 8px"
                },
                children: "Spell Properties"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 6
                },
                children: [
                  { key: "modifiableRange", label: "Modifiable Range" },
                  { key: "lineOfSight", label: "Line of Sight" },
                  { key: "linear", label: "Linear" },
                  { key: "diagonal", label: "Diagonal" },
                  { key: "freeCells", label: "Free Cells" },
                  { key: "aoe", label: "Area of Effect" }
                ].map(({ key, label }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 8px",
                      background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                      border: `1px solid ${C.goldDim}`,
                      borderRadius: 4
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          id: `admin.spell.${key}_checkbox`,
                          type: "checkbox",
                          checked: cfg[key] ?? false,
                          onChange: (e) => set(key, e.target.checked),
                          "data-ocid": `admin.spell.${key}_checkbox`,
                          style: { accentColor: C.gold, width: 12, height: 12 }
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "label",
                        {
                          htmlFor: `admin.spell.${key}_checkbox`,
                          style: {
                            ...labelStyle,
                            marginBottom: 0,
                            fontSize: 9,
                            cursor: "pointer"
                          },
                          children: label
                        }
                      )
                    ]
                  },
                  key
                ))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.minrange_input", style: labelStyle, children: "Min Range" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.spell.minrange_input",
                type: "number",
                min: 0,
                max: 10,
                value: cfg.minRange ?? 0,
                onChange: (e) => set("minRange", Math.max(0, Number(e.target.value) || 0)),
                "data-ocid": "admin.spell.minrange_input",
                style: inputStyle()
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.maxrange_input", style: labelStyle, children: "Max Range" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.spell.maxrange_input",
                type: "number",
                min: 0,
                max: 20,
                value: cfg.maxRange ?? Number(cfg.range),
                onChange: (e) => set("maxRange", Math.max(0, Number(e.target.value) || 0)),
                "data-ocid": "admin.spell.maxrange_input",
                style: inputStyle()
              }
            )
          ] }),
          cfg.effectType !== "buff" && cfg.spellType !== "heal" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "1 / -1", marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "p",
              {
                style: {
                  color: "#f0c44a",
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: "0 0 6px"
                },
                children: [
                  cfg.aoe ? "AoE" : "Range",
                  " Hit Pattern (click tiles to toggle)"
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { color: "#8a8090", fontSize: 9, margin: "0 0 8px" }, children: [
              "Center tile (🟡) = caster position. Click others to mark hit tiles (red).",
              " ",
              cfg.aoe ? "All marked tiles are hit around the target." : "Defines valid target offsets from caster."
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(11, 22px)",
                  gap: 1
                },
                children: Array.from(
                  { length: 11 },
                  (_, row) => Array.from({ length: 11 }, (_2, col) => {
                    const dx = col - 5;
                    const dy = row - 5;
                    const isCenter = dx === 0 && dy === 0;
                    const hitTiles = cfg.hitTiles ?? [];
                    const isHit = hitTiles.some(
                      ([hx, hy]) => hx === dx && hy === dy
                    );
                    return /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          if (isCenter) return;
                          const cur = hitTiles;
                          const next = isHit ? cur.filter(([hx, hy]) => !(hx === dx && hy === dy)) : [...cur, [dx, dy]];
                          set("hitTiles", next);
                        },
                        title: `(${dx},${dy})`,
                        style: {
                          width: 22,
                          height: 22,
                          background: isCenter ? "#f1c40f" : isHit ? "#c0392b" : "#0d0f1a",
                          border: `1px solid ${isCenter ? "#e8b840" : isHit ? "#e74c3c" : C.goldDim}`,
                          borderRadius: 2,
                          cursor: isCenter ? "default" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 8,
                          padding: 0
                        },
                        children: isCenter ? "🟡" : isHit ? "●" : ""
                      },
                      `aoe-${dx}-${dy}`
                    );
                  })
                )
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  gap: 8,
                  marginTop: 6,
                  alignItems: "center"
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      "data-ocid": "admin.spell.hittiles_clear_button",
                      onClick: () => set("hitTiles", []),
                      style: {
                        padding: "3px 10px",
                        background: "transparent",
                        border: `1px solid ${C.goldDim}`,
                        borderRadius: 3,
                        color: "#8a8090",
                        cursor: "pointer",
                        fontSize: 10
                      },
                      children: "Clear Pattern"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      "data-ocid": "admin.spell.hittiles_reset_button",
                      onClick: () => {
                        const r = Math.max(1, cfg.minRange ?? 1);
                        const defaults = [];
                        for (let dy2 = -r; dy2 <= r; dy2++) {
                          for (let dx2 = -r; dx2 <= r; dx2++) {
                            if (dx2 === 0 && dy2 === 0) continue;
                            if (Math.max(Math.abs(dx2), Math.abs(dy2)) <= r)
                              defaults.push([dx2, dy2]);
                          }
                        }
                        set("hitTiles", defaults);
                      },
                      style: {
                        padding: "3px 10px",
                        background: "transparent",
                        border: `1px solid ${C.goldDim}`,
                        borderRadius: 3,
                        color: "#8a8090",
                        cursor: "pointer",
                        fontSize: 10
                      },
                      children: "Reset to Default"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#6a6070", fontSize: 9 }, children: [
                    ((_a = cfg.hitTiles) == null ? void 0 : _a.length) ?? 0,
                    " ",
                    "tiles selected"
                  ] })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.minlevel_input", style: labelStyle, children: "Min Level" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.spell.minlevel_input",
                type: "number",
                min: 1,
                value: cfg.minLevel ?? 1,
                onChange: (e) => set("minLevel", Math.max(1, Number(e.target.value) || 1)),
                "data-ocid": "admin.spell.minlevel_input",
                style: inputStyle()
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.effectcategory_select", style: labelStyle, children: "Effect Category" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                id: "admin.spell.effectcategory_select",
                value: cfg.effectCategory ?? "damage",
                onChange: (e) => set(
                  "effectCategory",
                  e.target.value
                ),
                "data-ocid": "admin.spell.effectcategory_select",
                style: inputStyle(),
                children: SPELL_EFFECT_CATEGORIES.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c, children: c.charAt(0).toUpperCase() + c.slice(1) }, c))
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.effectparams_input", style: labelStyle, children: "Effect Params (JSON, optional)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          id: "admin.spell.effectparams_input",
          type: "text",
          value: cfg.effectParams ?? "",
          onChange: (e) => set("effectParams", e.target.value || null),
          placeholder: '{"pushDistance": 2}',
          "data-ocid": "admin.spell.effectparams_input",
          style: inputStyle()
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginTop: 4 }, children: "Buff Effect (self or ally)" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0 16px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.buffstat_input", style: labelStyle, children: "Buff Stat" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                id: "admin.spell.buffstat_input",
                value: cfg.buffStat ?? "",
                onChange: (e) => set("buffStat", e.target.value || void 0),
                "data-ocid": "admin.spell.buffstat_input",
                style: inputStyle(),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "None" }),
                  ["dmg", "res", "sp", "mp", "ap", "chc", "healRecv"].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s, children: s.toUpperCase() }, s))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.buffmodifier_input", style: labelStyle, children: "Buff Modifier" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.spell.buffmodifier_input",
                type: "number",
                step: "0.01",
                value: cfg.buffModifier ?? 1,
                onChange: (e) => set("buffModifier", Number(e.target.value) || 1),
                disabled: !cfg.buffStat,
                "data-ocid": "admin.spell.buffmodifier_input",
                style: { ...inputStyle(), opacity: cfg.buffStat ? 1 : 0.4 }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6a6070", fontSize: 9, margin: "2px 0 0" }, children: "1.0=no change, 1.4=+40%" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.buffduration_input", style: labelStyle, children: "Buff Duration (turns)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.spell.buffduration_input",
                type: "number",
                min: 0,
                value: cfg.buffDuration ?? 0,
                onChange: (e) => set("buffDuration", Math.max(0, Number(e.target.value) || 0)),
                disabled: !cfg.buffStat,
                "data-ocid": "admin.spell.buffduration_input",
                style: { ...inputStyle(), opacity: cfg.buffStat ? 1 : 0.4 }
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginTop: 4 }, children: "Debuff Effect (on target)" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0 16px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.debuffstat_input", style: labelStyle, children: "Debuff Stat" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                id: "admin.spell.debuffstat_input",
                value: cfg.debuffStat ?? "",
                onChange: (e) => set("debuffStat", e.target.value || void 0),
                "data-ocid": "admin.spell.debuffstat_input",
                style: inputStyle(),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "None" }),
                  ["dmg", "res", "sp", "mp", "ap", "chc", "healRecv", "res_sp"].map(
                    (s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s, children: s.toUpperCase() }, s)
                  )
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.debuffmodifier_input", style: labelStyle, children: "Debuff Modifier" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.spell.debuffmodifier_input",
                type: "number",
                step: "0.01",
                value: cfg.debuffModifier ?? 1,
                onChange: (e) => set("debuffModifier", Number(e.target.value) || 1),
                disabled: !cfg.debuffStat,
                "data-ocid": "admin.spell.debuffmodifier_input",
                style: { ...inputStyle(), opacity: cfg.debuffStat ? 1 : 0.4 }
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6a6070", fontSize: 9, margin: "2px 0 0" }, children: "MP/AP: negative=reduce. Others: 0.7=-30%" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.debuffduration_input", style: labelStyle, children: "Debuff Duration (turns)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.spell.debuffduration_input",
                type: "number",
                min: 0,
                value: cfg.debuffDuration ?? 0,
                onChange: (e) => set("debuffDuration", Math.max(0, Number(e.target.value) || 0)),
                disabled: !cfg.debuffStat,
                "data-ocid": "admin.spell.debuffduration_input",
                style: { ...inputStyle(), opacity: cfg.debuffStat ? 1 : 0.4 }
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginTop: 4 }, children: "Damage Over Time (DoT)" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 10
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "admin.spell.isdotspell_checkbox",
              type: "checkbox",
              checked: cfg.isDotSpell ?? false,
              onChange: (e) => set("isDotSpell", e.target.checked),
              "data-ocid": "admin.spell.isdotspell_checkbox",
              style: { accentColor: C.gold, width: 12, height: 12 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.isdotspell_checkbox", style: labelStyle, children: "Is DoT Spell (damage applied over turns, not upfront)" })
        ]
      }
    ),
    cfg.isDotSpell && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.dottype_select", style: labelStyle, children: "DoT Type" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          value: cfg.dotType ?? "poison",
          onChange: (e) => set(
            "dotType",
            e.target.value
          ),
          "data-ocid": "admin.spell.dottype_select",
          style: { ...inputStyle(), cursor: "pointer" },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "poison", children: "Poison 🐍" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "burn", children: "Burn 🔥" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "bleed", children: "Bleed 🩸" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "venom", children: "Venom 🐍" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "other", children: "Other ☠️" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "admin.spell.dotdamage_input", style: labelStyle, children: [
              "DoT Damage/Turn ",
              cfg.isDotSpell ? "(main damage)" : "(extra DoT)"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.spell.dotdamage_input",
                type: "number",
                min: 0,
                value: cfg.dotDamage ?? 0,
                onChange: (e) => set("dotDamage", Math.max(0, Number(e.target.value) || 0)),
                "data-ocid": "admin.spell.dotdamage_input",
                style: inputStyle()
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.spell.dotduration_input", style: labelStyle, children: "DoT Duration (turns)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                id: "admin.spell.dotduration_input",
                type: "number",
                min: 0,
                value: cfg.dotDuration ?? 0,
                onChange: (e) => set("dotDuration", Math.max(0, Number(e.target.value) || 0)),
                "data-ocid": "admin.spell.dotduration_input",
                style: inputStyle()
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginTop: 4 }, children: "Special Mechanics" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 6,
          marginBottom: 10
        },
        children: [
          { key: "isSwap", label: "Swap Positions" },
          { key: "isMirror", label: "Mirror Reflect" },
          { key: "isTimestep", label: "Timestep (AP/MP reset)" },
          { key: "isSacrifice", label: "Sacrifice (HP cost)" },
          { key: "isBarrier", label: "Barrier (block cell)" },
          { key: "isTrap", label: "Trap (triggered)" },
          { key: "isMark", label: "Mark (double dmg)" }
        ].map(({ key, label }) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 8px",
              background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
              border: `1px solid ${C.goldDim}`,
              borderRadius: 4
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: `admin.spell.${key}_checkbox`,
                  type: "checkbox",
                  checked: cfg[key] ?? false,
                  onChange: (e) => set(key, e.target.checked),
                  "data-ocid": `admin.spell.${key}_checkbox`,
                  style: { accentColor: C.gold, width: 12, height: 12 }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "label",
                {
                  htmlFor: `admin.spell.${key}_checkbox`,
                  style: {
                    ...labelStyle,
                    marginBottom: 0,
                    fontSize: 9,
                    cursor: "pointer"
                  },
                  children: label
                }
              )
            ]
          },
          key
        ))
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          border: `1px solid ${C.goldDim}`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              style: {
                width: 48,
                height: 48,
                background: `linear-gradient(135deg, ${C.bg3}, #2a0a1a)`,
                border: `2px solid ${C.gold}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                flexShrink: 0
              },
              children: cfg.iconEmoji || "❔"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#f0c44a", fontWeight: 800, fontSize: 13 }, children: cfg.name || "Unnamed Spell" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#8a8090", fontSize: 11, marginTop: 2 }, children: cfg.description || "No description" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 8, marginTop: 4 }, children: [
              [`⚡ ${String(cfg.apCost)} AP`, C.blue],
              [`💧 ${String(cfg.mpCost)} MP`, C.green],
              [`🗡️ ${String(cfg.damage)} dmg`, C.red],
              [`👁️ ${String(cfg.range)} rng`, C.gold]
            ].map(([label, color]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                style: {
                  background: `${color}18`,
                  border: `1px solid ${color}44`,
                  borderRadius: 20,
                  padding: "1px 7px",
                  fontSize: 10,
                  color
                },
                children: label
              },
              label
            )) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Btn,
        {
          variant: "gold",
          onClick: () => {
            if (!cfg.id.trim() || !cfg.name.trim()) {
              ue.error("Spell ID and name are required");
              return;
            }
            onSave(cfg);
          },
          ocid: "admin.spell.save_button",
          disabled: saving,
          children: saving ? "Saving…" : "Save Spell"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Btn,
        {
          variant: "ghost",
          onClick: onCancel,
          ocid: "admin.spell.cancel_button",
          children: "Cancel"
        }
      )
    ] })
  ] });
};
const SpellList = ({ spells, loading, onAdd, onEdit, onDelete }) => {
  const [confirmId, setConfirmId] = reactExports.useState(null);
  const pending = spells.find((s) => s.id === confirmId);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 20 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "h3",
              {
                style: {
                  color: "#f0c44a",
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: "0.06em"
                },
                children: "Spell Configurations"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { color: "#8a8090", fontSize: 11, margin: "3px 0 0" }, children: [
              spells.length,
              " spell",
              spells.length === 1 ? "" : "s",
              " configured"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Btn, { variant: "gold", onClick: onAdd, ocid: "admin.spells.add_button", children: "+ Add Spell" })
        ]
      }
    ),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        "data-ocid": "admin.spells.loading_state",
        style: {
          color: "#8a8090",
          fontSize: 12,
          textAlign: "center",
          padding: 24
        },
        children: "Loading spells…"
      }
    ),
    !loading && spells.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": "admin.spells.empty_state",
        style: {
          textAlign: "center",
          padding: "40px 0",
          color: "#6a6070",
          fontSize: 13,
          border: `1px dashed ${C.dimmer}`,
          borderRadius: 8
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 28, marginBottom: 8 }, children: "⚡" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, marginBottom: 4 }, children: "No spells yet" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11 }, children: "Add default spells for your characters" })
        ]
      }
    ),
    spells.map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(PanelCard, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        "data-ocid": `admin.spells.item.${i + 1}`,
        style: {
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "10px 14px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              style: {
                width: 40,
                height: 40,
                background: `linear-gradient(135deg, ${C.bg3}, #2a0a1a)`,
                border: `2px solid ${C.goldDim}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0
              },
              children: s.iconEmoji || "⚡"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                style: {
                  color: "#c0ccd8",
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 2
                },
                children: s.name || s.id
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center"
                },
                children: [
                  [
                    [s.effectType, C.gold],
                    [`AP ${String(s.apCost)}`, C.blue],
                    [`DMG ${String(s.damage)}`, C.red],
                    [`RNG ${String(s.range)}`, C.green]
                  ].map(([label, color]) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      style: {
                        background: `${color}18`,
                        border: `1px solid ${color}44`,
                        borderRadius: 20,
                        padding: "1px 7px",
                        fontSize: 10,
                        color,
                        letterSpacing: "0.04em"
                      },
                      children: label
                    },
                    label
                  )),
                  s.description && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#6a6070", fontSize: 10 }, children: [
                    s.description.slice(0, 40),
                    s.description.length > 40 ? "…" : ""
                  ] })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Btn,
              {
                variant: "ghost",
                small: true,
                onClick: () => onEdit(s.id),
                ocid: `admin.spells.edit_button.${i + 1}`,
                children: "Edit"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Btn,
              {
                variant: "red",
                small: true,
                onClick: () => setConfirmId(s.id),
                ocid: `admin.spells.delete_button.${i + 1}`,
                children: "×"
              }
            )
          ] })
        ]
      }
    ) }, s.id)),
    confirmId && /* @__PURE__ */ jsxRuntimeExports.jsx(
      ConfirmDialog,
      {
        title: `Delete ${(pending == null ? void 0 : pending.name) || (pending == null ? void 0 : pending.id) || "spell"}?`,
        body: "This removes the live spell immediately. Boss pools and player unlocks that reference it will break until you recreate it. This cannot be undone.",
        ocidPrefix: "admin.spells.delete",
        onCancel: () => setConfirmId(null),
        onConfirm: () => {
          onDelete(confirmId);
          setConfirmId(null);
        }
      }
    )
  ] });
};
const DEFAULT_TIER_CFG = {
  tierSize: 10,
  sameTierPercent: 60,
  adjacentTierPercent: 20,
  twoAwayPercent: 10,
  threeOrMorePercent: 5
};
const TierConfigTab = () => {
  const { actor } = useActor();
  const [cfg, setCfg] = reactExports.useState(() => {
    try {
      const raw = localStorage.getItem("pbv_tier_spawn_config");
      if (raw) return { ...DEFAULT_TIER_CFG, ...JSON.parse(raw) };
    } catch {
    }
    return DEFAULT_TIER_CFG;
  });
  const total = cfg.sameTierPercent + cfg.adjacentTierPercent + cfg.twoAwayPercent + cfg.threeOrMorePercent;
  const isValid = total === 100;
  const setNum = (k, v) => {
    const n = Math.max(0, Number.parseInt(v) || 0);
    setCfg((p) => ({ ...p, [k]: n }));
  };
  const handleSave = async () => {
    if (!isValid) {
      ue.error("Percentages must sum to exactly 100%");
      return;
    }
    const tierErr = validateTierSpawnConfig({
      tierSize: Number(cfg.tierSize),
      sameTierPercent: Number(cfg.sameTierPercent),
      adjacentTierPercent: Number(cfg.adjacentTierPercent),
      twoAwayPercent: Number(cfg.twoAwayPercent),
      threeOrMorePercent: Number(cfg.threeOrMorePercent)
    });
    if (tierErr) {
      ue.error(tierErr);
      return;
    }
    try {
      localStorage.setItem("pbv_tier_spawn_config", JSON.stringify(cfg));
      if (actor) {
        await actor.adminSetTierSpawnConfig({
          ...cfg,
          tierSize: BigInt(cfg.tierSize)
        });
      }
      ue.success("Tier spawn config saved!");
    } catch (err) {
      ue.error(`Failed to save config: ${String(err)}`);
    }
  };
  const SAMPLE_LEVELS = [1, 10, 25, 50, 100, 200, 500];
  const ts = Math.max(1, cfg.tierSize);
  const previewRows = SAMPLE_LEVELS.map((level) => {
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
      threePlus: `${cfg.threeOrMorePercent}%`
    };
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.tiers_tab", style: { padding: 24 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "h3",
      {
        style: {
          color: "#f0c44a",
          margin: "0 0 4px",
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: "0.06em"
        },
        children: "Enemy Tier Spawn System"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#8a8090", fontSize: 11, margin: "0 0 20px" }, children: "Configure how likely players are to encounter same-tier vs higher/lower-tier enemies. All percentages must sum to 100." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          background: "linear-gradient(180deg,#13141c,#0e0f16)",
          border: `1px solid ${C.goldDim}`,
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 16
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Tier Configuration" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0 20px"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "tier.tiersize", style: labelStyle, children: "Tier Size (levels per tier)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: "tier.tiersize",
                      type: "number",
                      min: 1,
                      max: 100,
                      value: cfg.tierSize,
                      onChange: (e) => setNum("tierSize", e.target.value),
                      "data-ocid": "admin.tier.tiersize_input",
                      style: inputStyle()
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6a6070", fontSize: 10, margin: "4px 0 0" }, children: "e.g. 10 means levels 1–10 = Tier 1, 11–20 = Tier 2, etc." })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "tier.same", style: labelStyle, children: "Same Tier % (default 60)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: "tier.same",
                      type: "number",
                      min: 0,
                      max: 100,
                      value: cfg.sameTierPercent,
                      onChange: (e) => setNum("sameTierPercent", e.target.value),
                      "data-ocid": "admin.tier.same_input",
                      style: inputStyle(!isValid)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "tier.adj", style: labelStyle, children: "±1 Tier % (default 20, split ± evenly)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: "tier.adj",
                      type: "number",
                      min: 0,
                      max: 100,
                      value: cfg.adjacentTierPercent,
                      onChange: (e) => setNum("adjacentTierPercent", e.target.value),
                      "data-ocid": "admin.tier.adjacent_input",
                      style: inputStyle(!isValid)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "tier.two", style: labelStyle, children: "±2 Tiers % (default 10, split ± evenly)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: "tier.two",
                      type: "number",
                      min: 0,
                      max: 100,
                      value: cfg.twoAwayPercent,
                      onChange: (e) => setNum("twoAwayPercent", e.target.value),
                      "data-ocid": "admin.tier.twoaway_input",
                      style: inputStyle(!isValid)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "tier.three", style: labelStyle, children: "±3+ Tiers % (default 5)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: "tier.three",
                      type: "number",
                      min: 0,
                      max: 100,
                      value: cfg.threeOrMorePercent,
                      onChange: (e) => setNum("threeOrMorePercent", e.target.value),
                      "data-ocid": "admin.tier.threemore_input",
                      style: inputStyle(!isValid)
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "flex-end",
                      marginBottom: 12,
                      paddingBottom: 8
                    },
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        style: {
                          background: isValid ? `${C.green}22` : `${C.red}22`,
                          border: `1px solid ${isValid ? C.green : C.red}`,
                          borderRadius: 6,
                          padding: "6px 14px",
                          width: "100%",
                          textAlign: "center"
                        },
                        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "span",
                          {
                            style: {
                              color: isValid ? C.green : C.red,
                              fontWeight: 800,
                              fontSize: 13
                            },
                            children: [
                              "Total: ",
                              total,
                              "%",
                              isValid ? " ✔" : " ✘ must be 100"
                            ]
                          }
                        )
                      }
                    )
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Btn, { variant: "gold", onClick: handleSave, ocid: "admin.tier.save_button", children: "Save Tier Config" })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          background: "linear-gradient(180deg,#13141c,#0e0f16)",
          border: `1px solid ${C.goldDim}`,
          borderRadius: 8,
          overflow: "hidden"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              style: {
                padding: "12px 16px",
                borderBottom: `1px solid ${C.goldDim}`
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginBottom: 0 }, children: "Spawn Probability Preview" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "table",
            {
              style: { width: "100%", borderCollapse: "collapse", fontSize: 11 },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: C.bg1 }, children: [
                  "Player Lvl",
                  "Tier",
                  "Tier Range",
                  "Same (%)",
                  "±1 Tiers",
                  "±2 Tiers",
                  "±3+ Tiers"
                ].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "th",
                  {
                    style: {
                      color: "#f0c44a",
                      padding: "8px 12px",
                      textAlign: "left",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap"
                    },
                    children: h
                  },
                  h
                )) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: previewRows.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "tr",
                  {
                    style: { background: i % 2 === 0 ? C.bg0 : C.bg2 },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "td",
                        {
                          style: {
                            color: "#c0ccd8",
                            padding: "7px 12px",
                            fontWeight: 700
                          },
                          children: [
                            "Lv ",
                            row.level
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { color: "#f0c44a", padding: "7px 12px" }, children: [
                        "T",
                        row.tier
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { color: "#8a8090", padding: "7px 12px" }, children: [
                        row.tierMin,
                        "–",
                        row.tierMax
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "td",
                        {
                          style: {
                            color: "#56d18a",
                            padding: "7px 12px",
                            fontWeight: 700
                          },
                          children: [
                            row.samePct,
                            "%"
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { color: C.blue, padding: "7px 12px" }, children: [
                        row.adjLow,
                        " / ",
                        row.adjHigh,
                        " (",
                        Math.floor(cfg.adjacentTierPercent / 2),
                        "% each)"
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { color: "#f0c44a", padding: "7px 12px" }, children: [
                        row.twoLow,
                        " / ",
                        row.twoHigh,
                        " (",
                        Math.floor(cfg.twoAwayPercent / 2),
                        "% each)"
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { color: "#8a8090", padding: "7px 12px" }, children: row.threePlus })
                    ]
                  },
                  row.level
                )) })
              ]
            }
          ) })
        ]
      }
    )
  ] });
};
const SettingsTab = () => {
  const [targetPrincipal, setTargetPrincipal] = reactExports.useState("");
  const [confirmText, setConfirmText] = reactExports.useState("");
  const assignRole = useAssignUserRole();
  const handleTransfer = () => {
    if (!targetPrincipal.trim()) {
      ue.error("Enter a Principal ID");
      return;
    }
    if (confirmText !== "TRANSFER") {
      ue.error("Type TRANSFER to confirm");
      return;
    }
    assignRole.mutate(
      { principalId: targetPrincipal.trim(), role: "admin" },
      {
        onSuccess: () => {
          ue.success(
            "Admin role transferred! The new admin must log in to activate."
          );
          setTargetPrincipal("");
          setConfirmText("");
        },
        onError: () => ue.error("Transfer failed — check the Principal ID")
      }
    );
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.settings_tab", style: { padding: 20 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "h3",
      {
        style: {
          color: "#f0c44a",
          margin: "0 0 6px",
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: "0.06em"
        },
        children: "Settings"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        style: {
          color: "#8a8090",
          fontSize: 11,
          marginBottom: 24,
          lineHeight: 1.5
        },
        children: "Manage admin permissions and game settings."
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Transfer Admin Role" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          border: `1px solid ${C.red}44`,
          borderRadius: 8,
          padding: "16px 18px",
          marginBottom: 20
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "p",
            {
              style: {
                color: "#8a8090",
                fontSize: 11,
                marginBottom: 16,
                lineHeight: 1.6
              },
              children: [
                "⚠️ This grants another Internet Identity full admin control. It does not automatically remove your own admin role. Enter the Principal ID of the new admin and type",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: C.red }, children: "TRANSFER" }),
                " to confirm."
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              label: "Target Principal ID",
              value: targetPrincipal,
              onChange: setTargetPrincipal,
              ocid: "admin.settings.principal_input",
              placeholder: "aaaaa-bbbbb-ccccc-ddddd-cai"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              label: 'Confirm (type "TRANSFER")',
              value: confirmText,
              onChange: setConfirmText,
              ocid: "admin.settings.confirm_input",
              placeholder: "TRANSFER",
              err: confirmText.length > 0 && confirmText !== "TRANSFER"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Btn,
            {
              variant: "red",
              onClick: handleTransfer,
              ocid: "admin.settings.transfer_button",
              disabled: assignRole.isPending,
              children: assignRole.isPending ? "Transferring…" : "🛡️ Transfer Admin Role"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Default Spells Preset" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6a6070", fontSize: 11, marginBottom: 12 }, children: "Use the Spells tab to add, edit, or remove spells available to players." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          border: `1px solid ${C.goldDim}`,
          borderRadius: 6,
          padding: "10px 14px",
          fontSize: 11,
          color: "#8a8090"
        },
        children: [
          "Navigate to ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: C.gold }, children: "Spells" }),
          " in the sidebar to manage spell configurations."
        ]
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(LevelUpConfigPanel, {})
  ] });
};
const LevelUpConfigPanel = () => {
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
          ...JSON.parse(raw)
        };
    } catch {
    }
    return {
      maxSpellRange: 5,
      spellRangeGrowthLevels: 10,
      spellFailBaseChance: 20,
      spellFailReductionPerLevel: 0.1
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
      spellFailReductionPerLevel: Number(cfg.spellFailReductionPerLevel ?? 0.1)
    });
    if (err) {
      ue.error(err);
      return;
    }
    localStorage.setItem("pbv_levelup_config", JSON.stringify(cfg));
    try {
      if (actor) {
        await actor.adminSetLevelUpConfig({
          maxSpellRange: BigInt(cfg.maxSpellRange),
          spellRangeGrowthLevels: BigInt(cfg.spellRangeGrowthLevels),
          spellFailBaseChance: cfg.spellFailBaseChance,
          spellFailReductionPerLevel: cfg.spellFailReductionPerLevel,
          statGrowthPercent: BigInt(5),
          apMpLevelThreshold: BigInt(25),
          spellLevelingBaseCost: BigInt(10),
          spellLevelingCostMultiplier: 2,
          spellDmgGrowthPercent: BigInt(3)
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2e3);
    } catch (_e) {
      ue.error("Failed to save level-up config to backend");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      style: {
        background: "linear-gradient(180deg,#13141c,#0e0f16)",
        border: `1px solid ${C.goldDim}`,
        borderRadius: 8,
        padding: "16px 20px",
        marginTop: 20
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Spell System Config" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 16px"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "levelup.maxrange", style: labelStyle, children: "Max Spell Range" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "levelup.maxrange",
                    type: "number",
                    min: 1,
                    max: 20,
                    value: cfg.maxSpellRange,
                    onChange: (e) => setCfg((p) => ({
                      ...p,
                      maxSpellRange: Math.max(1, Number(e.target.value) || 5)
                    })),
                    style: inputStyle(),
                    "data-ocid": "admin.levelup.maxrange_input"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6a6070", fontSize: 10, margin: "3px 0 0" }, children: "Max range a spell can reach (default 5)" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "levelup.rangegrowth", style: labelStyle, children: "Range +1 Every N Levels" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "levelup.rangegrowth",
                    type: "number",
                    min: 1,
                    value: cfg.spellRangeGrowthLevels,
                    onChange: (e) => setCfg((p) => ({
                      ...p,
                      spellRangeGrowthLevels: Math.max(
                        1,
                        Number(e.target.value) || 10
                      )
                    })),
                    style: inputStyle(),
                    "data-ocid": "admin.levelup.rangegrowth_input"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6a6070", fontSize: 10, margin: "3px 0 0" }, children: "Every N player levels, +1 to all spell ranges" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "levelup.failbase", style: labelStyle, children: "Base Spell Fail % (Lv1)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "levelup.failbase",
                    type: "number",
                    min: 0,
                    max: 100,
                    step: 0.1,
                    value: cfg.spellFailBaseChance,
                    onChange: (e) => setCfg((p) => ({
                      ...p,
                      spellFailBaseChance: Math.max(0, Number(e.target.value) || 20)
                    })),
                    style: inputStyle(),
                    "data-ocid": "admin.levelup.failbase_input"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6a6070", fontSize: 10, margin: "3px 0 0" }, children: "Default 20% at level 1" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "levelup.failred", style: labelStyle, children: "Fail % Reduction/Level" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "levelup.failred",
                    type: "number",
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: cfg.spellFailReductionPerLevel,
                    onChange: (e) => setCfg((p) => ({
                      ...p,
                      spellFailReductionPerLevel: Math.max(
                        0,
                        Number(e.target.value) || 0.1
                      )
                    })),
                    style: inputStyle(),
                    "data-ocid": "admin.levelup.failred_input"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6a6070", fontSize: 10, margin: "3px 0 0" }, children: "0.1 = reaches 0% at level 200" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Btn, { variant: "gold", onClick: handleSave, ocid: "admin.levelup.save_button", children: saved ? "Saved ✓" : "Save Config" })
      ]
    }
  );
};
const DEFAULT_PALETTE = ["#8b0000", "#c0392b", "#2c1a1a", "#4a1010"];
const VisualsTab = () => {
  const { actor } = useActor();
  const stored = (() => {
    try {
      const v = localStorage.getItem("pbv_color_palette") ?? localStorage.getItem("paperVertexPalette");
      if (v) {
        const arr = JSON.parse(v);
        if (Array.isArray(arr)) return arr;
      }
    } catch (e) {
      logDebugWarn("UI", "AdminDashboard palette load failed", String(e));
    }
    return [];
  })();
  const [slots, setSlots] = React.useState(
    DEFAULT_PALETTE.map((c, i) => ({
      color: stored[i] ?? c,
      enabled: stored.length > 0 ? !!stored[i] : true
    }))
  );
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);
  const handleSave = async () => {
    const palette = slots.filter((s) => s.enabled).map((s) => s.color);
    localStorage.setItem("paperVertexPalette", JSON.stringify(palette));
    localStorage.setItem("pbv_color_palette", JSON.stringify(palette));
    try {
      await actor.adminSetColorPalette(
        JSON.stringify(palette)
      );
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 2e3);
    } catch (err) {
      console.error("Failed to save color palette:", err);
      setSaveError("Save failed — check console");
      ue.error(`Failed to save color palette: ${String(err)}`);
    }
  };
  const handleReset = () => {
    localStorage.removeItem("paperVertexPalette");
    localStorage.removeItem("pbv_color_palette");
    setSlots(DEFAULT_PALETTE.map((c) => ({ color: c, enabled: true })));
  };
  const activePalette = slots.filter((s) => s.enabled).map((s) => s.color);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.visuals_tab", style: { padding: 20 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "h3",
      {
        style: {
          color: "#f0c44a",
          margin: "0 0 6px",
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: "0.06em"
        },
        children: "Visuals"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        style: {
          color: "#8a8090",
          fontSize: 11,
          marginBottom: 20,
          lineHeight: 1.5
        },
        children: "Control the visual theme of the paper vertex landscape around the isometric map."
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Map Paper Vertex Colors" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "p",
      {
        style: {
          color: "#6a6070",
          fontSize: 11,
          marginBottom: 14,
          lineHeight: 1.5
        },
        children: "Up to 4 colors for the folded paper landscape around maps. Leave all unchecked for true random colors."
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 20
        },
        children: slots.map((slot, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
              borderRadius: 6,
              padding: "8px 12px",
              border: `1px solid ${C.goldDim}`
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "label",
                {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    flex: 1
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "checkbox",
                        checked: slot.enabled,
                        onChange: (e) => setSlots(
                          (p) => p.map(
                            (s, idx) => idx === i ? { ...s, enabled: e.target.checked } : s
                          )
                        ),
                        "data-ocid": `admin.visuals.color_slot.${i + 1}`,
                        style: { accentColor: C.gold, width: 14, height: 14 }
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#c0ccd8", fontSize: 11, width: 52 }, children: [
                      "Color ",
                      i + 1
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "color",
                  value: slot.color,
                  disabled: !slot.enabled,
                  onChange: (e) => setSlots(
                    (p) => p.map(
                      (s, idx) => idx === i ? { ...s, color: e.target.value } : s
                    )
                  ),
                  "data-ocid": `admin.visuals.color_picker.${i + 1}`,
                  style: {
                    width: 40,
                    height: 32,
                    border: `1px solid ${C.gold}`,
                    borderRadius: 4,
                    cursor: slot.enabled ? "pointer" : "not-allowed",
                    background: "transparent",
                    padding: 2,
                    opacity: slot.enabled ? 1 : 0.35
                  }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  style: {
                    color: slot.enabled ? C.silver : C.dimmer,
                    fontSize: 11,
                    fontFamily: "monospace",
                    width: 60
                  },
                  children: slot.enabled ? slot.color : "—"
                }
              )
            ]
          },
          `slot-${slot.color}-${i}`
        ))
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, marginTop: 8 }, children: "Live Preview" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          display: "flex",
          gap: 8,
          marginBottom: 20,
          background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          borderRadius: 6,
          padding: 12,
          border: `1px solid ${C.goldDim}`
        },
        children: activePalette.length > 0 ? activePalette.map((col) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            title: col,
            style: {
              width: 36,
              height: 36,
              borderRadius: 4,
              background: col,
              border: `1px solid ${C.goldDim}`,
              boxShadow: `0 0 6px ${col}88`
            }
          },
          col
        )) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#6a6070", fontSize: 11 }, children: "True random — all slots disabled" })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, flexDirection: "column" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Btn,
          {
            variant: "gold",
            onClick: handleSave,
            ocid: "admin.visuals.save_button",
            children: saved ? "Saved ✓" : "Save Palette"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Btn,
          {
            variant: "ghost",
            onClick: handleReset,
            ocid: "admin.visuals.reset_button",
            children: "Reset to Random"
          }
        )
      ] }),
      saveError && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "p",
        {
          "data-ocid": "admin.visuals.save_error",
          style: { color: "#e05050", fontSize: 11, margin: 0 },
          children: saveError
        }
      )
    ] })
  ] });
};
const MODIFIER_TYPES = [
  { value: "slime_flood", label: "Slime Flood — Double MP cost movement" },
  { value: "paper_windstorm", label: "Paper Windstorm — 50% miss on ranged" },
  { value: "gravity_well", label: "Gravity Well — Push/pull double range" },
  { value: "blood_moon", label: "Blood Moon — +25% dmg, -25% heal" },
  { value: "fog_of_war", label: "Fog of War — Enemies hidden beyond 3 tiles" },
  { value: "thorned_ground", label: "Thorned Ground — 5 dmg per extra tile" },
  {
    value: "arcane_surge",
    label: "Arcane Surge — -1 AP cost, +15% fail chance"
  },
  { value: "mirror_field", label: "Mirror Field — 20% reflect single-target" },
  {
    value: "frozen_terrain",
    label: "Frozen Terrain — Double MP cost + LoS +1 range"
  },
  { value: "plague_zone", label: "Plague Zone — -2 HP every turn start" },
  { value: "time_warp", label: "Time Warp — 15s timer instead of 30s" },
  { value: "void_rift", label: "Void Rift — Random tile teleports + -3 HP" },
  // EXP5: Hazard tile modifiers
  { value: "lava_fields", label: "Lava Fields — Spawn 3-8 lava hazard tiles" },
  { value: "ice_fields", label: "Ice Fields — Spawn 3-8 ice hazard tiles" },
  { value: "spike_pit", label: "Spike Pit — Spawn 3-8 spike hazard tiles" },
  { value: "custom", label: "Custom" }
];
const ModifierEditor = ({ initial, onSave, onCancel, saving }) => {
  const [cfg, setCfg] = React.useState(initial);
  const set = (k, v) => setCfg((p) => ({ ...p, [k]: v }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.modifier_editor", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Modifier Configuration" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 16px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              label: "ID",
              value: cfg.id,
              onChange: (v) => set("id", v),
              ocid: "admin.modifier.id_input",
              placeholder: "slime_flood"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Field,
            {
              label: "Name",
              value: cfg.name,
              onChange: (v) => set("name", v),
              ocid: "admin.modifier.name_input",
              placeholder: "Slime Flood"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Field,
      {
        label: "Description",
        value: cfg.description,
        onChange: (v) => set("description", v),
        ocid: "admin.modifier.description_input",
        placeholder: "Double MP cost for all movement"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 10 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 14 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.modifier.type_select", style: labelStyle, children: "Modifier Type" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "select",
        {
          id: "admin.modifier.type_select",
          value: cfg.modifierType,
          onChange: (e) => set("modifierType", e.target.value),
          "data-ocid": "admin.modifier.type_select",
          style: inputStyle(),
          children: MODIFIER_TYPES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t.value, children: t.label }, t.value))
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          border: `1px solid ${C.goldDim}`,
          borderRadius: 5,
          padding: "10px 14px",
          marginBottom: 14
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...sectionHeadStyle, margin: "0 0 8px" }, children: "Global Modifier Roll Settings" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0 12px"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "label",
                    {
                      htmlFor: "admin.modifier.globaltrigger_input",
                      style: labelStyle,
                      children: "Global Trigger % (any mod)"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "number",
                      min: 0,
                      max: 100,
                      value: cfg.globalTriggerChance ?? 20,
                      onChange: (e) => set(
                        "globalTriggerChance",
                        Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      ),
                      "data-ocid": "admin.modifier.globaltrigger_input",
                      style: { ...inputStyle(), width: "100%" }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "admin.modifier.secondmod_input", style: labelStyle, children: "Second Modifier % (if first triggers)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      type: "number",
                      min: 0,
                      max: 100,
                      value: cfg.secondModifierChance ?? 50,
                      onChange: (e) => set(
                        "secondModifierChance",
                        Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      ),
                      "data-ocid": "admin.modifier.secondmod_input",
                      style: { ...inputStyle(), width: "100%" }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "label",
                    {
                      htmlFor: "admin.modifier.triggerchance_input",
                      style: labelStyle,
                      children: "This Modifier Weight (%)"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      id: "admin.modifier.triggerchance_input",
                      type: "number",
                      min: 0,
                      max: 100,
                      value: cfg.triggerChance ?? 20,
                      onChange: (e) => set(
                        "triggerChance",
                        Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      ),
                      "data-ocid": "admin.modifier.triggerchance_input",
                      style: { ...inputStyle(), width: "100%" }
                    }
                  )
                ] })
              ]
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
          border: `1px solid ${C.goldDim}`,
          borderRadius: 5,
          padding: "7px 12px"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              id: "admin.modifier.active_checkbox",
              type: "checkbox",
              checked: cfg.active,
              onChange: (e) => set("active", e.target.checked),
              "data-ocid": "admin.modifier.active_checkbox",
              style: { accentColor: C.gold, width: 14, height: 14 }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "label",
            {
              htmlFor: "admin.modifier.active_checkbox",
              style: { ...labelStyle, marginBottom: 0, cursor: "pointer" },
              children: "Active on all maps"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Btn,
        {
          variant: "gold",
          onClick: () => onSave(cfg),
          ocid: "admin.modifier.save_button",
          children: saving ? "Saving…" : "Save Modifier"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Btn,
        {
          variant: "ghost",
          onClick: onCancel,
          ocid: "admin.modifier.cancel_button",
          children: "Cancel"
        }
      )
    ] })
  ] });
};
const newAchievement = () => ({
  id: `achievement_${Date.now()}`,
  name: "",
  description: "",
  dokaReward: 100,
  condition: "first_battle_win",
  active: true
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
  "doka_10000"
];
const AchievementEditor = ({ initial, onSave, onCancel, saving }) => {
  const [cfg, setCfg] = React.useState(initial);
  const set = (k, v) => setCfg((p) => ({ ...p, [k]: v }));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": "admin.achievement_editor",
      style: {
        background: "linear-gradient(180deg,#13141c,#0e0f16)",
        border: `1px solid ${C.goldDim}`,
        borderRadius: 8,
        padding: 20,
        marginBottom: 16
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Achievement Configuration" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 16px"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Field,
                {
                  label: "ID",
                  value: cfg.id,
                  onChange: (v) => set("id", v),
                  ocid: "admin.achievement.id_input",
                  placeholder: "first_battle_win"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Field,
                {
                  label: "Name",
                  value: cfg.name,
                  onChange: (v) => set("name", v),
                  ocid: "admin.achievement.name_input",
                  placeholder: "First Blood"
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Field,
          {
            label: "Description",
            value: cfg.description,
            onChange: (v) => set("description", v),
            ocid: "admin.achievement.desc_input",
            placeholder: "Win your first battle"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0 16px"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: labelStyle, htmlFor: "ach_doka", children: "Doka Reward" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    id: "ach_doka",
                    type: "number",
                    min: 0,
                    value: cfg.dokaReward,
                    onChange: (e) => set("dokaReward", Math.max(0, Number(e.target.value) || 0)),
                    "data-ocid": "admin.achievement.doka_input",
                    style: inputStyle()
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 10 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: labelStyle, htmlFor: "ach_condition", children: "Condition" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "select",
                  {
                    id: "ach_condition",
                    value: cfg.condition,
                    onChange: (e) => set("condition", e.target.value),
                    "data-ocid": "admin.achievement.condition_select",
                    style: { ...inputStyle(), appearance: "none" },
                    children: ACHIEVEMENT_CONDITIONS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c, children: c }, c))
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "ach_active",
                  type: "checkbox",
                  checked: cfg.active,
                  onChange: (e) => set("active", e.target.checked),
                  "data-ocid": "admin.achievement.active_checkbox",
                  style: { accentColor: C.gold, width: 14, height: 14 }
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "ach_active", style: { ...labelStyle, marginBottom: 0 }, children: "Active (visible to players)" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Btn,
            {
              variant: "ghost",
              onClick: onCancel,
              ocid: "admin.achievement.cancel_button",
              children: "Cancel"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Btn,
            {
              variant: "gold",
              onClick: () => {
                if (!cfg.id.trim() || !cfg.name.trim()) {
                  ue.error("Achievement ID and name are required");
                  return;
                }
                onSave(cfg);
              },
              ocid: "admin.achievement.save_button",
              disabled: saving,
              children: saving ? "Saving…" : "Save Achievement"
            }
          )
        ] })
      ]
    }
  );
};
const AdminDashboard = ({
  onBack,
  isAdmin
}) => {
  var _a, _b, _c, _d, _e, _f;
  const [saveStatus, setSaveStatus] = reactExports.useState(null);
  const [dashState, setDashState] = reactExports.useState({
    tab: "enemies",
    editingEnemyId: null,
    editingRegionId: null,
    editingSpriteId: null,
    editingSpellId: null,
    editingModifierId: null,
    editingAchievementId: null,
    isDirty: false
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
  const [gameConfigDraft, setGameConfigDraft] = reactExports.useState({
    leaderBoostPercent: 10,
    dokaSpawnChance: 40,
    dokaSpawnBaseValue: 5
  });
  const [gameConfigSaved, setGameConfigSaved] = reactExports.useState(false);
  const [bossRushConfig, setBossRushConfig] = reactExports.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bossRushConfig") || "{}");
    } catch {
      return {};
    }
  });
  const [bossRushSaved, setBossRushSaved] = reactExports.useState(false);
  const [shopPrincipalId, setShopPrincipalId] = reactExports.useState("");
  const [shopDokaAmount, setShopDokaAmount] = reactExports.useState(0);
  const [shopConfirm, setShopConfirm] = reactExports.useState(null);
  const [pendingTab, setPendingTab] = reactExports.useState(null);
  const [pendingDelete, setPendingDelete] = reactExports.useState(null);
  const { actor: adminActor } = useActor();
  reactExports.useEffect(() => {
    const stored = localStorage.getItem("bossRushConfig");
    if (stored) {
      try {
        setBossRushConfig(JSON.parse(stored));
      } catch {
      }
    }
    (async () => {
      try {
        const result = await adminActor.getBossRushConfig();
        const cfg = result && Array.isArray(result) ? result[0] : result;
        if (cfg) {
          try {
            setBossRushConfig(JSON.parse(cfg));
          } catch (_) {
          }
        }
      } catch (err) {
        console.error("Failed to load boss rush config:", err);
      }
    })();
  }, [adminActor]);
  reactExports.useEffect(() => {
    if (gameConfigQ.data) setGameConfigDraft(gameConfigQ.data);
  }, [gameConfigQ.data]);
  const hasOpenEditor = dashState.editingEnemyId != null || dashState.editingRegionId != null || dashState.editingSpellId != null || dashState.editingModifierId != null || dashState.editingAchievementId != null;
  const applyTab = (tab) => setDashState((p) => ({
    ...p,
    tab,
    editingEnemyId: null,
    editingRegionId: null,
    editingSpriteId: null,
    editingSpellId: null,
    editingModifierId: null,
    editingAchievementId: null
  }));
  const setTab = (tab) => {
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
  const editingEnemy = dashState.editingEnemyId === "__new__" ? newEnemy() : enemies.find((e) => e.id === dashState.editingEnemyId) ?? null;
  const editingRegion = dashState.editingRegionId === "__new__" ? newRegion() : regions.find((r) => r.id === dashState.editingRegionId) ?? null;
  const editingSpell = dashState.editingSpellId === "__new__" ? newSpell() : spells.find((s) => s.id === dashState.editingSpellId) ?? null;
  if (!isAdmin) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        "data-ocid": "admin.access_denied",
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(5,6,14,0.97)",
          zIndex: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Space Grotesk', system-ui, sans-serif"
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              background: "linear-gradient(180deg,#13141c,#0e0f16)",
              border: `1px solid ${C.gold}`,
              borderRadius: 12,
              padding: "36px 40px",
              minWidth: 340,
              maxWidth: 420,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 0 60px rgba(192,57,43,0.2), 0 20px 40px rgba(0,0,0,0.6)"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 36, marginBottom: 16 }, children: "🛡️" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "h2",
                {
                  style: {
                    color: "#f0c44a",
                    margin: "0 0 12px",
                    fontSize: 18,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase"
                  },
                  children: "Admin Access Required"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#8a8090", fontSize: 13, marginBottom: 24 }, children: "Only the first player who logged in has admin access. Log in with the admin Internet Identity to use this dashboard." }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Btn,
                {
                  variant: "ghost",
                  onClick: onBack,
                  ocid: "admin.access_denied.back_button",
                  children: "← Back to Game"
                }
              )
            ]
          }
        )
      }
    );
  }
  const TABS = [
    { key: "enemies", label: "Enemies", icon: "⚔️" },
    { key: "regions", label: "Regions", icon: "🗺️" },
    { key: "sprites", label: "Player Sprites", icon: "♟️" },
    { key: "spells", label: "Spells", icon: "⚡" },
    { key: "modifiers", label: "Map Modifiers", icon: "🌀" },
    { key: "tiers", label: "Enemy Tiers", icon: "🎯" },
    { key: "visuals", label: "Visuals", icon: "🎨" },
    { key: "settings", label: "Settings", icon: "⚙️" },
    { key: "purchases", label: "Purchases", icon: "🧾" },
    { key: "achievements", label: "Achievements", icon: "🏆" },
    { key: "names", label: "Enemy Names", icon: "📛" },
    { key: "bosses", label: "Bosses", icon: "👹" },
    { key: "ads", label: "Ad Boxes", icon: "📢" },
    { key: "shop", label: "Shop", icon: "🛒" },
    { key: "bossRush", label: "Boss Rush", icon: "⚔️" }
  ];
  const anyPending = setEnemyMut.isPending || delEnemyMut.isPending || setRegionMut.isPending || delRegionMut.isPending || setSpriteMut.isPending || delSpriteMut.isPending || setSpellMut.isPending || delSpellMut.isPending || setModifierMut.isPending || delModifierMut.isPending;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": "admin.dashboard",
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(5,6,14,0.97)",
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        overflow: "hidden"
      },
      children: [
        saveStatus && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              position: "fixed",
              top: 60,
              right: 16,
              zIndex: 9999,
              background: saveStatus.includes("failed") ? "#8B0000" : "#006400",
              color: "white",
              padding: "8px 16px",
              borderRadius: 4,
              fontSize: 13,
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
            },
            children: saveStatus
          }
        ),
        pendingTab && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            title: "Leave this editor?",
            body: "Unsaved edits in the open form will be discarded. Save first if you want to keep them.",
            confirmLabel: pendingTab === "close" ? "Leave dashboard" : "Leave editor",
            ocidPrefix: "admin.unsaved",
            onCancel: () => setPendingTab(null),
            onConfirm: () => {
              const next = pendingTab;
              setPendingTab(null);
              if (next === "close") onBack();
              else applyTab(next);
            }
          }
        ),
        pendingDelete && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            title: `Delete ${pendingDelete.label}?`,
            body: pendingDelete.kind === "name" ? "This removes the name from the live enemy-name pool immediately." : "This removes the live configuration immediately. This cannot be undone.",
            ocidPrefix: `admin.${pendingDelete.kind}s.delete`,
            onCancel: () => setPendingDelete(null),
            onConfirm: () => {
              const { kind, id } = pendingDelete;
              setPendingDelete(null);
              if (kind === "modifier") {
                delModifierMut.mutate(id, {
                  onSuccess: () => ue.success("Modifier deleted"),
                  onError: () => ue.error("Failed to delete modifier")
                });
              } else if (kind === "achievement") {
                delAchievementMut.mutate(id, {
                  onSuccess: () => ue.success("Achievement deleted"),
                  onError: () => ue.error("Failed to delete")
                });
              } else {
                delEnemyNameMut.mutate(id, {
                  onSuccess: () => ue.success(`Removed "${id}"`),
                  onError: () => ue.error("Failed to remove name")
                });
              }
            }
          }
        ),
        shopConfirm === "grant" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            title: `Grant ${shopDokaAmount} Doka?`,
            body: `This credits ${shopDokaAmount} Doka to ${shopPrincipalId} immediately. There is no undo.`,
            confirmLabel: "Grant Doka",
            ocidPrefix: "admin.shop.grant",
            onCancel: () => setShopConfirm(null),
            onConfirm: () => {
              setShopConfirm(null);
              void (async () => {
                try {
                  await adminActor.adminAddDokaToUser(
                    Principal.fromText(shopPrincipalId),
                    BigInt(Number(shopDokaAmount) || 0),
                    null
                  );
                  ue.success(
                    `Granted ${shopDokaAmount} Doka to ${shopPrincipalId}`
                  );
                  setSaveStatus("Saved");
                  setTimeout(() => setSaveStatus(null), 3e3);
                } catch (err) {
                  ue.error(`Failed to grant Doka: ${String(err)}`);
                  setSaveStatus(`Save failed: ${String(err)}`);
                }
              })();
            }
          }
        ),
        shopConfirm === "ban" && /* @__PURE__ */ jsxRuntimeExports.jsx(
          ConfirmDialog,
          {
            title: `Ban ${shopPrincipalId}?`,
            body: "Banned principals fail purchases, buffs, achievement claims, boss rush, and Doka awards. Achievement progress for this principal is cleared.",
            confirmLabel: "Ban player",
            ocidPrefix: "admin.shop.ban",
            onCancel: () => setShopConfirm(null),
            onConfirm: () => {
              setShopConfirm(null);
              void (async () => {
                try {
                  await adminActor.adminBanAccount(Principal.fromText(shopPrincipalId));
                  ue.success(`Banned ${shopPrincipalId}`);
                  setSaveStatus("Saved");
                  setTimeout(() => setSaveStatus(null), 3e3);
                } catch (err) {
                  ue.error(`Failed to ban player: ${String(err)}`);
                  setSaveStatus(`Save failed: ${String(err)}`);
                }
              })();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              height: 52,
              flexShrink: 0,
              background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
              borderBottom: `1px solid ${C.goldDim}`,
              boxShadow: "0 2px 16px rgba(192,57,43,0.1)"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    style: {
                      fontSize: 18,
                      filter: "drop-shadow(0 0 6px rgba(192,57,43,0.5))"
                    },
                    children: "🛡️"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      style: {
                        color: "#f0c44a",
                        fontWeight: 800,
                        fontSize: 14,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase"
                      },
                      children: "Admin Dashboard"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      style: {
                        color: "#8a8090",
                        fontSize: 10,
                        marginLeft: 10,
                        letterSpacing: "0.06em"
                      },
                      children: "ÆSTRALTØ"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center" }, children: [
                anyPending && /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    "data-ocid": "admin.loading_state",
                    style: {
                      color: "#f0c44a",
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      animation: "pulse 1.5s infinite"
                    },
                    children: "● Saving…"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Btn, { variant: "ghost", onClick: requestClose, ocid: "admin.close_button", children: "← Back to Game" })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, display: "flex", overflow: "hidden" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                width: 180,
                flexShrink: 0,
                background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
                borderRight: `1px solid ${C.goldDim}`,
                padding: "16px 0",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                overflowY: "auto"
              },
              children: [
                TABS.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "button",
                  {
                    type: "button",
                    "data-ocid": `admin.tab.${t.key}`,
                    onClick: () => setTab(t.key),
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 20px",
                      cursor: "pointer",
                      border: "none",
                      borderLeft: `3px solid ${dashState.tab === t.key ? C.gold : "transparent"}`,
                      background: dashState.tab === t.key ? `linear-gradient(90deg, ${C.gold}14, transparent)` : "transparent",
                      color: dashState.tab === t.key ? C.goldBright : C.dim,
                      fontSize: 12,
                      fontWeight: dashState.tab === t.key ? 700 : 500,
                      letterSpacing: "0.05em",
                      textAlign: "left",
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
                      transition: "all 0.15s",
                      width: "100%"
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t.icon }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t.label })
                    ]
                  },
                  t.key
                )),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    style: {
                      marginTop: "auto",
                      padding: "16px 20px 8px",
                      borderTop: `1px solid ${C.goldDim}`
                    },
                    children: [
                      ["Enemies", enemies.length],
                      ["Regions", regions.length],
                      ["Sprites", sprites.length],
                      ["Spells", spells.length]
                    ].map(([label, count]) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        style: {
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6
                        },
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#8a8090", fontSize: 10 }, children: label }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "span",
                            {
                              style: {
                                color: "#f0c44a",
                                fontSize: 12,
                                fontWeight: 700
                              },
                              children: count
                            }
                          )
                        ]
                      },
                      label
                    ))
                  }
                )
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                flex: 1,
                overflow: "auto",
                background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)"
              },
              children: [
                dashState.tab === "enemies" && (enemyQ.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TabErrorBanner,
                  {
                    tabName: "Enemies",
                    onRetry: () => enemyQ.refetch()
                  }
                ) : editingEnemy ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  EnemyEditor,
                  {
                    initial: editingEnemy,
                    regions,
                    idLocked: dashState.editingEnemyId !== "__new__",
                    saving: setEnemyMut.isPending,
                    onSave: (cfg) => {
                      setEnemyMut.mutate(cfg, {
                        onSuccess: () => {
                          ue.success(`Enemy "${cfg.name || cfg.id}" saved`);
                          setDashState((p) => ({ ...p, editingEnemyId: null }));
                        },
                        onError: () => ue.error("Failed to save enemy")
                      });
                    },
                    onCancel: () => setDashState((p) => ({ ...p, editingEnemyId: null }))
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                  EnemyList,
                  {
                    enemies,
                    loading: enemyQ.isLoading,
                    onAdd: () => setDashState((p) => ({
                      ...p,
                      editingEnemyId: "__new__"
                    })),
                    onEdit: (id) => setDashState((p) => ({ ...p, editingEnemyId: id })),
                    onDelete: (id) => {
                      delEnemyMut.mutate(id, {
                        onSuccess: () => ue.success("Enemy deleted"),
                        onError: () => ue.error("Failed to delete enemy")
                      });
                    }
                  }
                )),
                dashState.tab === "regions" && (regionQ.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TabErrorBanner,
                  {
                    tabName: "Regions",
                    onRetry: () => regionQ.refetch()
                  }
                ) : editingRegion ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RegionEditor,
                  {
                    initial: editingRegion,
                    idLocked: dashState.editingRegionId !== "__new__",
                    saving: setRegionMut.isPending,
                    onSave: (cfg) => {
                      setRegionMut.mutate(cfg, {
                        onSuccess: () => {
                          ue.success(`Region "${cfg.name || cfg.id}" saved`);
                          setDashState((p) => ({ ...p, editingRegionId: null }));
                        },
                        onError: () => ue.error("Failed to save region")
                      });
                    },
                    onCancel: () => setDashState((p) => ({ ...p, editingRegionId: null }))
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RegionList,
                  {
                    regions,
                    loading: regionQ.isLoading,
                    onAdd: () => setDashState((p) => ({
                      ...p,
                      editingRegionId: "__new__"
                    })),
                    onEdit: (id) => setDashState((p) => ({ ...p, editingRegionId: id })),
                    onDelete: (id) => {
                      delRegionMut.mutate(id, {
                        onSuccess: () => ue.success("Region deleted"),
                        onError: () => ue.error("Failed to delete region")
                      });
                    }
                  }
                )),
                dashState.tab === "sprites" && (spriteQ.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TabErrorBanner,
                  {
                    tabName: "Player Sprites",
                    onRetry: () => spriteQ.refetch()
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    style: {
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden"
                    },
                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                      SpriteList,
                      {
                        sprites,
                        loading: spriteQ.isLoading,
                        saving: setSpriteMut.isPending || delSpriteMut.isPending,
                        onSave: (cfg) => {
                          const walkErr = validateWalkFrameUrls(cfg.walkFramesFront) ?? validateWalkFrameUrls(cfg.walkFramesRight) ?? validateWalkFrameUrls(cfg.walkFramesLeft) ?? validateWalkFrameUrls(cfg.walkFramesBack) ?? validateOptionalUrl("frontUrl", cfg.frontUrl[0] ?? "") ?? validateOptionalUrl("rightUrl", cfg.rightUrl[0] ?? "") ?? validateOptionalUrl("leftUrl", cfg.leftUrl[0] ?? "") ?? validateOptionalUrl("backUrl", cfg.backUrl[0] ?? "");
                          if (walkErr) {
                            ue.error(walkErr);
                            return;
                          }
                          setSpriteMut.mutate(cfg, {
                            onSuccess: () => ue.success(
                              `Character "${cfg.name || cfg.id}" saved`
                            ),
                            onError: () => ue.error("Failed to save character")
                          });
                        },
                        onDelete: (id) => {
                          delSpriteMut.mutate(id, {
                            onSuccess: () => ue.success("Character deleted"),
                            onError: () => ue.error("Failed to delete character")
                          });
                        }
                      }
                    )
                  }
                )),
                dashState.tab === "spells" && (spellQ.isError ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  TabErrorBanner,
                  {
                    tabName: "Spells",
                    onRetry: () => spellQ.refetch()
                  }
                ) : editingSpell ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SpellEditor,
                  {
                    initial: editingSpell,
                    idLocked: dashState.editingSpellId !== "__new__",
                    saving: setSpellMut.isPending,
                    onSave: (cfg) => {
                      setSpellMut.mutate(cfg, {
                        onSuccess: () => {
                          ue.success(`Spell "${cfg.name || cfg.id}" saved`);
                          setDashState((p) => ({ ...p, editingSpellId: null }));
                        },
                        onError: () => ue.error("Failed to save spell")
                      });
                    },
                    onCancel: () => setDashState((p) => ({ ...p, editingSpellId: null }))
                  }
                ) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                  SpellList,
                  {
                    spells,
                    loading: spellQ.isLoading,
                    onAdd: () => setDashState((p) => ({ ...p, editingSpellId: "__new__" })),
                    onEdit: (id) => setDashState((p) => ({ ...p, editingSpellId: id })),
                    onDelete: (id) => {
                      delSpellMut.mutate(id, {
                        onSuccess: () => ue.success("Spell deleted"),
                        onError: () => ue.error("Failed to delete spell")
                      });
                    }
                  }
                )),
                dashState.tab === "settings" && /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsTab, {}),
                dashState.tab === "visuals" && /* @__PURE__ */ jsxRuntimeExports.jsx(VisualsTab, {}),
                dashState.tab === "tiers" && /* @__PURE__ */ jsxRuntimeExports.jsx(TierConfigTab, {}),
                dashState.tab === "purchases" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.purchases_tab", style: { padding: 20 }, children: [
                  purchaseQ.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TabErrorBanner,
                    {
                      tabName: "Purchases",
                      onRetry: () => purchaseQ.refetch()
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 20
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "h3",
                            {
                              style: {
                                color: "#f0c44a",
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 800,
                                letterSpacing: "0.06em"
                              },
                              children: "Purchase Records"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "p",
                            {
                              style: {
                                color: "#8a8090",
                                fontSize: 11,
                                margin: "4px 0 0"
                              },
                              children: "All Doka shop orders, customer data & proof-of-address documents"
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "div",
                          {
                            style: {
                              background: `${C.gold}18`,
                              border: `1px solid ${C.goldDim}`,
                              borderRadius: 20,
                              padding: "4px 12px",
                              fontSize: 11,
                              color: "#f0c44a",
                              fontWeight: 700
                            },
                            children: [
                              ((_a = purchaseQ.data) == null ? void 0 : _a.length) ?? 0,
                              " records"
                            ]
                          }
                        )
                      ]
                    }
                  ),
                  purchaseQ.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      "data-ocid": "admin.purchases.loading_state",
                      style: {
                        textAlign: "center",
                        padding: 40,
                        color: "#8a8090",
                        fontSize: 13
                      },
                      children: "Loading purchase records…"
                    }
                  ),
                  !purchaseQ.isLoading && (((_b = purchaseQ.data) == null ? void 0 : _b.length) ?? 0) === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      "data-ocid": "admin.purchases.empty_state",
                      style: {
                        textAlign: "center",
                        padding: "40px 0",
                        color: "#6a6070",
                        fontSize: 13,
                        border: `1px dashed ${C.dimmer}`,
                        borderRadius: 8
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 28, marginBottom: 8 }, children: "🧾" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, marginBottom: 4 }, children: "No purchase records yet" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11 }, children: "Records appear here once players make purchases" })
                      ]
                    }
                  ),
                  (purchaseQ.data ?? []).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "table",
                    {
                      style: {
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 11
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { borderBottom: `1px solid ${C.goldDim}` }, children: [
                          "#",
                          "Customer",
                          "Email",
                          "Address",
                          "Amount",
                          "Price",
                          "Status",
                          "Date",
                          "Proof"
                        ].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "th",
                          {
                            style: {
                              color: "#f0c44a",
                              fontWeight: 800,
                              textAlign: "left",
                              padding: "8px 10px",
                              letterSpacing: "0.08em",
                              fontSize: 9,
                              textTransform: "uppercase",
                              whiteSpace: "nowrap"
                            },
                            children: h
                          },
                          h
                        )) }) }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: (purchaseQ.data ?? []).map((rec, i) => {
                          var _a2, _b2, _c2, _d2, _e2, _f2, _g, _h, _i;
                          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            "tr",
                            {
                              "data-ocid": `admin.purchases.item.${i + 1}`,
                              style: {
                                borderBottom: `1px solid ${C.goldDim}22`,
                                background: i % 2 === 0 ? C.bg0 : C.bg1
                              },
                              children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "td",
                                  {
                                    style: {
                                      padding: "8px 10px",
                                      color: "#8a8090",
                                      fontWeight: 700
                                    },
                                    children: i + 1
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "td",
                                  {
                                    style: {
                                      padding: "8px 10px",
                                      color: "#c0ccd8",
                                      whiteSpace: "nowrap"
                                    },
                                    children: [
                                      (_a2 = rec.customerData) == null ? void 0 : _a2.firstName,
                                      (_b2 = rec.customerData) == null ? void 0 : _b2.lastName
                                    ].filter(Boolean).join(" ") || "—"
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 10px", color: C.dim }, children: ((_c2 = rec.customerData) == null ? void 0 : _c2.email) || "—" }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "td",
                                  {
                                    style: {
                                      padding: "8px 10px",
                                      color: "#8a8090",
                                      maxWidth: 160,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap"
                                    },
                                    children: [
                                      (_d2 = rec.customerData) == null ? void 0 : _d2.address,
                                      (_e2 = rec.customerData) == null ? void 0 : _e2.city,
                                      (_f2 = rec.customerData) == null ? void 0 : _f2.postalCode,
                                      (_g = rec.customerData) == null ? void 0 : _g.country
                                    ].filter(Boolean).join(", ") || "—"
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                  "td",
                                  {
                                    style: {
                                      padding: "8px 10px",
                                      color: "#f0c44a",
                                      fontWeight: 700,
                                      textAlign: "right",
                                      whiteSpace: "nowrap"
                                    },
                                    children: [
                                      ((_h = rec.dokaAmount) == null ? void 0 : _h.toLocaleString()) ?? "—",
                                      " 💰"
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                  "td",
                                  {
                                    style: {
                                      padding: "8px 10px",
                                      color: "#c0ccd8",
                                      textAlign: "right",
                                      whiteSpace: "nowrap"
                                    },
                                    children: [
                                      "€",
                                      rec.priceEur ?? "—"
                                    ]
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "td",
                                  {
                                    style: {
                                      padding: "8px 10px",
                                      whiteSpace: "nowrap"
                                    },
                                    children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                                      "span",
                                      {
                                        style: {
                                          background: rec.status === "paid" || rec.status === "completed" ? `${C.green}22` : `${C.gold}22`,
                                          border: `1px solid ${rec.status === "paid" || rec.status === "completed" ? C.green : C.gold}44`,
                                          color: rec.status === "paid" || rec.status === "completed" ? C.green : C.gold,
                                          fontSize: 9,
                                          padding: "2px 7px",
                                          borderRadius: 20,
                                          fontWeight: 700
                                        },
                                        children: rec.status ?? "pending"
                                      }
                                    )
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "td",
                                  {
                                    style: {
                                      padding: "8px 10px",
                                      color: "#8a8090",
                                      whiteSpace: "nowrap"
                                    },
                                    children: rec.timestamp ? new Date(rec.timestamp).toLocaleString(
                                      "en-GB",
                                      { dateStyle: "short", timeStyle: "short" }
                                    ) : "—"
                                  }
                                ),
                                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "8px 10px" }, children: rec.proofFileUrl || rec.proofOfAddressBase64 || ((_i = rec.proofOfAddressName) == null ? void 0 : _i.startsWith("http")) ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "button",
                                  {
                                    type: "button",
                                    "data-ocid": `admin.purchases.view_proof_button.${i + 1}`,
                                    onClick: () => {
                                      var _a3, _b3;
                                      if (rec.proofFileUrl) {
                                        window.open(
                                          rec.proofFileUrl,
                                          "_blank",
                                          "noopener,noreferrer"
                                        );
                                        return;
                                      }
                                      if ((_a3 = rec.proofOfAddressName) == null ? void 0 : _a3.startsWith("http")) {
                                        window.open(
                                          rec.proofOfAddressName,
                                          "_blank",
                                          "noopener,noreferrer"
                                        );
                                        return;
                                      }
                                      const mime = ((_b3 = rec.proofOfAddressName) == null ? void 0 : _b3.endsWith(
                                        ".pdf"
                                      )) ? "application/pdf" : "image/jpeg";
                                      const url = `data:${mime};base64,${rec.proofOfAddressBase64}`;
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = rec.proofOfAddressName ?? `proof_${rec.id ?? i}.jpg`;
                                      a.click();
                                    },
                                    style: {
                                      background: `${C.blue}22`,
                                      border: `1px solid ${C.blue}55`,
                                      borderRadius: 4,
                                      color: C.blue,
                                      fontSize: 10,
                                      padding: "3px 8px",
                                      cursor: "pointer",
                                      fontWeight: 700,
                                      whiteSpace: "nowrap"
                                    },
                                    children: "📄 View"
                                  }
                                ) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#6a6070", fontSize: 10 }, children: "None" }) })
                              ]
                            },
                            rec.id ?? i
                          );
                        }) })
                      ]
                    }
                  ) })
                ] }),
                dashState.tab === "modifiers" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.modifiers_tab", style: { padding: 20 }, children: [
                  modifierQ.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TabErrorBanner,
                    {
                      tabName: "Map Modifiers",
                      onRetry: () => modifierQ.refetch()
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      "data-ocid": "admin.doka_spawn_config",
                      style: {
                        background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                        border: `1px solid ${C.goldDim}`,
                        borderRadius: 8,
                        padding: "14px 16px",
                        marginBottom: 18
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Ground Doka & Leader Config" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs(
                          "div",
                          {
                            style: {
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr 1fr",
                              gap: "0 16px",
                              marginBottom: 10
                            },
                            children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 8 }, children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "doka_spawn_chance", style: labelStyle, children: "Spawn Chance (%)" }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "input",
                                  {
                                    id: "doka_spawn_chance",
                                    type: "number",
                                    min: 0,
                                    max: 100,
                                    value: gameConfigDraft.dokaSpawnChance,
                                    onChange: (e) => setGameConfigDraft((p) => ({
                                      ...p,
                                      dokaSpawnChance: Math.max(
                                        0,
                                        Math.min(100, Number(e.target.value) || 0)
                                      )
                                    })),
                                    "data-ocid": "admin.doka.spawn_chance_input",
                                    style: inputStyle()
                                  }
                                )
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 8 }, children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "doka_spawn_base", style: labelStyle, children: "Base Doka Value" }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "input",
                                  {
                                    id: "doka_spawn_base",
                                    type: "number",
                                    min: 1,
                                    value: gameConfigDraft.dokaSpawnBaseValue,
                                    onChange: (e) => setGameConfigDraft((p) => ({
                                      ...p,
                                      dokaSpawnBaseValue: Math.max(
                                        1,
                                        Math.min(1e4, Number(e.target.value) || 1)
                                      )
                                    })),
                                    "data-ocid": "admin.doka.spawn_base_input",
                                    style: inputStyle()
                                  }
                                )
                              ] }),
                              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 8 }, children: [
                                /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "leader_boost", style: labelStyle, children: "Leader Boost per Death (%)" }),
                                /* @__PURE__ */ jsxRuntimeExports.jsx(
                                  "input",
                                  {
                                    id: "leader_boost",
                                    type: "number",
                                    min: 0,
                                    value: gameConfigDraft.leaderBoostPercent,
                                    onChange: (e) => setGameConfigDraft((p) => ({
                                      ...p,
                                      leaderBoostPercent: Math.max(
                                        0,
                                        Math.min(100, Number(e.target.value) || 0)
                                      )
                                    })),
                                    "data-ocid": "admin.doka.leader_boost_input",
                                    style: inputStyle()
                                  }
                                )
                              ] })
                            ]
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center" }, children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            Btn,
                            {
                              variant: "gold",
                              onClick: () => {
                                const gameErr = validateGameConfig(gameConfigDraft);
                                if (gameErr) {
                                  ue.error(gameErr);
                                  return;
                                }
                                setGameConfigMut.mutate(gameConfigDraft, {
                                  onSuccess: () => {
                                    setGameConfigSaved(true);
                                    setTimeout(() => setGameConfigSaved(false), 2e3);
                                  },
                                  onError: () => ue.error("Failed to save game config")
                                });
                              },
                              ocid: "admin.doka.save_config_button",
                              disabled: setGameConfigMut.isPending,
                              children: setGameConfigMut.isPending ? "Saving…" : "Save Config"
                            }
                          ),
                          gameConfigSaved && /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "span",
                            {
                              style: {
                                color: "#56d18a",
                                fontSize: 11,
                                fontWeight: 700
                              },
                              children: "✓ Saved!"
                            }
                          )
                        ] })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      style: {
                        background: "linear-gradient(160deg,#48343c 0%,#241a20 40%,#14101a 100%)",
                        border: `1px solid ${C.goldDim}`,
                        borderRadius: 7,
                        padding: "10px 14px",
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 10
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 18 }, children: "🌀" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "div",
                            {
                              style: {
                                color: "#f0c44a",
                                fontWeight: 700,
                                fontSize: 12,
                                marginBottom: 2
                              },
                              children: "Global Modifier System"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#8a8090", fontSize: 11 }, children: "Each active modifier has its own trigger chance (%). When the player enters a new map through a portal, each modifier independently rolls against its chance. Default: 20%. Set a modifier's trigger chance in the editor below." })
                        ] })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "h3",
                            {
                              style: {
                                color: "#f0c44a",
                                margin: 0,
                                fontSize: 14,
                                fontWeight: 800,
                                letterSpacing: "0.06em"
                              },
                              children: "Map Modifiers"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            "p",
                            {
                              style: {
                                color: "#8a8090",
                                fontSize: 11,
                                margin: "3px 0 0"
                              },
                              children: [
                                modifiers.length,
                                " modifier",
                                modifiers.length === 1 ? "" : "s",
                                " defined"
                              ]
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Btn,
                          {
                            variant: "gold",
                            onClick: () => setDashState((p) => ({
                              ...p,
                              editingModifierId: "__new__"
                            })),
                            ocid: "admin.modifiers.add_button",
                            children: "+ Add Modifier"
                          }
                        )
                      ]
                    }
                  ),
                  dashState.editingModifierId ? /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      style: {
                        background: "linear-gradient(180deg,#13141c,#0e0f16)",
                        border: `1px solid ${C.goldDim}`,
                        borderRadius: 8,
                        padding: 20
                      },
                      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                        ModifierEditor,
                        {
                          initial: dashState.editingModifierId === "__new__" ? {
                            id: `mod_${Date.now()}`,
                            name: "",
                            description: "",
                            modifierType: "slime_flood",
                            active: true
                          } : modifiers.find(
                            (m) => m.id === dashState.editingModifierId
                          ) ?? {
                            id: `mod_${Date.now()}`,
                            name: "",
                            description: "",
                            modifierType: "slime_flood",
                            active: true
                          },
                          saving: setModifierMut.isPending,
                          onSave: (cfg) => {
                            setModifierMut.mutate(cfg, {
                              onSuccess: () => {
                                ue.success(`Modifier "${cfg.name}" saved`);
                                setDashState((p) => ({
                                  ...p,
                                  editingModifierId: null
                                }));
                              },
                              onError: () => ue.error("Failed to save modifier")
                            });
                          },
                          onCancel: () => setDashState((p) => ({
                            ...p,
                            editingModifierId: null
                          }))
                        }
                      )
                    }
                  ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    modifierQ.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        style: {
                          color: "#8a8090",
                          fontSize: 12,
                          textAlign: "center",
                          padding: 24
                        },
                        children: "Loading modifiers\\u2026"
                      }
                    ),
                    !modifierQ.isLoading && modifiers.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        "data-ocid": "admin.modifiers.empty_state",
                        style: {
                          textAlign: "center",
                          padding: "40px 0",
                          color: "#6a6070",
                          fontSize: 13,
                          border: `1px dashed ${C.dimmer}`,
                          borderRadius: 8
                        },
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 28, marginBottom: 8 }, children: "\\uD83C\\uDF00" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, marginBottom: 4 }, children: "No modifiers yet" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11 }, children: "Add Slime Flood, Paper Windstorm, or custom modifiers" })
                        ]
                      }
                    ),
                    modifiers.map((mod, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(PanelCard, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        "data-ocid": `admin.modifiers.item.${i + 1}`,
                        style: {
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          padding: "10px 14px"
                        },
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(
                              "div",
                              {
                                style: {
                                  color: "#c0ccd8",
                                  fontWeight: 700,
                                  fontSize: 13,
                                  marginBottom: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8
                                },
                                children: [
                                  mod.name || mod.id,
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    "span",
                                    {
                                      style: {
                                        background: mod.active ? `${C.green}22` : `${C.red}22`,
                                        border: `1px solid ${mod.active ? C.green : C.red}44`,
                                        color: mod.active ? C.green : C.red,
                                        fontSize: 9,
                                        padding: "1px 6px",
                                        borderRadius: 20
                                      },
                                      children: mod.active ? "Active" : "Inactive"
                                    }
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#8a8090", fontSize: 11 }, children: mod.description }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "div",
                              {
                                style: {
                                  background: `${C.gold}18`,
                                  border: `1px solid ${C.goldDim}`,
                                  borderRadius: 20,
                                  padding: "1px 7px",
                                  fontSize: 10,
                                  color: "#f0c44a",
                                  display: "inline-block",
                                  marginTop: 4
                                },
                                children: mod.modifierType
                              }
                            )
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Btn,
                              {
                                variant: "ghost",
                                small: true,
                                onClick: () => setDashState((p) => ({
                                  ...p,
                                  editingModifierId: mod.id
                                })),
                                ocid: `admin.modifiers.edit_button.${i + 1}`,
                                children: "Edit"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Btn,
                              {
                                variant: "red",
                                small: true,
                                onClick: () => setPendingDelete({
                                  kind: "modifier",
                                  id: mod.id,
                                  label: mod.name || mod.id
                                }),
                                ocid: `admin.modifiers.delete_button.${i + 1}`,
                                children: "\\u00D7"
                              }
                            )
                          ] })
                        ]
                      }
                    ) }, mod.id))
                  ] })
                ] }),
                dashState.tab === "achievements" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.achievements_tab", style: { padding: 20 }, children: [
                  achievementQ.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TabErrorBanner,
                    {
                      tabName: "Achievements",
                      onRetry: () => achievementQ.refetch()
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 20
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "h3",
                            {
                              style: {
                                color: "#f0c44a",
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 800,
                                letterSpacing: "0.06em"
                              },
                              children: "Achievements"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "p",
                            {
                              style: {
                                color: "#8a8090",
                                fontSize: 11,
                                margin: "4px 0 0"
                              },
                              children: "Configure player achievements and Doka rewards"
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          Btn,
                          {
                            variant: "gold",
                            small: true,
                            ocid: "admin.achievements.add_button",
                            onClick: () => setDashState((p) => ({
                              ...p,
                              editingAchievementId: "__new__"
                            })),
                            children: "+ New Achievement"
                          }
                        )
                      ]
                    }
                  ),
                  dashState.editingAchievementId && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    AchievementEditor,
                    {
                      initial: dashState.editingAchievementId === "__new__" ? newAchievement() : (achievementQ.data ?? []).find(
                        (a) => a.id === dashState.editingAchievementId
                      ) ?? newAchievement(),
                      onSave: (cfg) => setAchievementMut.mutate(cfg, {
                        onSuccess: () => {
                          ue.success("Achievement saved");
                          setDashState((p) => ({
                            ...p,
                            editingAchievementId: null
                          }));
                        },
                        onError: () => ue.error("Failed to save achievement")
                      }),
                      onCancel: () => setDashState((p) => ({ ...p, editingAchievementId: null })),
                      saving: setAchievementMut.isPending
                    }
                  ),
                  !dashState.editingAchievementId && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    achievementQ.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        "data-ocid": "admin.achievements.loading_state",
                        style: { padding: 40, textAlign: "center", color: C.dim },
                        children: "Loading…"
                      }
                    ),
                    !achievementQ.isLoading && (achievementQ.data ?? []).length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        "data-ocid": "admin.achievements.empty_state",
                        style: {
                          textAlign: "center",
                          padding: "40px 0",
                          color: "#6a6070",
                          fontSize: 13,
                          border: `1px dashed ${C.dimmer}`,
                          borderRadius: 8
                        },
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 28, marginBottom: 8 }, children: "🏆" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, marginBottom: 4 }, children: "No achievements yet" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11 }, children: "Add achievements with Doka rewards for players to unlock" })
                        ]
                      }
                    ),
                    (achievementQ.data ?? []).map((ach, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(PanelCard, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        "data-ocid": `admin.achievements.item.${i + 1}`,
                        style: {
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          padding: "10px 14px"
                        },
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsxs(
                              "div",
                              {
                                style: {
                                  color: "#c0ccd8",
                                  fontWeight: 700,
                                  fontSize: 13,
                                  marginBottom: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8
                                },
                                children: [
                                  ach.name,
                                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                                    "span",
                                    {
                                      style: {
                                        background: ach.active ? `${C.green}22` : `${C.red}22`,
                                        border: `1px solid ${ach.active ? C.green : C.red}44`,
                                        color: ach.active ? C.green : C.red,
                                        fontSize: 9,
                                        padding: "1px 6px",
                                        borderRadius: 20
                                      },
                                      children: ach.active ? "Active" : "Inactive"
                                    }
                                  )
                                ]
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "div",
                              {
                                style: {
                                  color: "#8a8090",
                                  fontSize: 11,
                                  marginBottom: 4
                                },
                                children: ach.description
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                "span",
                                {
                                  style: {
                                    background: `${C.gold}18`,
                                    border: `1px solid ${C.goldDim}`,
                                    borderRadius: 20,
                                    padding: "1px 7px",
                                    fontSize: 10,
                                    color: "#f0c44a"
                                  },
                                  children: [
                                    "🪙 ",
                                    ach.dokaReward.toLocaleString(),
                                    " Doka"
                                  ]
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "span",
                                {
                                  style: {
                                    background: "rgba(74,154,223,0.12)",
                                    border: "1px solid rgba(74,154,223,0.3)",
                                    borderRadius: 20,
                                    padding: "1px 7px",
                                    fontSize: 10,
                                    color: C.blue
                                  },
                                  children: ach.condition
                                }
                              )
                            ] })
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Btn,
                              {
                                variant: "ghost",
                                small: true,
                                onClick: () => setDashState((p) => ({
                                  ...p,
                                  editingAchievementId: ach.id
                                })),
                                ocid: `admin.achievements.edit_button.${i + 1}`,
                                children: "Edit"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              Btn,
                              {
                                variant: "red",
                                small: true,
                                onClick: () => setPendingDelete({
                                  kind: "achievement",
                                  id: ach.id,
                                  label: ach.name || ach.id
                                }),
                                ocid: `admin.achievements.delete_button.${i + 1}`,
                                children: "×"
                              }
                            )
                          ] })
                        ]
                      }
                    ) }, ach.id))
                  ] })
                ] }),
                dashState.tab === "bosses" && /* @__PURE__ */ jsxRuntimeExports.jsx(BossesTab, { spells }),
                dashState.tab === "ads" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "24px" }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "h2",
                    {
                      style: {
                        color: "#ff4444",
                        fontSize: "20px",
                        marginBottom: "24px"
                      },
                      children: "Advertisement Boxes"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "p",
                    {
                      style: {
                        color: "#aaa",
                        marginBottom: "24px",
                        fontSize: "14px"
                      },
                      children: "These 3 ad boxes appear on the login page. Upload an image URL and click-through link for each box you want to show."
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(AdBoxEditor, { index: 0 }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(AdBoxEditor, { index: 1 }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(AdBoxEditor, { index: 2 })
                ] }),
                dashState.tab === "shop" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.shop_tab", className: "p-4 space-y-6", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-red-400", children: "Shop Administration" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 p-4 rounded", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold mb-2", children: "Payment Links" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-400 text-sm", children: "Configure payment links in the shop settings below." })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 p-4 rounded", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold mb-2", children: "Manual Doka Grant" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          className: "flex-1 bg-gray-700 px-3 py-2 rounded text-sm",
                          placeholder: "Principal ID",
                          value: shopPrincipalId,
                          onChange: (e) => setShopPrincipalId(e.target.value)
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          className: "w-24 bg-gray-700 px-3 py-2 rounded text-sm",
                          placeholder: "Amount",
                          type: "number",
                          value: shopDokaAmount,
                          onChange: (e) => setShopDokaAmount(Number.parseInt(e.target.value) || 0)
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          className: "bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm",
                          onClick: () => {
                            const grantErr = validateDokaGrant(shopDokaAmount);
                            if (!shopPrincipalId || grantErr) {
                              ue.error(grantErr ?? "Enter a principal and amount");
                              return;
                            }
                            if (shopDokaAmount > MAX_DOKA_GRANT) {
                              ue.error("Grant amount exceeds maximum");
                              return;
                            }
                            setShopConfirm("grant");
                          },
                          children: "Grant"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-gray-800 p-4 rounded", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold mb-2", children: "Ban / Unban Player" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          className: "flex-1 bg-gray-700 px-3 py-2 rounded text-sm",
                          placeholder: "Principal ID",
                          value: shopPrincipalId,
                          onChange: (e) => setShopPrincipalId(e.target.value)
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          className: "bg-red-800 hover:bg-red-900 px-4 py-2 rounded text-sm",
                          onClick: () => {
                            if (!shopPrincipalId) {
                              ue.error("Enter a principal ID");
                              return;
                            }
                            setShopConfirm("ban");
                          },
                          children: "Ban"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          className: "bg-green-800 hover:bg-green-900 px-4 py-2 rounded text-sm",
                          onClick: () => {
                            if (!shopPrincipalId) {
                              ue.error("Enter a principal ID");
                              return;
                            }
                            (async () => {
                              try {
                                await adminActor.adminUnbanAccount(
                                  Principal.fromText(shopPrincipalId)
                                );
                                ue.success(`Unbanned ${shopPrincipalId}`);
                                setSaveStatus("Saved");
                                setTimeout(() => setSaveStatus(null), 3e3);
                              } catch (err) {
                                ue.error(`Failed to unban player: ${String(err)}`);
                                setSaveStatus(`Save failed: ${String(err)}`);
                              }
                            })();
                          },
                          children: "Unban"
                        }
                      )
                    ] })
                  ] })
                ] }),
                dashState.tab === "bossRush" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.boss_rush_tab", className: "p-4 space-y-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-red-400", children: "Boss Rush Configuration" }),
                  [
                    { room: 1, a: "Pale Archbishop", b: "Weeping Pawn" },
                    { room: 2, a: "Crimson Countess", b: "Fetid Rook" },
                    { room: 3, a: "Bone Cavalier", b: "Lord of Static" },
                    { room: 4, a: "Starborn Queen", b: "Enthroned Void" },
                    { room: 5, a: "Void Grandmaster", b: "Mirror Sovereign" },
                    { room: 6, a: "Chessboard Lich", b: "Pale Archivist" },
                    { room: 7, a: "Eternal Pawn King", b: "Final Pawn" },
                    { room: 8, a: "Midnight Bishop", b: "Twin Monarchs" },
                    { room: 9, a: "Alabaster Fortress", b: "Broodmother Rook" },
                    { room: 10, a: "Starved Vampire Pawn", b: "Weeping Pawn" }
                  ].map(({ room, a, b }) => {
                    const enabledKey = `room_${room}_enabled`;
                    const rewardKey = `room_${room}_reward`;
                    const isEnabled = bossRushConfig[enabledKey] !== false;
                    const rewardVal = typeof bossRushConfig[rewardKey] === "number" ? bossRushConfig[rewardKey] : room;
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        className: "bg-gray-800 p-3 rounded flex items-center gap-4",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-gray-400 w-8", children: [
                            "R",
                            room
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "flex-1 text-sm", children: [
                            a,
                            " + ",
                            b
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1 text-sm", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "input",
                              {
                                type: "checkbox",
                                checked: isEnabled,
                                onChange: (e) => setBossRushConfig((prev) => ({
                                  ...prev,
                                  [enabledKey]: e.target.checked
                                }))
                              }
                            ),
                            "Enabled"
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1 text-sm", children: [
                            "Reward:",
                            " ",
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "input",
                              {
                                type: "number",
                                value: rewardVal,
                                step: 0.5,
                                min: 0.5,
                                className: "w-16 bg-gray-700 px-2 py-1 rounded text-sm",
                                onChange: (e) => setBossRushConfig((prev) => ({
                                  ...prev,
                                  [rewardKey]: Number.parseFloat(e.target.value) || 1
                                }))
                              }
                            ),
                            "x"
                          ] })
                        ]
                      },
                      room
                    );
                  }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 pt-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        "data-ocid": "admin.boss_rush_save_button",
                        className: "bg-red-700 hover:bg-red-800 px-4 py-2 rounded text-sm font-semibold",
                        onClick: () => {
                          localStorage.setItem(
                            "bossRushConfig",
                            JSON.stringify(bossRushConfig)
                          );
                          (async () => {
                            try {
                              await adminActor.adminSetBossRushConfig(
                                JSON.stringify(bossRushConfig)
                              );
                              setSaveStatus("Saved");
                              setTimeout(() => setSaveStatus(null), 3e3);
                              setBossRushSaved(true);
                              setTimeout(() => setBossRushSaved(false), 2e3);
                            } catch (err) {
                              console.error("Failed to save boss rush config:", err);
                              ue.error("Failed to save Boss Rush config");
                              setSaveStatus(`Save failed: ${String(err)}`);
                            }
                          })();
                        },
                        children: "Save Boss Rush Config"
                      }
                    ),
                    bossRushSaved && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-green-400 text-sm", children: "Saved!" })
                  ] })
                ] }),
                dashState.tab === "names" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "data-ocid": "admin.names_tab", style: { padding: 20 }, children: [
                  enemyNamesQ.isError && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TabErrorBanner,
                    {
                      tabName: "Enemy Names",
                      onRetry: () => enemyNamesQ.refetch()
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 20
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "h3",
                            {
                              style: {
                                color: "#f0c44a",
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 800,
                                letterSpacing: "0.06em"
                              },
                              children: "Enemy Names"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "p",
                            {
                              style: {
                                color: "#8a8090",
                                fontSize: 11,
                                margin: "4px 0 0"
                              },
                              children: "Ancient names assigned to enemies — max 1 per enemy per map."
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs(
                            "div",
                            {
                              style: {
                                background: `${C.gold}18`,
                                border: `1px solid ${C.goldDim}`,
                                borderRadius: 20,
                                padding: "4px 12px",
                                fontSize: 11,
                                color: "#f0c44a",
                                fontWeight: 700
                              },
                              children: [
                                ((_c = enemyNamesQ.data) == null ? void 0 : _c.length) ?? 0,
                                " names"
                              ]
                            }
                          ),
                          (((_d = enemyNamesQ.data) == null ? void 0 : _d.length) ?? 0) === 0 && !enemyNamesQ.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(
                            Btn,
                            {
                              variant: "gold",
                              small: true,
                              onClick: () => initDefaultNamesMut.mutate(),
                              ocid: "admin.names.init_defaults_button",
                              children: "Load Defaults"
                            }
                          )
                        ] })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, marginBottom: 20 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        "data-ocid": "admin.names.input",
                        type: "text",
                        placeholder: "Enter ancient name…",
                        value: newNameInput,
                        onChange: (e) => setNewNameInput(e.target.value),
                        onKeyDown: (e) => {
                          if (e.key === "Enter" && newNameInput.trim()) {
                            addEnemyNameMut.mutate(newNameInput.trim(), {
                              onSuccess: () => {
                                ue.success(`Added "${newNameInput.trim()}"`);
                                setNewNameInput("");
                              },
                              onError: () => ue.error("Failed to add name")
                            });
                          }
                        },
                        style: {
                          flex: 1,
                          background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
                          border: `1px solid ${C.goldDim}`,
                          borderRadius: 6,
                          padding: "8px 12px",
                          color: "#c0ccd8",
                          fontSize: 13,
                          fontFamily: "'Space Grotesk', system-ui, sans-serif",
                          outline: "none"
                        }
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Btn,
                      {
                        variant: "gold",
                        small: true,
                        onClick: () => {
                          if (newNameInput.trim()) {
                            addEnemyNameMut.mutate(newNameInput.trim(), {
                              onSuccess: () => {
                                ue.success(`Added "${newNameInput.trim()}"`);
                                setNewNameInput("");
                              },
                              onError: () => ue.error("Failed to add name")
                            });
                          }
                        },
                        ocid: "admin.names.add_button",
                        children: "+ Add Name"
                      }
                    )
                  ] }),
                  enemyNamesQ.isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      "data-ocid": "admin.names.loading_state",
                      style: {
                        textAlign: "center",
                        padding: 40,
                        color: "#8a8090",
                        fontSize: 13
                      },
                      children: "Loading names…"
                    }
                  ),
                  !enemyNamesQ.isLoading && (((_e = enemyNamesQ.data) == null ? void 0 : _e.length) ?? 0) === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      "data-ocid": "admin.names.empty_state",
                      style: {
                        textAlign: "center",
                        padding: "40px 0",
                        color: "#6a6070",
                        fontSize: 13,
                        border: `1px dashed ${C.dimmer}`,
                        borderRadius: 8
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 28, marginBottom: 8 }, children: "📛" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, marginBottom: 4 }, children: "No enemy names yet" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11 }, children: "Click “Load Defaults” to pre-fill with 90 ancient names." })
                      ]
                    }
                  ),
                  (((_f = enemyNamesQ.data) == null ? void 0 : _f.length) ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: (enemyNamesQ.data ?? []).map((name, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      "data-ocid": `admin.names.item.${i + 1}`,
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
                        border: `1px solid ${C.goldDim}`,
                        borderRadius: 20,
                        padding: "4px 10px 4px 14px",
                        fontSize: 12,
                        color: "#c0ccd8",
                        fontWeight: 600
                      },
                      children: [
                        name,
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "button",
                          {
                            type: "button",
                            "data-ocid": `admin.names.delete_button.${i + 1}`,
                            onClick: () => setPendingDelete({
                              kind: "name",
                              id: name,
                              label: name
                            }),
                            style: {
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#d8463f",
                              fontSize: 14,
                              lineHeight: 1,
                              padding: 0,
                              fontWeight: 700
                            },
                            "aria-label": `Remove ${name}`,
                            children: "×"
                          }
                        )
                      ]
                    },
                    name
                  )) })
                ] })
              ]
            }
          )
        ] })
      ]
    }
  );
};
const ABILITY_LABELS = {
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
  [BossAbility.DAMAGE_IMMUNE]: "Damage Immune"
};
const ALL_ABILITIES = Object.values(BossAbility);
function PhaseEditor({
  phase,
  onChange,
  spells,
  label
}) {
  const toggleAbility = (a) => {
    const has = phase.specialAbilities.includes(a);
    onChange({
      ...phase,
      specialAbilities: has ? phase.specialAbilities.filter((x) => x !== a) : [...phase.specialAbilities, a]
    });
  };
  const toggleSpell = (id) => {
    const has = phase.spellPoolIds.includes(id);
    onChange({
      ...phase,
      spellPoolIds: has ? phase.spellPoolIds.filter((s) => s !== id) : [...phase.spellPoolIds, id]
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      style: {
        background: "linear-gradient(180deg,#1d2230,#13161f 60%,#0f121a)",
        border: `1px solid ${C.goldDim}`,
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 12
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: label }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 10
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: labelStyle, children: "HP Threshold % (phase 2 triggers below)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "number",
                    min: 0,
                    max: 100,
                    "aria-label": "HP Threshold",
                    value: Math.round(phase.hpThreshold * 100),
                    onChange: (e) => onChange({
                      ...phase,
                      hpThreshold: Math.max(0, Math.min(100, Number(e.target.value))) / 100
                    }),
                    style: inputStyle()
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: labelStyle, children: "Stat Multiplier on Entry" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "number",
                    min: 1,
                    step: 0.1,
                    "aria-label": "Stat Multiplier",
                    value: phase.statMultiplier,
                    onChange: (e) => onChange({
                      ...phase,
                      statMultiplier: Math.max(0.1, Number(e.target.value))
                    }),
                    style: inputStyle()
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: labelStyle, children: "Summon Count" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "number",
                    min: 0,
                    value: phase.summonCount,
                    onChange: (e) => onChange({
                      ...phase,
                      summonCount: Math.max(0, Number.parseInt(e.target.value) || 0)
                    }),
                    style: inputStyle()
                  }
                )
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...labelStyle, marginBottom: 6 }, children: "Special Abilities" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
            children: ALL_ABILITIES.map((a) => {
              const active = phase.specialAbilities.includes(a);
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => toggleAbility(a),
                  style: {
                    padding: "3px 10px",
                    borderRadius: 20,
                    border: `1px solid ${active ? C.gold : C.dimmer}`,
                    background: active ? C.goldDim : "transparent",
                    color: active ? C.goldBright : C.dim,
                    fontSize: 10,
                    cursor: "pointer",
                    fontWeight: active ? 700 : 400
                  },
                  children: ABILITY_LABELS[a]
                },
                a
              );
            })
          }
        ),
        spells.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { ...labelStyle, marginBottom: 6 }, children: "Spell Pool" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: spells.map((s) => {
            const active = phase.spellPoolIds.includes(s.id);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: () => toggleSpell(s.id),
                style: {
                  padding: "3px 10px",
                  borderRadius: 20,
                  border: `1px solid ${active ? C.blue : C.dimmer}`,
                  background: active ? `${C.blue}22` : "transparent",
                  color: active ? C.blue : C.dim,
                  fontSize: 10,
                  cursor: "pointer"
                },
                children: [
                  s.iconEmoji,
                  " ",
                  s.name
                ]
              },
              s.id
            );
          }) })
        ] })
      ]
    }
  );
}
const BOSS_PIECE_TYPES = [
  "bishop",
  "rook",
  "king",
  "knight",
  "pawn",
  "queen"
];
const BossesTab = ({ spells }) => {
  const { data: bossConfigs = DEFAULT_BOSS_CONFIGS, refetch } = useGetAllBossConfigs();
  const setBossConfig = useSetBossConfig();
  useDeleteBossConfig();
  const [expandedId, setExpandedId] = React.useState(null);
  const [drafts, setDrafts] = React.useState({});
  const getDraft = (id) => {
    if (drafts[id]) return drafts[id];
    return bossConfigs.find((b) => b.id === id) ?? DEFAULT_BOSS_CONFIGS.find((b) => b.id === id) ?? DEFAULT_BOSS_CONFIGS[0];
  };
  const updateDraft = (id, update) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...getDraft(id), ...update } }));
  };
  const handleSave = (id) => {
    setBossConfig.mutate(getDraft(id), {
      onSuccess: () => {
        ue.success(`Boss "${getDraft(id).name}" saved!`);
        refetch();
      },
      onError: () => ue.error("Failed to save boss config")
    });
  };
  const handleReset = (id) => {
    const def = DEFAULT_BOSS_CONFIGS.find((b) => b.id === id);
    if (!def) return;
    setBossConfig.mutate(def, {
      onSuccess: () => {
        setDrafts((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
        ue.success("Boss reset to defaults");
        refetch();
      }
    });
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      "data-ocid": "admin.bosses_tab",
      style: { padding: 20, overflowY: "auto", maxHeight: "100%" },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 18
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 22 }, children: "👹" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "h2",
                  {
                    style: {
                      color: "#f0c44a",
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase"
                    },
                    children: "Boss Editor"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#8a8090", margin: 0, fontSize: 11 }, children: "Browser-local drafts only (pbv_boss_configs). Not canister-live. A saved draft is not the live encounter until a backend writer exists. Changes apply on this browser's next boss encounter." })
              ] })
            ]
          }
        ),
        BOSS_IDS.map((bossId, idx) => {
          const draft = getDraft(bossId);
          const isOpen = expandedId === bossId;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(PanelCard, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                "data-ocid": `admin.bosses.item.${idx + 1}`,
                onClick: () => setExpandedId(isOpen ? null : bossId),
                style: {
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "12px 16px",
                  gap: 12,
                  textAlign: "left"
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 20 }, children: draft.iconEmoji }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        style: { color: "#f0c44a", fontWeight: 700, fontSize: 13 },
                        children: draft.name
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { color: "#8a8090", fontSize: 10, marginTop: 2 }, children: [
                      draft.pieceType.charAt(0).toUpperCase() + draft.pieceType.slice(1),
                      " — ",
                      "Phase 2 @ ",
                      Math.round(draft.phase2.hpThreshold * 100),
                      "% HP",
                      " — ",
                      draft.rewardDokaMultiplier,
                      "x Doka /",
                      " ",
                      draft.rewardXpMultiplier,
                      "x XP"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      style: {
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: draft.portalColor,
                        border: `2px solid ${C.goldDim}`,
                        flexShrink: 0
                      }
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#8a8090", fontSize: 16 }, children: isOpen ? "▲" : "▼" })
                ]
              }
            ),
            isOpen && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "0 16px 16px" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  style: {
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginBottom: 12
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Field,
                      {
                        label: "Name",
                        value: draft.name,
                        onChange: (v) => updateDraft(bossId, { name: v }),
                        ocid: `admin.bosses.name.${idx + 1}`
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: labelStyle, children: "Piece Type" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "select",
                        {
                          value: draft.pieceType,
                          onChange: (e) => updateDraft(bossId, {
                            pieceType: e.target.value
                          }),
                          style: inputStyle(),
                          children: BOSS_PIECE_TYPES.map((pt) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: pt, children: pt.charAt(0).toUpperCase() + pt.slice(1) }, pt))
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Field,
                      {
                        label: "Icon Emoji",
                        value: draft.iconEmoji,
                        onChange: (v) => updateDraft(bossId, { iconEmoji: v })
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Field,
                      {
                        label: "Portal Color (hex)",
                        value: draft.portalColor,
                        onChange: (v) => updateDraft(bossId, { portalColor: v })
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: labelStyle, children: "Doka Reward Multiplier" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "number",
                          min: 1,
                          step: 0.5,
                          value: draft.rewardDokaMultiplier,
                          onChange: (e) => updateDraft(bossId, {
                            rewardDokaMultiplier: Math.max(
                              1,
                              Number(e.target.value)
                            )
                          }),
                          style: inputStyle()
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: labelStyle, children: "XP Reward Multiplier" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          type: "number",
                          min: 1,
                          step: 0.5,
                          value: draft.rewardXpMultiplier,
                          onChange: (e) => updateDraft(bossId, {
                            rewardXpMultiplier: Math.max(
                              1,
                              Number(e.target.value)
                            )
                          }),
                          style: inputStyle()
                        }
                      )
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: sectionHeadStyle, children: "Base Stats" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  style: {
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 8,
                    marginBottom: 12
                  },
                  children: [
                    "hp",
                    "ap",
                    "mp",
                    "atk",
                    "res",
                    "sp",
                    "init",
                    "chc"
                  ].map((stat) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: labelStyle, children: stat.toUpperCase() }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "number",
                        min: 1,
                        value: draft.baseStats[stat],
                        onChange: (e) => updateDraft(bossId, {
                          baseStats: {
                            ...draft.baseStats,
                            [stat]: Math.max(
                              1,
                              Number.parseInt(e.target.value) || 1
                            )
                          }
                        }),
                        style: inputStyle()
                      }
                    )
                  ] }, stat))
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                PhaseEditor,
                {
                  label: "Phase 1",
                  phase: draft.phase1,
                  onChange: (p) => updateDraft(bossId, { phase1: p }),
                  spells
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                PhaseEditor,
                {
                  label: "Phase 2",
                  phase: draft.phase2,
                  onChange: (p) => updateDraft(bossId, { phase2: p }),
                  spells
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: labelStyle, children: "Lore Text (shown in battle log)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "textarea",
                  {
                    value: draft.loreText,
                    onChange: (e) => updateDraft(bossId, { loreText: e.target.value }),
                    rows: 2,
                    style: { ...inputStyle(), resize: "vertical" }
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Btn,
                  {
                    variant: "gold",
                    onClick: () => handleSave(bossId),
                    ocid: `admin.bosses.save_button.${idx + 1}`,
                    children: "Save Boss"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Btn,
                  {
                    variant: "ghost",
                    onClick: () => handleReset(bossId),
                    ocid: `admin.bosses.reset_button.${idx + 1}`,
                    children: "Reset to Defaults"
                  }
                )
              ] })
            ] })
          ] }, bossId);
        })
      ]
    }
  );
};
function AdBoxEditor({ index }) {
  const { actor } = useActor();
  const [imageUrl, setImageUrl] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [status, setStatus] = React.useState("");
  React.useEffect(() => {
    if (actor) {
      actor.getAdBoxes().then((boxes) => {
        if (boxes[index]) {
          setImageUrl(boxes[index][0]);
          setLinkUrl(boxes[index][1]);
        }
      }).catch(() => {
      });
    }
  }, [actor, index]);
  const save = async () => {
    const adErr = validateAdBox(index, imageUrl, linkUrl);
    if (adErr) {
      setStatus("Error");
      ue.error(adErr);
      return;
    }
    try {
      await actor.adminSetAdBox(BigInt(index), imageUrl, linkUrl);
      setStatus("Saved!");
      setTimeout(() => setStatus(""), 2e3);
    } catch {
      setStatus("Error");
    }
  };
  const clear = async () => {
    try {
      await actor.adminClearAdBox(BigInt(index));
      setImageUrl("");
      setLinkUrl("");
      setStatus("Cleared!");
      setTimeout(() => setStatus(""), 2e3);
    } catch {
      setStatus("Error");
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      style: {
        background: "#1a0505",
        border: "1px solid #4a0a0a",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px"
      },
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { style: { color: "#ff6666", marginBottom: "12px" }, children: [
          "Ad Box ",
          index + 1
        ] }),
        imageUrl && !unsafeUrl(imageUrl) && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: imageUrl,
            alt: "preview",
            style: {
              width: "200px",
              height: "150px",
              objectFit: "cover",
              borderRadius: "4px",
              marginBottom: "8px",
              display: "block"
            }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: imageUrl,
              onChange: (e) => setImageUrl(e.target.value),
              placeholder: "Image URL (https://...)",
              style: {
                background: "#0d0505",
                border: "1px solid #4a0a0a",
                color: "#fff",
                padding: "8px",
                borderRadius: "4px",
                fontSize: "13px"
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: linkUrl,
              onChange: (e) => setLinkUrl(e.target.value),
              placeholder: "Click-through URL (https://...)",
              style: {
                background: "#0d0505",
                border: "1px solid #4a0a0a",
                color: "#fff",
                padding: "8px",
                borderRadius: "4px",
                fontSize: "13px"
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: "8px", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: save,
                style: {
                  background: "#6b0000",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px"
                },
                children: "Save"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: clear,
                style: {
                  background: "#333",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px"
                },
                children: "Clear"
              }
            ),
            status && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "span",
              {
                style: {
                  color: status.includes("Error") ? "#ff4444" : "#44ff44",
                  fontSize: "12px"
                },
                children: status
              }
            )
          ] })
        ] })
      ]
    }
  );
}
export {
  AdminDashboard as default
};
