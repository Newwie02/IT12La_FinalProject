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
} from "react-native";
import { updateMyProfile, uploadPhoto } from "../api";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";

// GigMatch — onboarding step 3: "Set up your band profile" (band)
// Route: app/profile-setup-band.jsx  →  "/profile-setup-band"
// Flow: sign-up (step 1) → role-select (step 2, role = "band") → this screen (step 3, final).
// Band-specific fields only (no stage name / instruments / birthday — the full
// band details are set later in /create-band). Lands on the musician dashboard;
// the band dashboard unlocks once a band exists.

const HOME_ROUTE = "/dashboard-musician";

const BARANGAYS = [
  "Apokon", "Babu Pangir", "Busaon", "Canocotan", "Cuambogan", "La Filipina",
  "Liboganon", "Madaum", "Magdum", "Magugpo Pob", "Magugpo East",
  "Magugpo North", "Magugpo South", "Magugpo West", "Mankilam",
  "New Balamban", "Nueva Fuerza", "Pagsabangan", "Pandapan", "San Agustin",
  "San Isidro", "San Miguel", "Visayan Village",
];

const GENRES = [
  "OPM", "Pop", "Pop Rock", "Pinoy Rock", "Alternative Rock", "Indie Rock",
  "Acoustic", "R&B", "Soul", "Funk", "Jazz", "Blues", "Reggae", "Punk Rock",
  "Hard Rock", "Heavy Metal", "Folk", "Country", "Hip-Hop", "Rap", "Ballad",
  "Disco", "Dance", "Gospel", "Bossa Nova", "Latin", "Manila Sound",
  "Kundiman", "Novelty", "Christian Music",
];

const BIO_MAX = 255;

export default function ProfileSetupBand() {
  const router = useRouter();
  const { role, fullName } = useLocalSearchParams();

  const [photoUri, setPhotoUri] = useState(null);
  const [bandName, setBandName] = useState("");
  const [bio, setBio] = useState("");
  const [genres, setGenres] = useState([]);
  const [barangay, setBarangay] = useState(null);

  const [barangayModalOpen, setBarangayModalOpen] = useState(false);
  const [genreModalOpen, setGenreModalOpen] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "GigMatch needs access to your photos to set a band photo."
      );
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

  const toggleGenre = (item) => {
    setGenres((prev) =>
      prev.includes(item) ? prev.filter((g) => g !== item) : [...prev, item]
    );
  };

  const canFinish =
    bio.trim().length > 0 && genres.length > 0 && barangay !== null;

  const handleFinish = async () => {
    if (!canFinish) {
      Alert.alert(
        "Almost there",
        "Fill in your band bio, at least one genre, and your barangay."
      );
      return;
    }
    try {
      // Upload first so we save a real URL, not a blob:/file: path
      let photoUrl = "";
      if (photoUri) {
        photoUrl = /^https?:\/\//.test(photoUri) ? photoUri : await uploadPhoto(photoUri);
      }

      await updateMyProfile({
        stageName: bandName.trim(),
        barangay,
        genres: genres.join(","),
        bio: bio.trim(),
        photoUrl,
      });
    } catch (err) {
      Alert.alert("Couldn't save profile", err.message || "Please try again.");
      return;
    }
    router.replace({
      pathname: HOME_ROUTE,
      params: {
        role,
        fullName,
        instruments: "",
        genres: genres.join(","),
      },
    });
  };

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobFuchsia]} />
      <View style={[styles.blob, styles.blobIndigo]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrap}>
          <BlurView intensity={40} tint="dark" style={styles.card}>
            {/* Top bar */}
            <View style={styles.topBar}>
              <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
                <Text style={styles.backArrow}>←</Text>
              </Pressable>
              <Text style={styles.stepLabel}>Step 3 of 3</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressRow}>
              <View style={[styles.progressSegment, styles.progressFilled]} />
              <View style={[styles.progressSegment, styles.progressFilled]} />
              <View style={[styles.progressSegment, styles.progressFilled]} />
            </View>

            {/* Heading */}
            <Text style={styles.heading}>Set up your band profile</Text>
            <Text style={styles.subheading}>
              This helps clients and musicians get to know your band.
            </Text>

            {/* Photo */}
            <View style={styles.photoRow}>
              <View style={styles.avatar}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.avatarImage} />
                ) : null}
              </View>
              <Pressable onPress={pickPhoto} style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>Upload photo</Text>
              </Pressable>
            </View>

            {/* Band name */}
            <View style={styles.field}>
              <Text style={styles.label}>Band name</Text>
              <TextInput
                value={bandName}
                onChangeText={setBandName}
                placeholder="e.g. The Krizza Band"
                placeholderTextColor="rgba(255,255,255,0.45)"
                maxLength={40}
                style={styles.textInput}
              />
            </View>

            {/* Bio */}
            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
                placeholder="Tell clients and musicians about your band"
                placeholderTextColor="rgba(255,255,255,0.45)"
                multiline
                maxLength={BIO_MAX}
                style={styles.textarea}
              />
              <Text style={styles.charCount}>
                {bio.length}/{BIO_MAX}
              </Text>
            </View>

            {/* Genres — chip multi-select */}
            <View style={styles.field}>
              <Text style={styles.label}>Genres</Text>
              <View style={styles.chipRow}>
                {genres.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => toggleGenre(item)}
                    style={styles.chipSelected}
                  >
                    <Text style={styles.chipSelectedText}>{item}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setGenreModalOpen(true)} style={styles.chipAdd}>
                  <Text style={styles.chipAddText}>+ Add</Text>
                </Pressable>
              </View>
            </View>

            {/* Barangay — dropdown */}
            <View style={styles.field}>
              <Text style={styles.label}>Barangay</Text>
              <Pressable
                onPress={() => setBarangayModalOpen(true)}
                style={styles.dropdownField}
              >
                <Text style={barangay ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {barangay ?? "Select barangay"}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
            </View>

            {/* Finish */}
            <Pressable
              onPress={handleFinish}
              style={({ pressed }) => [pressed && canFinish && styles.pressed]}
            >
              <LinearGradient
                colors={canFinish ? ["#8b5cf6", "#d946ef"] : ["#3f3a52", "#3f3a52"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.finishButton}
              >
                <Text
                  style={[styles.finishButtonText, !canFinish && styles.finishButtonTextDisabled]}
                >
                  Finish &amp; Go to Dashboard
                </Text>
              </LinearGradient>
            </Pressable>
          </BlurView>
        </View>
      </ScrollView>

      {/* Genre picker modal (multi select) */}
      <SelectModal
        visible={genreModalOpen}
        title="Genres"
        options={GENRES}
        selected={genres}
        multiple
        onToggle={toggleGenre}
        onClose={() => setGenreModalOpen(false)}
      />

      {/* Barangay picker modal (single select) */}
      <SelectModal
        visible={barangayModalOpen}
        title="Select barangay"
        options={BARANGAYS}
        selected={barangay ? [barangay] : []}
        multiple={false}
        onSelect={(item) => {
          setBarangay(item);
          setBarangayModalOpen(false);
        }}
        onClose={() => setBarangayModalOpen(false)}
      />
    </View>
  );
}

