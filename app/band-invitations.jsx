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
import { getMyInvitations, respondToApplication, resolveUrl } from "../api";

// GigMatch — Band invitations (for the musician)
// Route: app/band-invitations.jsx  →  "/band-invitations"
// Band leaders hired YOU: accept to join their band, or decline.
// The row comes from GET /applications/invites (invitedBy = "band").

const PURPLE = "#7c3aed";

function inviteDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BandInvitations() {
  const router = useRouter();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getMyInvitations();
      setInvitations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Couldn't load invitations.");
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

  const answer = async (invite, status) => {
    setBusyId(invite.id);
    try {
      await respondToApplication(invite.id, status);
      if (status === "accepted") {
        const bandName = invite.band?.name ?? "the band";
        setInvitations((prev) =>
          prev.map((i) => (i.id === invite.id ? { ...i, status } : i))
        );
        Alert.alert(`You joined ${bandName}!`, "You're now a member of the band.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        setInvitations((prev) =>
          prev.map((i) => (i.id === invite.id ? { ...i, status } : i))
        );
      }
    } catch (err) {
      Alert.alert("Couldn't update", err.message || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmAnswer = (invite, status) => {
    const bandName = invite.band?.name ?? "this band";
    Alert.alert(
      status === "accepted" ? `Join ${bandName}?` : `Decline ${bandName}?`,
      status === "accepted"
        ? `You'll become a member of ${bandName}. You can leave anytime from your dashboard.`
        : `${bandName} will be told you declined. You can't be invited twice unless they send a new one.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: status === "accepted" ? "Join band" : "Decline",
          style: status === "rejected" ? "destructive" : "default",
          onPress: () => answer(invite, status),
        },
      ]
    );
  };

  const pending = invitations.filter((i) => i.status === "pending");
  const decided = invitations.filter((i) => i.status !== "pending");

  const renderInvite = (invite) => {
    const band = invite.band;
    const photo = resolveUrl(band?.photoUrl);
    const busy = busyId === invite.id;
    const bandName = band?.name ?? "A band";
    const leaderName = invite.leader?.name;

    return (
      <View key={invite.id} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="musical-notes" size={22} color="rgba(124,58,237,0.6)" />
            )}
          </View>
          <View style={styles.cardTopText}>
            <Text style={styles.name}>{bandName}</Text>
            <Text style={styles.meta}>
              {leaderName ? `${leaderName} · ` : ""}
              {band?.location ? `${band.location} · ` : ""}
              {inviteDate(invite.updatedAt || invite.createdAt)}
            </Text>
          </View>
        </View>

        {invite.message ? <Text style={styles.message}>“{invite.message}”</Text> : null}

        {invite.status === "pending" ? (
          <View style={styles.actionRow}>
            {band?.id ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/band-profile",
                    params: { id: String(band.id), name: band.name },
                  })
                }
                style={[styles.actionButton, styles.viewButton]}
              >
                <Text style={styles.viewText}>View profile</Text>
              </Pressable>
            ) : null}
            <Pressable
              disabled={busy}
              onPress={() => confirmAnswer(invite, "rejected")}
              style={[styles.actionButton, styles.rejectButton]}
            >
              <Text style={styles.rejectText}>{busy ? "..." : "Decline"}</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={() => confirmAnswer(invite, "accepted")}
              style={[styles.actionButton, styles.acceptButton]}
            >
              <Text style={styles.acceptText}>{busy ? "..." : "Accept"}</Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.badge,
              invite.status === "accepted" ? styles.badgeAccepted : styles.badgeRejected,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                invite.status === "accepted" ? styles.badgeAcceptedText : styles.badgeRejectedText,
              ]}
            >
              {invite.status === "accepted" ? "Joined" : "Declined"}
            </Text>
          </View>
        )}
      </View>
    );
  };

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

        <Text style={styles.title}>Band invitations</Text>
        <Text style={styles.subtitle}>Bands that invited you to join. Accept or decline.</Text>

        {loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 30 }} />
        ) : error ? (
          <View style={styles.messageCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
            <Text style={styles.messageText}>{error}</Text>
          </View>
        ) : invitations.length === 0 ? (
          <View style={styles.messageCard}>
            <Ionicons name="mail-open-outline" size={28} color={PURPLE} />
            <Text style={styles.messageText}>
              No invitations yet. When a band leader hires you from your profile, the invitation
              shows up here.
            </Text>
          </View>
        ) : (
          <>
            {pending.map(renderInvite)}
            {decided.length > 0 ? (
              <>
                <Text style={styles.historyLabel}>Answered</Text>
                {decided.map(renderInvite)}
              </>
            ) : null}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

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
  historyLabel: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 10,
  },

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

  message: { color: "#4b5563", fontSize: 13, lineHeight: 19, marginTop: 12 },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionButton: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  viewButton: {
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.35)",
    backgroundColor: "rgba(124,58,237,0.06)",
  },
  viewText: { color: PURPLE, fontSize: 13, fontWeight: "700" },
  rejectButton: {
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.35)",
    backgroundColor: "rgba(220,38,38,0.06)",
  },
  rejectText: { color: "#dc2626", fontSize: 13, fontWeight: "700" },
  acceptButton: { backgroundColor: PURPLE },
  acceptText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
  },
  badgeAccepted: { backgroundColor: "rgba(34,197,94,0.12)" },
  badgeRejected: { backgroundColor: "rgba(220,38,38,0.1)" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeAcceptedText: { color: "#16a34a" },
  badgeRejectedText: { color: "#dc2626" },
});
