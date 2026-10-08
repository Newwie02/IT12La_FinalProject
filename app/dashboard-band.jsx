import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import SwitchLoadingOverlay from "../components/SwitchLoadingOverlay";
import { useAppAlert } from "../components/useAppAlert";
import { getMyBand, getGigs, getMusicians, getReceivedApplications, resolveUrl } from "../api";

// GigMatch — Band dashboard (home, band-leader view)
// Route: app/dashboard-band.jsx  →  "/dashboard-band"

// Accepts an array, a "Rock, Pop" string, or nothing, and always returns an array.
function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((s) => s.trim());
  return [];
}

function currentMonthYear() {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function DashboardBand() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fullName, instruments, genres } = params;
  const [band, setBand] = useState(null);
  const [gigs, setGigs] = useState([]);
  const [musicians, setMusicians] = useState([]);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [acceptedApplications, setAcceptedApplications] = useState(0);

  useEffect(() => {
    getMyBand()
      .then(setBand)
      .catch((e) => console.log("getMyBand error:", e.message));

    getGigs()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        console.log("GIGS RESPONSE:", JSON.stringify(list[0]));
        setGigs(
          list.map((g) => ({
            id: String(g.id),
            posterName: g.title ?? g.poster?.name ?? "Gig",
            tags: toList(g.genres ?? g.genre),
            location: g.location ?? "",
            price: g.pay != null ? `₱${Number(g.pay).toLocaleString()}` : "",
            description: g.description ?? "",
          }))
        );
      })
      .catch((e) => console.log("getGigs error:", e.message));

    getMusicians()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        console.log("MUSICIANS RESPONSE:", JSON.stringify(list[0]));
        setMusicians(
          list.map((m) => ({
            id: String(m.id),
            name: m.name ?? "Musician",
            instrument: toList(m.instruments ?? m.instrument)[0] ?? "Musician",
            genre: toList(m.genres ?? m.genre)[0] ?? "",
            photoUrl: m.photoUrl ?? m.avatarUrl ?? null,
          }))
        );
      })
      .catch((e) => console.log("getMusicians error:", e.message));
  }, []);

  // Applications from musicians: re-check every time this screen comes into view
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getReceivedApplications()
        .then((list) => {
          if (!active) return;
          setPendingApplications(list.filter((a) => a.status === "pending").length);
          setAcceptedApplications(list.filter((a) => a.status === "accepted").length);
        })
        .catch((e) => console.log("getReceivedApplications error:", e.message));
      return () => {
        active = false;
      };
    }, [])
  );

  const bandName = band?.name ?? params.bandName;
  const bandPhotoUri = resolveUrl(band?.photoUrl) ?? params.bandPhotoUri;

  const resolvedBandName = bandName?.trim() ? bandName.trim() : "Your band";

  // Members = you (the leader) + every musician you accepted
  const stats = { bookings: 0, pending: 0, members: 1 + acceptedApplications, rating: "0.0" };
  const [isSwitching, setIsSwitching] = useState(false);
  const { showAlert, AlertModal } = useAppAlert();

  const backToMusicianView = () => {
    if (isSwitching) return;
    setIsSwitching(true);
    setTimeout(() => {
      router.push({
        pathname: "/dashboard-musician",
        params: { fullName, instruments, genres, bandName, bandPhotoUri },
      });
      setIsSwitching(false);
    }, 700);
  };

  const handleGigPress = (gig) => {
    router.push({
      pathname: "/gig-detail",
      params: {
        posterName: gig.posterName,
        tags: gig.tags.join(", "),
        location: gig.location,
        price: gig.price,
        description: gig.description,
      },
    });
  };

  // CHANGED: now sends the musician's id so the profile screen can load the full profile
  const handleSuggestedMusicianPress = (person) => {
    router.push({
      pathname: "/musician-profile",
      params: {
        id: person.id,
        name: person.name,
        tags: `${person.instrument} · ${person.genre}`,
      },
    });
  };

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />
      <View style={[styles.blob, styles.blobBlue]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <BlurView intensity={50} tint="light" style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Pressable onPress={backToMusicianView} style={styles.avatarWrap}>
              <View style={styles.avatarGreen}>
                {bandPhotoUri ? (
                  <Image source={{ uri: bandPhotoUri }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="people" size={20} color="#16a34a" />
                )}
              </View>
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Band — {resolvedBandName}</Text>
              <Text style={styles.headerSubtitle}>Band leader</Text>
            </View>
            <Pressable
              style={styles.bellButton}
              hitSlop={8}
              onPress={() =>
                showAlert({
                  icon: "notifications",
                  tone: "info",
                  title: "Notifications",
                  message: "No new notifications yet.",
                })
              }
            >
              <Ionicons name="notifications" size={20} color="#7c3aed" />
            </Pressable>
          </View>
          <Text style={styles.identityHint}>Tap your avatar to switch to your musician view</Text>
        </BlurView>

        {/* Upcoming gig */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Upcoming gig</Text>
          <LinearGradient
            colors={["#8b5cf6", "#d946ef"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.upcomingCard}
          >
            <Text style={styles.upcomingMonth}>{currentMonthYear()}</Text>
            <Text style={styles.upcomingTitle}>No Upcoming Gigs</Text>
            <Text style={styles.upcomingSubtitle}>You currently have no upcoming gigs.</Text>
          </LinearGradient>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.bookings}</Text>
            <Text style={styles.statLabel}>Booking</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.members}</Text>
            <Text style={styles.statLabel}>Member</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.rating}★</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Applications from musicians */}
        <Pressable
          onPress={() => router.push("/band-applications")}
          style={styles.applicationsCard}
        >
          <Ionicons name="mail-unread-outline" size={20} color="#7c3aed" />
          <View style={{ flex: 1 }}>
            <Text style={styles.applicationsTitle}>Applications</Text>
            <Text style={styles.applicationsSub}>
              {pendingApplications > 0
                ? `${pendingApplications} musician${pendingApplications === 1 ? "" : "s"} waiting for your answer`
                : "No pending applications"}
            </Text>
          </View>
          {pendingApplications > 0 ? (
            <View style={styles.applicationsBadge}>
              <Text style={styles.applicationsBadgeText}>{pendingApplications}</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </Pressable>

        {/* Gig Posting */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Gig Posting</Text>
          <Pressable onPress={() => router.push("/discover")}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gigRow}
        >
          {gigs.length === 0 ? (
            <Text style={styles.emptyText}>No gig postings yet.</Text>
          ) : null}
          {gigs.map((gig) => (
            <Pressable key={gig.id} onPress={() => handleGigPress(gig)}>
              <BlurView intensity={40} tint="light" style={styles.gigCard}>
                <View style={styles.gigTopRow}>
                  <View style={styles.gigAvatar} />
                  <View style={styles.gigTags}>
                    {gig.tags.map((tag) => (
                      <View key={tag} style={styles.tagChip}>
                        <Text style={styles.tagChipText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={styles.gigName}>{gig.posterName}</Text>
                <Text style={styles.gigMeta}>
                  {gig.location} · {gig.price}
                </Text>
                <Text style={styles.gigDescription} numberOfLines={1}>
                  {gig.description}
                </Text>
              </BlurView>
            </Pressable>
          ))}
        </ScrollView>

        {/* Suggest musician */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Suggest musician</Text>
         <Pressable
  onPress={() =>
    router.push({
      pathname: "/musicians",
      params: { fullName, instruments, genres, bandName: resolvedBandName, bandPhotoUri },
    })
  }
>
  <Text style={styles.seeAll}>See all</Text>
</Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.portfolioRow}
        >
          {musicians.length === 0 ? (
            <Text style={styles.emptyText}>No musicians yet.</Text>
          ) : null}
          {musicians.map((person) => (
            <Pressable key={person.id} onPress={() => handleSuggestedMusicianPress(person)}>
              <BlurView intensity={40} tint="light" style={styles.portfolioCard}>
                <View style={styles.portfolioAvatar}>
                  {person.photoUrl ? (
                    <Image
                      source={{ uri: resolveUrl(person.photoUrl) }}
                      style={styles.avatarImage}
                    />
                  ) : null}
                </View>
                <Text style={styles.suggestedName} numberOfLines={1}>
                  {person.name}
                </Text>
                <View style={styles.portfolioTagRow}>
                  <View style={styles.tagChipGreen}>
                    <Text style={styles.tagChipGreenText}>{person.instrument}</Text>
                  </View>
                  {person.genre ? (
                    <View style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{person.genre}</Text>
                    </View>
                  ) : null}
                </View>
              </BlurView>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav
        homeRoute="/dashboard-band"
        profileRoute="/profile-musician"
        params={{ fullName, instruments, genres, bandName: resolvedBandName, bandPhotoUri }}
      />
      {AlertModal}
      <SwitchLoadingOverlay visible={isSwitching} label="Switching to Musician dashboard..." />
    </View>
  );
}

const PURPLE = "#7c3aed";

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  blob: { position: "absolute", borderRadius: 9999, opacity: 0.25 },
  blobViolet: { top: -60, left: -60, height: 220, width: 220, backgroundColor: "#c4b5fd" },
  blobPink: { top: 120, right: -80, height: 220, width: 220, backgroundColor: "#f5d0fe" },
  blobBlue: { bottom: -60, left: "30%", height: 220, width: 220, backgroundColor: "#bfdbfe" },

  headerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.12)",
    overflow: "hidden",
    padding: 16,
    marginBottom: 18,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWrap: { borderRadius: 20 },
  avatarGreen: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: "rgba(34,197,94,0.14)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  headerText: { flex: 1 },
  headerTitle: { color: "#111827", fontSize: 16, fontWeight: "700" },
  headerSubtitle: { color: "#6b7280", fontSize: 13, marginTop: 2 },
  bellButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "rgba(124,58,237,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  identityHint: { color: "#9ca3af", fontSize: 11, marginTop: 10 },

  section: { marginBottom: 16 },
  sectionLabel: { color: "#111827", fontSize: 14, fontWeight: "700", marginBottom: 8 },

  upcomingCard: { borderRadius: 20, padding: 16 },
  upcomingMonth: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  upcomingTitle: { color: "#fff", fontSize: 19, fontWeight: "700", marginBottom: 4 },
  upcomingSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: { color: "#111827", fontSize: 18, fontWeight: "700" },
  statLabel: { color: "#9ca3af", fontSize: 11, marginTop: 2 },

  applicationsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.2)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  applicationsTitle: { color: "#111827", fontSize: 13, fontWeight: "700" },
  applicationsSub: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  applicationsBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  applicationsBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  seeAll: { color: PURPLE, fontSize: 13, fontWeight: "600" },
  emptyText: { color: "#9ca3af", fontSize: 13, paddingVertical: 12 },

  tagChip: {
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagChipText: { color: PURPLE, fontSize: 10, fontWeight: "600" },
  tagChipGreen: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagChipGreenText: { color: "#16a34a", fontSize: 10, fontWeight: "600" },

  gigRow: { gap: 12, paddingBottom: 20 },
  gigCard: {
    width: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    padding: 12,
  },
  gigTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  gigAvatar: {
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: "rgba(124,58,237,0.15)",
    overflow: "hidden",
  },
  gigTags: { flexDirection: "row", gap: 6, flexWrap: "wrap", flex: 1 },
  gigName: { color: "#111827", fontSize: 13, fontWeight: "700" },
  gigMeta: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  gigDescription: { color: "#6b7280", fontSize: 11, marginTop: 6 },

  portfolioRow: { gap: 12, paddingBottom: 20 },
  portfolioCard: {
    width: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    padding: 12,
    alignItems: "center",
  },
  portfolioAvatar: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: "rgba(124,58,237,0.15)",
    marginBottom: 10,
    overflow: "hidden",
  },
  suggestedName: { color: "#111827", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  portfolioTagRow: { flexDirection: "row", gap: 4, flexWrap: "wrap", justifyContent: "center" },
});