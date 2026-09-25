import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import { useAppAlert } from "../components/useAppAlert";

// GigMatch — Gig Posting (create a listing), no backend yet
// Route: app/gig-posting.jsx  →  "/gig-posting"
//
// The system has two kinds of gig postings: a BAND posting itself as
// available for an event, or a CLIENT posting a gig looking for a band.
// This screen currently covers the band side (reached from the shared
// musician/band bottom nav). A client-side "post a gig, looking for a
// band" version would live as its own screen off dashboard-client.jsx —
// not built yet since that dashboard hasn't been wired up to this nav.

const GENRES = [
  "OPM", "Pop", "Pop Rock", "Pinoy Rock", "Alternative Rock", "Indie Rock",
  "Acoustic", "R&B", "Soul", "Funk", "Jazz", "Blues", "Reggae", "Punk Rock",
  "Hard Rock", "Heavy Metal", "Folk", "Country", "Hip-Hop", "Rap", "Ballad",
  "Disco", "Dance", "Gospel", "Bossa Nova", "Latin", "Manila Sound",
  "Kundiman", "Novelty", "Christian Music",
];

const BARANGAYS = [
  "Apokon", "Babu Pangir", "Busaon", "Canocotan", "Cuambogan", "La Filipina",
  "Liboganon", "Madaum", "Magdum", "Magugpo Pob", "Magugpo East",
  "Magugpo North", "Magugpo South", "Magugpo West", "Mankilam",
  "New Balamban", "Nueva Fuerza", "Pagsabangan", "Pandapan", "San Agustin",
  "San Isidro", "San Miguel", "Visayan Village",
];

const DESCRIPTION_MAX = 255;

export default function GigPosting() {
  const router = useRouter();
  const { fullName, instruments, genres, bandName, bandPhotoUri } = useLocalSearchParams();
  const { showAlert, AlertModal } = useAppAlert();

  const [title, setTitle] = useState("");
  const [barangay, setBarangay] = useState(null);
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState([]);
  const [description, setDescription] = useState("");
  const [barangayModalOpen, setBarangayModalOpen] = useState(false);
  const [genreModalOpen, setGenreModalOpen] = useState(false);

  const toggleTag = (item) => {
    setTags((prev) => (prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]));
  };

  const canPost =
    title.trim().length > 0 &&
    barangay !== null &&
    price.trim().length > 0 &&
    tags.length > 0 &&
    description.trim().length > 0;

  const handlePost = () => {
    if (!canPost) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Almost there",
        message: "Fill in the title, location, price, at least one genre tag, and a description.",
      });
      return;
    }
    showAlert({
      icon: "checkmark-circle",
      tone: "success",
      title: "Gig posted",
      message: "This is a placeholder — no backend yet, so it won't actually appear for clients until that's wired up.",
      buttons: [
        {
          label: "Back to dashboard",
          onPress: () =>
            router.replace({
              pathname: bandName ? "/dashboard-band" : "/dashboard-musician",
              params: { fullName, instruments, genres, bandName, bandPhotoUri },
            }),
        },
      ],
    });
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Post a gig</Text>
        <Text style={styles.subtitle}>
          Let clients know {bandName ? bandName : "you're"} available for an event.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Available for weekend gigs"
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <Pressable onPress={() => setBarangayModalOpen(true)} style={styles.dropdownField}>
            <Text style={barangay ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {barangay ?? "Select barangay"}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Price</Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. ₱5,000"
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Genre tags</Text>
          <View style={styles.chipRow}>
            {tags.map((tag) => (
              <Pressable key={tag} onPress={() => toggleTag(tag)} style={styles.chipSelected}>
                <Text style={styles.chipSelectedText}>{tag}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setGenreModalOpen(true)} style={styles.chipAdd}>
              <Text style={styles.chipAddText}>+ Add</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={(v) => setDescription(v.slice(0, DESCRIPTION_MAX))}
            placeholder="What kind of event, how long, what you'll bring..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={DESCRIPTION_MAX}
            style={styles.textarea}
          />
          <Text style={styles.charCount}>
            {description.length}/{DESCRIPTION_MAX}
          </Text>
        </View>

        <Pressable onPress={handlePost} style={({ pressed }) => [pressed && canPost && styles.pressed]}>
          <LinearGradient
            colors={canPost ? ["#8b5cf6", "#d946ef"] : ["#e5e0f5", "#e5e0f5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.postButton}
          >
            <Text style={[styles.postButtonText, !canPost && styles.postButtonTextDisabled]}>
              Post gig
            </Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav
        homeRoute={bandName ? "/dashboard-band" : "/dashboard-musician"}
        profileRoute="/profile-musician"
        params={{ fullName, instruments, genres, bandName, bandPhotoUri }}
      />

      {/* Barangay picker */}
      <Modal visible={barangayModalOpen} animationType="slide" transparent onRequestClose={() => setBarangayModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setBarangayModalOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select barangay</Text>
            <Pressable onPress={() => setBarangayModalOpen(false)} hitSlop={10}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalList}>
            {BARANGAYS.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setBarangay(item);
                  setBarangayModalOpen(false);
                }}
                style={styles.modalRow}
              >
                <Text style={styles.modalRowText}>{item}</Text>
                {barangay === item ? <Text style={styles.modalCheck}>✓</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Genre picker */}
      <Modal visible={genreModalOpen} animationType="slide" transparent onRequestClose={() => setGenreModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setGenreModalOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Genre tags</Text>
            <Pressable onPress={() => setGenreModalOpen(false)} hitSlop={10}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalList}>
            {GENRES.map((item) => (
              <Pressable key={item} onPress={() => toggleTag(item)} style={styles.modalRow}>
                <Text style={styles.modalRowText}>{item}</Text>
                {tags.includes(item) ? <Text style={styles.modalCheck}>✓</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
          <Pressable onPress={() => setGenreModalOpen(false)} style={styles.modalDoneButtonWrap}>
            <LinearGradient
              colors={["#8b5cf6", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalDoneButton}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Modal>

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
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },

  title: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#6b7280", fontSize: 13, lineHeight: 19, marginBottom: 22 },

  field: { marginBottom: 18 },
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
  textarea: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#111827",
    minHeight: 90,
    textAlignVertical: "top",
  },
  charCount: { color: "#9ca3af", fontSize: 11, marginTop: 4, textAlign: "right" },

  dropdownField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownValue: { color: "#111827", fontSize: 14 },
  dropdownPlaceholder: { color: "#9ca3af", fontSize: 14 },
  chevron: { color: "#6b7280", fontSize: 16 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipSelected: {
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelectedText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  chipAdd: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipAddText: { color: "#374151", fontSize: 12, fontWeight: "500" },

  postButton: { marginTop: 10, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  postButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  postButtonTextDisabled: { color: "#a78bfa" },
  pressed: { opacity: 0.9 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  modalClose: { color: "#6b7280", fontSize: 16 },
  modalList: { maxHeight: 360 },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalRowText: { color: "#111827", fontSize: 14 },
  modalCheck: { color: PURPLE, fontSize: 14, fontWeight: "700" },
  modalDoneButtonWrap: { marginTop: 14 },
  modalDoneButton: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalDoneText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});