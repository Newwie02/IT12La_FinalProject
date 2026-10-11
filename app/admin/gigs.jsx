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
import { getAdminGigs, moderateAdminGig } from "../../api";

// GigMatch — gig post moderation.
// Route: app/admin/gigs  →  "/admin/gigs"
//
// New gig posts start "pending" and are invisible to Discover until a member
// of staff approves them. Rejected posts never appear; the poster is told why
// (see server/controllers/adminController.js → moderateGig), which matters
// because from their side a rejected gig would otherwise just silently vanish.
//
// The default view is the pending queue, since that's the only thing that
// actually needs a decision.

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "", label: "All" },
];

export default function AdminGigs() {
  const [filter, setFilter] = useState("pending");
  const [gigs, setGigs] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [noteFor, setNoteFor] = useState(null); // { id, text }

  const load = useCallback(async () => {
    setError(null);
    try {
      setGigs(await getAdminGigs(filter ? { moderationStatus: filter } : {}));
    } catch (err) {
      setError(err.message || "Couldn't load gigs.");
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const decide = async (gig, decision, note) => {
    setBusyId(gig.id);
    try {
      const updated = await moderateAdminGig(gig.id, { decision, note });
      setGigs((prev) => (prev || []).map((g) => (g.id === gig.id ? { ...g, ...updated } : g)));
      // If this filter is a specific status, the gig no longer belongs here.
      if (filter && updated.moderationStatus !== filter) {
        setGigs((prev) => (prev || []).filter((g) => g.id !== gig.id));
      }
    } catch (err) {
      Alert.alert("Couldn't save", err.message || "Something went wrong.");
    } finally {
      setBusyId(null);
      setNoteFor(null);
    }
  };

  const approve = (gig) =>
    confirmAsync(`Publish "${gig.title}" to Discover?`).then((ok) => {
      if (ok) decide(gig, "approve");
    });

  // A rejection needs a reason — it's shown to the poster, and without one
  // they're left with no idea what to fix.
  const reject = (gig) => {
    const text = (noteFor && noteFor.id === gig.id ? noteFor.text : "").trim();
    if (!text) {
      Alert.alert("Add a reason", "Tell the poster why this gig can't be published.");
      return;
    }
    decide(gig, "reject", text);
  };

  return (
    <AdminShell
      title="Gig moderation"
      subtitle="New gig posts wait here before they appear in Discover."
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

      {gigs === null ? (
        <Loading />
      ) : gigs.length === 0 ? (
        <View style={s.card}>
          <Text style={s.emptyText}>
            {filter === "pending" ? "Nothing waiting for review. 🎉" : "No gigs in this view."}
          </Text>
        </View>
      ) : (
        gigs.map((g) => (
          <GigCard
            key={g.id}
            gig={g}
            busy={busyId === g.id}
            note={noteFor && noteFor.id === g.id ? noteFor.text : ""}
            onNote={(text) => setNoteFor({ id: g.id, text })}
            onApprove={() => approve(g)}
            onReject={() => reject(g)}
          />
        ))
      )}
    </AdminShell>
  );
}

// ------------------------------------------------------------------ bits

function GigCard({ gig, busy, note, onNote, onApprove, onReject }) {
  const g = gig;
  const pending = g.moderationStatus === "pending";
  const tone =
    g.moderationStatus === "pending" ? "warn" : g.moderationStatus === "approved" ? "good" : "bad";

  return (
    <View style={s.card}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{g.title}</Text>
          <Text style={s.muted}>
            by {g.postedBy?.name || "a member"} · {fmtDate(g.createdAt)}
          </Text>
        </View>
        <StatusPill label={g.moderationStatus} tone={tone} />
      </View>

      {g.description ? <Text style={styles.description}>{g.description}</Text> : null}

      <View style={styles.metaRow}>
        {g.location ? <Text style={styles.meta}>📍 {g.location}</Text> : null}
        {g.date ? <Text style={styles.meta}>📅 {fmtDate(g.date)}</Text> : null}
        {g.pay ? <Text style={styles.meta}>💵 {g.pay}</Text> : null}
      </View>

      {/* Already decided — show who signed off and what they said. */}
      {!pending ? (
        <View style={styles.decided}>
          <Text style={styles.decidedText}>
            {g.moderationStatus === "approved" ? "Published" : "Rejected"}
            {g.moderatedAt ? ` ${fmtDate(g.moderatedAt)}` : ""}.
          </Text>
          {g.moderationNote ? <Text style={styles.noteEcho}>“{g.moderationNote}”</Text> : null}
        </View>
      ) : (
        <>
          <TextInput
            style={styles.note}
            placeholder="Why can't this be published? (needed to reject)"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={note}
            onChangeText={onNote}
            multiline
          />
          <View style={styles.actionRow}>
            <Pressable onPress={onReject} disabled={busy} style={{ flex: 1 }}>
              <View style={styles.rejectButton}>
                <Text style={styles.ghostText}>Reject</Text>
              </View>
            </Pressable>
            <Pressable onPress={onApprove} disabled={busy} style={{ flex: 1 }}>
              <LinearGradient
                colors={["#8b5cf6", "#d946ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.approveButton, busy && { opacity: 0.6 }]}
              >
                <Text style={styles.ghostText}>{busy ? "Saving…" : "Approve"}</Text>
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
      { text: "Publish", style: "default", onPress: () => resolve(true) },
    ]);
  });
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
  description: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  meta: { color: "rgba(255,255,255,0.55)", fontSize: 12 },

  decided: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 10,
  },
  decidedText: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  noteEcho: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4, fontStyle: "italic" },

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
  rejectButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.4)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 11,
    alignItems: "center",
  },
  approveButton: { borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  ghostText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
