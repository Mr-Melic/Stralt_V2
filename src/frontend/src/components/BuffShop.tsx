import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isBuffShopOpen,
  liveDokaForShopSpend,
  liveShopWallet,
  shouldAllowShopSpend,
  shouldRollbackFailedShopSpend,
  tryConsumeBuffItem,
  tryPurchaseBuffItem,
} from "../utils/itemShop";

// ── Item Definitions ──────────────────────────────────────────────────────────
export type BuffItemType =
  | "health_potion"
  | "greater_health_potion"
  | "battle_elixir"
  | "swift_boots"
  | "shield_charm"
  | "fury_potion";

export interface BuffItem {
  id: BuffItemType;
  name: string;
  icon: string;
  description: string;
  cost: number;
  maxStack: number;
}

export const BUFF_ITEMS: BuffItem[] = [
  {
    id: "health_potion",
    name: "Health Potion",
    icon: "🧪",
    description: "Restore 30% of max HP",
    cost: 50,
    maxStack: 5,
  },
  {
    id: "greater_health_potion",
    name: "Greater Potion",
    icon: "💊",
    description: "Restore 70% of max HP",
    cost: 120,
    maxStack: 5,
  },
  {
    id: "battle_elixir",
    name: "Battle Elixir",
    icon: "⚡",
    description: "+3 AP this turn (battle)",
    cost: 80,
    maxStack: 5,
  },
  {
    id: "swift_boots",
    name: "Swift Boots",
    icon: "👟",
    description: "+2 MP this turn (battle)",
    cost: 90,
    maxStack: 5,
  },
  {
    id: "shield_charm",
    name: "Shield Charm",
    icon: "🛡️",
    description: "Absorb next 20 damage",
    cost: 100,
    maxStack: 5,
  },
  {
    id: "fury_potion",
    name: "Fury Potion",
    icon: "💢",
    description: "+25% damage for 3 turns",
    cost: 150,
    maxStack: 5,
  },
];

// ── Inventory persistence ──────────────────────────────────────────────────────
export type Inventory = Partial<Record<BuffItemType, number>>;

export function loadInventory(principalId: string): Inventory {
  try {
    const raw = localStorage.getItem(`${principalId}_inventory`);
    if (!raw) return {};
    return JSON.parse(raw) as Inventory;
  } catch {
    return {};
  }
}

export function saveInventory(principalId: string, inv: Inventory): void {
  try {
    localStorage.setItem(`${principalId}_inventory`, JSON.stringify(inv));
  } catch {
    // ignore
  }
}

// ── Props ──────────────────────────────────────────────────────────────────────
export interface BuffShopProps {
  dokaBalance: number;
  /** Return false when the persist debit failed so inventory is not granted. */
  onDeductDoka: (amount: number) => boolean | Promise<boolean> | undefined;
  /** Live wallet. The render `dokaBalance` lags a same-tick heal debit. */
  getLiveDoka?: () => number;
  onUseItem: (itemType: BuffItemType) => void;
  isPlayerTurn: boolean;
  inBattle: boolean;
  userId?: string;
  /** Principal ID used as localStorage key namespace for inventory */
  principalId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const sectionStyle: React.CSSProperties = {
  padding: "6px 8px",
};

const tabButtonStyle = (_active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "4px 0",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  borderRadius: 3,
  cursor: "pointer",
});

const itemCardStyle: React.CSSProperties = {
  borderRadius: 5,
  padding: "6px 8px",
  display: "flex",
  flexDirection: "column",
  gap: 3,
  position: "relative",
};

const buyBtnStyle = (canAfford: boolean): React.CSSProperties => ({
  marginTop: 4,
  padding: "3px 0",
  fontSize: 10,
  fontWeight: 700,
  borderRadius: 3,
  cursor: canAfford ? "pointer" : "not-allowed",
  width: "100%",
});

const getBtnStyle = (canUse: boolean): React.CSSProperties => ({
  marginTop: 3,
  padding: "3px 0",
  fontSize: 10,
  fontWeight: 700,
  borderRadius: 3,
  cursor: canUse ? "pointer" : "not-allowed",
  width: "100%",
});

