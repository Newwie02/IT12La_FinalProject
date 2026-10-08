import { useEffect, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getGigById, getMe, getMyGigApplications, applyToGig } from "../api";

// GigMatch — Gig posting detail + Apply flow
// Route: app/gig-detail.jsx  →  "/gig-detail"
// Opened with { id, posterName, location, price, description, tags, ... }.
// When `id` is present the full gig is fetched (authoritative) and the
// musician sees an Apply button whose state comes from
// GET /api/gig-applications/mine (pending / accepted / rejected).
// The poster of the gig instead gets a shortcut to the review screen.

const PURPLE = "#7c3aed";

function formatDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function formatPay(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? String(value) : `₱${n.toLocaleString("en-PH")}`;
}

export default function GigDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    id, posterName, tags, location, price, description,
    fullName, instruments, genres, bandName, bandPhotoUri,
  } = params;

  const [gig, setGig] = useState(null);
  const [me, setMe] = useState(null);
  const [myStatus, setMyStatus] = useState(null); // null | "pending" | "accepted" | "rejected"
  const [loading, setLoading] = useState(!!id);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    Promise.all([
      getGigById(id).catch(() => null),
      getMe().catch(() => null),
      getMyGigApplications().catch(() => []),
    ])
      .then(([fullGig, user, apps]) => {
        if (!active) return;
        setGig(fullGig);
        setMe(user);
        const mine = (Array.isArray(apps) ? apps : []).find(
          (a) => String(a.gigId) === String(id)
        );
        setMyStatus(mine?.status ?? null);
        setLoading(false);
      })
      .catch(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  const title = gig?.title ?? posterName ?? "Gig posting";
  const when = gig?.date ? formatDate(gig.date) : tags ?? "";
  const place = gig?.location ?? location ?? "";
  const pay = gig ? formatPay(gig.pay) : price ?? "";
  const details = gig?.description ?? description ?? "";
  const meta = [place, pay].filter(Boolean).join(" · ");
  const ownGig = !!(me && gig && String(gig.postedById) === String(me.id));

  const submitApply = async () => {
    setApplying(true);
    try {
      await applyToGig({ gigId: id });
      setMyStatus("pending");
      Alert.alert("Application sent", `The poster of "${title}" will review your application.`);
    } catch (e) {
      Alert.alert("Couldn't apply", e.message || "Something went wrong.");
    } finally {
      setApplying(false);
    }
  };

  const confirmApply = () => {
    Alert.alert(`Apply to "${title}"?`, "Your profile will be shared with the poster.", [
      { text: "Cancel", style: "cancel" },
      { text: "Apply", onPress: submitApply },
    ]);
  };

  // What shows below Details, depending on who's looking
  let actionSection = null;
  if (id && !loading) {
    if (ownGig) {
      actionSection = (
        <Pressable style={styles.reviewButton} onPress={() => router.push("/gig-applications")}>
          <Ionicons name="people-outline" size={16} color={PURPLE} />
          <Text style={styles.reviewButtonText}>Review applications for this gig</Text>
        </Pressable>
      );
    } else if (myStatus === "pending") {
      actionSection = (
        <View style={[styles.statusChip, styles.statusPendingRow]}>
          <Ionicons name="time-outline" size={14} color={PURPLE} />
          <Text style={styles.statusPendingText}>Application sent · waiting for review</Text>
        </View>
      );
    } else if (myStatus === "accepted") {
      actionSection = (
        <View style={[styles.statusChip, styles.statusAcceptedRow]}>
          <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
          <Text style={styles.statusAcceptedText}>Application accepted 🎉</Text>
        </View>
      );
    } else {
      actionSection = (
        <Pressable onPress={confirmApply} disabled={applying} style={styles.applyButton}>
          <Text style={styles.applyButtonText}>
            {applying ? "Applying…" : myStatus === "rejected" ? "Apply again" : "Apply for this gig"}
          </Text>
        </Pressable>
      );
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.blob} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : (
          <>
            <Text style={styles.title}>{title}</Text>
            {meta ? <Text style={styles.meta}>{meta}</Text> : null}
            {when ? <Text style={styles.tags}>{when}</Text> : null}

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Details</Text>
              <Text style={styles.cardBody}>
                {details || "No description provided."}
              </Text>
            </View>

            {actionSection}

            <Pressable
              style={styles.messageButton}
              onPress={() =>
                router.push({
                  pathname: "/messages",
                  params: {
                    with: posterName ?? "Client",
                    fullName, instruments, genres, bandName, bandPhotoUri,
                  },
                })
              }
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={PURPLE} />
              <Text style={styles.messageButtonText}>Message about this gig</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  blob: {
    position: "absolute", top: -60, left: -60, height: 220, width: 220,
    borderRadius: 9999, opacity: 0.25, backgroundColor: "#c4b5fd",
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
  centerBox: { paddingVertical: 40, alignItems: "center" },
  backButton: {
    height: 36, width: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  title: { color: "#111827", fontSize: 20, fontWeight: "700" },
  meta: { color: "#6b7280", fontSize: 13, marginTop: 4 },
  tags: { color: "#9ca3af", fontSize: 12, marginTop: 2, marginBottom: 20 },
  card: {
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)", padding: 16, marginBottom: 20,
  },
  cardLabel: { color: "#111827", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  cardBody: { color: "#6b7280", fontSize: 13, lineHeight: 19 },

  applyButton: {
    backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14,
    alignItems: "center", marginBottom: 10,
  },
  applyButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  statusChip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 14, paddingVertical: 13, marginBottom: 10,
  },
  statusPendingRow: { backgroundColor: "rgba(124,58,237,0.1)" },
  statusPendingText: { color: PURPLE, fontSize: 13, fontWeight: "700" },
  statusAcceptedRow: { backgroundColor: "rgba(34,197,94,0.12)" },
  statusAcceptedText: { color: "#16a34a", fontSize: 13, fontWeight: "700" },

  reviewButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(124,58,237,0.1)", borderWidth: 1, borderColor: "rgba(124,58,237,0.25)",
    borderRadius: 14, paddingVertical: 13, marginBottom: 10,
  },
  reviewButtonText: { color: PURPLE, fontSize: 13, fontWeight: "700" },

  messageButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.8)", borderWidth: 1, borderColor: "rgba(124,58,237,0.25)",
    borderRadius: 14, paddingVertical: 13,
  },
  messageButtonText: { color: PURPLE, fontSize: 13, fontWeight: "700" },
});
