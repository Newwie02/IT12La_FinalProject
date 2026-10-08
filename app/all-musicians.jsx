import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMusicians, resolveUrl } from "../api";

// GigMatch — All musicians
// Route: app/all-musicians.jsx  →  "/all-musicians"
// Opened from the "See all" link in "Fellow musician" on the musician dashboard.
// Loads every real musician from the backend (GET /api/users/musicians).

export default function AllMusicians() {
  const router = useRouter();

  const [musicians, setMusicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  const loadMusicians = useCallback(async () => {
    try {
      setError(null);
      const data = await getMusicians();
      setMusicians(data);
    } catch (err) {
      setError(err.message || "Couldn't load musicians. Is the server running?");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadMusicians().finally(() => setLoading(false));
  }, [loadMusicians]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMusicians();
    setRefreshing(false);
  };

  const openProfile = (person) => {
    router.push({
      pathname: "/musician-profile",
      params: { id: String(person.id), name: person.name, tags: person.role },
    });
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? musicians.filter((m) => (m.name || "").toLowerCase().includes(q))
    : musicians;

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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

        <Text style={styles.title}>All musicians</Text>
        <Text style={styles.subtitle}>
          {loading ? "Loading..." : `${musicians.length} musician${musicians.length === 1 ? "" : "s"} on GigMatch`}
        </Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name"
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 30 }} />
        ) : error ? (
          <View style={styles.messageCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
            <Text style={styles.messageText}>{error}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.messageCard}>
            <Ionicons name="people-outline" size={28} color={PURPLE} />
            <Text style={styles.messageText}>
              {q ? "No musicians match your search." : "No other musicians yet."}
            </Text>
          </View>
        ) : (
          filtered.map((person) => {
            const photo = resolveUrl(person.photoUrl);
            return (
              <View key={person.id} style={styles.personRow}>
                <View style={styles.personAvatar}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.personAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={20} color="rgba(124,58,237,0.6)" />
                  )}
                </View>
                <View style={styles.personText}>
                  <Text style={styles.personName}>{person.name}</Text>
                  <Text style={styles.personMeta}>{person.role}</Text>
                </View>
                <Pressable onPress={() => openProfile(person)} style={styles.viewProfileButton}>
                  <Text style={styles.viewProfileText}>View Profile</Text>
                </Pressable>
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

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", padding: 0 },

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

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 12,
    marginBottom: 10,
  },
  personAvatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: "rgba(124,58,237,0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  personAvatarImage: { width: "100%", height: "100%" },
  personText: { flex: 1 },
  personName: { color: "#111827", fontSize: 13, fontWeight: "700" },
  personMeta: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  viewProfileButton: {
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewProfileText: { color: PURPLE, fontSize: 11, fontWeight: "700" },
});