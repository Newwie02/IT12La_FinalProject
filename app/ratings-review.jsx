import { useState, useCallback } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { getReceivedRatings } from "../api";

// GigMatch — Your received ratings (after you performed at a client's gig)
// Route: app/ratings-review.jsx  →  "/ratings-review"
// Data:  GET /api/ratings/received  →  { average, count, ratings: [{ ...r, rater, gig }] }
// Opened from the profile menu ("Ratings Review"). Sub-screen: back button, no BottomNav.

const PURPLE = "#7c3aed";

function formatDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// Fills n of 5 stars (used for the average, so halves show as filled)
function StarRow({ value, size = 16 }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= Math.round(value) ? "star" : "star-outline"}
          size={size}
          color={n <= Math.round(value) ? "#f59e0b" : "#d1d5db"}
        />
      ))}
    </View>
  );
}

export default function RatingsReview() {
  const router = useRouter();
  const [data, setData] = useState(null); // { average, count, ratings }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await getReceivedRatings());
    } catch (e) {
      setError(e.message || "Couldn't load your ratings. Is the server running?");
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

  const ratings = data?.ratings ?? [];

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
            <Text style={styles.screenTitle}>Ratings Review</Text>
            <Text style={styles.screenSubtitle}>What clients said about your performances</Text>
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
        ) : ratings.length === 0 ? (
          <>
            <BlurView intensity={40} tint="light" style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="star-outline" size={28} color="#f59e0b" />
              </View>
              <Text style={styles.emptyTitle}>No ratings yet</Text>
              <Text style={styles.emptyText}>
                When a client accepts your application and rates your performance after the gig,
                it will show up here.
              </Text>
            </BlurView>
          </>
        ) : (
          <>
            {/* Summary */}
            <BlurView intensity={40} tint="light" style={styles.summaryCard}>
              <View style={styles.summaryStarBadge}>
                <Ionicons name="star" size={26} color="#f59e0b" />
              </View>
              <Text style={styles.summaryValue}>
                {data.average != null ? data.average.toFixed(1) : "—"}
              </Text>
              <StarRow value={data.average ?? 0} size={18} />
              <Text style={styles.summaryLabel}>
                {data.count} rating{data.count === 1 ? "" : "s"} received
              </Text>
            </BlurView>

            {/* One card per rating */}
            {ratings.map((r) => {
              const raterName = r.rater?.name ?? "A client";
              const gigTitle = r.gig?.title ?? "your gig";
              return (
                <BlurView key={r.id} intensity={40} tint="light" style={styles.ratingCard}>
                  <View style={styles.ratingTopRow}>
                    <StarRow value={r.stars} />
                    <Text style={styles.ratingDate}>{formatDate(r.createdAt)}</Text>
                  </View>
                  <Text style={styles.ratingGig} numberOfLines={1}>
                    <Ionicons name="megaphone-outline" size={13} color={PURPLE} />  {gigTitle}
                  </Text>
                  <Text style={styles.ratingRater}>Rated by {raterName}</Text>
                  {r.comment ? (
                    <Text style={styles.ratingComment}>“{r.comment}”</Text>
                  ) : null}
                </BlurView>
              );
            })}
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
    height: 56, width: 56, borderRadius: 28, backgroundColor: "rgba(245,158,11,0.14)",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  emptyText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },

  summaryCard: {
    borderRadius: 18, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", overflow: "hidden",
    padding: 20, alignItems: "center", marginBottom: 14,
  },
  summaryStarBadge: {
    height: 52, width: 52, borderRadius: 26, backgroundColor: "rgba(245,158,11,0.14)",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  summaryValue: { color: "#111827", fontSize: 30, fontWeight: "800" },
  summaryLabel: { color: "#9ca3af", fontSize: 12, marginTop: 6 },

  starRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },

  ratingCard: {
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden", padding: 14, marginBottom: 10,
  },
  ratingTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingDate: { color: "#9ca3af", fontSize: 11 },
  ratingGig: { color: "#111827", fontSize: 13.5, fontWeight: "700", marginTop: 8 },
  ratingRater: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  ratingComment: {
    color: "#4b5563", fontSize: 13, lineHeight: 19, marginTop: 8,
    backgroundColor: "rgba(124,58,237,0.05)", borderRadius: 10, padding: 10,
  },
});
