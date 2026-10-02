import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import BottomNav from "../components/BottomNav";
import { useAppAlert } from "../components/useAppAlert";

// GigMatch — Gig Posting (create a listing), no backend yet
// Route: app/gig-posting.jsx  →  "/gig-posting"
//
// Band-side posting: a band advertising itself as available for an event.
// A client-side "looking for a band" version would live off
// dashboard-client.jsx — not built yet, that dashboard isn't wired to
// this nav.

const GIG_TYPES = [
  "Birthday", "Wedding", "Concert", "Festival",
  "Corporate Event", "School Event", "Private Event", "Bar / Restaurant",
];

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

const DURATIONS = ["1 hour", "2 hours", "3 hours", "4 hours", "5+ hours"];

const INCLUDED_OPTIONS = [
  "Live performance", "3 sets", "Song requests", "Basic sound equipment",
];

const CLIENT_REQUIREMENT_OPTIONS = [
  "Stage required", "Sound system provided by client",
  "Transportation arrangement", "Electrical requirements",
];

const DESCRIPTION_MAX = 255;

// Strips everything but digits (so pasted text, letters, symbols, extra
// decimal points, etc. can never end up in the fee) and drops leading
// zeros like "007" -> "7".
function digitsOnly(value) {
  return value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
}

// Renders a raw digit string as "₱5,000". Empty input renders as "".
function formatPeso(rawDigits) {
  if (!rawDigits) return "";
  return `₱${Number(rawDigits).toLocaleString("en-PH")}`;
}

