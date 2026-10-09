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
  getMe, getGigs, getBands, getNotifications, getReceivedGigApplications, getGivenRatings, resolveUrl,
} from "../api";

// GigMatch — Client / Event Organizer dashboard (home)
// Route: app/dashboard-client.jsx → "/dashboard-client"
// Login sends role "client" / "organizer" here (see index.jsx).
//
// Sections (real data):
//   Post gig                ← my gigs count (GET /api/gigs filtered by postedById)
//   My upcoming events      ← same gigs, classified Upcoming / Today / Ended / No date
//   Applications to review  ← GET /api/gig-applications/received (pending count)
//   Browse bands            ← GET /api/bands — tapping a band opens its profile
//                             (clients can view bands but can't join them)
//   Recent activity         ← gig applications + ratings I gave + gigs I posted
//                             (latest 3 here; "See all" opens /recent-activity)
// The header bell keeps the unread badge and opens /notifications.

const PURPLE = "#7c3aed";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatPay(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? String(value) : `₱${n.toLocaleString("en-PH")}`;
}

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

export default function DashboardClient() {
  const router = useRouter();
  const { fullName } = useLocalSearchParams();

  const [me, setMe] = useState(null);
  const [myGigs, setMyGigs] = useState([]);
  const [bands, setBands] = useState([]);
  const [applications, setApplications] = useState([]);
  const [givenRatings, setGivenRatings] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const profile = await getMe();
      const [gigs, allBands, notifList, received, myRatings] = await Promise.all([
        getGigs(),
        getBands().catch(() => []),
        getNotifications().catch(() => []),
        getReceivedGigApplications().catch(() => []),
        getGivenRatings().catch(() => []),
      ]);
      setMe(profile);
      // Gigs store their owner as postedById (NOT organizerId)
      setMyGigs((Array.isArray(gigs) ? gigs : []).filter((g) => String(g.postedById) === String(profile.id)));
      setBands(Array.isArray(allBands) ? allBands : []);
      const notifs = Array.isArray(notifList) ? notifList : [];
      // Only the unread count is kept — the bell badge (list lives in /notifications)
      setUnreadCount(notifs.filter((n) => !n.isRead).length);
      setApplications(Array.isArray(received) ? received : []);
      setGivenRatings(Array.isArray(myRatings) ? myRatings : []);
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
    // Keep the booking status (open/booked/…) — `status` above is the date label
    return { ...g, gigStatus: g.status, eventDate: valid ? d : null, status };
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

  // --- Recent activity: applications on my gigs + ratings I gave + gigs I posted
  const activity = [
    ...applications.map((a) => ({
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
    })),
    ...givenRatings.map((r) => ({
      id: `rating-${r.id}`,
      icon: "star-outline",
      color: "#f59e0b",
      title: `You rated a performance ${"★".repeat(r.stars)}${"☆".repeat(Math.max(0, 5 - r.stars))}`,
      subtitle: r.comment ? `"${r.comment}"` : "Thanks for the feedback!",
      at: r.createdAt,
    })),
    ...myGigs.map((g) => ({
      id: `gig-${g.id}`,
      icon: "megaphone-outline",
      color: "#2563eb",
      title: `You posted "${g.title}"`,
      subtitle: g.location ? `in ${g.location}` : "Waiting for musicians to apply",
      at: g.createdAt,
    })),
  ]
    .filter((item) => item.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 3);

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
                  const isBooked = g.gigStatus === "booked";
                  const isClosed = ["cancelled", "expired", "completed"].includes(g.gigStatus);
                  // Booked gigs show WHO is playing (the band's name)
                  const withName = isBooked
                    ? g.bookedWith?.bandName || g.bookedWith?.name
                    : null;
                  const meta = [withName ? `with ${withName}` : null, g.location, formatPay(g.pay)]
                    .filter(Boolean)
                    .join(" · ");
                  const pillLabel = isBooked
                    ? "Booked"
                    : g.gigStatus === "cancelled"
                    ? "Cancelled"
                    : g.gigStatus === "completed"
                    ? "Completed"
                    : g.gigStatus === "expired"
                    ? "Expired"
                    : isToday
                    ? "Today"
                    : g.status === "tba"
                    ? "No date"
                    : "Upcoming";
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
                            isToday && !isBooked && styles.eventStatusPillToday,
                            g.status === "tba" && !isBooked && styles.eventStatusPillTba,
                            isBooked && styles.eventStatusPillBooked,
                            isClosed && styles.eventStatusPillClosed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.eventStatusText,
                              isToday && !isBooked && styles.eventStatusTextToday,
                              g.status === "tba" && !isBooked && styles.eventStatusTextTba,
                              isBooked && styles.eventStatusTextBooked,
                              isClosed && styles.eventStatusTextClosed,
                            ]}
                          >
                            {pillLabel}
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
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/discover", params: { tab: "bands" } })
                }
              >
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

            {/* 5 — Recent activity (applications, ratings, new gigs): latest 3 */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent activity</Text>
              {activity.length > 0 ? (
                <Pressable onPress={() => router.push("/recent-activity")}>
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              ) : null}
            </View>
            {activity.length === 0 ? (
              <BlurView intensity={40} tint="light" style={styles.emptyCard}>
                <Ionicons name="pulse-outline" size={24} color={PURPLE} />
                <Text style={styles.emptyText}>
                  Applications, ratings, and new gigs will show up here.
                </Text>
              </BlurView>
            ) : (
              activity.map((item) => (
                <BlurView key={item.id} intensity={40} tint="light" style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: `${item.color}1a` }]}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  </View>
                  <View style={styles.activityText}>
                    <Text style={styles.activityTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.activitySubtitle} numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.activityTime}>{timeAgo(item.at)}</Text>
                </BlurView>
              ))
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
  eventStatusPillBooked: { backgroundColor: "rgba(34,197,94,0.15)" },
  eventStatusPillClosed: { backgroundColor: "rgba(107,114,128,0.12)" },
  eventStatusText: { color: PURPLE, fontSize: 10, fontWeight: "700" },
  eventStatusTextToday: { color: "#f59e0b" },
  eventStatusTextTba: { color: "#2563eb" },
  eventStatusTextBooked: { color: "#16a34a" },
  eventStatusTextClosed: { color: "#6b7280" },

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

  /* 5 — Recent activity */
  activityRow: {
    flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", overflow: "hidden",
    padding: 12, marginBottom: 10,
  },
  activityIcon: {
    height: 34, width: 34, borderRadius: 17, alignItems: "center", justifyContent: "center",
  },
  activityText: { flex: 1 },
  activityTitle: { color: "#111827", fontSize: 12.5, fontWeight: "600", lineHeight: 17 },
  activitySubtitle: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  activityTime: { color: "#9ca3af", fontSize: 10, fontWeight: "600" },
});
