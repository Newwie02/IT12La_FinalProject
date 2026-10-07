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
import { useAppAlert } from "../components/useAppAlert";
import { createBand, uploadPhoto } from "../api";


// GigMatch — Create a band (2-step wizard, no backend yet)
// Route: app/create-band.jsx  →  "/create-band"
// Step 1: band basics. Step 2: music info, event types, and songs.
//
// Songs are added on a separate screen (app/add-song.jsx). Since there's
// no global state, all of step 2's in-progress fields are passed to
// add-song as params and passed straight back on Cancel/Add song, along
// with a resumeStep="2" flag, so nothing typed gets lost crossing screens.

const BAND_TYPES = [
  "Cover Band", "Original Band", "Acoustic Band", "Tribute Band",
  "Wedding / Events Band", "Other",
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
  "Lead Guitar", "Rhythm Guitar", "Bass Guitar", "Drums",
  "Keyboard", "Vocals", "Other Instruments",
];

const LANGUAGES = ["Bisaya", "Tagalog", "English"];

const EVENT_TYPES = [
  "Birthday", "Wedding", "Concert", "Festival",
  "Corporate Event", "School Event", "Private Event", "Bar / Restaurant",
];

const DESCRIPTION_MAX = 255;
const BAND_NAME_MAX = 30;
const PRIMARY_GENRE_MAX = 2;
const SECONDARY_GENRE_MAX = 5;

function todayFormatted() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function parseList(param) {
  return param ? param.split(",").filter(Boolean) : [];
}

function parseSongs(param) {
  if (!param) return [];
  try {
    return JSON.parse(param);
  } catch {
    return [];
  }
}

export default function CreateBand() {
  const router = useRouter();
  const p = useLocalSearchParams();
  const { showAlert, AlertModal } = useAppAlert();

  const [step, setStep] = useState(p.resumeStep === "2" ? 2 : 1);

  // Step 1 — restored from params if we're resuming from add-song
  const [bandName, setBandName] = useState(p.bandName ?? "");
  const [photoUri, setPhotoUri] = useState(p.bandPhotoUri || null);
  const [description, setDescription] = useState(p.bandDescription ?? "");
  const [barangay, setBarangay] = useState(p.bandLocation ?? null);
  const [bandType, setBandType] = useState(p.bandType ?? null);
  const [barangayModalOpen, setBarangayModalOpen] = useState(false);
  const [bandTypeModalOpen, setBandTypeModalOpen] = useState(false);
  const dateJoined = p.dateJoined || todayFormatted();

  // Step 2
  const [languages, setLanguages] = useState(parseList(p.languages));
  const [musicalStyle, setMusicalStyle] = useState(p.musicalStyle ?? "");
  const [bandInstruments, setBandInstruments] = useState(parseList(p.bandInstruments));
  const [primaryGenres, setPrimaryGenres] = useState(parseList(p.primaryGenres));
  const [secondaryGenres, setSecondaryGenres] = useState(parseList(p.secondaryGenres));
  const [eventTypes, setEventTypes] = useState(parseList(p.eventTypes));
  const [songs, setSongs] = useState(parseSongs(p.songs));

  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [instrumentModalOpen, setInstrumentModalOpen] = useState(false);
  const [primaryGenreModalOpen, setPrimaryGenreModalOpen] = useState(false);
  const [secondaryGenreModalOpen, setSecondaryGenreModalOpen] = useState(false);
  const [eventTypeModalOpen, setEventTypeModalOpen] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert({
        icon: "image",
        tone: "warning",
        title: "Permission needed",
        message: "GigMatch needs access to your photos to set a band photo.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) setPhotoUri(result.assets[0].uri);
  };

  const toggleWithCap = (list, setList, item, max, label) => {
    const has = list.includes(item);
    if (has) {
      setList(list.filter((i) => i !== item));
      return;
    }
    if (max && list.length >= max) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Limit reached",
        message: `You can select up to ${max} ${label}.`,
      });
      return;
    }
    setList([...list, item]);
  };

  const canContinueStep1 =
    bandName.trim().length > 0 &&
    description.trim().length > 0 &&
    barangay !== null &&
    bandType !== null;

  const canFinish = primaryGenres.length > 0 && bandInstruments.length > 0;

  const handleContinue = () => {
    if (!canContinueStep1) return;
    setStep(2);
  };

  const buildContextParams = (overrides = {}) => ({
    fullName: p.fullName,
    instruments: p.instruments,
    genres: p.genres,
    bandName,
    bandPhotoUri: photoUri ?? "",
    bandDescription: description,
    dateJoined,
    bandLocation: barangay,
    bandType,
    languages: languages.join(","),
    musicalStyle,
    bandInstruments: bandInstruments.join(","),
    primaryGenres: primaryGenres.join(","),
    secondaryGenres: secondaryGenres.join(","),
    eventTypes: eventTypes.join(","),
    songs: JSON.stringify(songs),
    resumeStep: "2",
    ...overrides,
  });

  const goToAddSong = () => {
    router.push({ pathname: "/add-song", params: buildContextParams() });
  };

  const removeSong = (id) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
  };


