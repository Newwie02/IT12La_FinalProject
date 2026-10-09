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
import { getBandMembers, removeBandMember, resolveUrl } from "../api";

// GigMatch — Band members (for the band leader)
// Route: app/band-members.jsx  →  "/band-members"
// Opened by tapping "Member" on the band dashboard.
// Shows the leader and every accepted musician with their instruments.
// The leader can remove a member; the musician gets a notification.

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((s) => s.trim());
  return [];
}

function Avatar({ user }) {
  const photo = resolveUrl(user?.photoUrl);
  return (
    <View style={styles.avatar}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.avatarImage} />
      ) : (
        <Ionicons name="person" size={22} color="rgba(124,58,237,0.6)" />
      )}
    </View>
  );
}

export default function BandMembers() {
  const router = useRouter();

  const [data, setData] = useState(null); // { band, leader, members }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await getBandMembers();
      setData(result);
    } catch (err) {
      setError(err.message || "Couldn't load your band members.");
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

  const openProfile = (user) => {
    if (!user?.id) return;
    router.push({
      pathname: "/musician-profile",
      params: { id: String(user.id), name: user.name, tags: "musician" },
    });
  };

  const kick = async (member) => {
    setBusyId(member.applicationId);
    try {
      await removeBandMember(member.applicationId);
      setData((prev) =>
        prev
          ? { ...prev, members: prev.members.filter((m) => m.applicationId !== member.applicationId) }
          : prev
      );
    } catch (err) {
      Alert.alert("Couldn't remove member", err.message || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmKick = (member) => {
    const name = member.user?.name?.trim() || member.user?.stageName || "this musician";
    Alert.alert(
      `Remove ${name}?`,
      "They will be removed from your band and notified by the app.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => kick(member) },
      ]
    );
  };

    const members = data?.members ?? [];
  const isLeader = data?.isLeader !== false;
  const leader = data?.leader;

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

        <Text style={styles.title}>Band members</Text>
        <Text style={styles.subtitle}>
          {data?.band?.name ? `${data.band.name} · ` : ""}
          {loading ? "Loading..." : `${members.length + 1} member${members.length === 0 ? "" : "s"} including you`}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 30 }} />
        ) : error ? (
          <View style={styles.messageCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
            <Text style={styles.messageText}>{error}</Text>
          </View>
        ) : (
          <>
            {/* Leader (you) */}
            {leader ? (
              <View style={styles.card}>
                <Avatar user={leader} />
                <View style={styles.cardText}>
                  <Text style={styles.name}>{leader.name?.trim() || leader.stageName}</Text>
                  <Text style={styles.meta}>
                    {toList(leader.instruments).join(", ") || "No instruments listed"}
                  </Text>
                </View>
                <View style={styles.leaderBadge}>
                  <Text style={styles.leaderBadgeText}>Leader</Text>
                </View>
              </View>
            ) : null}

            {members.length === 0 ? (
              <View style={styles.messageCard}>
                <Ionicons name="people-outline" size={28} color={PURPLE} />
                <Text style={styles.messageText}>
                  No members yet. Musicians you accept will appear here.
                </Text>
              </View>
            ) : (
              members.map((member) => {
                const user = member.user;
                const name = user?.name?.trim() || user?.stageName || "Musician";
                const instruments = toList(user?.instruments);
                const busy = busyId === member.applicationId;
                return (
                  <View key={member.applicationId} style={styles.card}>
                    <Pressable onPress={() => openProfile(user)} style={styles.cardMain}>
                      <Avatar user={user} />
                      <View style={styles.cardText}>
                        <Text style={styles.name}>{name}</Text>
                        <Text style={styles.meta}>
                          {instruments.length > 0 ? instruments.join(", ") : "No instruments listed"}
                          {user?.barangay ? ` · ${user.barangay}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                                       {isLeader ? (
                      <Pressable
                        disabled={busy}
                        onPress={() => confirmKick(member)}
                        style={styles.kickButton}
                      >
                        <Text style={styles.kickText}>{busy ? "..." : "Remove"}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })
            )}
          </>
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
  subtitle: { color: "#6b7280", fontSize: 13, marginBottom: 18 },

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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 12,
    marginBottom: 10,
  },
  cardMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  cardText: { flex: 1 },
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
  name: { color: "#111827", fontSize: 14, fontWeight: "700" },
  meta: { color: "#6b7280", fontSize: 12, marginTop: 2 },

  leaderBadge: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  leaderBadgeText: { color: "#16a34a", fontSize: 11, fontWeight: "700" },

  kickButton: {
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.35)",
    backgroundColor: "rgba(220,38,38,0.06)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  kickText: { color: "#dc2626", fontSize: 11, fontWeight: "700" },
});