export default function GigPosting() {
  const router = useRouter();
  const { fullName, instruments, genres, bandName, bandPhotoUri } = useLocalSearchParams();
  const { showAlert, AlertModal } = useAppAlert();

  const [gigType, setGigType] = useState(null);
  const [barangay, setBarangay] = useState(null);
  const [duration, setDuration] = useState(null);
  const [genreTags, setGenreTags] = useState([]);
  const [description, setDescription] = useState("");
  const [startingFee, setStartingFee] = useState(""); // raw digits only, e.g. "5000"
  const [negotiable, setNegotiable] = useState(true);
  const [included, setIncluded] = useState([]);
  const [clientRequirements, setClientRequirements] = useState([]);
  const [portfolioPhotos, setPortfolioPhotos] = useState([]);

  // Only start showing field errors after the user has tried to post once,
  // so the form isn't red before they've touched anything.
  const [submitted, setSubmitted] = useState(false);

  const handleStartingFeeChange = (value) => {
    setStartingFee(digitsOnly(value));
  };

  const [gigTypeModalOpen, setGigTypeModalOpen] = useState(false);
  const [barangayModalOpen, setBarangayModalOpen] = useState(false);
  const [durationModalOpen, setDurationModalOpen] = useState(false);
  const [genreModalOpen, setGenreModalOpen] = useState(false);

  const toggleGenreTag = (item) => {
    setGenreTags((prev) => (prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]));
  };
  const toggleIncluded = (item) => {
    setIncluded((prev) => (prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]));
  };
  const toggleClientRequirement = (item) => {
    setClientRequirements((prev) => (prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]));
  };

  const addPortfolioPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert({
        icon: "image",
        tone: "warning",
        title: "Permission needed",
        message: "GigMatch needs access to your photos to attach portfolio images.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length) {
      setPortfolioPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removePortfolioPhoto = (uri) => {
    setPortfolioPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const errors = {
    gigType: gigType === null ? "Select a gig type." : null,
    barangay: barangay === null ? "Select a location." : null,
    duration: duration === null ? "Select a performance duration." : null,
    genreTags: genreTags.length === 0 ? "Add at least one genre tag." : null,
    description:
      description.trim().length === 0 ? "Description is required." : null,
    startingFee:
      startingFee.length === 0
        ? "Starting fee is required."
        : Number(startingFee) <= 0
        ? "Starting fee must be greater than ₱0."
        : null,
  };
  const canPost = Object.values(errors).every((e) => e === null);

  const handlePost = () => {
    setSubmitted(true);
    if (!canPost) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Almost there",
        message: "Some fields need your attention — check the highlighted fields below.",
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
          <Text style={styles.label}>Gig type</Text>
          <Pressable
            onPress={() => setGigTypeModalOpen(true)}
            style={[styles.dropdownField, submitted && errors.gigType && styles.fieldError]}
          >
            <Text style={gigType ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {gigType ?? "Select gig type"}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>
          {submitted && errors.gigType ? (
            <Text style={styles.errorText}>{errors.gigType}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <Pressable
            onPress={() => setBarangayModalOpen(true)}
            style={[styles.dropdownField, submitted && errors.barangay && styles.fieldError]}
          >
            <Text style={barangay ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {barangay ?? "Select barangay"}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>
          {submitted && errors.barangay ? (
            <Text style={styles.errorText}>{errors.barangay}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Performance duration</Text>
          <Pressable
            onPress={() => setDurationModalOpen(true)}
            style={[styles.dropdownField, submitted && errors.duration && styles.fieldError]}
          >
            <Text style={duration ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {duration ?? "Select duration"}
            </Text>
            <Text style={styles.chevron}>⌄</Text>
          </Pressable>
          {submitted && errors.duration ? (
            <Text style={styles.errorText}>{errors.duration}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Genre tags</Text>
          <View style={styles.chipRow}>
            {genreTags.map((tag) => (
              <Pressable key={tag} onPress={() => toggleGenreTag(tag)} style={styles.chipSelected}>
                <Text style={styles.chipSelectedText}>{tag}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setGenreModalOpen(true)} style={styles.chipAdd}>
              <Text style={styles.chipAddText}>+ Add</Text>
            </Pressable>
          </View>
          {submitted && errors.genreTags ? (
            <Text style={styles.errorText}>{errors.genreTags}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={(v) => setDescription(v.slice(0, DESCRIPTION_MAX))}
            placeholder="What kind of event, what you'll bring..."
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={DESCRIPTION_MAX}
            style={[styles.textarea, submitted && errors.description && styles.fieldError]}
          />
          <Text style={styles.charCount}>
            {description.length}/{DESCRIPTION_MAX}
          </Text>
          {submitted && errors.description ? (
            <Text style={styles.errorText}>{errors.description}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Starting fee</Text>
          <TextInput
            value={formatPeso(startingFee)}
            onChangeText={handleStartingFeeChange}
            placeholder="e.g. ₱5,000"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            style={[styles.input, submitted && errors.startingFee && styles.fieldError]}
          />
          {submitted && errors.startingFee ? (
            <Text style={styles.errorText}>{errors.startingFee}</Text>
          ) : null}
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setNegotiable(true)}
              style={[styles.toggleOption, negotiable && styles.toggleOptionActive]}
            >
              <Text style={[styles.toggleOptionText, negotiable && styles.toggleOptionTextActive]}>Negotiable</Text>
            </Pressable>
            <Pressable
              onPress={() => setNegotiable(false)}
              style={[styles.toggleOption, !negotiable && styles.toggleOptionActive]}
            >
              <Text style={[styles.toggleOptionText, !negotiable && styles.toggleOptionTextActive]}>Not negotiable</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Included</Text>
          <View style={styles.chipRow}>
            {INCLUDED_OPTIONS.map((item) => {
              const isSelected = included.includes(item);
              return (
                <Pressable
                  key={item}
                  onPress={() => toggleIncluded(item)}
                  style={[styles.chip, isSelected && styles.chipSelectedAlt]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelectedAlt]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Client Requirements</Text>
          <View style={styles.chipRow}>
            {CLIENT_REQUIREMENT_OPTIONS.map((item) => {
              const isSelected = clientRequirements.includes(item);
              return (
                <Pressable
                  key={item}
                  onPress={() => toggleClientRequirement(item)}
                  style={[styles.chip, isSelected && styles.chipSelectedAlt]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelectedAlt]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Portfolio (band)</Text>
          <View style={styles.portfolioRow}>
            {portfolioPhotos.map((uri) => (
              <View key={uri} style={styles.portfolioThumbWrap}>
                <Image source={{ uri }} style={styles.portfolioThumb} />
                <Pressable
                  onPress={() => removePortfolioPhoto(uri)}
                  style={styles.portfolioRemove}
                  hitSlop={6}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={addPortfolioPhoto} style={styles.portfolioAddButton}>
              <Ionicons name="add" size={20} color="#7c3aed" />
            </Pressable>
          </View>
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
          showGigs={!!bandName}
        />

      <SelectModal
        visible={gigTypeModalOpen}
        title="Gig type"
        options={GIG_TYPES}
        selected={gigType ? [gigType] : []}
        onSelect={(item) => { setGigType(item); setGigTypeModalOpen(false); }}
        onClose={() => setGigTypeModalOpen(false)}
      />
      <SelectModal
        visible={barangayModalOpen}
        title="Select barangay"
        options={BARANGAYS}
        selected={barangay ? [barangay] : []}
        onSelect={(item) => { setBarangay(item); setBarangayModalOpen(false); }}
        onClose={() => setBarangayModalOpen(false)}
      />
      <SelectModal
        visible={durationModalOpen}
        title="Performance duration"
        options={DURATIONS}
        selected={duration ? [duration] : []}
        onSelect={(item) => { setDuration(item); setDurationModalOpen(false); }}
        onClose={() => setDurationModalOpen(false)}
      />
      <SelectModal
        visible={genreModalOpen}
        title="Genre tags"
        options={GENRES}
        selected={genreTags}
        multiple
        onToggle={toggleGenreTag}
        onClose={() => setGenreModalOpen(false)}
      />

      {AlertModal}
    </KeyboardAvoidingView>
  );
}

function SelectModal({ visible, title, options, selected, multiple, onSelect, onToggle, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.modalClose}>✕</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.modalList}>
          {options.map((item) => {
            const isSelected = selected.includes(item);
            return (
              <Pressable key={item} onPress={() => (multiple ? onToggle(item) : onSelect(item))} style={styles.modalRow}>
                <Text style={styles.modalRowText}>{item}</Text>
                {isSelected ? <Text style={styles.modalCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        {multiple ? (
          <Pressable onPress={onClose} style={styles.modalDoneButtonWrap}>
            <LinearGradient colors={["#8b5cf6", "#d946ef"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalDoneButton}>
              <Text style={styles.modalDoneText}>Done</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>
    </Modal>
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
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827",
    marginBottom: 10,
  },
  textarea: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, padding: 14, fontSize: 14, color: "#111827", minHeight: 90, textAlignVertical: "top",
  },
  charCount: { color: "#9ca3af", fontSize: 11, marginTop: 4, textAlign: "right" },
  fieldError: { borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.05)" },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 6 },

  dropdownField: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  dropdownValue: { color: "#111827", fontSize: 14 },
  dropdownPlaceholder: { color: "#9ca3af", fontSize: 14 },
  chevron: { color: "#6b7280", fontSize: 16 },

  toggleRow: { flexDirection: "row", gap: 10 },
  toggleOption: {
    flex: 1, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, paddingVertical: 12, alignItems: "center",
  },
  toggleOptionActive: { borderColor: PURPLE, backgroundColor: "rgba(124,58,237,0.1)" },
  toggleOptionText: { color: "#6b7280", fontSize: 13, fontWeight: "600" },
  toggleOptionTextActive: { color: PURPLE },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipSelected: {
    backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipSelectedText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  chipAdd: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipAddText: { color: "#374151", fontSize: 12, fontWeight: "500" },

  chip: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipSelectedAlt: { borderColor: PURPLE, backgroundColor: "rgba(124,58,237,0.1)" },
  chipText: { color: "#374151", fontSize: 12, fontWeight: "600" },
  chipTextSelectedAlt: { color: PURPLE },

  portfolioRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  portfolioThumbWrap: { position: "relative" },
  portfolioThumb: { height: 64, width: 64, borderRadius: 12, backgroundColor: "rgba(124,58,237,0.1)" },
  portfolioRemove: {
    position: "absolute", top: -6, right: -6,
    height: 18, width: 18, borderRadius: 9,
    backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center",
  },
  portfolioAddButton: {
    height: 64, width: 64, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(124,58,237,0.3)", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },

  postButton: { marginTop: 10, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  postButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  postButtonTextDisabled: { color: "#a78bfa" },
  pressed: { opacity: 0.9 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "70%",
    backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  modalClose: { color: "#6b7280", fontSize: 16 },
  modalList: { maxHeight: 360 },
  modalRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  modalRowText: { color: "#111827", fontSize: 14 },
  modalCheck: { color: PURPLE, fontSize: 14, fontWeight: "700" },
  modalDoneButtonWrap: { marginTop: 14 },
  modalDoneButton: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalDoneText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});