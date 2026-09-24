import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// GigMatch — Gig posting detail screen (reached from dashboard-band's
// "Gig Posting" cards). Route: app/gig-detail.jsx  →  "/gig-detail"

export default function GigDetail() {
  const router = useRouter();
  const { posterName, tags, location, price, description } = useLocalSearchParams();

  return (
    <View style={styles.page}>
      <View style={styles.blob} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>

        <Text style={styles.title}>{posterName ?? "Gig posting"}</Text>
        <Text style={styles.meta}>
          {location ?? ""} · {price ?? ""}
        </Text>
        <Text style={styles.tags}>{tags ?? ""}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Details</Text>
          <Text style={styles.cardBody}>
            {description ?? "No description provided."}
          </Text>
        </View>

        <Pressable
          style={styles.applyButton}
          onPress={() =>
            router.push({ pathname: "/messages", params: { with: posterName ?? "Client" } })
          }
        >
          <Text style={styles.applyButtonText}>Message about this gig</Text>
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
  title: { color: "#111827", fontSize: 20, fontWeight: "700" },
  meta: { color: "#6b7280", fontSize: 13, marginTop: 4 },
  tags: { color: "#9ca3af", fontSize: 12, marginTop: 2, marginBottom: 20 },
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
  applyButton: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});