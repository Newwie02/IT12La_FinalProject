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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

// GigMatch — Create a band (2-step wizard, no backend yet)
// Route: app/create-band.jsx  →  "/create-band"
// Step 1: band basics. Step 2: music info + instruments.
// Carries the musician's own fullName/instruments/genres through
// untouched, and produces separate band-specific params on submit so the
// two don't collide.

const BAND_TYPES = [
  "Cover Band",
  "Original Band",
  "Acoustic Band",
  "Tribute Band",
  "Wedding / Events Band",
  "Other",
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

const BAND_INSTRUMENTS = [
  "Lead Guitar",
  "Rhythm Guitar",
  "Bass Guitar",
  "Drums",
  "Keyboard",
  "Vocals",
  "Other Instruments",
];

const DESCRIPTION_MAX = 255;

function todayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CreateBand() {
  const router = useRouter();
  const { fullName, instruments, genres } = useLocalSearchParams();

  const [step, setStep] = useState(1);

  // Step 1
  const [bandName, setBandName] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [description, setDescription] = useState("");
  const [barangay, setBarangay] = useState(null);
  const [bandType, setBandType] = useState(null);
  const [barangayModalOpen, setBarangayModalOpen] = useState(false);
  const [bandTypeModalOpen, setBandTypeModalOpen] = useState(false);

  // Step 2
  const [primaryGenre, setPrimaryGenre] = useState(null);
  const [secondaryGenre, setSecondaryGenre] = useState(null);
  const [musicalStyle, setMusicalStyle] = useState("");
  const [languages, setLanguages] = useState("");
  const [performsOriginals, setPerformsOriginals] = useState(true);
  const [performsCovers, setPerformsCovers] = useState(true);
  const [bandInstruments, setBandInstruments] = useState([]);
  const [primaryGenreModalOpen, setPrimaryGenreModalOpen] = useState(false);
  const [secondaryGenreModalOpen, setSecondaryGenreModalOpen] = useState(false);

  const dateJoined = todayFormatted();

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "GigMatch needs access to your photos to set a band photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const toggleBandInstrument = (item) => {
    setBandInstruments((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const canContinueStep1 =
    bandName.trim().length > 0 &&
    description.trim().length > 0 &&
    barangay !== null &&
    bandType !== null;

  const canFinish =
    primaryGenre !== null && bandInstruments.length > 0;

  const handleContinue = () => {
    if (!canContinueStep1) return;
    setStep(2);
  };

  const handleFinish = () => {
    if (!canFinish) {
      Alert.alert("Almost there", "Pick a primary genre and at least one instrument.");
      return;
    }
    router.replace({
      pathname: "/dashboard-band",
      params: {
        fullName,
        instruments,
        genres,
        bandName: bandName.trim(),
        bandPhotoUri: photoUri ?? "",
        bandDescription: description.trim(),
        dateJoined,
        bandLocation: barangay,
        bandType,
        primaryGenre,
        secondaryGenre: secondaryGenre ?? "",
        musicalStyle: musicalStyle.trim(),
        languages: languages.trim(),
        performsOriginals: performsOriginals ? "1" : "0",
        performsCovers: performsCovers ? "1" : "0",
        bandInstruments: bandInstruments.join(","),
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable
            onPress={() => (step === 1 ? router.back() : setStep(1))}
            style={styles.backButton}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <Text style={styles.stepLabel}>Step {step} of 2</Text>
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.progressSegment, styles.progressFilled]} />
          <View style={[styles.progressSegment, step === 2 && styles.progressFilled]} />
        </View>

        {step === 1 ? (
          <>
            <Text style={styles.title}>Create a band</Text>
            <Text style={styles.subtitle}>
              This is a placeholder flow — no backend yet, so nothing here persists past a reload.
            </Text>

            {/* Photo */}
            <View style={styles.photoRow}>
              <View style={styles.avatar}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="people" size={22} color="#7c3aed" />
                )}
              </View>
              <Pressable onPress={pickPhoto} style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>Upload photo</Text>
              </Pressable>
            </View>

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

            <View style={styles.field}>
              <Text style={styles.label}>Band description</Text>
              <TextInput
                value={description}
                onChangeText={(v) => setDescription(v.slice(0, DESCRIPTION_MAX))}
                placeholder="Tell clients and musicians about your band"
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={DESCRIPTION_MAX}
                style={styles.textarea}
              />
              <Text style={styles.charCount}>
                {description.length}/{DESCRIPTION_MAX}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date Created</Text>
              <View style={[styles.dropdownField, styles.readOnlyField]}>
                <Text style={styles.dropdownValue}>{dateJoined}</Text>
                <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
              </View>
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
              <Text style={styles.label}>Band type</Text>
              <Pressable onPress={() => setBandTypeModalOpen(true)} style={styles.dropdownField}>
                <Text style={bandType ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {bandType ?? "Select band type"}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
            </View>

            <Pressable onPress={handleContinue} style={({ pressed }) => [pressed && canContinueStep1 && styles.pressed]}>
              <LinearGradient
                colors={canContinueStep1 ? ["#8b5cf6", "#d946ef"] : ["#e5e0f5", "#e5e0f5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={[styles.primaryButtonText, !canContinueStep1 && styles.primaryButtonTextDisabled]}>
                  Click to continue
                </Text>
              </LinearGradient>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Music Information</Text>
            <Text style={styles.subtitle}>What your band plays and how.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Primary genre</Text>
              <Pressable onPress={() => setPrimaryGenreModalOpen(true)} style={styles.dropdownField}>
                <Text style={primaryGenre ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {primaryGenre ?? "Select primary genre"}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Secondary genre</Text>
              <Pressable onPress={() => setSecondaryGenreModalOpen(true)} style={styles.dropdownField}>
                <Text style={secondaryGenre ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {secondaryGenre ?? "Select secondary genre (optional)"}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Musical style</Text>
              <TextInput
                value={musicalStyle}
                onChangeText={setMusicalStyle}
                placeholder="e.g. High-energy, danceable"
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Languages performed</Text>
              <TextInput
                value={languages}
                onChangeText={setLanguages}
                placeholder="e.g. English, Tagalog, Bisaya"
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Original songs</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => setPerformsOriginals(true)}
                  style={[styles.toggleOption, performsOriginals && styles.toggleOptionActive]}
                >
                  <Text style={[styles.toggleOptionText, performsOriginals && styles.toggleOptionTextActive]}>Yes</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPerformsOriginals(false)}
                  style={[styles.toggleOption, !performsOriginals && styles.toggleOptionActive]}
                >
                  <Text style={[styles.toggleOptionText, !performsOriginals && styles.toggleOptionTextActive]}>No</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Cover songs</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => setPerformsCovers(true)}
                  style={[styles.toggleOption, performsCovers && styles.toggleOptionActive]}
                >
                  <Text style={[styles.toggleOptionText, performsCovers && styles.toggleOptionTextActive]}>Yes</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPerformsCovers(false)}
                  style={[styles.toggleOption, !performsCovers && styles.toggleOptionActive]}
                >
                  <Text style={[styles.toggleOptionText, !performsCovers && styles.toggleOptionTextActive]}>No</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Instruments</Text>
              <View style={styles.chipRow}>
                {BAND_INSTRUMENTS.map((item) => {
                  const isSelected = bandInstruments.includes(item);
                  return (
                    <Pressable
                      key={item}
                      onPress={() => toggleBandInstrument(item)}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable onPress={handleFinish} style={({ pressed }) => [pressed && canFinish && styles.pressed]}>
              <LinearGradient
                colors={canFinish ? ["#8b5cf6", "#d946ef"] : ["#e5e0f5", "#e5e0f5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={[styles.primaryButtonText, !canFinish && styles.primaryButtonTextDisabled]}>
                  GO to dashboard (Band)
                </Text>
              </LinearGradient>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Barangay picker */}
      <SelectModal
        visible={barangayModalOpen}
        title="Select barangay"
        options={BARANGAYS}
        selected={barangay ? [barangay] : []}
        onSelect={(item) => {
          setBarangay(item);
          setBarangayModalOpen(false);
        }}
        onClose={() => setBarangayModalOpen(false)}
      />

      {/* Band type picker */}
      <SelectModal
        visible={bandTypeModalOpen}
        title="Band type"
        options={BAND_TYPES}
        selected={bandType ? [bandType] : []}
        onSelect={(item) => {
          setBandType(item);
          setBandTypeModalOpen(false);
        }}
        onClose={() => setBandTypeModalOpen(false)}
      />

      {/* Primary genre picker */}
      <SelectModal
        visible={primaryGenreModalOpen}
        title="Primary genre"
        options={GENRES}
        selected={primaryGenre ? [primaryGenre] : []}
        onSelect={(item) => {
          setPrimaryGenre(item);
          setPrimaryGenreModalOpen(false);
        }}
        onClose={() => setPrimaryGenreModalOpen(false)}
      />

      {/* Secondary genre picker */}
      <SelectModal
        visible={secondaryGenreModalOpen}
        title="Secondary genre"
        options={GENRES}
        selected={secondaryGenre ? [secondaryGenre] : []}
        onSelect={(item) => {
          setSecondaryGenre(item);
          setSecondaryGenreModalOpen(false);
        }}
        onClose={() => setSecondaryGenreModalOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

function SelectModal({ visible, title, options, selected, onSelect, onClose }) {
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
              <Pressable key={item} onPress={() => onSelect(item)} style={styles.modalRow}>
                <Text style={styles.modalRowText}>{item}</Text>
                {isSelected ? <Text style={styles.modalCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  backButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { color: "#6b7280", fontSize: 12, fontWeight: "500" },

  progressRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  progressSegment: { flex: 1, height: 4, borderRadius: 999, backgroundColor: "#e5e7eb" },
  progressFilled: { backgroundColor: PURPLE },

  title: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#6b7280", fontSize: 13, lineHeight: 19, marginBottom: 22 },

  photoRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  avatar: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  uploadButton: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  uploadButtonText: { color: "#111827", fontSize: 13, fontWeight: "500" },

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
  readOnlyField: { opacity: 0.7 },
  dropdownValue: { color: "#111827", fontSize: 14 },
  dropdownPlaceholder: { color: "#9ca3af", fontSize: 14 },
  chevron: { color: "#6b7280", fontSize: 16 },

  toggleRow: { flexDirection: "row", gap: 10 },
  toggleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  toggleOptionActive: { borderColor: PURPLE, backgroundColor: "rgba(124,58,237,0.1)" },
  toggleOptionText: { color: "#6b7280", fontSize: 13, fontWeight: "600" },
  toggleOptionTextActive: { color: PURPLE },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: { borderColor: PURPLE, backgroundColor: "rgba(124,58,237,0.12)" },
  chipText: { color: "#374151", fontSize: 12, fontWeight: "600" },
  chipTextSelected: { color: PURPLE },

  primaryButton: { marginTop: 10, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  primaryButtonTextDisabled: { color: "#a78bfa" },
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
});