const [saving, setSaving] = useState(false);

const handleFinish = async () => {
  if (!canFinish) {
    showAlert({
      icon: "alert-circle",
      tone: "warning",
      title: "Almost there",
      message: "Pick at least one primary genre and at least one instrument.",
    });
    return;
  }

   setSaving(true);
  try {
    // Upload first so we save a real URL, not a blob:/file: path
    let photoUrl = "";
    if (photoUri) {
      photoUrl = /^https?:\/\//.test(photoUri) ? photoUri : await uploadPhoto(photoUri);
    }

    await createBand({
      name: bandName.trim(),
      genre: primaryGenres.join(", "),
      location: barangay,
      bio: description.trim(),
      photoUrl,
    });

    router.replace({
      pathname: "/dashboard-band",
      params: {
        fullName: p.fullName,
        instruments: p.instruments,
        genres: p.genres,
        bandName: bandName.trim(),
        bandPhotoUri: photoUrl,
        bandDescription: description.trim(),
        dateJoined,
        bandLocation: barangay,
        bandType,
        languages: languages.join(","),
        musicalStyle: musicalStyle.trim(),
        bandInstruments: bandInstruments.join(","),
        primaryGenres: primaryGenres.join(","),
        secondaryGenres: secondaryGenres.join(","),
        eventTypes: eventTypes.join(","),
        songs: JSON.stringify(songs),
      },
    });
  } catch (err) {
    showAlert({
      icon: "alert-circle",
      tone: "warning",
      title: "Couldn't create band",
      message: err.message || "Something went wrong. Please try again.",
    });
  } finally {
    setSaving(false);
  }
};



 /* const handleFinish = () => {
    if (!canFinish) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Almost there",
        message: "Pick at least one primary genre and at least one instrument.",
      });
      return;
    }
    router.replace({
      pathname: "/dashboard-band",
      params: {
        fullName: p.fullName,
        instruments: p.instruments,
        genres: p.genres,
        bandName: bandName.trim(),
        bandPhotoUri: photoUri ?? "",
        bandDescription: description.trim(),
        dateJoined,
        bandLocation: barangay,
        bandType,
        languages: languages.join(","),
        musicalStyle: musicalStyle.trim(),
        bandInstruments: bandInstruments.join(","),
        primaryGenres: primaryGenres.join(","),
        secondaryGenres: secondaryGenres.join(","),
        eventTypes: eventTypes.join(","),
        songs: JSON.stringify(songs),
      },
    });
  };*/

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
              <Text style={styles.label}>Date joined</Text>
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

            {/* Languages performed — dropdown, multi-select */}
            <View style={styles.field}>
              <Text style={styles.label}>Languages performed</Text>
              <View style={styles.chipRow}>
                {languages.map((item) => (
                  <Pressable key={item} onPress={() => toggleWithCap(languages, setLanguages, item)} style={styles.chipSelected}>
                    <Text style={styles.chipSelectedText}>{item}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setLanguageModalOpen(true)} style={styles.chipAdd}>
                  <Text style={styles.chipAddText}>+ Add</Text>
                </Pressable>
              </View>
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

            {/* Instruments — dropdown, multi-select */}
            <View style={styles.field}>
              <Text style={styles.label}>Instrument</Text>
              <View style={styles.chipRow}>
                {bandInstruments.map((item) => (
                  <Pressable key={item} onPress={() => toggleWithCap(bandInstruments, setBandInstruments, item)} style={styles.chipSelected}>
                    <Text style={styles.chipSelectedText}>{item}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setInstrumentModalOpen(true)} style={styles.chipAdd}>
                  <Text style={styles.chipAddText}>+ Add</Text>
                </Pressable>
              </View>
            </View>

            {/* Primary genre — dropdown, multi-select, max 2 */}
            <View style={styles.field}>
              <Text style={styles.label}>Primary genre (up to {PRIMARY_GENRE_MAX})</Text>
              <View style={styles.chipRow}>
                {primaryGenres.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => toggleWithCap(primaryGenres, setPrimaryGenres, item, PRIMARY_GENRE_MAX, "primary genres")}
                    style={styles.chipSelected}
                  >
                    <Text style={styles.chipSelectedText}>{item}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setPrimaryGenreModalOpen(true)} style={styles.chipAdd}>
                  <Text style={styles.chipAddText}>+ Add</Text>
                </Pressable>
              </View>
            </View>

            {/* Secondary genre — dropdown, multi-select, max 5 */}
            <View style={styles.field}>
              <Text style={styles.label}>Secondary genre (up to {SECONDARY_GENRE_MAX})</Text>
              <View style={styles.chipRow}>
                {secondaryGenres.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => toggleWithCap(secondaryGenres, setSecondaryGenres, item, SECONDARY_GENRE_MAX, "secondary genres")}
                    style={styles.chipSelected}
                  >
                    <Text style={styles.chipSelectedText}>{item}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setSecondaryGenreModalOpen(true)} style={styles.chipAdd}>
                  <Text style={styles.chipAddText}>+ Add</Text>
                </Pressable>
              </View>
            </View>

            {/* Available event types — dropdown, multi-select */}
            <View style={styles.field}>
              <Text style={styles.label}>Available event types</Text>
              <View style={styles.chipRow}>
                {eventTypes.map((item) => (
                  <Pressable key={item} onPress={() => toggleWithCap(eventTypes, setEventTypes, item)} style={styles.chipSelected}>
                    <Text style={styles.chipSelectedText}>{item}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setEventTypeModalOpen(true)} style={styles.chipAdd}>
                  <Text style={styles.chipAddText}>+ Add</Text>
                </Pressable>
              </View>
            </View>

            {/* Songs */}
            <View style={styles.field}>
              <Text style={styles.label}>Songs</Text>
              {songs.length > 0 ? (
                <View style={{ gap: 8, marginBottom: 10 }}>
                  {songs.map((song) => (
                    <View key={song.id} style={styles.songRow}>
                      <View style={styles.songTypeBadge}>
                        <Text style={styles.songTypeBadgeText}>
                          {song.type === "cover" ? "Cover" : "Original"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.songTitle}>{song.title}</Text>
                        <Text style={styles.songArtist}>{song.artist}</Text>
                      </View>
                      <Pressable onPress={() => removeSong(song.id)} hitSlop={8}>
                        <Ionicons name="close-circle" size={20} color="#9ca3af" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <Pressable onPress={goToAddSong} style={styles.addSongButton}>
                <Ionicons name="add-circle-outline" size={18} color="#7c3aed" />
                <Text style={styles.addSongButtonText}>Add song</Text>
              </Pressable>
            </View>

            <Pressable onPress={handleFinish} disabled={saving} style={({ pressed }) => [pressed && canFinish && styles.pressed]}>
              <LinearGradient
                colors={canFinish ? ["#8b5cf6", "#d946ef"] : ["#e5e0f5", "#e5e0f5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={[styles.primaryButtonText, !canFinish && styles.primaryButtonTextDisabled]}>
               {saving ? "Creating band..." : "GO to dashboard (Band)"}
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
        visible={bandTypeModalOpen}
        title="Band type"
        options={BAND_TYPES}
        selected={bandType ? [bandType] : []}
        onSelect={(item) => { setBandType(item); setBandTypeModalOpen(false); }}
        onClose={() => setBandTypeModalOpen(false)}
      />
      <SelectModal
        visible={languageModalOpen}
        title="Languages performed"
        options={LANGUAGES}
        selected={languages}
        multiple
        onToggle={(item) => toggleWithCap(languages, setLanguages, item)}
        onClose={() => setLanguageModalOpen(false)}
      />
      <SelectModal
        visible={instrumentModalOpen}
        title="Instrument"
        options={BAND_INSTRUMENTS}
        selected={bandInstruments}
        multiple
        onToggle={(item) => toggleWithCap(bandInstruments, setBandInstruments, item)}
        onClose={() => setInstrumentModalOpen(false)}
      />
      <SelectModal
        visible={primaryGenreModalOpen}
        title={`Primary genre (up to ${PRIMARY_GENRE_MAX})`}
        options={GENRES}
        selected={primaryGenres}
        multiple
        onToggle={(item) => toggleWithCap(primaryGenres, setPrimaryGenres, item, PRIMARY_GENRE_MAX, "primary genres")}
        onClose={() => setPrimaryGenreModalOpen(false)}
      />
      <SelectModal
        visible={secondaryGenreModalOpen}
        title={`Secondary genre (up to ${SECONDARY_GENRE_MAX})`}
        options={GENRES}
        selected={secondaryGenres}
        multiple
        onToggle={(item) => toggleWithCap(secondaryGenres, setSecondaryGenres, item, SECONDARY_GENRE_MAX, "secondary genres")}
        onClose={() => setSecondaryGenreModalOpen(false)}
      />
      <SelectModal
        visible={eventTypeModalOpen}
        title="Available event types"
        options={EVENT_TYPES}
        selected={eventTypes}
        multiple
        onToggle={(item) => toggleWithCap(eventTypes, setEventTypes, item)}
        onClose={() => setEventTypeModalOpen(false)}
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  backButton: {
    height: 36, width: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center",
  },
  stepLabel: { color: "#6b7280", fontSize: 12, fontWeight: "500" },

  progressRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  progressSegment: { flex: 1, height: 4, borderRadius: 999, backgroundColor: "#e5e7eb" },
  progressFilled: { backgroundColor: PURPLE },

  title: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#6b7280", fontSize: 13, lineHeight: 19, marginBottom: 22 },

  photoRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  avatar: {
    height: 64, width: 64, borderRadius: 32, backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  uploadButton: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  uploadButtonText: { color: "#111827", fontSize: 13, fontWeight: "500" },

  field: { marginBottom: 18 },
  label: { color: "#111827", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#111827",
  },
  textarea: {
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, padding: 14, fontSize: 14, color: "#111827", minHeight: 90, textAlignVertical: "top",
  },
  charCount: { color: "#9ca3af", fontSize: 11, marginTop: 4, textAlign: "right" },

  dropdownField: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.1)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  readOnlyField: { opacity: 0.7 },
  dropdownValue: { color: "#111827", fontSize: 14 },
  dropdownPlaceholder: { color: "#9ca3af", fontSize: 14 },
  chevron: { color: "#6b7280", fontSize: 16 },

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

  songRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12, padding: 10,
  },
  songTypeBadge: {
    backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  songTypeBadgeText: { color: PURPLE, fontSize: 10, fontWeight: "700" },
  songTitle: { color: "#111827", fontSize: 13, fontWeight: "700" },
  songArtist: { color: "#9ca3af", fontSize: 11, marginTop: 1 },

  addSongButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1, borderColor: "rgba(124,58,237,0.3)", borderRadius: 14, paddingVertical: 12,
  },
  addSongButtonText: { color: PURPLE, fontSize: 13, fontWeight: "600" },

  primaryButton: { marginTop: 10, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
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
  modalCheck: { color: PURPLE, fontSize: 14, fontWeight: "700" },
  modalDoneButtonWrap: { marginTop: 14 },
  modalDoneButton: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  modalDoneText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});