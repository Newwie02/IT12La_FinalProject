import { useState, useEffect } from "react";
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
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAppAlert } from "../components/useAppAlert";
import { getMyBand, updateMyBand, getBandProfile, saveBandDetails, uploadPhoto, resolveUrl } from "../api";

// GigMatch — Edit band profile (leader only)
// Route: app/edit-band.jsx  →  "/edit-band"
// Reached from the band's own profile (/profile-band). Loads GET /api/bands/me
// and the band's extra details (GET /api/band-details/:id, where instruments
// live) and saves with PUT /api/bands/me + PUT /api/band-details/me, so photo,
// name, bio, location, genre and instruments can all be fixed any time.

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

const INSTRUMENTS = [
  "Drum Set", "Electric Guitar", "Acoustic Guitar", "Bass Guitar",
  "Classical Guitar", "Piano", "Trumpet", "Flute", "Violin",
  "Main Vocal", "Support Vocal",
];

const DESCRIPTION_MAX = 255;
const BAND_NAME_MAX = 30;
const PRIMARY_GENRE_MAX = 2;

function toList(value) {
  return value ? String(value).split(",").map((s) => s.trim()).filter(Boolean) : [];
}

export default function EditBand() {
  const router = useRouter();
  const { showAlert, AlertModal } = useAppAlert();

  const [loading, setLoading] = useState(true);
  const [photoUri, setPhotoUri] = useState(null); // resolved URL or newly picked local uri
  const [originalPhoto, setOriginalPhoto] = useState(""); // resolved URL we started with
  const [photoFailed, setPhotoFailed] = useState(false);
  const [bandName, setBandName] = useState("");
  const [description, setDescription] = useState("");
  const [barangay, setBarangay] = useState(null);
  const [primaryGenres, setPrimaryGenres] = useState([]);
  const [instruments, setInstruments] = useState([]); // band details → instruments
  const [bandDetails, setBandDetails] = useState(null); // saved details, for merge-save
  const [bandId, setBandId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [barangayModalOpen, setBarangayModalOpen] = useState(false);
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [instrumentModalOpen, setInstrumentModalOpen] = useState(false);

  useEffect(() => {
    getMyBand()
      .then((band) => {
        if (!band) return;
        const resolved = resolveUrl(band.photoUrl) || "";
        setOriginalPhoto(resolved);
        setPhotoUri(resolved || null);
        setBandName(band.name ?? "");
        setDescription(band.bio ?? "");
        setBarangay(band.location || null);
        setPrimaryGenres(toList(band.genre));
        setBandId(band.id ?? null);

        // Extra details (instruments live here, not on the band row).
        // Loaded so a save can send them back untouched.
        if (band.id) {
          getBandProfile(band.id)
            .then((details) => {
              setBandDetails(details);
              setInstruments(Array.isArray(details.instruments) ? details.instruments : []);
            })
            .catch((e) => console.log("getBandProfile error:", e.message));
        }
      })
      .catch((e) => console.log("getMyBand error:", e.message))
      .finally(() => setLoading(false));
  }, []);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert({
        icon: "image",
        tone: "warning",
        title: "Permission needed",
        message: "GigMatch needs access to your photos to change the band photo.",
      });
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
      setPhotoFailed(false);
    }
  };

  const toggleGenre = (item) => {
    setPrimaryGenres((prev) =>
      prev.includes(item)
        ? prev.filter((g) => g !== item)
        : prev.length >= PRIMARY_GENRE_MAX
          ? prev
          : [...prev, item]
    );
  };

  const toggleInstrument = (item) => {
    setInstruments((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const canSave =
    !loading &&
    bandName.trim().length > 0 &&
    description.trim().length > 0 &&
    barangay !== null &&
    primaryGenres.length > 0;

  const handleSave = async () => {
    if (!canSave) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Almost there",
        message: "Fill in the band name, description, location, and at least one primary genre.",
      });
      return;
    }
    setSaving(true);
    try {
      // Only re-upload when the photo was actually changed to a local file
      let photoUrl = originalPhoto;
      if (photoUri && photoUri !== originalPhoto && !/^https?:\/\//.test(photoUri)) {
        photoUrl = await uploadPhoto(photoUri);
      }

      await updateMyBand({
        name: bandName.trim(),
        bio: description.trim(),
        location: barangay,
        genre: primaryGenres.join(", "),
        photoUrl,
      });

      // Instruments live in the band's extra details (PUT /band-details/me
      // replaces every field, so the saved values are sent back untouched)
      const current = bandDetails ?? (bandId ? await getBandProfile(bandId) : null);
      await saveBandDetails({
        ...(current ?? {}),
        instruments,
      });

      showAlert({
        icon: "checkmark-circle",
        tone: "success",
        title: "Band updated",
        message: "Your changes have been saved.",
        buttons: [{ label: "OK", onPress: () => router.back() }],
      });
    } catch (err) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Couldn't save band",
        message: err.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const showPhoto = photoUri && /^https?:\/\//.test(photoUri) && !photoFailed;
  const isLocalPhoto = photoUri && !/^https?:\/\//.test(photoUri);

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <Text style={styles.topTitle}>Edit band profile</Text>
          <View style={{ width: 36 }} />
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Loading your band...</Text>
        ) : (
          <>
            {/* Photo */}
            <View style={styles.photoRow}>
              <Pressable onPress={pickPhoto} style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  {showPhoto || isLocalPhoto ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.avatarImage}
                      onError={() => setPhotoFailed(true)}
                    />
                  ) : (
                    <Ionicons name="people" size={28} color="#7c3aed" />
                  )}
                </View>
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={12} color="#fff" />
                </View>
              </Pressable>
              <Pressable onPress={pickPhoto} style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>
                  {photoUri ? "Change photo" : "Upload photo"}
                </Text>
              </Pressable>
            </View>

            {/* Band name */}
            <View style={styles.field}>
              <Text style={styles.label}>Band name</Text>
              <TextInput
                value={bandName}
                onChangeText={(v) => setBandName(v.replace(/[^A-Za-z\s]/g, "").slice(0, BAND_NAME_MAX))}
                placeholder="e.g. The Krizza Band"
                placeholderTextColor="#9ca3af"
                maxLength={BAND_NAME_MAX}
                style={styles.input}
              />
              <Text style={styles.charCount}>
                {bandName.length}/{BAND_NAME_MAX}
              </Text>
            </View>

            {/* Description */}
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

            {/* Location */}
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <Pressable onPress={() => setBarangayModalOpen(true)} style={styles.dropdownField}>
                <Text style={barangay ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {barangay ?? "Select barangay"}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
            </View>

            {/* Primary genres */}
            <View style={styles.field}>
              <Text style={styles.label}>Primary genre (up to {PRIMARY_GENRE_MAX})</Text>
              <View style={styles.chipRow}>
                {primaryGenres.map((item) => (
                  <Pressable key={item} onPress={() => toggleGenre(item)} style={styles.chipSelected}>
                    <Text style={styles.chipSelectedText}>{item}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setGenreModalOpen(true)} style={styles.chipAdd}>
                  <Text style={styles.chipAddText}>+ Add</Text>
                </Pressable>
              </View>
            </View>

            {/* Instruments (from the band's details — same list as the wizard) */}
            <View style={styles.field}>
              <Text style={styles.label}>Instruments</Text>
              <View style={styles.chipRow}>
                {instruments.length === 0 ? (
                  <Text style={styles.hintText}>No instruments picked yet</Text>
                ) : (
                  instruments.map((item) => (
                    <Pressable key={item} onPress={() => toggleInstrument(item)} style={styles.chipSelected}>
                      <Text style={styles.chipSelectedText}>{item}</Text>
                    </Pressable>
                  ))
                )}
                <Pressable onPress={() => setInstrumentModalOpen(true)} style={styles.chipAdd}>
                  <Text style={styles.chipAddText}>+ Add</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [pressed && canSave && styles.pressed]}
            >
              <LinearGradient
                colors={canSave ? ["#8b5cf6", "#d946ef"] : ["#e5e0f5", "#e5e0f5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={[styles.primaryButtonText, !canSave && styles.primaryButtonTextDisabled]}>
                  {saving ? "Saving..." : "Save changes"}
                </Text>
              </LinearGradient>
            </Pressable>
          </>
        )}
      </ScrollView>

      <SelectModal
        visible={barangayModalOpen}
        title="Select barangay"
        options={BARANGAYS}
        selected={barangay ? [barangay] : []}
        onSelect={(item) => { setBarangay(item); setBarangayModalOpen(false); }}
        onClose={() => setBarangayModalOpen(false)}
      />
      <SelectModal
        visible={genreModalOpen}
        title={`Primary genre (up to ${PRIMARY_GENRE_MAX})`}
        options={GENRES}
        selected={primaryGenres}
        multiple
        max={PRIMARY_GENRE_MAX}
        onToggle={toggleGenre}
        onClose={() => setGenreModalOpen(false)}
      />
      <SelectModal
        visible={instrumentModalOpen}
        title="Instruments"
        options={INSTRUMENTS}
        selected={instruments}
        multiple
        onToggle={toggleInstrument}
        onClose={() => setInstrumentModalOpen(false)}
      />

      {AlertModal}
    </KeyboardAvoidingView>
  );
}

