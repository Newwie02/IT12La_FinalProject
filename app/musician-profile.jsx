import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMusicianById } from "../api";

// GigMatch — Musician profile detail screen (reached by tapping "View Profile"
// on a fellow musician). Route: app/musician-profile.jsx  →  "/musician-profile"

function toList(value) {
  return value ? String(value).split(",").filter(Boolean) : [];
}

export default function MusicianProfile() {
  const router = useRouter();
  const {
    userId,
    name,
    fullName,
    instruments,
    genres,
    bandName,
    bandPhotoUri,
  } = useLocalSearchParams();

  const [musician, setMusician] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    getMusicianById(userId)
      .then(setMusician)
      .catch((e) => console.log("getMusicianById error:", e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const displayName = musician?.name ?? name ?? "Musician";
  const stageName = musician?.stageName?.trim();
  const headline = stageName ? `${displayName} (${stageName})` : displayName;
  const instrumentList = toList(musician?.instruments);
  const genreList = toList(musician?.genres);
  const showPhoto = musician?.photoUrl && !photoFailed;

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>

        <View style={styles.avatar}>
          {showPhoto ? (
            <Image
              source={{ uri: musician.photoUrl }}
              style={styles.avatarImage}
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <Ionicons name="person" size={32} color="#7c3aed" />
          )}
        </View>

        <Text style={styles.name}>{headline}</Text>

        {loading ? (
          <Text style={styles.loadingText}>Loading profile...</Text>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Bio</Text>
              <Text style={musician?.bio ? styles.cardBody : styles.notSet}>
                {musician?.bio || "No bio yet."}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Instrument</Text>
              <View style={styles.chipRow}>
                {instrumentList.length > 0 ? (
                  instrumentList.map((item) => (
                    <View key={item} style={styles.chipGreen}>
                      <Text style={styles.chipGreenText}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.notSet}>Not set</Text>
                )}
              </View>

              <Text style={[styles.cardLabel, styles.cardLabelGap]}>Genre</Text>
              <View style={styles.chipRow}>
                {genreList.length > 0 ? (
                  genreList.map((item) => (
                    <View key={item} style={styles.chip}>
                      <Text style={styles.chipText}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.notSet}>Not set</Text>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <InfoRow icon="location-outline" label="Barangay" value={musician?.barangay} />
              <InfoRow icon="call-outline" label="Phone number" value={musician?.phone} last />
            </View>
          </>
        )}

        <Pressable
          style={[styles.contactButton, !userId && styles.contactButtonDisabled]}
          disabled={!userId}
          onPress={() =>
            router.push({
              pathname: "/messages",
              params: {
                withId: userId,
                with: displayName,
                fullName,
                instruments,
                genres,
                bandName,
                bandPhotoUri,
              },
            })
          }
        >
          <Text style={styles.contactButtonText}>
            {userId ? "Message this musician" : "Can't message: missing user id"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Ionicons name={icon} size={18} color="#7c3aed" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={value ? styles.infoValue : styles.notSet}>{value || "Not set"}</Text>
    </View>
  );
}

const PURPLE = "#7c3aed";

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  blob: {
    position: "absolute",
    top: -60,
    left: -60,
    height: 220,
    width: 220,
    borderRadius: 9999,
    opacity: 0.25,
    backgroundColor: "#c4b5fd",
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
  backButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  avatar: {
    height: 88,
    width: 88,
    borderRadius: 44,
    backgroundColor: "rgba(124,58,237,0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 12,
  },
  avatarImage: { width: "100%", height: "100%" },
  name: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 16 },
  loadingText: { color: "#9ca3af", fontSize: 13, marginVertical: 20 },
  card: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 16,
    marginBottom: 14,
  },
  cardLabel: { color: "#111827", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  cardLabelGap: { marginTop: 16 },
  cardBody: { color: "#374151", fontSize: 13, lineHeight: 19 },
  notSet: { color: "#9ca3af", fontSize: 13 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  chipGreen: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipGreenText: { color: "#16a34a", fontSize: 12, fontWeight: "600" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  infoLabel: { flex: 1, color: "#6b7280", fontSize: 13 },
  infoValue: { color: "#111827", fontSize: 13, fontWeight: "600" },
  contactButton: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  contactButtonDisabled: { opacity: 0.5 },
  contactButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});