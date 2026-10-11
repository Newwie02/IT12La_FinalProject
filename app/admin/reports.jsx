import { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AdminShell, { adminStyles as s, StatusPill } from "../../components/admin/AdminShell";
import { getAdminReports, resolveAdminReport } from "../../api";

// GigMatch — content moderation.
// Route: app/admin/reports  →  "/admin/reports"
//
// Every report a member has filed, newest first. The admin can take it into
// review, then resolve it (with a note) or dismiss it as unfounded.

const FILTERS = [
  { key: "", label: "All" },
  { key: "open", label: "Open" },
  { key: "reviewing", label: "Reviewing" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
];

const TARGET_LABELS = {
  user: "Account",
  profile: "Profile",
  gig: "Gig post",
  review: "Review",
  message: "Message",
  media: "Portfolio media",
};

export default function AdminReports() {
  const [filter, setFilter] = useState("open");
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [noteFor, setNoteFor] = useState(null); // { id, text }

  const load = useCallback(async () => {
    setError(null);
    try {
      setReports(await getAdminReports(filter ? { status: filter } : {}));
    } catch (err) {
      setError(err.message || "Couldn't load reports.");
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const update = async (id, body) => {
    setBusyId(id);
    try {
      const updated = await resolveAdminReport(id, body);
      setReports((prev) =>
        (prev || []).map((r) => (r.id === id ? { ...r, ...updated } : r))
      );
      // Drop it from the list if the filter no longer matches.
      if (filter && updated.status !== filter) {
        setReports((prev) => (prev || []).filter((r) => r.id !== id));
      }
    } catch (err) {
      Alert.alert("Couldn't save", err.message || "Something went wrong.");
    } finally {
      setBusyId(null);
      setNoteFor(null);
    }
  };

  const takeIntoReview = (r) => update(r.id, { status: "reviewing" });
  const dismiss = (r) =>
    confirmAsync("Dismiss this report as unfounded?").then((ok) => {
      if (ok) update(r.id, { status: "dismissed", resolution: "Dismissed — no action needed." });
    });
  const resolveWithNote = (r) => {
    const text = (noteFor && noteFor.id === r.id ? noteFor.text : "").trim();
    if (!text) {
      Alert.alert("Add a note", "Describe what you did about this report before resolving it.");
      return;
    }
    update(r.id, { status: "resolved", resolution: text });
  };

  return (
    <AdminShell
      title="Content moderation"
      subtitle="Review reported members, profiles, gig posts, and messages."
    >
      {/* Status filter */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key || "all"}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {reports === null ? (
        <Loading />
      ) : reports.length === 0 ? (
        <View style={s.card}>
          <Text style={s.emptyText}>
            {filter === "open" ? "Nothing flagged. The queue is clear. 🎉" : "No reports in this view."}
          </Text>
        </View>
      ) : (
        reports.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            busy={busyId === r.id}
            note={noteFor && noteFor.id === r.id ? noteFor.text : ""}
            onNote={(text) => setNoteFor({ id: r.id, text })}
            onReview={() => takeIntoReview(r)}
            onDismiss={() => dismiss(r)}
            onResolve={() => resolveWithNote(r)}
          />
        ))
      )}
    </AdminShell>
  );
}

// ------------------------------------------------------------------ bits

function ReportCard({ report, busy, note, onNote, onReview, onDismiss, onResolve }) {
  const r = report;
  const isOpen = r.status === "open";
  const inReview = r.status === "reviewing";
  const closed = r.status === "resolved" || r.status === "dismissed";
  const owner = r.targetOwner;

  const tone =
    r.status === "open" ? "warn" : r.status === "reviewing" ? "info" : r.status === "resolved" ? "good" : "neutral";

  return (
    <View style={s.card}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {TARGET_LABELS[r.targetType] || r.targetType} reported
          </Text>
          <Text style={s.muted}>
            by {r.reporter?.name || "a member"} · {fmtDate(r.createdAt)}
          </Text>
        </View>
        <StatusPill label={r.status} tone={tone} />
      </View>

      <Text style={styles.reason}>{r.reason}</Text>
      {r.details ? <Text style={styles.details}>{r.details}</Text> : null}

      {/* The account behind the reported content, if we could resolve it. */}
      {owner ? (
        <View style={styles.ownerRow}>
          <Text style={styles.ownerLabel}>Account:</Text>
          <Text style={styles.ownerName}>{owner.name}</Text>
          <StatusPill label={owner.accountStatus} tone={owner.accountStatus === "active" ? "good" : "warn"} />
          {owner.verified ? <StatusPill label="✓" tone="good" /> : null}
        </View>
      ) : null}

      {closed && r.resolution ? (
        <View style={styles.resolution}>
          <Text style={styles.resolutionLabel}>Resolution</Text>
          <Text style={styles.resolutionText}>{r.resolution}</Text>
        </View>
      ) : null}

      {/* Actions change with how far the report has progressed. */}
      {closed ? (
        <Text style={[s.muted, { marginTop: 10 }]}>
          Closed {r.resolvedAt ? fmtDate(r.resolvedAt) : ""}.
        </Text>
      ) : (
        <>
          <TextInput
            style={styles.note}
            placeholder="What did you do about this? (needed to resolve)"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={note}
            onChangeText={onNote}
            multiline
          />
          <View style={styles.actionRow}>
            {isOpen ? (
              <Pressable onPress={onReview} disabled={busy} style={{ flex: 1 }}>
                <View style={styles.ghostButton}>
                  <Text style={styles.ghostText}>Take into review</Text>
                </View>
              </Pressable>
            ) : null}
            <Pressable onPress={onDismiss} disabled={busy} style={{ flex: 1 }}>
              <View style={[styles.ghostButton, styles.dismissButton]}>
                <Text style={styles.ghostText}>Dismiss</Text>
              </View>
            </Pressable>
            <Pressable onPress={onResolve} disabled={busy} style={{ flex: 1 }}>
              <LinearGradient
                colors={["#8b5cf6", "#d946ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.resolveButton, busy && { opacity: 0.6 }]}
              >
                <Text style={styles.ghostText}>{busy ? "Saving…" : "Resolve"}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}
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
      { text: "Yes", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipActive: {
    borderColor: "rgba(167,139,250,0.6)",
    backgroundColor: "rgba(139,92,246,0.25)",
  },
  chipText: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  headRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  title: { color: "#fff", fontSize: 14, fontWeight: "600" },
  reason: { color: "#fcd34d", fontSize: 13, marginTop: 10, fontWeight: "500" },
  details: { color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 19, marginTop: 4 },

  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  ownerLabel: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  ownerName: { color: "#fff", fontSize: 13, fontWeight: "600" },

  resolution: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "rgba(52,211,153,0.1)",
    padding: 10,
  },
  resolutionLabel: { color: "#6ee7b7", fontSize: 11, fontWeight: "600", marginBottom: 3 },
  resolutionText: { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 18 },

  note: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 13,
    padding: 10,
    marginTop: 12,
    minHeight: 44,
  },

  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  ghostButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 11,
    alignItems: "center",
  },
  dismissButton: { borderColor: "rgba(248,113,113,0.4)" },
  resolveButton: { borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  ghostText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
