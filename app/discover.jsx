import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";

// GigMatch — Discover screen (placeholder browse/search destination)
// Route: app/discover.jsx  →  "/discover"

export default function Discover() {
  const { fullName, instruments, genres, bandName, bandPhotoUri } = useLocalSearchParams();

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.placeholderCard}>
          <Ionicons name="compass-outline" size={28} color="#7c3aed" />
          <Text style={styles.placeholderText}>
            Search and browse bands, musicians, and events here once this is wired up.
          </Text>
        </View>
      </ScrollView>
      <BottomNav
        homeRoute={bandName ? "/dashboard-band" : "/dashboard-musician"}
        profileRoute="/profile-musician"
        params={{ fullName, instruments, genres, bandName, bandPhotoUri }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  blob: { position: "absolute", borderRadius: 9999, opacity: 0.25 },
  blobViolet: { top: -60, left: -60, height: 220, width: 220, backgroundColor: "#c4b5fd" },
  blobPink: { top: 200, right: -80, height: 220, width: 220, backgroundColor: "#f5d0fe" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
  title: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 20 },
  placeholderCard: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  placeholderText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },
});