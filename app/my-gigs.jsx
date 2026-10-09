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
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getBookings, getMyGigApplications } from "../api";

// GigMatch — My gigs (band / musician)
// Route: app/my-gigs.jsx  →  "/my-gigs"  (param: tab = "bookings" | "applications")
// Opened from the dashboard's Booking / Pending stat cards:
//   Bookings    → GET /gig-applications/bookings  (accepted gigs, soonest first)
//   Applications → GET /gig-applications/mine      (gigs I applied to, newest first)

const PURPLE = "#7c3aed";

function formatPay(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? String(value) : `₱${n.toLocaleString("en-PH")}`;
}

function gigDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Date to be confirmed";
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Status chip — same wording the dashboards use
function StatusChip({ status }) {
  const map = {
    booked: { text: "Booked", style: styles.chipGreen, textStyle: styles.chipGreenText },
    completed: { text: "Completed", style: styles.chipPurple, textStyle: styles.chipPurpleText },
    pending: { text: "Pending", style: styles.chipAmber, textStyle: styles.chipAmberText },
    accepted: { text: "Accepted", style: styles.chipGreen, textStyle: styles.chipGreenText },
    rejected: { text: "Declined", style: styles.chipRed, textStyle: styles.chipRedText },
    cancelled: { text: "Cancelled", style: styles.chipRed, textStyle: styles.chipRedText },
    expired: { text: "Expired", style: styles.chipGray, textStyle: styles.chipGrayText },
  };
  const c = map[status] || { text: status || "", style: styles.chipGray, textStyle: styles.chipGrayText };
  return (
    <View style={[styles.chip, c.style]}>
      <Text style={[styles.chipText, c.textStyle]}>{c.text}</Text>
    </View>
  );
}

