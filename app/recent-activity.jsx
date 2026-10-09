import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getMe,
  getGigs,
  getReceivedGigApplications,
  getGivenRatings,
} from "../api";

// GigMatch — Recent activity (full list)
// Route: app/recent-activity.jsx  →  "/recent-activity"
// "See all" on the client dashboard's Recent activity section opens this
// screen: every gig application, rating, and gig the client posted —
// newest first. Each row jumps to the screen where the item can be used:
//   application → /gig-applications (review it)
//   rating      → /ratings-review    (your rating history)
//   gig         → /gig-detail        (your posted gig)

const PURPLE = "#7c3aed";

// "just now", "12m ago", "3h ago", "2d ago", "Oct 3"
function timeAgo(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function RecentActivity() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const profile = await getMe();
      const [gigs, received, myRatings] = await Promise.all([
        getGigs(),
        getReceivedGigApplications().catch(() => []),
        getGivenRatings().catch(() => []),
      ]);
      const myGigs = (Array.isArray(gigs) ? gigs : []).filter(
        (g) => String(g.postedById) === String(profile.id)
      );

      const feed = [
        ...received.map((a) => ({
          id: `app-${a.id}`,
          icon:
            a.status === "accepted"
              ? "checkmark-circle-outline"
              : a.status === "rejected"
                ? "close-circle-outline"
                : "document-text-outline",
          color: a.status === "accepted" ? "#16a34a" : a.status === "rejected" ? "#dc2626" : PURPLE,
          title: `${a.applicant?.name ?? "A musician"} applied to "${a.gig?.title ?? "your gig"}"`,
          subtitle:
            a.status === "accepted"
              ? "You accepted this application"
              : a.status === "rejected"
                ? "You declined this application"
                : "Waiting for your review",
          at: a.createdAt,
          route: "/gig-applications",
        })),
        ...myRatings.map((r) => ({
          id: `rating-${r.id}`,
          icon: "star-outline",
          color: "#f59e0b",
          title: `You rated a performance ${"★".repeat(r.stars)}${"☆".repeat(Math.max(0, 5 - r.stars))}`,
          subtitle: r.comment ? `"${r.comment}"` : "Thanks for the feedback!",
          at: r.createdAt,
          route: "/ratings-review",
        })),
        ...myGigs.map((g) => ({
          id: `gig-${g.id}`,
          icon: "megaphone-outline",
          color: "#2563eb",
          title: `You posted "${g.title}"`,
          subtitle: g.location ? `in ${g.location}` : "Waiting for musicians to apply",
          at: g.createdAt,
          route: "/gig-detail",
          gig: g,
        })),
      ]
        .filter((item) => item.at)
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 50);

      setItems(feed);
    } catch (err) {
      setError(err.message || "Couldn't load recent activity.");
    }
  }, []);

  // Refetch every time the screen comes into view (e.g. after accepting)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openItem = (item) => {
    if (item.route === "/gig-detail" && item.gig) {
      const g = item.gig;
      router.push({
        pathname: "/gig-detail",
        params: {
          id: String(g.id),
          posterName: g.title,
          location: g.location,
          price: g.pay,
          description: g.description,
          tags: g.date,
          role: "client",
        },
      });
      return;
    }
    if (item.route) router.push(item.route);
  };

  const subtitle = loading
    ? " "
    : items.length > 0
      ? `${items.length} update${items.length === 1 ? "" : "s"} from your gigs and ratings`
      : "Nothing here yet";

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
        }
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
        </View>

        <Text style={styles.title}>Recent activity</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 30 }} />
        ) : error ? (
          <View style={styles.messageCard}>
            <Ionicons name="cloud-offline-outline" size={28} color="#dc2626" />
            <Text style={styles.messageText}>{error}</Text>
            <Pressable onPress={() => onRefresh()} style={styles.retryButton}>
              <Ionicons name="refresh" size={14} color={PURPLE} />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.messageCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="pulse-outline" size={28} color={PURPLE} />
            </View>
            <Text style={styles.messageTitle}>No activity yet</Text>
            <Text style={styles.messageText}>
              Applications, ratings, and new gigs will show up here.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <Pressable key={item.id} onPress={() => openItem(item)} style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: `${item.color}1a` }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardTime}>{timeAgo(item.at)}</Text>
                <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
              </View>
            </Pressable>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  blob: { position: "absolute", borderRadius: 9999, opacity: 0.25 },
  blobViolet: { top: -60, left: -60, height: 220, width: 220, backgroundColor: "#c4b5fd" },
  blobPink: { top: 240, right: -80, height: 220, width: 220, backgroundColor: "#f5d0fe" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 40 },

  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  backButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },

  title: { color: "#111827", fontSize: 24, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: "#6b7280", fontSize: 13, marginBottom: 18 },

  messageCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: "rgba(124,58,237,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  messageTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  messageText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  retryText: { color: PURPLE, fontSize: 12, fontWeight: "700" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 14,
    marginBottom: 12,
  },
  iconWrap: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitle: { color: "#111827", fontSize: 13.5, fontWeight: "700", lineHeight: 18 },
  cardSubtitle: { color: "#9ca3af", fontSize: 12, marginTop: 3 },
  cardMeta: { alignItems: "center", gap: 6 },
  cardTime: { color: "#9ca3af", fontSize: 10, fontWeight: "600" },
});
