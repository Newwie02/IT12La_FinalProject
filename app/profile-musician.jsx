import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";

// GigMatch — Musician profile/account screen (placeholder settings hub)
// Route: app/profile-musician.jsx  →  "/profile-musician"

export default function ProfileMusician() {
  const router = useRouter();
  const { fullName, instruments, genres, bandName } = useLocalSearchParams();
  const name = fullName?.trim() ? fullName.trim() : "Musician";

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color="#7c3aed" />
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.subtitle}>Musician</Text>
        </View>

        <Pressable
          style={styles.rowButton}
          onPress={() =>
            router.push({
              pathname: "/create-band",
              params: { fullName, instruments, genres },
            })
          }
        >
          <Ionicons name="people-outline" size={18} color="#7c3aed" />
          <Text style={styles.rowButtonText}>Create or manage a band</Text>
        </Pressable>

        <Pressable style={styles.rowButton} onPress={() => router.replace("/")}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={[styles.rowButtonText, { color: "#ef4444" }]}>Log out</Text>
        </Pressable>
      </ScrollView>
      <BottomNav
        homeRoute={bandName ? "/dashboard-band" : "/dashboard-musician"}
        profileRoute="/profile-musician"
        params={{ fullName, instruments, genres, bandName }}
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
  card: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  name: { color: "#111827", fontSize: 16, fontWeight: "700" },
  subtitle: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  rowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 14,
    marginBottom: 10,
  },
  rowButtonText: { color: "#111827", fontSize: 13, fontWeight: "600" },
});