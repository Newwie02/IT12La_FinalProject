import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getMyProfile, uploadPhoto, requestVerification, resolveUrl } from "../api";
import { useAppAlert } from "../components/useAppAlert";

// GigMatch — ID verification (the member-facing side of the verified badge).
// Route: app/verification.jsx  →  "/verification"
// Opened from the profile/settings menu on every role (musician, client, band).
//
// The account states come straight from the server, which already returns them
// on GET /users/me:
//
//   unverified → offer to attach an ID photo
//   pending    → in the admin queue, waiting for review
//   approved   → verified badge is live on the profile
//   rejected   → not approved, with the reviewer's reason, and they can retry
//
// Submitting uploads the photo with the existing POST /upload, then hands the
// URL to POST /users/me/verification. The admin reviews it in their queue and
// the outcome arrives back as a notification.

const PURPLE = "#7c3aed";

// Per-state copy and colours. `verified` is a separate boolean from
// verificationStatus, so "approved AND verified" is what counts as live.
function stateFor(me) {
  if (me?.verificationStatus === "approved" && me?.verified) {
    return {
      key: "approved",
      icon: "shield-checkmark",
      color: "#16a34a",
      tint: "rgba(34,197,94,0.12)",
      title: "ID Verified",
      subtitle: "Your identity has been confirmed by our review team. The verified badge shows on your profile.",
      canRequest: false,
    };
  }
  if (me?.verificationStatus === "pending") {
    return {
      key: "pending",
      icon: "time-outline",
      color: "#d97706",
      tint: "rgba(217,119,6,0.14)",
      title: "Waiting for review",
      subtitle:
        "Your ID is with our review team. You'll get a notification as soon as it's been checked.",
      canRequest: false,
    };
  }
  if (me?.verificationStatus === "rejected") {
    return {
      key: "rejected",
      icon: "shield-half-outline",
      color: "#dc2626",
      tint: "rgba(220,38,38,0.1)",
      title: "Not approved",
      subtitle:
        "Your ID couldn't be accepted. Check the reason below, use a clearer photo, and you can submit again.",
      canRequest: true,
    };
  }
  return {
    key: "unverified",
    icon: "shield-outline",
    color: PURPLE,
    tint: "rgba(124,58,237,0.1)",
    title: "Get verified",
    subtitle:
      "Add a photo of a valid ID. Our review team checks it and, once approved, a verified badge appears on your profile so others know you're a real person.",
    canRequest: true,
  };
}

