import { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AdminShell, { adminStyles as s, StatusPill } from "../../components/admin/AdminShell";
import { getAdminDisputes, updateAdminDispute, resolveUrl } from "../../api";

// GigMatch — dispute / report handling.
// Route: app/admin/disputes  →  "/admin/disputes"
//
// Both sides of a booking disagreement are shown side by side. The admin can
// keep private working notes, and record a decision — which closes the case
// and stamps who decided it and when.

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "under_review", label: "Under review" },
  { key: "resolved", label: "Resolved" },
  { key: "", label: "All" },
];

export default function AdminDisputes() {
  const [filter, setFilter] = useState("open");
  const [disputes, setDisputes] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [expanded, setExpanded] = useState(null); // id of the open card
  const [draft, setDraft] = useState({ notes: "", decision: "" });

  const load = useCallback(async () => {
    setError(null);
    try {
      setDisputes(await getAdminDisputes(filter ? { status: filter } : {}));
    } catch (err) {
      setError(err.message || "Couldn't load disputes.");
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openCard = (d) => {
    setExpanded(d.id);
    setDraft({ notes: d.notes || "", decision: "" });
  };

  const saveNotes = async (d) => {
    setBusyId(d.id);
    try {
      const updated = await updateAdminDispute(d.id, { notes: draft.notes });
      setDisputes((prev) => (prev || []).map((x) => (x.id === d.id ? { ...x, ...updated } : x)));
    } catch (err) {
      Alert.alert("Couldn't save", err.message || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const startReview = async (d) => {
    setBusyId(d.id);
    try {
      const updated = await updateAdminDispute(d.id, { status: "under_review" });
      setDisputes((prev) => (prev || []).map((x) => (x.id === d.id ? { ...x, ...updated } : x)));
    } catch (err) {
      Alert.alert("Couldn't save", err.message || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const recordDecision = async (d) => {
    if (!draft.decision.trim()) {
      Alert.alert("Decision needed", "Write the outcome before closing this dispute.");
      return;
    }
    const ok = await confirmAsync(
      "Record this decision? It closes the dispute and notifies both sides."
    );
    if (!ok) return;

    setBusyId(d.id);
    try {
      const updated = await updateAdminDispute(d.id, {
        decision: draft.decision.trim(),
        notes: draft.notes,
      });
      setDisputes((prev) => (prev || []).map((x) => (x.id === d.id ? { ...x, ...updated } : x)));
      setExpanded(null);
    } catch (err) {
      Alert.alert("Couldn't save", err.message || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell
      title="Dispute resolution"
      subtitle="Read both sides, keep notes, and record a decision."
    >
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

      {disputes === null ? (
        <Loading />
      ) : disputes.length === 0 ? (
        <View style={s.card}>
          <Text style={s.emptyText}>
            {filter === "open" ? "No open disputes. 🎉" : "No disputes in this view."}
          </Text>
        </View>
      ) : (
        disputes.map((d) => (
          <DisputeCard
            key={d.id}
            dispute={d}
            expanded={expanded === d.id}
            busy={busyId === d.id}
            draft={draft}
            onExpand={() => openCard(d)}
            onNotes={(text) => setDraft((p) => ({ ...p, notes: text }))}
            onDecision={(text) => setDraft((p) => ({ ...p, decision: text }))}
            onSaveNotes={() => saveNotes(d)}
            onStartReview={() => startReview(d)}
            onRecordDecision={() => recordDecision(d)}
          />
        ))
      )}
    </AdminShell>
  );
}

// ------------------------------------------------------------------ bits

function DisputeCard({
  dispute: d,
  expanded,
  busy,
  draft,
  onExpand,
  onNotes,
  onDecision,
  onSaveNotes,
  onStartReview,
  onRecordDecision,
}) {
  const resolved = d.status === "resolved";

  return (
    <View style={s.card}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reason}>{d.reason}</Text>
          <Text style={s.muted}>Opened {fmtDate(d.createdAt)}</Text>
        </View>
        <StatusPill
          label={d.status.replace("_", " ")}
          tone={resolved ? "good" : d.status === "under_review" ? "info" : "warn"}
        />
      </View>

      {d.details ? <Text style={styles.details}>{d.details}</Text> : null}

      {/* Both sides of the disagreement */}
      <View style={styles.parties}>
        <Party label="Complainant" user={d.complainant} />
        <View style={styles.partyDivider} />
        <Party label="Respondent" user={d.respondent} />
      </View>

      {resolved ? (
        <View style={styles.decisionBox}>
          <Text style={styles.decisionLabel}>Decision</Text>
          <Text style={styles.decisionText}>{d.decision || "—"}</Text>
          <Text style={[s.muted, { marginTop: 6 }]}>
            {d.decidedAt ? `Decided ${fmtDate(d.decidedAt)}` : ""}
          </Text>
          {d.notes ? (
            <>
              <Text style={[styles.decisionLabel, { marginTop: 12 }]}>Notes</Text>
              <Text style={styles.decisionText}>{d.notes}</Text>
            </>
          ) : null}
        </View>
      ) : !expanded ? (
        <Pressable onPress={onExpand}>
          <LinearGradient
            colors={["#8b5cf6", "#d946ef"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.openButton}
          >
            <Text style={styles.buttonText}>Review this dispute</Text>
          </LinearGradient>
        </Pressable>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Private notes (only admins see these)</Text>
          <TextInput
            style={styles.textarea}
            placeholder="What you've gathered so far…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={draft.notes}
            onChangeText={onNotes}
            multiline
          />

          <Text style={styles.fieldLabel}>Decision (shared with both sides)</Text>
          <TextInput
            style={styles.textarea}
            placeholder="The outcome and any action taken…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={draft.decision}
            onChangeText={onDecision}
            multiline
          />

          <View style={styles.actionRow}>
            <Pressable onPress={onSaveNotes} disabled={busy} style={{ flex: 1 }}>
              <View style={styles.ghostButton}>
                <Text style={styles.buttonText}>Save notes</Text>
              </View>
            </Pressable>
            {d.status === "open" ? (
              <Pressable onPress={onStartReview} disabled={busy} style={{ flex: 1 }}>
                <View style={styles.ghostButton}>
                  <Text style={styles.buttonText}>Take into review</Text>
                </View>
              </Pressable>
            ) : null}
            <Pressable onPress={onRecordDecision} disabled={busy} style={{ flex: 1.2 }}>
              <LinearGradient
                colors={["#8b5cf6", "#d946ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.resolveButton, busy && { opacity: 0.6 }]}
              >
                <Text style={styles.buttonText}>{busy ? "Saving…" : "Record decision"}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function Party({ label, user }) {
  const photo = user ? resolveUrl(user.photoUrl) : null;
  return (
    <View style={styles.party}>
      <Text style={styles.partyLabel}>{label}</Text>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.partyAvatar} />
      ) : (
        <View style={[styles.partyAvatar, styles.partyAvatarFallback]}>
          <Text style={styles.partyLetter}>{(user?.name || "?").charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.partyName} numberOfLines={1}>
        {user?.name || "Unknown"}
      </Text>
      <Text style={s.muted} numberOfLines={1}>
        {user?.email || ""}
      </Text>
      {user?.role ? <StatusPill label={user.role} tone="info" /> : null}
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
      { text: "Record it", style: "destructive", onPress: () => resolve(true) },
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
  reason: { color: "#fff", fontSize: 15, fontWeight: "600" },
  details: { color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 19, marginTop: 8 },

  parties: {
    flexDirection: "row",
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 12,
  },
  party: { flex: 1, alignItems: "center", gap: 4 },
  partyDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  partyLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "600" },
  partyAvatar: { height: 44, width: 44, borderRadius: 22, marginTop: 2 },
  partyAvatarFallback: {
    backgroundColor: "rgba(139,92,246,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  partyLetter: { color: "#fff", fontSize: 16, fontWeight: "700" },
  partyName: { color: "#fff", fontSize: 13, fontWeight: "600" },

  fieldLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 6,
  },
  textarea: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 13,
    padding: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },

  decisionBox: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "rgba(52,211,153,0.1)",
    padding: 12,
  },
  decisionLabel: { color: "#6ee7b7", fontSize: 11, fontWeight: "600", marginBottom: 4 },
  decisionText: { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 19 },

  openButton: { borderRadius: 12, paddingVertical: 11, alignItems: "center", marginTop: 14 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  ghostButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  resolveButton: { borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
