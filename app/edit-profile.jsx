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
import { getMyProfile, updateMyProfile, uploadPhoto, changePassword } from "../api";
 
// GigMatch — Edit profile (musician)
// Route: app/edit-profile.jsx  →  "/edit-profile"
// Editable: photo, stage name, barangay, instruments, genres, password.
 
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
 
const GENRES = [
  "OPM", "Pop", "Pop Rock", "Pinoy Rock", "Alternative Rock", "Indie Rock",
  "Acoustic", "R&B", "Soul", "Funk", "Jazz", "Blues", "Reggae", "Punk Rock",
  "Hard Rock", "Heavy Metal", "Folk", "Country", "Hip-Hop", "Rap", "Ballad",
  "Disco", "Dance", "Gospel", "Bossa Nova", "Latin", "Manila Sound",
  "Kundiman", "Novelty", "Christian Music",
];
 
const PASSWORD_MIN = 8;
const BIO_MAX = 255;
 
function toList(value) {
  return value ? String(value).split(",").filter(Boolean) : [];
}
 
export default function EditProfile() {
  const router = useRouter();
  const { showAlert, AlertModal } = useAppAlert();
 
  const [loading, setLoading] = useState(true);
  const [photoUri, setPhotoUri] = useState(null); // current URL or newly picked local uri
  const [photoFailed, setPhotoFailed] = useState(false);
  const [stageName, setStageName] = useState("");
  const [bio, setBio] = useState("");
  const [barangay, setBarangay] = useState(null);
  const [instruments, setInstruments] = useState([]);
  const [genres, setGenres] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
 
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState({ field: null, message: null });
  const [savingPassword, setSavingPassword] = useState(false);
 
  const [barangayModalOpen, setBarangayModalOpen] = useState(false);
  const [instrumentModalOpen, setInstrumentModalOpen] = useState(false);
  const [genreModalOpen, setGenreModalOpen] = useState(false);
 
  useEffect(() => {
    getMyProfile()
      .then((me) => {
        setPhotoUri(me.photoUrl || null);
        setStageName(me.stageName ?? "");
        setBio(me.bio ?? "");
        setBarangay(me.barangay || null);
        setInstruments(toList(me.instruments));
        setGenres(toList(me.genres));
      })
      .catch((e) => console.log("getMyProfile error:", e.message))
      .finally(() => setLoading(false));
  }, []);
 
  const toggle = (setList) => (item) =>
    setList((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  const toggleInstrument = toggle(setInstruments);
  const toggleGenre = toggle(setGenres);
 
  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert({
        icon: "image",
        tone: "warning",
        title: "Permission needed",
        message: "GigMatch needs access to your photos to change your profile picture.",
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
 
  const canSaveProfile =
    bio.trim().length > 0 && barangay !== null && instruments.length > 0 && genres.length > 0;
 
  const handleSaveProfile = async () => {
    if (!canSaveProfile) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Almost there",
        message: "Add a bio, pick a barangay, and choose at least one instrument and one genre.",
      });
      return;
    }
    setSavingProfile(true);
    try {
      let photoUrl = photoUri ?? "";
      if (photoUri && !/^https?:\/\//.test(photoUri)) {
        photoUrl = await uploadPhoto(photoUri);
      }
      await updateMyProfile({
        stageName: stageName.trim(),
        bio: bio.trim(),
        barangay,
        instruments: instruments.join(","),
        genres: genres.join(","),
        photoUrl,
      });
      showAlert({
        icon: "checkmark-circle",
        tone: "success",
        title: "Profile updated",
        message: "Your changes have been saved.",
        buttons: [{ label: "OK", onPress: () => router.back() }],
      });
    } catch (err) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Couldn't save profile",
        message: err.message || "Please try again.",
      });
    } finally {
      setSavingProfile(false);
    }
  };
 
  const handleChangePassword = async () => {
    setPasswordError({ field: null, message: null });
    if (!currentPassword) {
      setPasswordError({ field: "currentPassword", message: "Enter your current password." });
      return;
    }
    if (newPassword.length < PASSWORD_MIN) {
      setPasswordError({
        field: "newPassword",
        message: `New password must be at least ${PASSWORD_MIN} characters.`,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError({ field: "confirmPassword", message: "Passwords don't match." });
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showAlert({
        icon: "checkmark-circle",
        tone: "success",
        title: "Password changed",
        message: "Use your new password the next time you log in.",
      });
    } catch (err) {
      setPasswordError({ field: err.field ?? null, message: err.message || "Couldn't change password." });
    } finally {
      setSavingPassword(false);
    }
  };
 
  const showPhoto = photoUri && !photoFailed;
  const pwError = (field) => (passwordError.field === field ? passwordError.message : null);
 
  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <Text style={styles.topTitle}>Edit profile</Text>
          <View style={{ width: 36 }} />
        </View>
 
        {loading ? (
          <Text style={styles.loadingText}>Loading your profile...</Text>
        ) : (
          <>
            {/* Photo */}
            <View style={styles.photoRow}>
              <Pressable onPress={pickPhoto} style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  {showPhoto ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.avatarImage}
                      onError={() => setPhotoFailed(true)}
                    />
                  ) : (
                    <Ionicons name="person" size={28} color="#7c3aed" />
                  )}
                </View>
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={12} color="#fff" />
                </View>
              </Pressable>
              <Pressable onPress={pickPhoto} style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>Change photo</Text>
              </Pressable>
            </View>
 
            {/* Stage name */}
            <View style={styles.field}>
              <Text style={styles.label}>Stage name</Text>
              <TextInput
                value={stageName}
                onChangeText={setStageName}
                placeholder="e.g. DJ Rivera"
                placeholderTextColor="#9ca3af"
                maxLength={40}
                style={styles.input}
              />
            </View>
 
            {/* Bio */}
            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
                placeholder="Tell people about your style and experience"
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={BIO_MAX}
                style={styles.textarea}
              />
              <Text style={styles.charCount}>
                {bio.length}/{BIO_MAX}
              </Text>
            </View>
 
            {/* Barangay */}
            <View style={styles.field}>
              <Text style={styles.label}>Barangay</Text>
              <Pressable onPress={() => setBarangayModalOpen(true)} style={styles.dropdownField}>
                <Text style={barangay ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {barangay ?? "Select barangay"}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
            </View>
 
            {/* Instruments */}
            <View style={styles.field}>
              <Text style={styles.label}>Instrument(s)</Text>
              <View style={styles.chipRow}>
                {instruments.map((item) => (
                  <Pressable key={item} onPress={() => toggleInstrument(item)} style={styles.chipSelected}>
                    <Text style={styles.chipSelectedText}>{item}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setInstrumentModalOpen(true)} style={styles.chipAdd}>
                  <Text style={styles.chipAddText}>+ Add</Text>
                </Pressable>
              </View>
            </View>
 
            {/* Genres */}
            <View style={styles.field}>
              <Text style={styles.label}>Genres</Text>
              <View style={styles.chipRow}>
                {genres.map((item) => (
                  <Pressable key={item} onPress={() => toggleGenre(item)} style={styles.chipSelected}>
                    <Text style={styles.chipSelectedText}>{item}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setGenreModalOpen(true)} style={styles.chipAdd}>
                  <Text style={styles.chipAddText}>+ Add</Text>
                </Pressable>
              </View>
            </View>
 
            <Pressable
              onPress={handleSaveProfile}
              disabled={savingProfile}
              style={({ pressed }) => [pressed && canSaveProfile && styles.pressed]}
            >
              <LinearGradient
                colors={canSaveProfile ? ["#8b5cf6", "#d946ef"] : ["#e5e0f5", "#e5e0f5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={[styles.primaryButtonText, !canSaveProfile && styles.primaryButtonTextDisabled]}>
                  {savingProfile ? "Saving..." : "Save changes"}
                </Text>
              </LinearGradient>
            </Pressable>
 
            {/* Change password */}
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Change password</Text>
 
            <View style={styles.field}>
              <Text style={styles.label}>Current password</Text>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Current password"
                placeholderTextColor="#9ca3af"
                style={[styles.input, pwError("currentPassword") && styles.inputError]}
              />
              {pwError("currentPassword") ? <Text style={styles.errorText}>{pwError("currentPassword")}</Text> : null}
            </View>
 
            <View style={styles.field}>
              <Text style={styles.label}>New password</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder={`At least ${PASSWORD_MIN} characters`}
                placeholderTextColor="#9ca3af"
                style={[styles.input, pwError("newPassword") && styles.inputError]}
              />
              {pwError("newPassword") ? <Text style={styles.errorText}>{pwError("newPassword")}</Text> : null}
            </View>
 
            <View style={styles.field}>
              <Text style={styles.label}>Confirm new password</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Repeat new password"
                placeholderTextColor="#9ca3af"
                style={[styles.input, pwError("confirmPassword") && styles.inputError]}
              />
              {pwError("confirmPassword") ? <Text style={styles.errorText}>{pwError("confirmPassword")}</Text> : null}
            </View>
 
            {passwordError.message && !passwordError.field ? (
              <Text style={styles.errorText}>{passwordError.message}</Text>
            ) : null}
 
            <Pressable onPress={handleChangePassword} disabled={savingPassword} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>
                {savingPassword ? "Updating..." : "Update password"}
              </Text>
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
        visible={instrumentModalOpen}
        title="Instrument(s)"
        options={INSTRUMENTS}
        selected={instruments}
        multiple
        onToggle={toggleInstrument}
        onClose={() => setInstrumentModalOpen(false)}
      />
      <SelectModal
        visible={genreModalOpen}
        title="Genres"
        options={GENRES}
        selected={genres}
        multiple
        onToggle={toggleGenre}
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
  inputError: { borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.05)" },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 6 },
 
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
 
  divider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 28 },
  sectionTitle: { color: "#111827", fontSize: 16, fontWeight: "700", marginBottom: 16 },
  secondaryButton: {
    borderWidth: 1, borderColor: "rgba(124,58,237,0.4)", borderRadius: 14,
    paddingVertical: 14, alignItems: "center", marginTop: 4,
  },
  secondaryButtonText: { color: PURPLE, fontSize: 14, fontWeight: "700" },
 
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
 


















