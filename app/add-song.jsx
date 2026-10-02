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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAppAlert } from "../components/useAppAlert";

// GigMatch — Add New Song (used from create-band.jsx step 2)
// Route: app/add-song.jsx  →  "/add-song"
//
// Receives all of create-band's in-progress step 1 + step 2 fields as
// params (so nothing typed there is lost), plus the existing songs list
// as JSON. On Cancel or Add song, returns to /create-band with those same
// params — updated with the new song on Add, unchanged on Cancel — plus
// resumeStep="2" so it reopens on the Music Information step.

export default function AddSong() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [title, setTitle] = useState("");
  const [songType, setSongType] = useState("original"); // "original" | "cover"
  const [artist, setArtist] = useState("");
  const [link, setLink] = useState("");
  const { showAlert, AlertModal } = useAppAlert();

  const canAdd = title.trim().length > 0 && artist.trim().length > 0;

  const returnToCreateBand = (overrides = {}) => {
    router.replace({
      pathname: "/create-band",
      params: { ...params, resumeStep: "2", ...overrides },
    });
  };

  const handleCancel = () => {
    returnToCreateBand();
  };

  const handleAddSong = () => {
    if (!canAdd) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Almost there",
        message: "Enter a song title and artist name.",
      });
      return;
    }
    let existingSongs = [];
    try {
      existingSongs = params.songs ? JSON.parse(params.songs) : [];
    } catch {
      existingSongs = [];
    }
    const newSong = {
      id: Date.now().toString(),
      title: title.trim(),
      type: songType,
      artist: artist.trim(),
      link: link.trim(),
    };
    returnToCreateBand({ songs: JSON.stringify([...existingSongs, newSong]) });
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable onPress={handleCancel} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>

        <Text style={styles.title}>Add New Song</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Song title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Ligaya"
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Song type</Text>
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setSongType("original")}
              style={[styles.toggleOption, songType === "original" && styles.toggleOptionActive]}
            >
              <Text style={[styles.toggleOptionText, songType === "original" && styles.toggleOptionTextActive]}>
                Original
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSongType("cover")}
              style={[styles.toggleOption, songType === "cover" && styles.toggleOptionActive]}
            >
              <Text style={[styles.toggleOptionText, songType === "cover" && styles.toggleOptionTextActive]}>
                Cover
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Artist / Original Artist</Text>
          <TextInput
            value={artist}
            onChangeText={setArtist}
            placeholder={songType === "cover" ? "Who originally performed this song" : "Your band, or the songwriter"}
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Song link (optional)</Text>
          <TextInput
            value={link}
            onChangeText={setLink}
            placeholder="YouTube, Spotify, SoundCloud link..."
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            style={styles.input}
          />
        </View>

        <View style={styles.buttonRow}>
          <Pressable onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleAddSong}
            style={({ pressed }) => [{ flex: 1 }, pressed && canAdd && styles.pressed]}
          >
            <LinearGradient
              colors={canAdd ? ["#8b5cf6", "#d946ef"] : ["#e5e0f5", "#e5e0f5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addButton}
            >
              <Text style={[styles.addButtonText, !canAdd && styles.addButtonTextDisabled]}>
                Add song
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>

      {AlertModal}
    </KeyboardAvoidingView>
  );
}

const PURPLE = "#7c3aed";

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  blob: { position: "absolute", borderRadius: 9999, opacity: 0.2 },
  blobViolet: { top: -60, left: -60, height: 220, width: 220, backgroundColor: "#c4b5fd" },
  blobPink: { top: 260, right: -80, height: 220, width: 220, backgroundColor: "#f5d0fe" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },

  backButton: {
    height: 36, width: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  title: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 22 },

  field: { marginBottom: 18 },
  label: { color: "#111827", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827",
  },

  toggleRow: { flexDirection: "row", gap: 10 },
  toggleOption: {
    flex: 1, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, paddingVertical: 12, alignItems: "center",
  },
  toggleOptionActive: { borderColor: PURPLE, backgroundColor: "rgba(124,58,237,0.1)" },
  toggleOptionText: { color: "#6b7280", fontSize: 13, fontWeight: "600" },
  toggleOptionTextActive: { color: PURPLE },

  buttonRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  cancelButton: {
    flex: 1, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 14, paddingVertical: 15, alignItems: "center",
  },
  cancelButtonText: { color: "#374151", fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.9 },
  addButton: { borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  addButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  addButtonTextDisabled: { color: "#a78bfa" },
});