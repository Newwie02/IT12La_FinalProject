import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getReceivedApplications, respondToApplication, resolveUrl } from "../api";

// GigMatch — Band applications (for the band leader)
// Route: app/band-applications.jsx  →  "/band-applications"
// Shows musicians who applied to your band. Accept or reject each one.

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((s) => s.trim());
  return [];
}

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
];

export default function BandApplications() {
  const router = useRouter();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("pending");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getReceivedApplications();
      setApplications(data);
    } catch (err) {
      setError(err.message || "Couldn't load applications.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const answer = async (application, status) => {
    setBusyId(application.id);
    try {
      await respondToApplication(application.id, status);
      setApplications((prev) =>
        prev.map((a) => (a.id === application.id ? { ...a, status } : a))
      );
    } catch (err) {
      Alert.alert("Couldn't update", err.message || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmAnswer = (application, status) => {
    const who = application.applicant?.name?.trim() || application.applicant?.stageName || "this musician";
    Alert.alert(
      status === "accepted" ? "Accept application?" : "Reject application?",
      status === "accepted"
        ? `${who} will be told they were accepted.`
        : `${who} will be told they were rejected.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: status === "accepted" ? "Accept" : "Reject",
          style: status === "rejected" ? "destructive" : "default",
          onPress: () => answer(application, status),
        },
      ]
    );
  };

  const openProfile = (applicant) => {
    if (!applicant?.id) return;
    router.push({
      pathname: "/musician-profile",
      params: { id: String(applicant.id), name: applicant.name, tags: "musician" },
    });
  };

  const counts = {
    pending: applications.filter((a) => a.status === "pending").length,
    accepted: applications.filter((a) => a.status === "accepted").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };
  const visible = applications.filter((a) => a.status === tab);

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
        }
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
        </View>

        <Text style={styles.title}>Band applications</Text>
        <Text style={styles.subtitle}>
          Musicians who want to join — plus the invitations you've sent.
        </Text>

        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t.label} ({counts[t.key]})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 30 }} />
        ) : error ? (
          <View style={styles.messageCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
            <Text style={styles.messageText}>{error}</Text>
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.messageCard}>
            <Ionicons name="mail-open-outline" size={28} color={PURPLE} />
            <Text style={styles.messageText}>
              {tab === "pending"
                ? "No pending applications right now."
                : tab === "accepted"
                ? "You haven't accepted anyone yet."
                : "No rejected applications."}
            </Text>
          </View>
        ) : (
          visible.map((app) => {
            const applicant = app.applicant;
            const name = applicant?.name?.trim() || applicant?.stageName || "Musician";
            const photo = resolveUrl(applicant?.photoUrl);
            const instruments = toList(applicant?.instruments);
            const busy = busyId === app.id;
            // A pending row I created myself (Hire from a profile) — I can't
            // answer it; only the musician can, so show "awaiting reply".
            const sentInvite = app.status === "pending" && app.invitedBy === "band";

            return (
              <View key={app.id} style={styles.card}>
                <Pressable onPress={() => openProfile(applicant)} style={styles.cardTop}>
                  <View style={styles.avatar}>
                    {photo ? (
                      <Image source={{ uri: photo }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="person" size={22} color="rgba(124,58,237,0.6)" />
                    )}
                  </View>
                  <View style={styles.cardTopText}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.meta}>
                      {instruments.length > 0 ? instruments.join(", ") : "No instruments listed"}
                      {applicant?.barangay ? ` · ${applicant.barangay}` : ""}
                    </Text>
                    {app.band?.name ? (
                      <Text style={styles.forBand}>
                        {sentInvite ? `Invited to join ${app.band.name}` : `Applying to ${app.band.name}`}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </Pressable>

                {app.message ? <Text style={styles.message}>“{app.message}”</Text> : null}

                {app.status === "pending" ? (
                  sentInvite ? (
                    <View style={styles.awaitingRow}>
                      <Ionicons name="time-outline" size={14} color="#b45309" />
                      <Text style={styles.awaitingText}>Invitation sent · awaiting reply</Text>
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <Pressable
                        disabled={busy}
                        onPress={() => confirmAnswer(app, "rejected")}
                        style={[styles.actionButton, styles.rejectButton]}
                      >
                        <Text style={styles.rejectText}>{busy ? "..." : "Reject"}</Text>
                      </Pressable>
                      <Pressable
                        disabled={busy}
                        onPress={() => confirmAnswer(app, "accepted")}
                        style={[styles.actionButton, styles.acceptButton]}
                      >
                        <Text style={styles.acceptText}>{busy ? "..." : "Accept"}</Text>
                      </Pressable>
                    </View>
                  )
                ) : (
                  <View
                    style={[
                      styles.badge,
                      app.status === "accepted" ? styles.badgeAccepted : styles.badgeRejected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        app.status === "accepted" ? styles.badgeAcceptedText : styles.badgeRejectedText,
                      ]}
                    >
                      {app.status === "accepted" ? "Accepted" : "Rejected"}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const PURPLE = "#7c3aed";

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  blob: { position: "absolute", borderRadius: 9999, opacity: 0.25 },
  blobViolet: { top: -60, left: -60, height: 220, width: 220, backgroundColor: "#c4b5fd" },
  blobPink: { top: 240, right: -80, height: 220, width: 220, backgroundColor: "#f5d0fe" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 40 },

  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  backButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },

  title: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#6b7280", fontSize: 13, marginBottom: 16 },

  tabRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.08)",
  },
  tabActive: { backgroundColor: PURPLE },
  tabText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#fff" },

  messageCard: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  messageText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },

  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 14,
    marginBottom: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: "rgba(124,58,237,0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  cardTopText: { flex: 1 },
  name: { color: "#111827", fontSize: 14, fontWeight: "700" },
  meta: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  forBand: { color: PURPLE, fontSize: 11, fontWeight: "600", marginTop: 3 },

  message: { color: "#4b5563", fontSize: 13, lineHeight: 19, marginTop: 12 },

  awaitingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  awaitingText: { color: "#b45309", fontSize: 12, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionButton: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  rejectButton: { borderWidth: 1, borderColor: "rgba(220,38,38,0.35)", backgroundColor: "rgba(220,38,38,0.06)" },
  rejectText: { color: "#dc2626", fontSize: 13, fontWeight: "700" },
  acceptButton: { backgroundColor: PURPLE },
  acceptText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 12 },
  badgeAccepted: { backgroundColor: "rgba(34,197,94,0.12)" },
  badgeRejected: { backgroundColor: "rgba(220,38,38,0.1)" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeAcceptedText: { color: "#16a34a" },
  badgeRejectedText: { color: "#dc2626" },
});