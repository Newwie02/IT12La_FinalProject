import { useCallback, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getGigById, getMe, getMyGigApplications, applyToGig, cancelGig } from "../api";

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

  // Re-fetched on every focus so a gig that got filled/cancelled while the
  // page was open shows the friendly "no longer available" state.
  useFocusEffect(
    useCallback(() => {
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
    }, [id])
  );

  const title = gig?.title ?? posterName ?? "Gig posting";
  const when = gig?.date ? formatDate(gig.date) : tags ?? "";
  const place = gig?.location ?? location ?? "";
  const pay = gig ? formatPay(gig.pay) : price ?? "";
  const details = gig?.description ?? description ?? "";
  const meta = [place, pay].filter(Boolean).join(" · ");
  const ownGig = !!(me && gig && String(gig.postedById) === String(me.id));

  // --- Booking lifecycle state -------------------------------------------
  const gigStatus = gig?.status ?? null; // open | booked | completed | cancelled | expired
  const bookedWith = gig?.bookedWith ?? null; // { id, name, bandName } while booked
  // Someone else's gig that isn't open anymore → friendly dead end, no Apply
  const unavailable = !loading && !!gig && !ownGig && myStatus !== "accepted" && gigStatus !== "open";

  // Cancels a gig/booking. The server records WHO cancelled (me) and WHY.
  const doCancel = async (reason) => {
    try {
      const updated = await cancelGig(id, reason);
      setGig((prev) => ({
        ...(prev || {}),
        ...updated,
        // A released booking no longer shows who it was booked with
        bookedWith: updated.status === "booked" ? prev?.bookedWith ?? null : null,
      }));
      if (myStatus === "accepted") setMyStatus("rejected"); // booking released
      Alert.alert(
        "Done",
        updated.status === "cancelled"
          ? "The gig was cancelled and has left Discover."
          : "The booking was released — the gig is open again in Discover."
      );
    } catch (e) {
      Alert.alert("Couldn't cancel", e.message || "Something went wrong.");
    }
  };

  // Reason picker (Alert buttons work on Android too — Alert.prompt doesn't)
  const confirmCancel = () => {
    const booked = gigStatus === "booked";
    Alert.alert(
      booked ? "Cancel this booking?" : "Cancel this gig?",
      booked
        ? "The booking is released, the gig returns to Discover, and everyone who was declined can re-apply."
        : "The gig will be closed and leave Discover.",
      [
        { text: "Schedule changed", onPress: () => doCancel("Schedule changed") },
        { text: "No longer needed", onPress: () => doCancel("No longer needed") },
        { text: "Don't cancel", style: "cancel" },
      ]
    );
  };

  // The accepted band backs out → same release flow, recorded with their id
  const confirmBackOut = () => {
    Alert.alert(
      "Back out of this booking?",
      "The gig returns to Discover and the client is notified.",
      [
        { text: "Schedule changed", onPress: () => doCancel("Schedule changed") },
        { text: "Line-up changed", onPress: () => doCancel("Line-up changed") },
        { text: "Stay booked", style: "cancel" },
      ]
    );
  };

  const posterId = gig?.postedById ?? gig?.postedBy?.id ?? null;
  // A band's "we're available" post → { id, name } of the band that posted
  // it. Drives the "View band profile" CTA (portfolio + hire / message).
  const posterBand = gig?.posterBand ?? null;
  const posterDisplayName = posterBand?.name ?? gig?.postedBy?.name ?? posterName ?? "Client";

  const viewBandProfile = () => {
    if (!posterBand) return;
    router.push({
      pathname: "/band-profile",
      params: { id: String(posterBand.id), name: posterBand.name },
    });
  };

  // Opens a DIRECT thread with the gig's client (withId = thread view).
  // Without withId the messages screen only shows the conversation list.
  const openPosterThread = () => {
    router.push({
      pathname: "/messages",
      params: {
        ...(posterId ? { withId: String(posterId) } : {}),
        with: posterDisplayName,
        fullName, instruments, genres, bandName, bandPhotoUri,
      },
    });
  };

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
    if (unavailable) {
      // Friendly dead end instead of an error ("just got filled" race)
      actionSection = (
        <View style={styles.unavailableCard}>
          <Ionicons name="lock-closed-outline" size={22} color={PURPLE} />
          <Text style={styles.unavailableTitle}>This gig is no longer available</Text>
          <Text style={styles.unavailableSub}>
            It has been filled, cancelled, or its date has passed. Check Discover for more gigs like it.
          </Text>
          <Pressable style={styles.browseButton} onPress={() => router.replace("/discover")}>
            <Text style={styles.browseButtonText}>Back to Discover</Text>
          </Pressable>
        </View>
      );
    } else if (ownGig) {
      actionSection = posterBand ? (
        <>
          {/* Your own band's availability post — nobody applies to it */}
          <View style={[styles.statusChip, styles.statusPendingRow]}>
            <Ionicons name="megaphone-outline" size={14} color={PURPLE} />
            <Text style={styles.statusPendingText}>Your band's gig post is live in Discover</Text>
          </View>
          {gigStatus === "open" ? (
            <Pressable style={styles.cancelButton} onPress={confirmCancel}>
              <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.cancelButtonText}>Remove gig post</Text>
            </Pressable>
          ) : gigStatus && gigStatus !== "booked" ? (
            <View style={[styles.statusChip, styles.statusDoneRow]}>
              <Ionicons name="checkmark-done-outline" size={14} color="#6b7280" />
              <Text style={styles.statusDoneText}>
                {gigStatus === "cancelled"
                  ? "Removed"
                  : gigStatus === "completed"
                  ? "Completed — the event is over"
                  : "Expired"}
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <>
          {gigStatus === "booked" ? (
            <View style={[styles.statusChip, styles.statusAcceptedRow]}>
              <Ionicons name="ribbon" size={14} color="#16a34a" />
              <Text style={styles.statusAcceptedText}>
                Booked{bookedWith ? ` with ${bookedWith.bandName || bookedWith.name}` : ""}
                {when ? ` · ${when}` : ""}
              </Text>
            </View>
          ) : null}

          <Pressable style={styles.reviewButton} onPress={() => router.push("/gig-applications")}>
            <Ionicons name="people-outline" size={16} color={PURPLE} />
            <Text style={styles.reviewButtonText}>Review applications for this gig</Text>
          </Pressable>

          {gigStatus === "open" || gigStatus === "booked" ? (
            <Pressable style={styles.cancelButton} onPress={confirmCancel}>
              <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.cancelButtonText}>
                {gigStatus === "booked" ? "Cancel booking" : "Cancel gig"}
              </Text>
            </Pressable>
          ) : gigStatus ? (
            <View style={[styles.statusChip, styles.statusDoneRow]}>
              <Ionicons name="checkmark-done-outline" size={14} color="#6b7280" />
              <Text style={styles.statusDoneText}>
                {gigStatus === "completed"
                  ? "Completed — the event is over"
                  : gigStatus === "cancelled"
                  ? "Cancelled"
                  : "Expired — no band was booked"}
              </Text>
            </View>
          ) : null}
        </>
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
        <>
          <View style={[styles.statusChip, styles.statusAcceptedRow]}>
            <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
            <Text style={styles.statusAcceptedText}>
              {gigStatus === "booked" ? "You're booked 🎉" : "Application accepted 🎉"}
              {gigStatus === "booked" && when ? ` · ${when}` : ""}
            </Text>
          </View>
          {/* You're hired → DM the client directly to coordinate the gig */}
          <Pressable style={styles.messageClientButton} onPress={openPosterThread}>
            <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
            <Text style={styles.messageClientButtonText}>Message the client</Text>
          </Pressable>
          {/* Back out → the gig returns to open and the client is told */}
          {gigStatus === "booked" ? (
            <Pressable style={styles.cancelButton} onPress={confirmBackOut}>
              <Ionicons name="exit-outline" size={16} color="#dc2626" />
              <Text style={styles.cancelButtonText}>Back out of booking</Text>
            </Pressable>
          ) : null}
        </>
      );
    } else if (posterBand) {
      // Nobody applies to a band's gig post (clients hire, musicians see
      // other bands) — the CTA opens the band's profile: portfolio + hire.
      actionSection = (
        <Pressable style={styles.applyButton} onPress={viewBandProfile}>
          <Text style={styles.applyButtonText}>View band profile</Text>
        </Pressable>
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

            {/* Band's gig post → quick link to the band's profile (portfolio) */}
            {posterBand && !ownGig ? (
              <Pressable onPress={viewBandProfile} style={styles.posterBandRow} hitSlop={8}>
                <Ionicons name="people-outline" size={14} color={PURPLE} />
                <Text style={styles.posterBandText}>
                  Posted by {posterBand.name} · view profile
                </Text>
                <Ionicons name="chevron-forward" size={14} color={PURPLE} />
              </Pressable>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Details</Text>
              <Text style={styles.cardBody}>
                {details || "No description provided."}
              </Text>
            </View>

            {actionSection}

            {/* Direct thread with the client (posterId → withId). Hidden when the
                accepted state shows its own primary button, or on your own gig. */}
            {!ownGig && myStatus !== "accepted" && !unavailable ? (
              <Pressable style={styles.messageButton} onPress={openPosterThread}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={PURPLE} />
                <Text style={styles.messageButtonText}>
                  {posterBand ? "Message the band" : "Message about this gig"}
                </Text>
              </Pressable>
            ) : null}
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

  // "Posted by {band} · view profile" line on a band's gig post
  posterBandRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  posterBandText: { color: PURPLE, fontSize: 12.5, fontWeight: "700" },
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
  statusDoneRow: { backgroundColor: "rgba(107,114,128,0.12)" },
  statusDoneText: { color: "#6b7280", fontSize: 13, fontWeight: "700" },

  // Friendly dead end when the gig was filled/cancelled/expired
  unavailableCard: {
    alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", padding: 20,
    marginBottom: 10,
  },
  unavailableTitle: { color: "#111827", fontSize: 15, fontWeight: "700", marginTop: 4 },
  unavailableSub: { color: "#6b7280", fontSize: 12.5, textAlign: "center", lineHeight: 18 },
  browseButton: {
    marginTop: 8, backgroundColor: PURPLE, borderRadius: 12,
    paddingVertical: 11, paddingHorizontal: 22,
  },
  browseButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // Cancel gig / cancel booking / back out (records who + why)
  cancelButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, paddingVertical: 13, marginBottom: 10,
    borderWidth: 1, borderColor: "rgba(220,38,38,0.3)", backgroundColor: "rgba(220,38,38,0.06)",
  },
  cancelButtonText: { color: "#dc2626", fontSize: 13, fontWeight: "700" },

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

  // Primary CTA after the client accepts the application
  messageClientButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#16a34a", borderRadius: 14, paddingVertical: 14, marginBottom: 10,
  },
  messageClientButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