export default function MyGigs() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [tab, setTab] = useState(params.tab === "applications" ? "applications" : "bookings");
  const [bookings, setBookings] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [bookingRows, appRows] = await Promise.all([
        getBookings().catch(() => []),
        getMyGigApplications().catch(() => []),
      ]);
      setBookings(Array.isArray(bookingRows) ? bookingRows : []);
      setApps(Array.isArray(appRows) ? appRows : []);
    } catch (err) {
      setError(err.message || "Couldn't load your gigs.");
    }
  }, []);

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

  const openGig = (gig) => {
    if (!gig?.id) return;
    router.push({
      pathname: "/gig-detail",
      params: {
        id: String(gig.id),
        posterName: gig.postedBy?.name ?? "Client",
        location: gig.location ?? "",
        price: gig.pay ?? "",
        description: gig.description ?? "",
      },
    });
  };

  // Bookings: upcoming first (same rule as the dashboard stat), then past
  const dayAnchor = new Date();
  const todayStart = new Date(dayAnchor.getFullYear(), dayAnchor.getMonth(), dayAnchor.getDate());
  const withGig = bookings.filter((b) => b.gig);
  const upcoming = withGig.filter(
    (b) => b.gig.status === "booked" && (!b.gig.date || new Date(b.gig.date) >= todayStart)
  );
  const past = withGig.filter((b) => !upcoming.includes(b));

  const pendingApps = apps.filter((a) => a.status === "pending");
  const decidedApps = apps.filter((a) => a.status !== "pending");

  const TABS = [
    { key: "bookings", label: "Bookings" },
    { key: "applications", label: "Applications" },
  ];

  const renderSectionLabel = (text) => <Text style={styles.sectionLabel}>{text}</Text>;

  const renderBooking = (b) => (
    <Pressable key={b.id} style={styles.card} onPress={() => openGig(b.gig)}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {b.gig.title}
          </Text>
          <Text style={styles.cardMeta}>
            {[
              b.gig.date ? gigDate(b.gig.date) : "Date to be confirmed",
              b.gig.location,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Text style={styles.cardSub}>
            {[
              b.gig.postedBy?.name ? `with ${b.gig.postedBy.name}` : null,
              formatPay(b.gig.pay),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <StatusChip status={b.gig.status} />
      </View>
      <View style={styles.openRow}>
        <Text style={styles.openText}>Open gig</Text>
        <Ionicons name="chevron-forward" size={14} color={PURPLE} />
      </View>
    </Pressable>
  );

  const renderApplication = (a) => {
    const gig = a.gig;
    return (
      <Pressable key={a.id} style={styles.card} onPress={() => gig && openGig(gig)}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {gig?.title ?? "Gig unavailable"}
            </Text>
            <Text style={styles.cardMeta}>
              {gig
                ? [gig.date ? gigDate(gig.date) : null, gig.location].filter(Boolean).join(" · ")
                : "This gig was removed"}
            </Text>
            <Text style={styles.cardSub}>
              Applied {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {a.message ? ` · "${a.message}"` : ""}
            </Text>
          </View>
          <StatusChip status={a.status} />
        </View>
        <View style={styles.openRow}>
          <Text style={styles.openText}>Open gig</Text>
          <Ionicons name="chevron-forward" size={14} color={PURPLE} />
        </View>
      </Pressable>
    );
  };

  const emptyFor = (key) =>
    key === "bookings"
      ? { icon: "calendar-outline", text: "No bookings yet — when a client books your band, the gig shows up here." }
      : { icon: "document-text-outline", text: "You haven't applied to any gigs yet. Find one in Discover and apply." };

  const empty = emptyFor(tab);
  const listEmpty =
    tab === "bookings" ? withGig.length === 0 : apps.length === 0;

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

        <Text style={styles.title}>My gigs</Text>
        <Text style={styles.subtitle}>Your bookings and the gigs you applied to.</Text>

        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 30 }} />
        ) : error ? (
          <View style={styles.messageCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
            <Text style={styles.messageText}>{error}</Text>
          </View>
        ) : listEmpty ? (
          <View style={styles.messageCard}>
            <Ionicons name={empty.icon} size={28} color={PURPLE} />
            <Text style={styles.messageText}>{empty.text}</Text>
          </View>
        ) : tab === "bookings" ? (
          <>
            {upcoming.length > 0 ? (
              <>
                {renderSectionLabel(`Upcoming (${upcoming.length})`)}
                {upcoming.map(renderBooking)}
              </>
            ) : null}
            {past.length > 0 ? (
              <>
                {renderSectionLabel(`Past (${past.length})`)}
                {past.map(renderBooking)}
              </>
            ) : null}
            {upcoming.length === 0 && past.length === 0 ? (
              <View style={styles.messageCard}>
                <Ionicons name={empty.icon} size={28} color={PURPLE} />
                <Text style={styles.messageText}>{empty.text}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <>
            {pendingApps.length > 0 ? (
              <>
                {renderSectionLabel(`Waiting for the client's answer (${pendingApps.length})`)}
                {pendingApps.map(renderApplication)}
              </>
            ) : null}
            {decidedApps.length > 0 ? (
              <>
                {renderSectionLabel(`Answered (${decidedApps.length})`)}
                {decidedApps.map(renderApplication)}
              </>
            ) : null}
          </>
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
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },

  title: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#6b7280", fontSize: 13, marginBottom: 16 },

  tabRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.08)",
  },
  tabActive: { backgroundColor: PURPLE },
  tabText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: "#fff" },

  sectionLabel: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },

  messageCard: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  messageText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },

  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 14,
    marginBottom: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardTitle: { color: "#111827", fontSize: 14, fontWeight: "700" },
  cardMeta: { color: "#6b7280", fontSize: 12, marginTop: 3 },
  cardSub: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  openRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  openText: { color: PURPLE, fontSize: 12, fontWeight: "700" },

  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 10, fontWeight: "700" },
  chipGreen: { backgroundColor: "rgba(34,197,94,0.12)" },
  chipGreenText: { color: "#16a34a" },
  chipPurple: { backgroundColor: "rgba(124,58,237,0.1)" },
  chipPurpleText: { color: PURPLE },
  chipAmber: { backgroundColor: "rgba(245,158,11,0.14)" },
  chipAmberText: { color: "#b45309" },
  chipRed: { backgroundColor: "rgba(220,38,38,0.1)" },
  chipRedText: { color: "#dc2626" },
  chipGray: { backgroundColor: "rgba(107,114,128,0.12)" },
  chipGrayText: { color: "#6b7280" },
});
