import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// GigMatch — Band profile detail screen (reached by tapping a recommended
// band card). Route: app/band-profile.jsx  →  "/band-profile"

export default function BandProfile() {
  const router = useRouter();
  const { name, tags } = useLocalSearchParams();

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>

        <View style={styles.avatar}>
          <Ionicons name="people" size={32} color="#7c3aed" />
        </View>
        <Text style={styles.name}>{name ?? "Band"}</Text>
        <Text style={styles.tags}>{tags ?? ""}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>About</Text>
          <Text style={styles.cardBody}>
            This is a placeholder band profile — bio, past gigs, availability, and a
            booking button will go here once real band data is wired up.
          </Text>
        </View>

        <Pressable
          style={styles.contactButton}
          onPress={() =>
            router.push({ pathname: "/messages", params: { with: name ?? "Band" } })
          }
        >
          <Text style={styles.contactButtonText}>Message this band</Text>
        </Pressable>
      </ScrollView>
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
    height: 72,
    width: 72,
    borderRadius: 36,
    backgroundColor: "rgba(124,58,237,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  name: { color: "#111827", fontSize: 20, fontWeight: "700" },
  tags: { color: "#9ca3af", fontSize: 13, marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 16,
    marginBottom: 20,
  },
  cardLabel: { color: "#111827", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  cardBody: { color: "#6b7280", fontSize: 13, lineHeight: 19 },
  contactButton: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  contactButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});