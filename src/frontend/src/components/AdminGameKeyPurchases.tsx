import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { readAdminCmdResult } from "../utils/adminContract";
import { validateDokaGrant } from "../utils/adminSafety";
import {
  type GameKeyRequestView,
  gameKeyApproveConfirmBody,
  gameKeyEmailedConfirmBody,
  gameKeyMailtoHref,
  gameKeyRejectConfirmBody,
  hintedEurosLabel,
  playerGameKeyStatusCopy,
  readGameKeyCmdResult,
  readGameKeyRequestList,
  resolveAdminApproveDokaAmount,
  suggestedDokaFromEuroCents,
} from "../utils/dokaGameKey";

const C = {
  bg0: "#13161f",
  bg1: "#1d2230",
  gold: "#f0c44a",
  goldDim: "#5c4a1f",
  red: "#d8463f",
  blue: "#86c4ff",
  green: "#56d18a",
  dim: "#8a8090",
  dimmer: "#5a5060",
} as const;

type ActorAny = Record<string, unknown>;

function asActor(actor: unknown): ActorAny | null {
  return actor && typeof actor === "object" ? (actor as ActorAny) : null;
}

const inputStyle: React.CSSProperties = {
  background: "linear-gradient(180deg,#13141c,#0e0f16)",
  border: "1px solid rgba(192,57,43,0.27)",
  borderRadius: 8,
  color: "#c0ccd8",
  padding: "7px 10px",
  fontSize: 12,
  outline: "none",
  fontFamily: "'Saira', system-ui, sans-serif",
  minHeight: 44,
};

