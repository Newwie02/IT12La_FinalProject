import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// GigMatch — Create a band (placeholder, no backend)
// Route: app/create-band.jsx  →  "/create-band"
// Carries the current fullName/instruments/genres through so the
// dashboard doesn't lose that data when it navigates back. On submit,
// switches the dashboard into "band mode" with the entered band name.

export default function CreateBand() {
  const router = useRouter();
  const { fullName, instruments, genres } = useLocalSearchParams();
  const [bandName, setBandName] = useState("");

  const canSubmit = bandName.trim().length > 0;

  const handleCreate = () => {
    if (!canSubmit) return;
    router.replace({
      pathname: "/dashboard-band",
      params: {
        fullName,
        instruments,
        genres,
        bandName: bandName.trim(),
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.blob, styles.blobViolet]} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>

        <Text style={styles.title}>Create a band</Text>
        <Text style={styles.subtitle}>
          This is a placeholder flow — no backend yet, so this doesn't persist
          past a reload. Naming it here takes you to your new band dashboard.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Band name</Text>
          <TextInput
            value={bandName}
            onChangeText={setBandName}
            placeholder="e.g. The Krizza Band"
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
        </View>

        <Pressable
          onPress={handleCreate}
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        >
          <Text style={styles.submitButtonText}>Create band</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  title: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#6b7280", fontSize: 13, lineHeight: 19, marginBottom: 24 },
  field: { marginBottom: 24 },
  label: { color: "#111827", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  submitButton: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: { backgroundColor: "#c4b5fd" },
  submitButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});