import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useFocusEffect } from "expo-router";
import AdminShell, { adminStyles as s } from "../../components/admin/AdminShell";
import { getAdminAudit } from "../../api";

// GigMatch — audit log.
// Route: app/admin/audit  →  "/admin/audit"
//
// A read-only, newest-first trail of every administrator action. Each row
// shows who did what to which record, plus the stored detail blob when there
// is one. Nothing here can be edited — that's the point of an audit log.

// Turns "verification.approve" into something readable.
const ACTION_LABELS = {
  "verification.approve": { text: "Approved a verification", tone: "good" },
  "verification.reject": { text: "Rejected a verification", tone: "warn" },
  "user.badge.grant": { text: "Granted the verified badge", tone: "good" },
  "user.badge.revoke": { text: "Removed the verified badge", tone: "warn" },
  "user.status.active": { text: "Restored an account", tone: "good" },
  "user.status.warned": { text: "Warned an account", tone: "warn" },
  "user.status.suspended": { text: "Suspended an account", tone: "warn" },
  "user.status.banned": { text: "Banned an account", tone: "bad" },
  "gig.booking.cancel.warn":
    { text: "Warned an account for cancelling a booking", tone: "warn" },
  "booking.cancelled": { text: "Cancelled a confirmed booking", tone: "warn" },
  "report.open": { text: "Reopened a report", tone: "info" },
  "report.reviewing": { text: "Took a report into review", tone: "info" },
  "report.resolved": { text: "Resolved a report", tone: "good" },
  "report.dismissed": { text: "Dismissed a report", tone: "neutral" },
  "dispute.update": { text: "Updated a dispute", tone: "info" },
};

export default function AdminAudit() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await getAdminAudit(150));
    } catch (err) {
      setError(err.message || "Couldn't load the audit log.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <AdminShell title="Audit log" subtitle="Every administrator action, newest first.">
      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {rows === null ? (
        <View style={{ alignItems: "center", padding: 40 }}>
          <ActivityIndicator color="#a78bfa" size="large" />
        </View>
      ) : rows.length === 0 ? (
        <View style={s.card}>
          <Text style={s.emptyText}>
            No administrator actions recorded yet. Actions appear here as soon as
            someone verifies, moderates, or resolves something.
          </Text>
        </View>
      ) : (
        <View style={s.card}>
          {rows.map((row, i) => (
            <AuditRow key={row.id} row={row} last={i === rows.length - 1} />
          ))}
        </View>
      )}

      <Pressable onPress={load}>
        <View style={styles.refresh}>
          <Text style={styles.refreshText}>Refresh</Text>
        </View>
      </Pressable>
    </AdminShell>
  );
}

// ------------------------------------------------------------------ bits

function AuditRow({ row, last }) {
  const meta = ACTION_LABELS[row.action];
  const label = meta?.text || humanize(row.action);
  const tone = meta?.tone || "neutral";

  // details is stored as a JSON string; show it only if it parsed to
  // something worth reading. Entries the platform wrote itself (a member
  // cancelling a confirmed booking, say) are flagged `automatic` — there is
  // no staff member behind those, so don't blame the account that was
  // actioned by printing its name as the actor.
  const { automatic, text: detail } = parseDetails(row.details);

  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <View style={[styles.dot, dotColor(tone)]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.action}>{label}</Text>
        <Text style={s.muted}>
          {automatic ? "System (automatic)" : row.admin?.name || "Unknown admin"} ·{" "}
          {fmtStamp(row.createdAt)}
        </Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

function humanize(action) {
  return String(action || "")
    .split(".")
    .join(" → ")
    .replace(/_/g, " ");
}

// "{ from: false, to: true, automatic: true }" -> { text: "from: false  ·  to: true",
// automatic: true }. The flag is peeled off so it doesn't clutter the detail
// line — it already changed who we show as the actor.
function parseDetails(raw) {
  if (!raw) return { automatic: false, text: null };
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return { automatic: false, text: null };
    const parts = Object.entries(obj)
      .filter(([k, v]) => k !== "automatic" && v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${k}: ${String(v)}`);
    return { automatic: !!obj.automatic, text: parts.length ? parts.join("  ·  ") : null };
  } catch {
    // Not JSON — show the raw text if it's short enough to be useful.
    return { automatic: false, text: raw.length <= 120 ? raw : null };
  }
}

function dotColor(tone) {
  const colors = {
    good: "rgba(52,211,153,0.9)",
    warn: "rgba(251,191,36,0.9)",
    bad: "rgba(248,113,113,0.9)",
    info: "rgba(167,139,250,0.9)",
    neutral: "rgba(255,255,255,0.35)",
  };
  return { backgroundColor: colors[tone] || colors.neutral };
}

function fmtStamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  dot: { height: 8, width: 8, borderRadius: 4, marginTop: 6 },
  action: { color: "#fff", fontSize: 13, fontWeight: "600" },
  detail: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  refresh: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 11,
    alignItems: "center",
  },
  refreshText: { color: "#d8b4fe", fontSize: 13, fontWeight: "600" },
});