function formatStamp(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Verification() {
  const router = useRouter();
  const { showAlert, AlertModal } = useAppAlert();

  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const [photoUri, setPhotoUri] = useState(null); // locally picked, not yet uploaded
  const [photoFailed, setPhotoFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMe(await getMyProfile());
    } catch (err) {
      setError(err.message || "Couldn't load your verification status.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const state = stateFor(me);
  const submittedDoc = resolveUrl(me?.idDocUrl);
  const reviewedAt = formatStamp(me?.verificationReviewedAt);
  const requestedAt = formatStamp(me?.verificationRequestedAt);

  const pickIdPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert({
        icon: "image",
        tone: "warning",
        title: "Permission needed",
        message: "GigMatch needs access to your photos so you can attach your ID.",
      });
      return;
    }
    // No cropping on an ID: `allowsEditing` would let the frame cut off the
    // details the reviewer actually needs to see.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotoUri(result.assets[0].uri);
      setPhotoFailed(false);
    }
  };

  const submit = () => {
    if (!photoUri) return;
    showAlert({
      icon: "shield-checkmark",
      tone: "success",
      title: "Submit for review?",
      message:
        "Our team will check your ID. You'll get a notification with the result, and you can still use GigMatch while you wait.",
      buttons: [
        { label: "Cancel", style: "secondary" },
        { label: "Submit", onPress: doSubmit },
      ],
    });
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      // Reuse the existing upload endpoint; it validates the file is an image.
      const idDocUrl = await uploadPhoto(photoUri);
      await requestVerification(idDocUrl);
      setPhotoUri(null);
      await load();
      showAlert({
        icon: "checkmark-circle",
        tone: "success",
        title: "Request submitted",
        message: "Your ID is now waiting for review. We'll notify you with the result.",
      });
    } catch (err) {
      showAlert({
        icon: "alert-circle",
        tone: "warning",
        title: "Couldn't submit",
        message: err.message || "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.backRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        </View>

        <Text style={styles.heading}>ID Verification</Text>

        {error ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : me === null ? (
          <View style={{ alignItems: "center", padding: 40 }}>
            <ActivityIndicator color={PURPLE} size="large" />
          </View>
        ) : (
          <>
            {/* --- Current status ------------------------------------- */}
            <View style={[styles.card, styles.statusCard, { borderColor: state.tint }]}>
              <View style={[styles.statusIconWrap, { backgroundColor: state.tint }]}>
                <Ionicons name={state.icon} size={30} color={state.color} />
              </View>
              <Text style={[styles.statusTitle, { color: state.color }]}>{state.title}</Text>
              <Text style={styles.statusSubtitle}>{state.subtitle}</Text>

              {state.key === "pending" && requestedAt ? (
                <Text style={styles.meta}>Submitted {requestedAt}</Text>
              ) : null}
              {state.key === "approved" && reviewedAt ? (
                <Text style={styles.meta}>Verified on {reviewedAt}</Text>
              ) : null}
            </View>

            {/* --- The reviewer's reason, when there is one ------------- */}
            {state.key === "rejected" && me.verificationNote ? (
              <View style={styles.reasonCard}>
                <Text style={styles.reasonLabel}>Reason given</Text>
                <Text style={styles.reasonText}>{me.verificationNote}</Text>
              </View>
            ) : null}

            {/* --- Submitting an ID ----------------------------------- */}
            {state.canRequest ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Photo of your ID</Text>
                <Text style={styles.sectionHint}>
                  A government or school ID works best. Make sure all four corners and the text are
                  readable.
                </Text>

                <Pressable onPress={pickIdPhoto} style={styles.pickButton}>
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={styles.idPreview} resizeMode="cover" />
                  ) : submittedDoc && /^https?:\/\//.test(submittedDoc) && !photoFailed ? (
                    <Image
                      source={{ uri: submittedDoc }}
                      style={styles.idPreview}
                      resizeMode="cover"
                      onError={() => setPhotoFailed(true)}
                    />
                  ) : (
                    <View style={styles.pickEmpty}>
                      <Ionicons name="cloud-upload-outline" size={26} color={PURPLE} />
                      <Text style={styles.pickEmptyText}>Choose ID photo</Text>
                    </View>
                  )}
                </Pressable>

                <Text style={styles.meta}>
                  {photoUri
                    ? "New photo selected — it hasn't been sent yet."
                    : submittedDoc && state.key === "rejected"
                    ? "Showing the ID you sent last time. Pick a new one to try again."
                    : null}
                </Text>

                <Pressable onPress={submit} disabled={!photoUri || submitting} style={{ marginTop: 14 }}>
                  <LinearGradient
                    colors={["#8b5cf6", "#d946ef"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.submitButton, (!photoUri || submitting) && { opacity: 0.5 }]}
                  >
                    <Text style={styles.submitText}>
                      {submitting ? "Submitting…" : state.key === "rejected" ? "Submit again" : "Submit for review"}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>What happens next</Text>
                <Text style={styles.sectionHint}>
                  You don't need to do anything else. If you ever need to change your ID on file,
                  contact support and we'll reopen your request.
                </Text>
              </View>
            )}

            {/* --- Already sent, waiting ------------------------------ */}
            {!state.canRequest && submittedDoc && /^https?:\/\//.test(submittedDoc) ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>ID on file</Text>
                <Image source={{ uri: submittedDoc }} style={styles.idPreview} resizeMode="cover" />
              </View>
            ) : null}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      {AlertModal}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 20 },

  backRow: { marginBottom: 14 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { color: "#111827", fontSize: 14, fontWeight: "600" },

  heading: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 18,
    marginBottom: 14,
  },
  statusCard: { alignItems: "center", paddingVertical: 26 },
  statusIconWrap: {
    height: 62,
    width: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  statusTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  statusSubtitle: {
    color: "#4b5563",
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
  },

  reasonCard: {
    borderRadius: 14,
    backgroundColor: "rgba(220,38,38,0.07)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.18)",
    padding: 14,
    marginBottom: 14,
  },
  reasonLabel: { color: "#dc2626", fontSize: 11, fontWeight: "700", marginBottom: 4 },
  reasonText: { color: "#374151", fontSize: 13.5, lineHeight: 20 },

  sectionTitle: { color: "#111827", fontSize: 14, fontWeight: "600", marginBottom: 6 },
  sectionHint: { color: "#6b7280", fontSize: 12.5, lineHeight: 18, marginBottom: 14 },

  pickButton: { borderRadius: 14, overflow: "hidden" },
  pickEmpty: {
    height: 150,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(124,58,237,0.35)",
    backgroundColor: "rgba(124,58,237,0.05)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pickEmptyText: { color: PURPLE, fontSize: 13, fontWeight: "600" },
  idPreview: { height: 190, width: "100%", borderRadius: 14, backgroundColor: "#eee" },

  meta: { color: "#9ca3af", fontSize: 12, marginTop: 10, textAlign: "center" },

  submitButton: { borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  errorText: { color: "#dc2626", fontSize: 13, marginBottom: 10 },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { color: PURPLE, fontSize: 13, fontWeight: "600" },
});