function PurchaseConfirm({
  title,
  body,
  confirmLabel,
  ocidPrefix,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
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
        zIndex: 410,
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
          maxWidth: 440,
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
          <button
            type="button"
            data-ocid={`${ocidPrefix}.cancel_button`}
            onClick={onCancel}
            style={{
              minHeight: 44,
              padding: "8px 14px",
              background: "transparent",
              border: `1px solid ${C.goldDim}`,
              color: C.dim,
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-ocid={`${ocidPrefix}.confirm_button`}
            onClick={onConfirm}
            style={{
              minHeight: 44,
              padding: "8px 14px",
              background: "linear-gradient(135deg,#6a0a0a,#c0392b)",
              border: "1px solid #c0392b",
              color: "#fff",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const AdminGameKeyPurchases: React.FC = () => {
  const { actor: rawActor } = useActor();
  const actor = asActor(rawActor);
  const [rows, setRows] = useState<GameKeyRequestView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "redeemed" | "rejected"
  >("all");
  const [dokaDraft, setDokaDraft] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<{
    id: string;
    email: string;
    code: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    | null
    | { kind: "approve"; rec: GameKeyRequestView; amount: number }
    | { kind: "reject"; rec: GameKeyRequestView }
    | { kind: "emailed"; id: string }
  >(null);

  const load = useCallback(async () => {
    const list = actor?.adminListGameKeyRequests;
    if (typeof list !== "function") {
      setError("GameKey admin methods are not available on this actor");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRows(readGameKeyRequestList(await list()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((rec) => {
    if (statusFilter !== "all" && rec.status !== statusFilter) return false;
    const n = query.trim().toLowerCase();
    if (!n) return true;
    return [rec.id, rec.email, rec.userPrincipal, rec.status].some((p) =>
      p.toLowerCase().includes(n),
    );
  });

  const approve = async (rec: GameKeyRequestView) => {
    const parsed = resolveAdminApproveDokaAmount(dokaDraft[rec.id]);
    if ("err" in parsed) {
      toast.error(parsed.err);
      return;
    }
    const amount = parsed.ok;
    const fn = actor?.adminApproveGameKeyPurchase;
    if (typeof fn !== "function") {
      toast.error("Approve is not available");
      return;
    }
    setBusyId(rec.id);
    try {
      const cmd = readGameKeyCmdResult(
        await fn(rec.id, BigInt(amount)),
        "adminApproveGameKeyPurchase",
      );
      if ("err" in cmd) {
        toast.error(cmd.err);
        return;
      }
      setReveal({ id: rec.id, email: rec.email, code: cmd.ok });
      toast.success("GameKey generated. Copy it, then mark emailed.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (rec: GameKeyRequestView) => {
    const fn = actor?.adminRejectGameKeyPurchase;
    if (typeof fn !== "function") {
      toast.error("Reject is not available");
      return;
    }
    setBusyId(rec.id);
    try {
      const parsed = readAdminCmdResult(
        await fn(rec.id),
        "adminRejectGameKeyPurchase",
      );
      if ("err" in parsed) {
        toast.error(parsed.err);
        return;
      }
      toast.success("Request rejected");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const showReveal = async (rec: GameKeyRequestView) => {
    const fn = actor?.adminGetGameKeyReveal;
    if (typeof fn !== "function") {
      toast.error("Reveal is not available");
      return;
    }
    setBusyId(rec.id);
    try {
      const parsed = readGameKeyCmdResult(
        await fn(rec.id),
        "adminGetGameKeyReveal",
      );
      if ("err" in parsed) {
        toast.error(parsed.err);
        return;
      }
      setReveal({ id: rec.id, email: rec.email, code: parsed.ok });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const markEmailed = async (id: string) => {
    const fn = actor?.adminMarkGameKeyEmailed;
    if (typeof fn !== "function") {
      toast.error("Mark emailed is not available");
      return;
    }
    setBusyId(id);
    try {
      const parsed = readAdminCmdResult(
        await fn(id),
        "adminMarkGameKeyEmailed",
      );
      if ("err" in parsed) {
        toast.error(parsed.err);
        return;
      }
      toast.success("Reveal wiped. Code will not be shown again.");
      setReveal(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("GameKey copied");
    } catch {
      toast.error("Could not copy GameKey");
    }
  };

  return (
    <div data-ocid="admin.purchases_tab" style={{ padding: 20 }}>
      {error && (
        <div
          style={{
            background: `${C.red}22`,
            border: `1px solid ${C.red}55`,
            color: "#e0d6c8",
            padding: "10px 12px",
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 12,
          }}
        >
          {error}{" "}
          <button
            type="button"
            onClick={() => void load()}
            style={{
              marginLeft: 8,
              background: "transparent",
              color: C.gold,
              border: `1px solid ${C.goldDim}`,
              borderRadius: 6,
              minHeight: 36,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 8,
          flexWrap: "wrap",
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
            Incoming GameKey requests
          </h3>
          <p
            style={{
              color: "#8a8090",
              fontSize: 11,
              margin: "4px 0 0",
            }}
          >
            Confirm Mollie payment, type the Doka amount (1000 / 10€), then
            Approve. The player hint is a claim only — it is never the grant.
            The canister cannot send email — copy the code or use mailto, then
            mark emailed.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter email, principal, id…"
            data-ocid="admin.purchases.search_input"
            aria-label="Filter purchase requests"
            style={{ ...inputStyle, maxWidth: 260, margin: 0 }}
          />
          <select
            aria-label="Purchase status"
            data-ocid="admin.purchases.status_filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as
                  | "all"
                  | "pending"
                  | "approved"
                  | "redeemed"
                  | "rejected",
              )
            }
            style={{ ...inputStyle, width: "auto", margin: 0 }}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="redeemed">Redeemed</option>
            <option value="rejected">Rejected</option>
          </select>
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
            {filtered.length}/{rows.length}
          </div>
        </div>
      </div>

      {loading && (
        <div
          data-ocid="admin.purchases.loading_state"
          style={{ textAlign: "center", padding: 40, color: "#8a8090" }}
        >
          Loading purchase requests…
        </div>
      )}

      {!loading && rows.length === 0 && (
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
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            No GameKey requests yet
          </div>
          <div style={{ fontSize: 11 }}>
            Player submissions from Buy Doka appear here
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && filtered.length === 0 && (
        <div
          data-ocid="admin.purchases.no_match"
          style={{
            textAlign: "center",
            padding: "24px 0",
            color: "#6a6070",
            fontSize: 12,
          }}
        >
          No records match the current filter.
        </div>
      )}

      {filtered.length > 0 && (
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
                  "Player",
                  "Email",
                  "Hint €",
                  "Doka",
                  "Status",
                  "When",
                  "Actions",
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
              {filtered.map((rec, i) => {
                const suggested = suggestedDokaFromEuroCents(
                  rec.hintedEuroCents,
                );
                return (
                  <tr
                    key={rec.id}
                    data-ocid={`admin.purchases.item.${i + 1}`}
                    style={{
                      borderBottom: `1px solid ${C.goldDim}22`,
                      background: i % 2 === 0 ? C.bg0 : C.bg1,
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 10px",
                        color: "#c0ccd8",
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={rec.userPrincipal}
                    >
                      {rec.userPrincipal || "—"}
                    </td>
                    <td style={{ padding: "8px 10px", color: C.dim }}>
                      {rec.email || "—"}
                    </td>
                    <td style={{ padding: "8px 10px", color: "#c0ccd8" }}>
                      {hintedEurosLabel(rec.hintedEuroCents)}
                      {suggested > 0 ? (
                        <div style={{ color: C.dim, fontSize: 10 }}>
                          player claim ≈ {suggested.toLocaleString()} Doka
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {rec.status === "pending" ? (
                        <input
                          aria-label={`Doka amount for ${rec.id}`}
                          data-ocid={`admin.purchases.doka_input.${i + 1}`}
                          type="number"
                          min={1}
                          placeholder="Mollie Doka"
                          value={dokaDraft[rec.id] ?? ""}
                          onChange={(e) =>
                            setDokaDraft((p) => ({
                              ...p,
                              [rec.id]: e.target.value,
                            }))
                          }
                          style={{ ...inputStyle, width: 110, minHeight: 40 }}
                        />
                      ) : (
                        <span style={{ color: C.gold, fontWeight: 700 }}>
                          {rec.dokaAmount > 0
                            ? `${rec.dokaAmount.toLocaleString()} 💰`
                            : "—"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          color:
                            rec.status === "approved" ||
                            rec.status === "redeemed"
                              ? C.green
                              : rec.status === "rejected"
                                ? C.red
                                : C.gold,
                          fontWeight: 700,
                          fontSize: 10,
                        }}
                      >
                        {playerGameKeyStatusCopy(rec.status)}
                        {rec.emailed ? " · emailed" : ""}
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
                        ? new Date(rec.timestamp).toLocaleString("en-GB", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <div
                        style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                      >
                        {rec.status === "pending" && (
                          <>
                            <button
                              type="button"
                              data-ocid={`admin.purchases.approve_button.${i + 1}`}
                              disabled={busyId === rec.id}
                              onClick={() => {
                                const parsed = resolveAdminApproveDokaAmount(
                                  dokaDraft[rec.id],
                                );
                                if ("err" in parsed) {
                                  toast.error(parsed.err);
                                  return;
                                }
                                const grantErr = validateDokaGrant(parsed.ok);
                                if (grantErr) {
                                  toast.error(grantErr);
                                  return;
                                }
                                setConfirm({
                                  kind: "approve",
                                  rec,
                                  amount: parsed.ok,
                                });
                              }}
                              style={{
                                minHeight: 36,
                                padding: "6px 10px",
                                background: `${C.green}22`,
                                border: `1px solid ${C.green}55`,
                                color: C.green,
                                borderRadius: 6,
                                cursor: "pointer",
                                fontWeight: 700,
                                fontSize: 11,
                              }}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              data-ocid={`admin.purchases.reject_button.${i + 1}`}
                              disabled={busyId === rec.id}
                              onClick={() =>
                                setConfirm({ kind: "reject", rec })
                              }
                              style={{
                                minHeight: 36,
                                padding: "6px 10px",
                                background: `${C.red}22`,
                                border: `1px solid ${C.red}55`,
                                color: C.red,
                                borderRadius: 6,
                                cursor: "pointer",
                                fontWeight: 700,
                                fontSize: 11,
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {rec.status === "approved" && !rec.emailed && (
                          <button
                            type="button"
                            data-ocid={`admin.purchases.reveal_button.${i + 1}`}
                            disabled={busyId === rec.id}
                            onClick={() => void showReveal(rec)}
                            style={{
                              minHeight: 36,
                              padding: "6px 10px",
                              background: `${C.blue}22`,
                              border: `1px solid ${C.blue}55`,
                              color: C.blue,
                              borderRadius: 6,
                              cursor: "pointer",
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          >
                            Show code
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reveal && (
        <div
          data-ocid="admin.purchases.reveal_dialog"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            zIndex: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#141726",
              border: `1px solid ${C.goldDim}`,
              borderRadius: 12,
              padding: 20,
              width: "min(560px, 96vw)",
            }}
          >
            <h4 style={{ color: C.gold, margin: "0 0 8px" }}>
              GameKey (shown until marked emailed)
            </h4>
            <p style={{ color: C.dim, fontSize: 11, margin: "0 0 10px" }}>
              The canister cannot send email. Copy the code or open mailto, then
              mark emailed so it is wiped from admin view.
            </p>
            <textarea
              readOnly
              value={reveal.code}
              aria-label="Generated GameKey"
              style={{
                ...inputStyle,
                width: "100%",
                minHeight: 88,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 12,
              }}
            >
              <button
                type="button"
                data-ocid="admin.purchases.copy_code_button"
                onClick={() => void copyCode(reveal.code)}
                style={{
                  minHeight: 44,
                  padding: "8px 14px",
                  background: "linear-gradient(135deg,#6a0a0a,#c0392b)",
                  border: "1px solid #c0392b",
                  color: "#fff",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Copy code
              </button>
              <a
                href={gameKeyMailtoHref(reveal.email, reveal.code)}
                data-ocid="admin.purchases.mailto_link"
                style={{
                  minHeight: 44,
                  padding: "8px 14px",
                  display: "inline-flex",
                  alignItems: "center",
                  background: `${C.blue}22`,
                  border: `1px solid ${C.blue}55`,
                  color: C.blue,
                  borderRadius: 6,
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Open mailto
              </a>
              <button
                type="button"
                data-ocid="admin.purchases.mark_emailed_button"
                onClick={() => setConfirm({ kind: "emailed", id: reveal.id })}
                style={{
                  minHeight: 44,
                  padding: "8px 14px",
                  background: `${C.green}22`,
                  border: `1px solid ${C.green}55`,
                  color: C.green,
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Mark emailed
              </button>
              <button
                type="button"
                onClick={() => setReveal(null)}
                style={{
                  minHeight: 44,
                  padding: "8px 14px",
                  background: "transparent",
                  border: `1px solid ${C.goldDim}`,
                  color: C.dim,
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm?.kind === "approve" && (
        <PurchaseConfirm
          title={`Approve ${confirm.amount.toLocaleString()} Doka?`}
          body={gameKeyApproveConfirmBody(confirm.amount, confirm.rec.email)}
          confirmLabel="Approve GameKey"
          ocidPrefix="admin.purchases.approve"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const rec = confirm.rec;
            setConfirm(null);
            void approve(rec);
          }}
        />
      )}
      {confirm?.kind === "reject" && (
        <PurchaseConfirm
          title={`Reject ${confirm.rec.email || confirm.rec.id}?`}
          body={gameKeyRejectConfirmBody()}
          confirmLabel="Reject request"
          ocidPrefix="admin.purchases.reject"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const rec = confirm.rec;
            setConfirm(null);
            void reject(rec);
          }}
        />
      )}
      {confirm?.kind === "emailed" && (
        <PurchaseConfirm
          title="Wipe GameKey from admin view?"
          body={gameKeyEmailedConfirmBody()}
          confirmLabel="Mark emailed"
          ocidPrefix="admin.purchases.mark_emailed"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const id = confirm.id;
            setConfirm(null);
            void markEmailed(id);
          }}
        />
      )}
    </div>
  );
};

export default AdminGameKeyPurchases;
