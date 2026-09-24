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
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

// GigMatch — onboarding step 3: "Set up your profile" (Event Organizer / Client)
// Route: app/profile-setup-organizer.jsx  →  "/profile-setup-organizer"
// Flow: sign-up (step 1) → role-select (step 2, role = "organizer") → this screen (step 3, final).
// Requires:
//   npx expo install expo-image-picker --legacy-peer-deps
//   npx expo install @react-native-community/datetimepicker --legacy-peer-deps
// Update HOME_ROUTE once your main app / dashboard route exists.

const HOME_ROUTE = "/dashboard-client";

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

const POSITIONS = [
  "Event Organizer",
  "Event Coordinator",
  "Event Manager",
  "Organization President",
  "Committee Head",
  "Owner/Founder",
  "Representative",
  "Other",
];

const BARANGAYS = [
  "Apokon", "Babu Pangir", "Busaon", "Canocotan", "Cuambogan", "La Filipina",
  "Liboganon", "Madaum", "Magdum", "Magugpo Pob", "Magugpo East",
  "Magugpo North", "Magugpo South", "Magugpo West", "Mankilam",
  "New Balamban", "Nueva Fuerza", "Pagsabangan", "Pandapan", "San Agustin",
  "San Isidro", "San Miguel", "Visayan Village",
];

const BIO_MAX = 255;

function formatDate(date) {
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProfileSetupOrganizer() {
  const router = useRouter();
  const { role } = useLocalSearchParams();

  const [photoUri, setPhotoUri] = useState(null);
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState(null);
  const [birthday, setBirthday] = useState(null);
  const [position, setPosition] = useState(null);
  const [barangay, setBarangay] = useState(null);

  const [genderModalOpen, setGenderModalOpen] = useState(false);
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [barangayModalOpen, setBarangayModalOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "GigMatch needs access to your photos to set a profile picture."
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

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios"); // iOS keeps the sheet open until Done
    if (event.type === "dismissed") return;
    if (selectedDate) setBirthday(selectedDate);
  };

  const canFinish =
    bio.trim().length > 0 &&
    gender !== null &&
    birthday !== null &&
    position !== null &&
    barangay !== null;

  const handleFinish = () => {
    if (!canFinish) {
      Alert.alert(
        "Almost there",
        "Fill in your bio, gender, birthday, position, and barangay."
      );
      return;
    }
    router.replace({
      pathname: HOME_ROUTE,
      params: { role, position, barangay },
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
            <Text style={styles.heading}>Set up your profile</Text>
            <Text style={styles.subheading}>
              This helps musicians and bands know who they're working with.
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

            {/* Bio */}
            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
                placeholder="Tell musicians about the events you run"
                placeholderTextColor="rgba(255,255,255,0.45)"
                multiline
                maxLength={BIO_MAX}
                style={styles.textarea}
              />
              <Text style={styles.charCount}>
                {bio.length}/{BIO_MAX}
              </Text>
            </View>

            {/* Gender — dropdown */}
            <View style={styles.field}>
              <Text style={styles.label}>Gender</Text>
              <Pressable onPress={() => setGenderModalOpen(true)} style={styles.dropdownField}>
                <Text style={gender ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {gender ?? "Select gender"}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
            </View>

            {/* Birthday — date picker */}
            <View style={styles.field}>
              <Text style={styles.label}>Birthday</Text>
              <Pressable onPress={() => setShowDatePicker(true)} style={styles.dropdownField}>
                <Text style={birthday ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {formatDate(birthday) ?? "Select birthday"}
                </Text>
                <Text style={styles.chevron}>📅</Text>
              </Pressable>
              {showDatePicker ? (
                <DateTimePicker
                  value={birthday ?? new Date(2000, 0, 1)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={onChangeDate}
                />
              ) : null}
            </View>

            {/* Position — dropdown */}
            <View style={styles.field}>
              <Text style={styles.label}>Position</Text>
              <Pressable onPress={() => setPositionModalOpen(true)} style={styles.dropdownField}>
                <Text style={position ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {position ?? "Select position"}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
            </View>

            {/* Barangay — dropdown */}
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <Pressable onPress={() => setBarangayModalOpen(true)} style={styles.dropdownField}>
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

      {/* Gender picker modal */}
      <SelectModal
        visible={genderModalOpen}
        title="Gender"
        options={GENDERS}
        selected={gender ? [gender] : []}
        onSelect={(item) => {
          setGender(item);
          setGenderModalOpen(false);
        }}
        onClose={() => setGenderModalOpen(false)}
      />

      {/* Position picker modal */}
      <SelectModal
        visible={positionModalOpen}
        title="Position"
        options={POSITIONS}
        selected={position ? [position] : []}
        onSelect={(item) => {
          setPosition(item);
          setPositionModalOpen(false);
        }}
        onClose={() => setPositionModalOpen(false)}
      />

      {/* Barangay picker modal */}
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
    </View>
  );
}

function SelectModal({ visible, title, options, selected, onSelect, onClose }) {
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
              <Pressable key={item} onPress={() => onSelect(item)} style={styles.modalRow}>
                <Text style={styles.modalRowText}>{item}</Text>
                {isSelected ? <Text style={styles.modalCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
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

  finishButton: { marginTop: 10, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  finishButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  finishButtonTextDisabled: { color: "rgba(255,255,255,0.5)" },
  pressed: { opacity: 0.9 },

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
  modalTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalClose: { color: "rgba(255,255,255,0.6)", fontSize: 16 },
  modalList: { maxHeight: 360 },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  modalRowText: { color: "#fff", fontSize: 14 },
  modalCheck: { color: "#d8b4fe", fontSize: 14, fontWeight: "700" },
});