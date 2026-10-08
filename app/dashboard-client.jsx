import { useState, useCallback } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import {
  getMe, getGigs, getBands, getNotifications, getReceivedGigApplications, resolveUrl,
} from "../api";

// GigMatch — Client / Event Organizer dashboard (home)
// Route: app/dashboard-client.jsx → "/dashboard-client"
// Login sends role "client" / "organizer" here (see index.jsx).
//
// Sections (real data):
//   Post gig                ← my gigs count (GET /api/gigs filtered by postedById)
//   My upcoming events      ← same gigs, classified Upcoming / Today / Ended / No date
//   Applications to review  ← GET /api/gig-applications/received (pending count)
//   Browse bands            ← GET /api/bands
//   Notifications           ← GET /api/notifications (unread badge + latest 3)

const PURPLE = "#7c3aed";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Notification icon per type (everything else falls back to the bell)
const NOTIF_STYLE = {
  removed: { icon: "person-remove-outline", color: "#dc2626" },
  accepted: { icon: "checkmark-circle-outline", color: "#16a34a" },
  rejected: { icon: "close-circle-outline", color: "#dc2626" },
  "gig-application": { icon: "document-text-outline", color: PURPLE },
};
function notifStyle(type) {
  return NOTIF_STYLE[type] ?? { icon: "notifications-outline", color: PURPLE };
}

function formatPay(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? String(value) : `₱${n.toLocaleString("en-PH")}`;
}