// ── Component ──────────────────────────────────────────────────────────────────
const BuffShop: React.FC<BuffShopProps> = ({
  dokaBalance,
  onDeductDoka,
  getLiveDoka,
  onUseItem,
  isPlayerTurn,
  inBattle,
  userId,
  principalId,
  isOpen,
  onClose,
}) => {
  const storageKey = principalId ?? userId ?? "guest";
  const [inventory, setInventory] = useState<Inventory>(() =>
    loadInventory(storageKey),
  );
  const [activeTab, setActiveTab] = useState<"shop" | "inventory">("shop");
  // Track storageKey to reload when it changes (login)
  const prevKeyRef = useRef(storageKey);
  const liveWalletRef = useRef(dokaBalance);
  const inventoryRef = useRef(inventory);
  useEffect(() => {
    // Host live wallet is authoritative. Copying the render prop here
    // restored a stale-high balance after a same-tick heal/buy debit
    // (prop 90 landing after this shop already spent to 40).
    if (getLiveDoka) return;
    liveWalletRef.current = dokaBalance;
  }, [dokaBalance, getLiveDoka]);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    if (prevKeyRef.current !== storageKey) {
      prevKeyRef.current = storageKey;
      setInventory(loadInventory(storageKey));
    }
  }, [storageKey]);

  // Persist whenever inventory changes
  useEffect(() => {
    saveInventory(storageKey, inventory);
  }, [inventory, storageKey]);

  const handleBuy = useCallback(
    (item: BuffItem) => {
      const wallet = liveDokaForShopSpend(
        getLiveDoka,
        liveShopWallet(liveWalletRef.current, getLiveDoka),
      );
      const purchase = tryPurchaseBuffItem({
        wallet,
        cost: item.cost,
        owned: inventoryRef.current[item.id] ?? 0,
        maxStack: item.maxStack,
        inBattle,
      });
      if (!purchase) return;
      liveWalletRef.current = purchase.nextWallet;
      inventoryRef.current = {
        ...inventoryRef.current,
        [item.id]: purchase.nextOwned,
      };
      void Promise.resolve(onDeductDoka(item.cost)).then((ok) => {
        if (ok === false) {
          if (
            shouldRollbackFailedShopSpend({
              liveDoka: liveWalletRef.current,
              expectedDoka: purchase.nextWallet,
            })
          ) {
            liveWalletRef.current += item.cost;
          }
          inventoryRef.current = {
            ...inventoryRef.current,
            [item.id]: Math.max(0, purchase.nextOwned - 1),
          };
          return;
        }
        setInventory((prev) => ({
          ...prev,
          [item.id]: (prev[item.id] ?? 0) + 1,
        }));
      });
    },
    [getLiveDoka, inBattle, onDeductDoka],
  );

  const handleUse = useCallback(
    (itemId: BuffItemType) => {
      if (!inBattle || !isPlayerTurn) return;
      const nextOwned = tryConsumeBuffItem(inventoryRef.current[itemId] ?? 0);
      if (nextOwned == null) return;
      inventoryRef.current = {
        ...inventoryRef.current,
        [itemId]: nextOwned,
      };
      onUseItem(itemId);
      setInventory((prev) => ({
        ...prev,
        [itemId]: nextOwned,
      }));
    },
    [inBattle, isPlayerTurn, onUseItem],
  );

  const totalItems = BUFF_ITEMS.reduce(
    (acc, it) => acc + (inventory[it.id] ?? 0),
    0,
  );

  // Modal: omitted isOpen is false. Do not default this to true — an always-on
  // overlay would cover the world map. GameFlow owns the open flag and must
  // pass it into WorldExploration so persist + item-use stay on that host.
  if (!isBuffShopOpen(isOpen)) return null;

  return (
    <div
      data-ocid="buff_shop.dialog"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose?.();
      }}
      aria-modal="true"
      aria-label="Item Shop"
    >
      <div
        className="stone-frame"
        style={{
          width: "min(520px, 94vw)",
          maxHeight: "min(80vh, 80dvh)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="stone-header flex items-center justify-between px-5 py-3 shrink-0">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚗️</span>
            <span className="stone-header-title" style={{ fontSize: 16 }}>
              Item Shop
            </span>
          </div>
          <button
            type="button"
            data-ocid="buff_shop.close_button"
            onClick={onClose}
            aria-label="Close shop"
            className="stone-btn-slate stone-modal-close"
            style={{
              width: 30,
              height: 30,
              padding: 0,
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          className="stone-well"
          style={{ overflowY: "auto", flex: 1, padding: 2 }}
        >
          {/* Doka balance */}
          <div className="stone-header" style={sectionStyle}>
            <span
              className="stone-pill stone-pill-gold"
              style={{
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
              }}
            >
              {liveDokaForShopSpend(
                getLiveDoka,
                liveWalletRef.current,
              ).toLocaleString()}{" "}
              Doka
              {inBattle && (
                <span style={{ color: "#e74c3c", fontSize: 9, marginLeft: 4 }}>
                  (buy outside battle)
                </span>
              )}
            </span>
          </div>

          {/* Tab switcher */}
          <div
            className="stone-well"
            style={{
              display: "flex",
              gap: 4,
              padding: "5px 8px",
            }}
          >
            <button
              type="button"
              data-ocid="buff_shop.shop_tab"
              className={
                activeTab === "shop" ? "stone-btn-crimson" : "stone-btn-slate"
              }
              style={tabButtonStyle(activeTab === "shop")}
              onClick={() => setActiveTab("shop")}
            >
              Shop
            </button>
            <button
              type="button"
              data-ocid="buff_shop.inventory_tab"
              className={
                activeTab === "inventory"
                  ? "stone-btn-crimson"
                  : "stone-btn-slate"
              }
              style={tabButtonStyle(activeTab === "inventory")}
              onClick={() => setActiveTab("inventory")}
            >
              Inventory
              {totalItems > 0 && (
                <span
                  className="stone-pill-crimson"
                  style={{ marginLeft: 4, fontSize: 9, padding: "0 4px" }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          {/* Shop tab */}
          {activeTab === "shop" && (
            <div
              style={{
                padding: "6px 8px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                maxHeight: 340,
                overflowY: "auto",
              }}
            >
              {BUFF_ITEMS.map((item) => {
                const owned = inventory[item.id] ?? 0;
                const canAfford =
                  shouldAllowShopSpend(
                    liveDokaForShopSpend(
                      getLiveDoka,
                      liveShopWallet(dokaBalance, getLiveDoka),
                    ),
                    item.cost,
                  ) && !inBattle;
                const atMax = owned >= item.maxStack;
                return (
                  <div
                    key={item.id}
                    data-ocid={`buff_shop.item.${item.id}`}
                    className="stone-well"
                    style={itemCardStyle}
                  >
                    {/* Count badge */}
                    {owned > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "#c0392b",
                          color: "#fff",
                          fontSize: 8,
                          fontWeight: 700,
                          borderRadius: 8,
                          padding: "0 4px",
                          lineHeight: "14px",
                        }}
                      >
                        ×{owned}
                      </span>
                    )}
                    <div
                      style={{
                        fontSize: 18,
                        lineHeight: 1,
                        textAlign: "center",
                      }}
                    >
                      {item.icon}
                    </div>
                    <div
                      style={{
                        color: "#e0c8a0",
                        fontSize: 9,
                        fontWeight: 700,
                        textAlign: "center",
                        lineHeight: 1.2,
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        color: "#887766",
                        fontSize: 8,
                        textAlign: "center",
                        lineHeight: 1.3,
                      }}
                    >
                      {item.description}
                    </div>
                    <div
                      style={{
                        color: "#f1c40f",
                        fontSize: 9,
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                    >
                      {item.cost} Doka
                    </div>
                    <button
                      type="button"
                      data-ocid={`buff_shop.buy_button.${item.id}`}
                      className={
                        canAfford && !atMax
                          ? "stone-btn-crimson"
                          : "stone-btn-slate"
                      }
                      style={buyBtnStyle(canAfford && !atMax)}
                      disabled={!canAfford || atMax}
                      onClick={() => handleBuy(item)}
                    >
                      {atMax ? "Max" : "Buy"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inventory tab */}
          {activeTab === "inventory" && (
            <div
              style={{
                padding: "6px 8px",
                maxHeight: 340,
                overflowY: "auto",
              }}
            >
              {BUFF_ITEMS.filter((it) => (inventory[it.id] ?? 0) > 0).length ===
              0 ? (
                <div
                  data-ocid="buff_shop.empty_state"
                  style={{
                    color: "#556677",
                    fontSize: 10,
                    textAlign: "center",
                    padding: "18px 0",
                  }}
                >
                  No items in inventory.
                  <br />
                  Buy items in the Shop tab.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                  }}
                >
                  {BUFF_ITEMS.filter((it) => (inventory[it.id] ?? 0) > 0).map(
                    (item) => {
                      const count = inventory[item.id] ?? 0;
                      const canUse = inBattle && isPlayerTurn && count > 0;
                      return (
                        <div
                          key={item.id}
                          data-ocid={`buff_shop.inv_item.${item.id}`}
                          className="stone-well"
                          style={{
                            ...itemCardStyle,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 18, flexShrink: 0 }}>
                            {item.icon}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                color: "#e0c8a0",
                                fontSize: 9,
                                fontWeight: 700,
                                lineHeight: 1.2,
                              }}
                            >
                              {item.name}
                              <span
                                style={{
                                  color: "#c0392b",
                                  marginLeft: 4,
                                  fontWeight: 800,
                                }}
                              >
                                ×{count}
                              </span>
                            </div>
                            <div
                              style={{
                                color: "#887766",
                                fontSize: 8,
                                lineHeight: 1.3,
                                marginTop: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.description}
                            </div>
                          </div>
                          <button
                            type="button"
                            data-ocid={`buff_shop.use_button.${item.id}`}
                            className={
                              canUse ? "stone-btn-crimson" : "stone-btn-slate"
                            }
                            style={{
                              ...getBtnStyle(canUse),
                              width: 38,
                              flexShrink: 0,
                              marginTop: 0,
                            }}
                            disabled={!canUse}
                            onClick={() => handleUse(item.id)}
                            title={
                              !inBattle
                                ? "Only usable in battle"
                                : !isPlayerTurn
                                  ? "Wait for your turn"
                                  : "Use item"
                            }
                          >
                            Use
                          </button>
                        </div>
                      );
                    },
                  )}
                </div>
              )}

              {/* In-battle hint */}
              {!inBattle && (
                <p
                  style={{
                    color: "#556677",
                    fontSize: 8,
                    textAlign: "center",
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  Items can only be used during your battle turn.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuffShop;
