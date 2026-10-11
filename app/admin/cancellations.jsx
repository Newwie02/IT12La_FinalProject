import { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useFocusEffect } from "expo-router";
import AdminShell, { adminStyles as s, StatusPill } from "../../components/admin/AdminShell";
import { getAdminCancellations, setAdminUserStatus, resolveUrl } from "../../api";

// GigMatch — booking cancellations, for staff review.
// Route: app/admin/cancellations  →  "/admin/cancellations"
//
// A confirmed booking is a commitment on both sides: the client was counting
// on a band for their event, the band was counting on the work. When someone
// walks away the platform records it here and warns them automatically.
//
// This list is a REVIEW QUEUE, not a verdict. Staff look through it —
// especially for the same account appearing more than once — and escalate
// with the ordinary moderation actions (warn / suspend / ban). Escalating
// goes through PATCH /users/:id/status, so it is audited, notified to the
// member with a date+time stamp, and enforced by the participation gate
// exactly like a moderation action taken from the Users screen.

// Escalating order. The account's current status is filtered out, so the
// buttons always offer the next step rather than repeating the current one.
const STATUS_ACTIONS = [
  { status: "warned", label: "Warn", tone: "warn" },
  { status: "suspended", label: "Suspend 7d", tone: "warn" },
  { status: "banned", label: "Ban", tone: "bad" },
  { status: "active", label: "Restore", tone: "good" },
];

export default function AdminCancellations() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await getAdminCancellations(200));
    } catch (err) {
      setError(err.message || "Couldn't load booking cancellations.");
    }
  }, []);

  // Refetch on every focus so an action taken here shows up immediately.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const changeStatus = async (row, status) => {
    const who = row.user?.name || "this account";

    if (status === "banned" || status === "suspended") {
      const ok = await confirmAsync(
        status === "banned"
          ? `Ban ${who}? They will no longer be able to sign in.`
          : `Suspend ${who} for 7 days?`
      );
      if (!ok) return;
    }

    setBusyId(row.user.id);
    try {
      const res = await setAdminUserStatus(row.user.id, {
        status,
        reason:
          status === "active"
            ? null
            : `${status === "warned" ? "Warning" : "Account " + status} issued after ` +
              `reviewing the cancellation of "${row.gigTitle}"`,
        days: status === "suspended" ? 7 : undefined,
      });
      setRows((prev) =>
        (prev || []).map((r) =>
          r.user.id === row.user.id
            ? { ...r, user: { ...r.user, ...res } }
            : r
        )
      );
    } catch (err) {
      Alert.alert("Couldn't save", err.message || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell
      title="Cancellations"
      subtitle="Confirmed bookings someone walked away from, newest first. Warn, suspend or ban repeat offenders."
    >
      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <View style={s.card}>
          <Text style={s.emptyText}>
            No confirmed bookings have been cancelled yet. An entry appears
            here as soon as a client cancels a booked gig or a band backs out
            of one.
          </Text>
        </View>
      ) : (
        <>
          <Text style={s.sectionTitle}>
            {rows.length} cancellation{rows.length === 1 ? "" : "s"} on record
          </Text>
          {rows.map((row) => (
            <CancelCard
              key={row.id}
              row={row}
              busy={busyId === row.user.id}
              onStatus={(status) => changeStatus(row, status)}
            />
          ))}
        </>
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

function CancelCard({ row, busy, onStatus }) {
  const u = row.user || {};
  const photo = resolveUrl(u.photoUrl);
  const statusTone =
    u.accountStatus === "banned"
      ? "bad"
      : u.accountStatus === "suspended" || u.accountStatus === "warned"
        ? "warn"
        : "good";

  const when = fmtStamp(row.at);

  return (
    <View style={s.card}>
      {/* Who walked away */}
      <View style={styles.head}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatarSm} />
        ) : (
          <View style={[styles.avatarSm, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{(u.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{u.name || "Unknown member"}</Text>
          {u.email ? <Text style={s.muted}>{u.email}</Text> : null}
          <View style={styles.pillRow}>
            {/* The account's own role can't say which side backed out — a band
                leader's role is still "musician". `side` is recorded at the
                moment of cancellation and is the reliable answer. */}
            <StatusPill
              label={row.side === "band" ? "Band backed out" : "Client cancelled"}
              tone={row.side === "band" ? "info" : "neutral"}
            />
            {u.role ? <StatusPill label={u.role} tone="info" /> : null}
            {u.accountStatus ? (
              <StatusPill label={u.accountStatus} tone={statusTone} />
            ) : null}
          </View>
        </View>
      </View>

      {/* Which gig, and why */}
      <Text style={styles.gig}>
        {row.gigTitle ? `“${row.gigTitle}”` : "Unknown gig"}
      </Text>
      <Text style={s.muted}>{when}</Text>

      {row.reason ? (
        <Text style={styles.reason}>Reason given: {row.reason}</Text>
      ) : (
        <Text style={[styles.reason, { fontStyle: "italic" }]}>
          No reason was given.
        </Text>
      )}

      {/* What the platform already did about it */}
      <Text style={styles.autoNote}>
        {row.autoWarned
          ? "An automatic warning was added when this was recorded."
          : "No automatic warning — a heavier penalty already applied to this account."}
      </Text>

      {u.accountStatus === "suspended" && u.suspendedUntil ? (
        <Text style={styles.suspendNote}>
          Suspended until {new Date(u.suspendedUntil).toLocaleString()}
        </Text>
      ) : null}

      {/* Staff escalation */}
      <View style={styles.actionRow}>
        {STATUS_ACTIONS.filter((a) => a.status !== u.accountStatus).map((a) => (
          <Pressable
            key={a.status}
            onPress={() => onStatus(a.status)}
            disabled={busy || u.role === "admin"}
            style={{ flex: 1 }}
          >
            <View style={[styles.modAction, a.tone === "bad" && styles.modActionBad]}>
              <Text style={[styles.modActionText, a.tone === "bad" && { color: "#fca5a5" }]}>
                {a.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Loading() {
  return (
    <View style={{ alignItems: "center", padding: 40 }}>
      <ActivityIndicator color="#a78bfa" size="large" />
    </View>
  );
}

function confirmAsync(message) {
  return new Promise((resolve) => {
    Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Yes, proceed", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

function fmtStamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 10 },
  avatarSm: { height: 42, width: 42, borderRadius: 21 },
  avatarFallback: {
    backgroundColor: "rgba(139,92,246,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontSize: 16, fontWeight: "700" },
  name: { color: "#fff", fontSize: 14.5, fontWeight: "700" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },

  gig: { color: "rgba(255,255,255,0.9)", fontSize: 13.5, fontWeight: "600" },
  reason: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 6,
  },
  autoNote: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 8,
  },
  suspendNote: { color: "#fcd34d", fontSize: 11.5, marginTop: 6 },

  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  modAction: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    backgroundColor: "rgba(251,191,36,0.1)",
    paddingVertical: 9,
    alignItems: "center",
  },
  modActionBad: {
    borderColor: "rgba(248,113,113,0.4)",
    backgroundColor: "rgba(248,113,113,0.1)",
  },
  modActionText: { color: "#fcd34d", fontSize: 12, fontWeight: "600" },

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