function SelectModal({
  visible,
  title,
  options,
  selected,
  multiple,
  onSelect,
  onToggle,
  onClose,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <BlurView intensity={50} tint="dark" style={styles.modalSheet}>
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
              <Pressable
                key={item}
                onPress={() => (multiple ? onToggle(item) : onSelect(item))}
                style={styles.modalRow}
              >
                <Text style={styles.modalRowText}>{item}</Text>
                {isSelected ? <Text style={styles.modalCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        {multiple ? (
          <Pressable onPress={onClose} style={styles.modalDoneButtonWrap}>
            <LinearGradient
              colors={["#8b5cf6", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalDoneButton}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </BlurView>
    </Modal>
  );
}

const CARD_MAX_WIDTH = 384;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0c0a18" },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  blob: { position: "absolute", borderRadius: 9999, opacity: 0.35 },
  blobViolet: { top: -80, left: -60, height: 280, width: 280, backgroundColor: "#7c3aed" },
  blobFuchsia: { top: "28%", right: -80, height: 320, width: 320, backgroundColor: "#d946ef" },
  blobIndigo: { bottom: -100, left: "20%", height: 320, width: 320, backgroundColor: "#6366f1" },

  wrap: { width: "100%", maxWidth: CARD_MAX_WIDTH },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  backArrow: { color: "#fff", fontSize: 16 },
  stepLabel: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "500" },

  progressRow: { flexDirection: "row", gap: 6, marginBottom: 22 },
  progressSegment: { flex: 1, height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  progressFilled: { backgroundColor: "#a78bfa" },

  heading: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subheading: { color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 18, marginBottom: 22 },

  photoRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 22 },
  avatar: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: "rgba(167,139,250,0.25)",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  uploadButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  uploadButtonText: { color: "#fff", fontSize: 13, fontWeight: "500" },

  field: { marginBottom: 18 },
  label: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600", marginBottom: 8 },

  textInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#fff",
  },

  textarea: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#fff",
    minHeight: 90,
    textAlignVertical: "top",
  },
  charCount: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 4, textAlign: "right" },

  dropdownField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownValue: { color: "#fff", fontSize: 14 },
  dropdownPlaceholder: { color: "rgba(255,255,255,0.45)", fontSize: 14 },
  chevron: { color: "rgba(255,255,255,0.6)", fontSize: 16 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipSelected: {
    backgroundColor: "rgba(167,139,250,0.22)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.6)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelectedText: { color: "#d8b4fe", fontSize: 13, fontWeight: "600" },
  chipAdd: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipAddText: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" },

  finishButton: { marginTop: 10, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  finishButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  finishButtonTextDisabled: { color: "rgba(255,255,255,0.5)" },
  pressed: { opacity: 0.9 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "70%",
    backgroundColor: "rgba(18,14,36,0.85)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderBottomWidth: 0,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalClose: { color: "rgba(255,255,255,0.7)", fontSize: 16 },
  modalList: { flexGrow: 0 },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  modalRowText: { color: "#fff", fontSize: 14 },
  modalCheck: { color: "#a78bfa", fontSize: 15, fontWeight: "700" },
  modalDoneButtonWrap: { marginTop: 14 },
  modalDoneButton: { borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  modalDoneText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
