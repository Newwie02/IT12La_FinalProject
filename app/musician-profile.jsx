import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMusicianById, resolveUrl } from "../api";

// GigMatch — Another musician's profile
// Route: app/musician-profile.jsx  →  "/musician-profile"
// Opened with params: id, name, tags

// CHANGE THIS to the route of your chat screen (e.g. "/chat" or "/conversation")

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((s) => s.trim());
  return [];
}

export default function MusicianProfile() {
  const router = useRouter();
  const { id, name, tags } = useLocalSearchParams();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getMusicianById(id)
      .then((data) => {
        console.log("MUSICIAN PROFILE RESPONSE:", JSON.stringify(data));
        setUser(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const displayName = user?.stageName?.trim() || user?.name || name || "Musician";
  const instruments = toList(user?.instruments);
  const genres = toList(user?.genres);
  const photo = resolveUrl(user?.photoUrl);
  const showPhoto = photo && !photoFailed;

 const handleMessage = () => {
  router.push({
    pathname: "/messages",
    params: { withId: String(id), with: displayName },
  });
};

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              {showPhoto ? (
                <Image
                  source={{ uri: photo }}
                  style={styles.avatarImage}
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <Ionicons name="person" size={30} color="rgba(124,58,237,0.6)" />
              )}
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.subtitle}>
                {instruments[0] || tags || "Musician"}
                {user?.barangay ? ` · ${user.barangay}` : ""}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerAccent} />

        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 30 }} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              <Pressable onPress={handleMessage} style={styles.messageButton}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                <Text style={styles.messageButtonText}>Message</Text>
              </Pressable>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>About</Text>
                <Text style={styles.bodyText}>{user?.bio?.trim() || "No bio yet."}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Instruments</Text>
                <View style={styles.chipRow}>
                  {instruments.length === 0 ? (
                    <Text style={styles.bodyText}>Not set</Text>
                  ) : (
                    instruments.map((i) => (
                      <View key={i} style={styles.chipGreen}>
                        <Text style={styles.chipGreenText}>{i}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Genres</Text>
                <View style={styles.chipRow}>
                  {genres.length === 0 ? (
                    <Text style={styles.bodyText}>Not set</Text>
                  ) : (
                    genres.map((g) => (
                      <View key={g} style={styles.chip}>
                        <Text style={styles.chipText}>{g}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Contact</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#6b7280" />
                  <Text style={styles.bodyText}>{user?.barangay || "Barangay not set"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={16} color="#6b7280" />
                  <Text style={styles.bodyText}>{user?.phone || "Phone not set"}</Text>
                </View>
              </View>
            </>
          )}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const PURPLE = "#7c3aed";

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },

  header: { backgroundColor: PURPLE, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 24 },
  headerAccent: { height: 3, backgroundColor: "#60a5fa" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 },
  backText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    height: 76,
    width: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  identityText: { flex: 1 },
  name: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13 },

  body: { paddingHorizontal: 16, paddingTop: 18 },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center", marginTop: 30 },

  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PURPLE,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  messageButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: "#111827", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  bodyText: { color: "#4b5563", fontSize: 13, lineHeight: 19 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  chipGreen: { backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipGreenText: { color: "#16a34a", fontSize: 12, fontWeight: "600" },
});