function SelectModal({ visible, title, options, selected, multiple, max, onSelect, onToggle, onClose }) {
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
            const capped = multiple && !isSelected && max != null && selected.length >= max;
            return (
              <Pressable
                key={item}
                onPress={() => (multiple ? onToggle(item) : onSelect(item))}
                style={styles.modalRow}
              >
                <Text style={[styles.modalRowText, capped && styles.modalRowTextCapped]}>{item}</Text>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 60 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backButton: {
    height: 36, width: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center",
  },
  topTitle: { color: "#111827", fontSize: 17, fontWeight: "700" },
  loadingText: { color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 40 },

  photoRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 22 },
  avatarWrap: { position: "relative" },
  avatar: {
    height: 72, width: 72, borderRadius: 36, backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  cameraBadge: {
    position: "absolute", right: -2, bottom: -2, height: 24, width: 24, borderRadius: 12,
    backgroundColor: PURPLE, borderWidth: 2, borderColor: "#f8f7fb",
    alignItems: "center", justifyContent: "center",
  },
  uploadButton: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  uploadButtonText: { color: "#111827", fontSize: 13, fontWeight: "500" },

  field: { marginBottom: 18 },
  label: { color: "#111827", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827",
  },
  textarea: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12, padding: 14, fontSize: 14, color: "#111827", minHeight: 90, textAlignVertical: "top",
  },
  charCount: { color: "#9ca3af", fontSize: 11, marginTop: 4, textAlign: "right" },
  hintText: { color: "#9ca3af", fontSize: 12 },

  dropdownField: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  dropdownValue: { color: "#111827", fontSize: 14 },
  dropdownPlaceholder: { color: "#9ca3af", fontSize: 14 },
  chevron: { color: "#6b7280", fontSize: 16 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipSelected: {
    backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipSelectedText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  chipAdd: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipAddText: { color: "#374151", fontSize: 12, fontWeight: "500" },

  primaryButton: { marginTop: 6, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  primaryButtonTextDisabled: { color: "#a78bfa" },
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
  modalRowTextCapped: { color: "#9ca3af" },
  modalCheck: { color: PURPLE, fontSize: 14, fontWeight: "700" },
  modalDoneButtonWrap: { marginTop: 14 },
  modalDoneButton: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalDoneText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
