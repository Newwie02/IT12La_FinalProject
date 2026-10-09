import { useState, useCallback } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator, Alert, TextInput,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import {
  getReceivedGigApplications, respondToGigApplication, resolveUrl,
  getGivenRatings, createRating,
} from "../api";

// GigMatch — Client: review musicians who applied to MY gigs
// Route: app/gig-applications.jsx  →  "/gig-applications"
// Data:  GET /api/gig-applications/received  →  [{ ...app, gig, applicant }]
// Accept / Decline → PATCH /api/gig-applications/:id  (applicant is notified)
// Rate performance → POST /api/ratings  (accepted applications only, 1-5 stars)

const PURPLE = "#7c3aed";

export default function GigApplications() {
  const router = useRouter();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Ratings the poster already gave: { [applicationId]: { stars, comment } }
  const [given, setGiven] = useState({});
  // The application currently showing the star picker (null = none open)
  const [ratingFor, setRatingFor] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingBusy, setRatingBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [list, mine] = await Promise.all([
        getReceivedGigApplications(),
        getGivenRatings().catch(() => []), // ratings are optional extra
      ]);
      setApps(Array.isArray(list) ? list : []);
      setGiven(
        Object.fromEntries(
          (Array.isArray(mine) ? mine : []).map((r) => [r.applicationId, r])
        )
      );
    } catch (e) {
      setError(e.message || "Couldn't load applications. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload every time the screen comes back into view
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const respond = async (appId, status) => {
    if (busyId) return;
    setBusyId(appId);
    try {
      await respondToGigApplication(appId, status);
      // Re-fetch: accepting books the gig and auto-closes every other
      // application ("gig filled"), so local patching isn't enough.
      await load();
    } catch (e) {
      Alert.alert("Couldn't update", e.message || "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = apps.filter((a) => a.status === "pending").length;
  const accepted = apps.filter((a) => a.status === "accepted").length;
  const declined = apps.filter((a) => a.status === "rejected").length;

  // Opens the star picker for one accepted performer
  const openRating = (appId) => {
    setRatingFor(appId);
    setRatingStars(0);
    setRatingComment("");
  };

  // Saves 1-5 stars for the performer (accepted applications only)
  const submitRating = async (appId) => {
    if (ratingBusy) return;
    if (ratingStars < 1) {
      Alert.alert("Pick a star rating", "Tap the stars to rate this performance from 1 to 5.");
      return;
    }
    setRatingBusy(true);
    try {
      const saved = await createRating({
        applicationId: appId,
        stars: ratingStars,
        comment: ratingComment.trim() || undefined,
      });
      setGiven((prev) => ({ ...prev, [appId]: saved }));
      setRatingFor(null);
    } catch (e) {
      Alert.alert("Couldn't save rating", e.message || "Something went wrong.");
    } finally {
      setRatingBusy(false);
    }
  };

  // Group the flat list per gig so each posting reads as its own section
  const groups = [];
  const byGig = {};
  for (const a of apps) {
    const key = a.gig?.id ?? "unknown";
    if (!byGig[key]) {
      byGig[key] = { gig: a.gig, items: [] };
      groups.push(byGig[key]);
    }
    byGig[key].items.push(a);
  }

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.circleButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <View>
            <Text style={styles.screenTitle}>Applications</Text>
            <Text style={styles.screenSubtitle}>Musicians who applied to your gigs</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : error ? (
          <BlurView intensity={40} tint="light" style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => { setLoading(true); load(); }} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </BlurView>
        ) : apps.length === 0 ? (
          <BlurView intensity={40} tint="light" style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={28} color={PURPLE} />
            </View>
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptyText}>
              Musicians who apply to your gigs will show up here so you can accept or decline them.
            </Text>
          </BlurView>
        ) : (
          <>
            {/* Status counts */}
            <View style={styles.summaryRow}>
              <BlurView intensity={40} tint="light" style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: PURPLE }]}>{pending}</Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </BlurView>
              <BlurView intensity={40} tint="light" style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: "#16a34a" }]}>{accepted}</Text>
                <Text style={styles.summaryLabel}>Accepted</Text>
              </BlurView>
              <BlurView intensity={40} tint="light" style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{declined}</Text>
                <Text style={styles.summaryLabel}>Declined</Text>
              </BlurView>
            </View>

            {/* One section per gig */}
            {groups.map(({ gig, items }, gi) => (
              <View key={gig?.id ?? `g${gi}`} style={styles.gigSection}>
                <View style={styles.gigHeaderRow}>
                  <View style={styles.gigIcon}>
                    <Ionicons name="megaphone-outline" size={14} color={PURPLE} />
                  </View>
                  <Text style={styles.gigTitle} numberOfLines={1}>
                    {gig?.title ?? "Your gig"}
                  </Text>
                  <View style={styles.gigCount}>
                    <Text style={styles.gigCountText}>{items.length}</Text>
                  </View>
                </View>

                {items.map((a) => {
                  const applicant = a.applicant;
                  const photo = resolveUrl(applicant?.photoUrl);
                  const meta = [
                    applicant?.instruments?.split(",")[0],
                    applicant?.barangay,
                  ].filter(Boolean).join(" · ");
                  const busy = busyId === a.id;
                  return (
                    <BlurView key={a.id} intensity={40} tint="light" style={styles.appCard}>
                      <View style={styles.appTopRow}>
                        <View style={styles.avatar}>
                          {photo ? (
                            <Image source={{ uri: photo }} style={styles.avatarImage} />
                          ) : (
                            <Ionicons name="person" size={20} color={PURPLE} />
                          )}
                        </View>
                        <View style={styles.appInfo}>
                          <Text style={styles.appName} numberOfLines={1}>
                            {applicant?.name ?? "Musician"}
                          </Text>
                          {meta ? (
                            <Text style={styles.appMeta} numberOfLines={1}>{meta}</Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.statusChip,
                            a.status === "accepted" && styles.statusChipAccepted,
                            a.status === "rejected" && styles.statusChipRejected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusChipText,
                              a.status === "accepted" && styles.statusChipTextAccepted,
                              a.status === "rejected" && styles.statusChipTextRejected,
                            ]}
                          >
                            {a.status === "pending" ? "Pending" : a.status === "accepted" ? "Accepted" : "Declined"}
                          </Text>
                        </View>
                      </View>

                      {a.message ? <Text style={styles.appMessage}>“{a.message}”</Text> : null}

                      {a.status === "pending" ? (
                        <View style={styles.actionRow}>
                          <Pressable
                            onPress={() => respond(a.id, "accepted")}
                            disabled={busy}
                            style={[styles.actionButton, styles.acceptButton, busy && styles.actionButtonBusy]}
                          >
                            <Text style={styles.acceptButtonText}>{busy ? "…" : "Accept"}</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => respond(a.id, "rejected")}
                            disabled={busy}
                            style={[styles.actionButton, styles.declineButton, busy && styles.actionButtonBusy]}
                          >
                            <Text style={styles.declineButtonText}>{busy ? "…" : "Decline"}</Text>
                          </Pressable>
                        </View>
                      ) : null}

                      {/* Accepted → message the performer + rate the performance */}
                      {a.status === "accepted" ? (
                        ratingFor === a.id ? (
                          <View style={styles.rateBox}>
                            <Text style={styles.rateTitle}>Rate this performance</Text>
                            <View style={styles.starPickerRow}>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Pressable
                                  key={n}
                                  onPress={() => setRatingStars(n)}
                                  hitSlop={6}
                                  style={styles.starPickButton}
                                >
                                  <Ionicons
                                    name={n <= ratingStars ? "star" : "star-outline"}
                                    size={30}
                                    color={n <= ratingStars ? "#f59e0b" : "#d1d5db"}
                                  />
                                </Pressable>
                              ))}
                            </View>
                            <TextInput
                              value={ratingComment}
                              onChangeText={setRatingComment}
                              placeholder="Add a comment (optional)…"
                              placeholderTextColor="#9ca3af"
                              multiline
                              maxLength={500}
                              style={styles.rateCommentInput}
                            />
                            <View style={styles.actionRow}>
                              <Pressable
                                onPress={() => setRatingFor(null)}
                                disabled={ratingBusy}
                                style={[styles.actionButton, styles.declineButton, ratingBusy && styles.actionButtonBusy]}
                              >
                                <Text style={styles.declineButtonText}>Cancel</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => submitRating(a.id)}
                                disabled={ratingBusy}
                                style={[styles.actionButton, styles.acceptButton, ratingBusy && styles.actionButtonBusy]}
                              >
                                <Ionicons name="star" size={14} color="#16a34a" />
                                <Text style={styles.acceptButtonText}>
                                  {ratingBusy ? "Saving…" : "Submit"}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <>
                            <View style={styles.actionRow}>
                              {/* Direct thread with the accepted performer */}
                              <Pressable
                                onPress={() =>
                                  router.push({
                                    pathname: "/messages",
                                    params: {
                                      withId: String(a.userId),
                                      with: applicant?.name ?? "Performer",
                                    },
                                  })
                                }
                                style={[styles.actionButton, styles.messageActionButton]}
                              >
                                <Ionicons name="chatbubble-ellipses-outline" size={14} color={PURPLE} />
                                <Text style={styles.messageActionText}>Message</Text>
                              </Pressable>
                              {!given[a.id] ? (
                                <Pressable
                                  onPress={() => openRating(a.id)}
                                  style={[styles.actionButton, styles.rateButton]}
                                >
                                  <Ionicons name="star-outline" size={14} color="#b45309" />
                                  <Text style={styles.rateButtonText}>Rate performance</Text>
                                </Pressable>
                              ) : null}
                            </View>

                            {given[a.id] ? (
                              <View style={styles.ratedBox}>
                                <View style={styles.starsRow}>
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <Ionicons
                                      key={n}
                                      name={n <= given[a.id].stars ? "star" : "star-outline"}
                                      size={16}
                                      color={n <= given[a.id].stars ? "#f59e0b" : "#d1d5db"}
                                    />
                                  ))}
                                  <Text style={styles.ratedLabel}>You rated {given[a.id].stars}/5</Text>
                                </View>
                                {given[a.id].comment ? (
                                  <Text style={styles.ratedComment}>“{given[a.id].comment}”</Text>
                                ) : null}
                              </View>
                            ) : null}
                          </>
                        )
                      ) : null}
                    </BlurView>
                  );
                })}
              </View>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  blob: { position: "absolute", borderRadius: 9999, opacity: 0.25 },
  blobViolet: { top: -60, left: -60, height: 220, width: 220, backgroundColor: "#c4b5fd" },
  blobPink: { top: 180, right: -80, height: 220, width: 220, backgroundColor: "#f5d0fe" },

  topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  circleButton: {
    height: 38, width: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center",
  },
  screenTitle: { color: "#111827", fontSize: 18, fontWeight: "700" },
  screenSubtitle: { color: "#6b7280", fontSize: 12, marginTop: 2 },

  centerBox: { paddingVertical: 40, alignItems: "center" },

  errorCard: {
    borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", overflow: "hidden",
    padding: 20, alignItems: "center", gap: 10,
  },
  errorText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },
  retryButton: { backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: PURPLE, fontSize: 12, fontWeight: "700" },

  emptyCard: {
    borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", overflow: "hidden",
    padding: 24, alignItems: "center", gap: 8,
  },
  emptyIcon: {
    height: 56, width: 56, borderRadius: 28, backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  emptyText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  summaryCard: {
    flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden", padding: 12, alignItems: "center",
  },
  summaryValue: { fontSize: 18, fontWeight: "700" },
  summaryLabel: { color: "#9ca3af", fontSize: 11, marginTop: 2 },

  gigSection: { marginBottom: 16 },
  gigHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  gigIcon: {
    height: 24, width: 24, borderRadius: 12, backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  gigTitle: { flex: 1, color: "#111827", fontSize: 14, fontWeight: "700" },
  gigCount: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  gigCountText: { color: PURPLE, fontSize: 11, fontWeight: "700" },

  appCard: {
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden", padding: 14, marginBottom: 10,
  },
  appTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    height: 42, width: 42, borderRadius: 21, backgroundColor: "rgba(124,58,237,0.15)",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  appInfo: { flex: 1 },
  appName: { color: "#111827", fontSize: 14, fontWeight: "700" },
  appMeta: { color: "#9ca3af", fontSize: 12, marginTop: 2 },

  statusChip: {
    backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  statusChipAccepted: { backgroundColor: "rgba(34,197,94,0.12)" },
  statusChipRejected: { backgroundColor: "rgba(220,38,64,0.1)" },
  statusChipText: { color: PURPLE, fontSize: 11, fontWeight: "700" },
  statusChipTextAccepted: { color: "#16a34a" },
  statusChipTextRejected: { color: "#dc2626" },

  appMessage: {
    color: "#6b7280", fontSize: 12.5, lineHeight: 18, marginTop: 10,
    backgroundColor: "rgba(124,58,237,0.05)", borderRadius: 10, padding: 10,
  },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionButton: {
    flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center",
    flexDirection: "row", justifyContent: "center", gap: 6,
  },
  actionButtonBusy: { opacity: 0.6 },
  acceptButton: { backgroundColor: "rgba(34,197,94,0.14)" },
  acceptButtonText: { color: "#16a34a", fontSize: 13, fontWeight: "700" },
  declineButton: { backgroundColor: "rgba(220,38,64,0.08)" },
  declineButtonText: { color: "#dc2626", fontSize: 13, fontWeight: "700" },

  // Rating widget (accepted performances)
  rateButton: { backgroundColor: "rgba(245,158,11,0.14)" },
  rateButtonText: { color: "#b45309", fontSize: 13, fontWeight: "700" },
  // Direct message to the accepted performer
  messageActionButton: { backgroundColor: "rgba(124,58,237,0.1)" },
  messageActionText: { color: PURPLE, fontSize: 13, fontWeight: "700" },
  rateBox: {
    marginTop: 12, backgroundColor: "rgba(245,158,11,0.07)",
    borderRadius: 12, padding: 12,
  },
  rateTitle: { color: "#111827", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  starPickerRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 10 },
  starPickButton: { paddingHorizontal: 2 },
  rateCommentInput: {
    backgroundColor: "#fff", borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)", paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 13, color: "#111827", minHeight: 44, maxHeight: 90, marginBottom: 4,
  },
  ratedBox: {
    marginTop: 12, backgroundColor: "rgba(245,158,11,0.08)",
    borderRadius: 12, padding: 12,
  },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratedLabel: { color: "#b45309", fontSize: 12, fontWeight: "700", marginLeft: 6 },
  ratedComment: { color: "#6b7280", fontSize: 12.5, lineHeight: 18, marginTop: 6 },
});
