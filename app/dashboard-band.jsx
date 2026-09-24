import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";

// GigMatch — Band dashboard (home, band-leader view)
// Route: app/dashboard-band.jsx  →  "/dashboard-band"
// Reached from dashboard-musician.jsx by tapping the avatar once a band
// exists. Light glassmorphism shell, fully interactive with local state —
// no backend yet, so nothing persists past a reload.

const PLACEHOLDER_GIG_POSTINGS = [
  {
    id: "1",
    posterName: "Krizza Yeke",
    tags: ["Jazz", "Pop"],
    location: "Madaum, Tagum",
    price: "₱3,000",
    description: "Small birthday party, looking for a 2-hour acoustic set...",
  },
  {
    id: "2",
    posterName: "Krizza Yeke",
    tags: ["Jazz", "Rock"],
    location: "Madaum, Tagum",
    price: "₱7,000",
    description: "Family Reunion, need full band for the whole evening...",
  },
];

const PLACEHOLDER_SUGGESTED_MUSICIANS = [
  { id: "1", name: "Angel Daro", instrument: "Drummer", genre: "Pop" },
  { id: "2", name: "Ivy Grace Mananday", instrument: "Electric Guitar", genre: "Rock" },
  { id: "3", name: "Marco Villar", instrument: "Bass Guitar", genre: "R&B" },
];

function currentMonthYear() {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function DashboardBand() {
  const router = useRouter();
  const { bandName, fullName, instruments, genres } = useLocalSearchParams();

  const resolvedBandName = bandName?.trim() ? bandName.trim() : "Your band";

  const [stats] = useState({ bookings: 0, pending: 0, members: 1, rating: "0.0" });

  const backToMusicianView = () => {
    router.push({
      pathname: "/dashboard-musician",
      params: { fullName, instruments, genres, bandName: resolvedBandName },
    });
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

  const handleSuggestedMusicianPress = (person) => {
    router.push({
      pathname: "/musician-profile",
      params: { name: person.name, tags: `${person.instrument} · ${person.genre}` },
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
                <Ionicons name="people" size={20} color="#16a34a" />
              </View>
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Band — {resolvedBandName}</Text>
              <Text style={styles.headerSubtitle}>Band leader</Text>
            </View>
            <Pressable
              style={styles.bellButton}
              hitSlop={8}
              onPress={() => Alert.alert("Notifications", "No new notifications yet.")}
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
          {PLACEHOLDER_GIG_POSTINGS.map((gig) => (
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
          <Pressable onPress={() => router.push("/discover")}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.portfolioRow}
        >
          {PLACEHOLDER_SUGGESTED_MUSICIANS.map((person) => (
            <Pressable key={person.id} onPress={() => handleSuggestedMusicianPress(person)}>
              <BlurView intensity={40} tint="light" style={styles.portfolioCard}>
                <View style={styles.portfolioAvatar} />
                <Text style={styles.suggestedName} numberOfLines={1}>
                  {person.name}
                </Text>
                <View style={styles.portfolioTagRow}>
                  <View style={styles.tagChipGreen}>
                    <Text style={styles.tagChipGreenText}>{person.instrument}</Text>
                  </View>
                  <View style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{person.genre}</Text>
                  </View>
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
        params={{ fullName, instruments, genres, bandName: resolvedBandName }}
      />
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
  },
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

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  seeAll: { color: PURPLE, fontSize: 13, fontWeight: "600" },

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
  },
  suggestedName: { color: "#111827", fontSize: 12, fontWeight: "700", marginBottom: 6 },
  portfolioTagRow: { flexDirection: "row", gap: 4, flexWrap: "wrap", justifyContent: "center" },
});