export default function DashboardClient() {
  const router = useRouter();
  const { fullName } = useLocalSearchParams();

  const [me, setMe] = useState(null);
  const [myGigs, setMyGigs] = useState([]);
  const [bands, setBands] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [applications, setApplications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const profile = await getMe();
      const [gigs, allBands, notifList, received] = await Promise.all([
        getGigs(),
        getBands().catch(() => []),
        getNotifications().catch(() => []),
        getReceivedGigApplications().catch(() => []),
      ]);
      setMe(profile);
      // Gigs store their owner as postedById (NOT organizerId)
      setMyGigs((Array.isArray(gigs) ? gigs : []).filter((g) => String(g.postedById) === String(profile.id)));
      setBands(Array.isArray(allBands) ? allBands : []);
      const notifs = Array.isArray(notifList) ? notifList : [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.isRead).length);
      setApplications(Array.isArray(received) ? received : []);
    } catch (e) {
      setError(e.message || "Couldn't load your dashboard. Is the server running?");
    }
  }, []);

  // Reload every time the screen comes back into view (e.g. after posting a gig)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      load().finally(() => active && setLoading(false));
      return () => { active = false; };
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const name = (me?.name || fullName || "").trim() || "there";
  const firstName = name.split(" ")[0];

  // --- Classify my gigs into event statuses -------------------------------
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const events = myGigs.map((g) => {
    const d = g.date ? new Date(g.date) : null;
    const valid = d && !isNaN(d.getTime());
    let status = "tba";
    if (valid) {
      if (d >= startOfTomorrow) status = "upcoming";
      else if (d >= startOfToday) status = "today";
      else status = "ended";
    }
    return { ...g, eventDate: valid ? d : null, status };
  });

  const statusCounts = {
    upcoming: events.filter((e) => e.status === "upcoming").length,
    today: events.filter((e) => e.status === "today").length,
    ended: events.filter((e) => e.status === "ended").length,
    tba: events.filter((e) => e.status === "tba").length,
  };

  const activeEvents = events
    .filter((e) => e.status !== "ended")
    .sort((a, b) => {
      if (a.eventDate && b.eventDate) return a.eventDate - b.eventDate;
      if (a.eventDate) return -1;
      if (b.eventDate) return 1;
      return 0;
    });

  const pendingApplications = applications.filter((a) => a.status === "pending").length;
  const recentNotifications = notifications.slice(0, 3);

  const statusChips = [
    { key: "upcoming", label: "Upcoming", value: statusCounts.upcoming, color: PURPLE, tint: "rgba(124,58,237,0.1)" },
    { key: "today", label: "Today", value: statusCounts.today, color: "#f59e0b", tint: "rgba(245,158,11,0.12)" },
    { key: "tba", label: "No date", value: statusCounts.tba, color: "#2563eb", tint: "rgba(37,99,235,0.1)" },
    { key: "ended", label: "Ended", value: statusCounts.ended, color: "#6b7280", tint: "rgba(107,114,128,0.1)" },
  ].filter((c) => c.value > 0);

  // --- Navigation ---------------------------------------------------------
  const openGig = (gig) =>
    router.push({
      pathname: "/gig-detail",
      params: {
        id: String(gig.id),
        posterName: gig.title,
        location: gig.location,
        price: gig.pay,
        description: gig.description,
        tags: gig.date,
        fullName,
        role: "client",
      },
    });

  const openBand = (b) =>
    router.push({ pathname: "/band-profile", params: { id: String(b.id), name: b.name } });

  const postGig = () =>
    router.push({ pathname: "/gig-posting", params: { fullName, role: "client" } });

  const openNotification = (n) =>
    router.push({
      pathname: "/notification-detail",
      params: {
        id: String(n.id),
        title: String(n.title ?? ""),
        message: String(n.message ?? ""),
        createdAt: n.createdAt ? String(n.createdAt) : "",
        type: String(n.type ?? "info"),
      },
    });

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />
      <View style={[styles.blob, styles.blobBlue]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
      >
        {/* Header */}
        <BlurView intensity={50} tint="light" style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              {me?.photoUrl ? (
                <Image source={{ uri: resolveUrl(me.photoUrl) }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="calendar" size={20} color={PURPLE} />
              )}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Hi, {firstName}</Text>
              <Text style={styles.headerSubtitle}>Event Organizer</Text>
            </View>
            <Pressable style={styles.bellButton} hitSlop={8} onPress={() => router.push("/notifications")}>
              <Ionicons name="notifications" size={20} color={PURPLE} />
              {unreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </BlurView>

        {loading ? (
          <View style={styles.centerBox}><ActivityIndicator size="large" color={PURPLE} /></View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={onRefresh} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* 1 — Post a gig (with gig count) */}
            <Pressable onPress={postGig} style={styles.heroWrap}>
              <LinearGradient
                colors={["#8b5cf6", "#d946ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroIcon}>
                  <Ionicons name="add" size={24} color="#fff" />
                </View>
                <View style={styles.heroText}>
                  <Text style={styles.heroTitle}>Post a gig</Text>
                  <Text style={styles.heroSub}>Find musicians & bands for your event</Text>
                </View>
                <View style={styles.heroCount}>
                  <Text style={styles.heroCountValue}>{myGigs.length}</Text>
                  <Text style={styles.heroCountLabel}>{myGigs.length === 1 ? "gig" : "gigs"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
              </LinearGradient>
            </Pressable>

            {/* 2 — My upcoming events (status counts) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>My upcoming events</Text>
            </View>
            {statusChips.length > 0 ? (
              <View style={styles.chipRow}>
                {statusChips.map((c) => (
                  <View key={c.key} style={[styles.chip, { backgroundColor: c.tint }]}>
                    <View style={[styles.chipDot, { backgroundColor: c.color }]} />
                    <Text style={[styles.chipText, { color: c.color }]}>
                      {c.value} {c.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {activeEvents.length === 0 ? (
              <BlurView intensity={40} tint="light" style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={24} color={PURPLE} />
                <Text style={styles.emptyText}>
                  {myGigs.length === 0
                    ? "No events yet — post your first gig and it will show up here."
                    : "All your events have ended. Post a new gig to get started."}
                </Text>
              </BlurView>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventsRow}
              >
                {activeEvents.slice(0, 10).map((g) => {
                  const isToday = g.status === "today";
                  const meta = [g.location, formatPay(g.pay)].filter(Boolean).join(" · ");
                  return (
                    <Pressable key={g.id} onPress={() => openGig(g)} style={styles.eventCard}>
                      <BlurView intensity={40} tint="light" style={styles.eventCardInner}>
                        <View style={[styles.eventDateBlock, isToday && styles.eventDateBlockToday]}>
                          <Text style={styles.eventDay}>
                            {g.eventDate ? g.eventDate.getDate() : "?"}
                          </Text>
                          <Text style={styles.eventMonth}>
                            {g.eventDate ? MONTHS[g.eventDate.getMonth()] : "TBA"}
                          </Text>
                        </View>
                        <Text style={styles.eventTitle} numberOfLines={2}>{g.title}</Text>
                        <Text style={styles.eventMeta} numberOfLines={1}>
                          {meta || "No details yet"}
                        </Text>
                        <View
                          style={[
                            styles.eventStatusPill,
                            isToday && styles.eventStatusPillToday,
                            g.status === "tba" && styles.eventStatusPillTba,
                          ]}
                        >
                          <Text
                            style={[
                              styles.eventStatusText,
                              isToday && styles.eventStatusTextToday,
                              g.status === "tba" && styles.eventStatusTextTba,
                            ]}
                          >
                            {isToday ? "Today" : g.status === "tba" ? "No date" : "Upcoming"}
                          </Text>
                        </View>
                      </BlurView>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* 3 — Applications to review (pending count) */}
            <Pressable onPress={() => router.push("/gig-applications")}>
              <BlurView intensity={40} tint="light" style={styles.applicationsCard}>
                <View style={styles.applicationsIcon}>
                  <Ionicons name="document-text-outline" size={20} color={PURPLE} />
                </View>
                <View style={styles.applicationsText}>
                  <Text style={styles.applicationsTitle}>Applications to review</Text>
                  <Text style={styles.applicationsSub}>
                    {pendingApplications > 0
                      ? `${pendingApplications} musician${pendingApplications === 1 ? "" : "s"} waiting for your answer`
                      : "No applications waiting"}
                  </Text>
                </View>
                {pendingApplications > 0 ? (
                  <View style={styles.applicationsBadge}>
                    <Text style={styles.applicationsBadgeText}>{pendingApplications}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                )}
              </BlurView>
            </Pressable>

            {/* 4 — Browse bands */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Browse bands</Text>
              <Pressable onPress={() => router.push("/discover")}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {bands.length === 0 ? (
              <BlurView intensity={40} tint="light" style={styles.emptyCard}>
                <Ionicons name="people-outline" size={24} color={PURPLE} />
                <Text style={styles.emptyText}>No bands yet.</Text>
              </BlurView>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bandsRow}>
                {bands.slice(0, 10).map((b) => (
                  <Pressable key={b.id} onPress={() => openBand(b)} style={styles.bandCard}>
                    <BlurView intensity={40} tint="light" style={styles.bandCardInner}>
                      <View style={styles.bandAvatar}>
                        {b.photoUrl ? (
                          <Image source={{ uri: resolveUrl(b.photoUrl) }} style={styles.bandAvatarImage} />
                        ) : (
                          <Ionicons name="people" size={22} color={PURPLE} />
                        )}
                      </View>
                      <Text style={styles.bandName} numberOfLines={1}>{b.name}</Text>
                      <Text style={styles.bandTags} numberOfLines={1}>
                        {[b.genre, b.location].filter(Boolean).join(" · ") || "Band"}
                      </Text>
                    </BlurView>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* 5 — Notifications */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              <Pressable onPress={() => router.push("/notifications")}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {recentNotifications.length === 0 ? (
              <BlurView intensity={40} tint="light" style={styles.emptyCard}>
                <Ionicons name="notifications-outline" size={24} color={PURPLE} />
                <Text style={styles.emptyText}>You're all caught up.</Text>
              </BlurView>
            ) : (
              recentNotifications.map((n) => {
                const look = notifStyle(n.type);
                return (
                  <Pressable key={n.id} onPress={() => openNotification(n)}>
                    <BlurView intensity={40} tint="light" style={styles.notifRow}>
                      <View style={[styles.notifIcon, { backgroundColor: `${look.color}1a` }]}>
                        <Ionicons name={look.icon} size={16} color={look.color} />
                      </View>
                      <View style={styles.notifText}>
                        <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
                        <Text style={styles.notifMessage} numberOfLines={2}>{n.message}</Text>
                      </View>
                      {!n.isRead ? <View style={styles.unreadDot} /> : null}
                    </BlurView>
                  </Pressable>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav
        homeRoute="/dashboard-client"
        profileRoute="/profile-client"
        params={{ fullName, role: "client" }}
        showGigs={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  blob: { position: "absolute", borderRadius: 9999, opacity: 0.25 },
  blobViolet: { top: -60, left: -60, height: 220, width: 220, backgroundColor: "#c4b5fd" },
  blobPink: { top: 120, right: -80, height: 220, width: 220, backgroundColor: "#f5d0fe" },
  blobBlue: { bottom: -60, left: "30%", height: 220, width: 220, backgroundColor: "#bfdbfe" },

  centerBox: { paddingVertical: 40, alignItems: "center" },
  errorCard: {
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 18, borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)", padding: 20, alignItems: "center", gap: 10, marginBottom: 12,
  },
  errorText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },
  retryButton: { backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: PURPLE, fontSize: 12, fontWeight: "700" },

  /* Header */
  headerCard: {
    borderRadius: 22, borderWidth: 1, borderColor: "rgba(124,58,237,0.12)",
    overflow: "hidden", padding: 16, marginBottom: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    height: 42, width: 42, borderRadius: 21, backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  headerText: { flex: 1 },
  headerTitle: { color: "#111827", fontSize: 16, fontWeight: "700" },
  headerSubtitle: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  bellButton: {
    height: 36, width: 36, borderRadius: 18, backgroundColor: "rgba(124,58,237,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  bellBadge: {
    position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },

  /* 1 — Post a gig */
  heroWrap: { marginBottom: 18 },
  heroCard: {
    borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12,
  },
  heroIcon: {
    height: 44, width: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  heroText: { flex: 1 },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  heroCount: {
    alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6,
  },
  heroCountValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  heroCountLabel: { color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "600" },

  /* Sections */
  sectionHeaderRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 10, marginTop: 4,
  },
  sectionTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  seeAll: { color: PURPLE, fontSize: 13, fontWeight: "600" },

  /* 2 — Upcoming events */
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipDot: { height: 6, width: 6, borderRadius: 3 },
  chipText: { fontSize: 11.5, fontWeight: "700" },

  eventsRow: { gap: 12, paddingBottom: 18 },
  eventCard: { width: 170 },
  eventCardInner: {
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden", padding: 12,
  },
  eventDateBlock: {
    alignSelf: "flex-start", borderRadius: 10, backgroundColor: "rgba(124,58,237,0.12)",
    paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", marginBottom: 10,
  },
  eventDateBlockToday: { backgroundColor: "rgba(245,158,11,0.15)" },
  eventDay: { color: PURPLE, fontSize: 15, fontWeight: "800" },
  eventMonth: { color: PURPLE, fontSize: 10, fontWeight: "700", marginTop: 1 },
  eventTitle: { color: "#111827", fontSize: 13, fontWeight: "700", marginBottom: 4 },
  eventMeta: { color: "#9ca3af", fontSize: 11, marginBottom: 10 },
  eventStatusPill: {
    alignSelf: "flex-start", borderRadius: 999, backgroundColor: "rgba(124,58,237,0.1)",
    paddingHorizontal: 8, paddingVertical: 4,
  },
  eventStatusPillToday: { backgroundColor: "rgba(245,158,11,0.15)" },
  eventStatusPillTba: { backgroundColor: "rgba(37,99,235,0.1)" },
  eventStatusText: { color: PURPLE, fontSize: 10, fontWeight: "700" },
  eventStatusTextToday: { color: "#f59e0b" },
  eventStatusTextTba: { color: "#2563eb" },

  emptyCard: {
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", overflow: "hidden",
    padding: 16, alignItems: "center", gap: 8, marginBottom: 14,
  },
  emptyText: { color: "#6b7280", fontSize: 12.5, textAlign: "center", lineHeight: 18 },

  /* 3 — Applications to review */
  applicationsCard: {
    flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(124,58,237,0.14)", overflow: "hidden",
    padding: 14, marginBottom: 18, marginTop: 4,
  },
  applicationsIcon: {
    height: 42, width: 42, borderRadius: 21, backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  applicationsText: { flex: 1 },
  applicationsTitle: { color: "#111827", fontSize: 13.5, fontWeight: "700" },
  applicationsSub: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  applicationsBadge: {
    minWidth: 26, height: 26, borderRadius: 13, backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 7,
  },
  applicationsBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  /* 4 — Browse bands */
  bandsRow: { gap: 12, paddingBottom: 18 },
  bandCard: { width: 140 },
  bandCardInner: {
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden", padding: 12,
  },
  bandAvatar: {
    height: 48, width: 48, borderRadius: 24, backgroundColor: "rgba(124,58,237,0.15)",
    marginBottom: 10, alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  bandAvatarImage: { width: "100%", height: "100%" },
  bandName: { color: "#111827", fontSize: 13, fontWeight: "700" },
  bandTags: { color: "#9ca3af", fontSize: 11, marginTop: 2 },

  /* 5 — Notifications */
  notifRow: {
    flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", overflow: "hidden",
    padding: 12, marginBottom: 10,
  },
  notifIcon: {
    height: 34, width: 34, borderRadius: 17, alignItems: "center", justifyContent: "center",
  },
  notifText: { flex: 1 },
  notifTitle: { color: "#111827", fontSize: 13, fontWeight: "700" },
  notifMessage: { color: "#6b7280", fontSize: 12, marginTop: 2, lineHeight: 16 },
  unreadDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: PURPLE },
});
