import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import { useAppAlert } from "../components/useAppAlert";

// GigMatch — Musician / Band dashboard (home)
// Route: app/dashboard-musician.jsx  →  "/dashboard-musician"
// Light glassmorphism shell. Fully interactive with local state (taps,
// toggles, navigation all work) — there's no backend yet, so nothing here
// persists past a reload. Swap PLACEHOLDER_* constants for real data once
// an API is wired up.
//
// Identity: real name/instruments/genres come from route params, forwarded
// all the way from sign-up → role-select → profile-setup. Tapping the
// avatar opens the real band dashboard (dashboard-band.jsx) if a band
// exists, or the create-band flow if it doesn't.

const PLACEHOLDER_REMINDER = {
  date: "Sat, Oct 18 · 6:00 PM",
  status: "Confirmed",
  title: "Wedding Reception — Live Set",
  location: "Visayan Village, Tagum",
  price: "₱17,000",
};

const PLACEHOLDER_RECOMMENDED = [
  { id: "1", name: "Ctrl+S", tags: "Pop, R&B Band" },
  { id: "2", name: "IV of Speeds", tags: "Rock, Pop, R&B Band" },
];

const PLACEHOLDER_FELLOW_MUSICIANS = [
  { id: "1", name: "Angel Daro", role: "Drummer · Tagum", rating: "5.0" },
  { id: "2", name: "Ivy Grace Mananday", role: "Electric Guitar · Tagum", rating: "2.5" },
];

export default function DashboardMusician() {
  const router = useRouter();
  const { fullName, instruments, genres, bandName, bandPhotoUri } = useLocalSearchParams();

  const musicianName = fullName?.trim() ? fullName.trim() : "Musician";
  const instrumentTags = instruments ? instruments.split(",").filter(Boolean) : [];
  const genreTags = genres ? genres.split(",").filter(Boolean) : [];
  const resolvedBandName = bandName?.trim() ? bandName.trim() : null;

  const [isOnline, setIsOnline] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const { showAlert, AlertModal } = useAppAlert();

  const headerLabel = `Musician — ${musicianName}`;

  const goToBandOrCreate = () => {
    if (resolvedBandName) {
      router.push({
        pathname: "/dashboard-band",
        params: { bandName: resolvedBandName, fullName, instruments, genres, bandPhotoUri },
      });
    } else {
      router.push({
        pathname: "/create-band",
        params: { fullName, instruments, genres },
      });
    }
  };

  const handleReminderPress = () => {
    showAlert({
      icon: "calendar",
      tone: "info",
      title: PLACEHOLDER_REMINDER.title,
      message: `${PLACEHOLDER_REMINDER.date}\n${PLACEHOLDER_REMINDER.location} · ${PLACEHOLDER_REMINDER.price}\n\nFull booking details screen goes here once real bookings exist.`,
    });
  };

  const handleBandPress = (band) => {
    router.push({
      pathname: "/band-profile",
      params: { name: band.name, tags: band.tags },
    });
  };

  const handleMusicianPress = (person) => {
    router.push({
      pathname: "/musician-profile",
      params: { name: person.name, tags: `${person.role} · ${person.rating}★` },
    });
  };

  return (
    <View style={styles.page}>
      {/* Soft pastel blobs for the glass surfaces to refract */}
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />
      <View style={[styles.blob, styles.blobBlue]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <BlurView intensity={50} tint="light" style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Pressable onPress={goToBandOrCreate} style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color="#7c3aed" />
              </View>
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{headerLabel}</Text>
              <Text style={styles.headerSubtitle}>Good day, {musicianName.split(" ")[0]}</Text>
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
          <Text style={styles.identityHint}>
            {resolvedBandName
              ? "Tap your avatar to open your band dashboard"
              : "Tap your avatar to create a band"}
          </Text>
        </BlurView>

        {/* Reminder */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reminder</Text>
          <Pressable onPress={handleReminderPress}>
            <LinearGradient
              colors={["#8b5cf6", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.reminderCard}
            >
              <View style={styles.reminderTopRow}>
                <Text style={styles.reminderDate}>{PLACEHOLDER_REMINDER.date}</Text>
                <View style={styles.confirmedBadge}>
                  <Text style={styles.confirmedBadgeText}>{PLACEHOLDER_REMINDER.status}</Text>
                </View>
              </View>
              <Text style={styles.reminderTitle}>{PLACEHOLDER_REMINDER.title}</Text>
              <Text style={styles.reminderMeta}>
                {PLACEHOLDER_REMINDER.location} · {PLACEHOLDER_REMINDER.price}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Tags */}
        <View style={styles.tagRow}>
          {instrumentTags.length > 0 || genreTags.length > 0 ? (
            <>
              {instrumentTags.map((tag) => (
                <View key={`instrument-${tag}`} style={styles.tagChipGreen}>
                  <Text style={styles.tagChipGreenText}>{tag}</Text>
                </View>
              ))}
              {genreTags.map((tag) => (
                <View key={`genre-${tag}`} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.tagChipGreen}>
                <Text style={styles.tagChipGreenText}>Guitarist</Text>
              </View>
              <View style={styles.tagChip}>
                <Text style={styles.tagChipText}>Pop</Text>
              </View>
              <View style={styles.tagChip}>
                <Text style={styles.tagChipText}>Rock</Text>
              </View>
            </>
          )}
        </View>

        {/* Status cards — real, tappable local state */}
        <View style={styles.statusRow}>
          <Pressable
            style={styles.statusCardWrap}
            onPress={() => setIsOnline((v) => !v)}
          >
            <BlurView intensity={40} tint="light" style={styles.statusCard}>
              <View style={[styles.statusDot, !isOnline && styles.statusDotOff]} />
              <Text style={styles.statusValue}>{isOnline ? "Online" : "Offline"}</Text>
              <Text style={styles.statusLabel}>Active status</Text>
            </BlurView>
          </Pressable>

          <Pressable style={styles.statusCardWrap} onPress={goToBandOrCreate}>
            <BlurView intensity={40} tint="light" style={styles.statusCard}>
              <View style={[styles.statusDot, !resolvedBandName && styles.statusDotOff]} />
              <Text style={styles.statusValue}>{resolvedBandName ? "Banded" : "Solo"}</Text>
              <Text style={styles.statusLabel}>Band Status</Text>
            </BlurView>
          </Pressable>

          <Pressable
            style={styles.statusCardWrap}
            onPress={() => setIsAvailable((v) => !v)}
          >
            <BlurView intensity={40} tint="light" style={styles.statusCard}>
              <View style={[styles.statusDot, !isAvailable && styles.statusDotOff]} />
              <Text style={styles.statusValue}>{isAvailable ? "Available" : "Busy"}</Text>
              <Text style={styles.statusLabel}>Availability</Text>
            </BlurView>
          </Pressable>
        </View>

        {/* Create band CTA — only relevant while no band exists yet */}
        {!resolvedBandName ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/create-band",
                params: { fullName, instruments, genres },
              })
            }
            style={styles.createBandButton}
          >
            <Ionicons name="add-circle" size={18} color="#7c3aed" />
            <Text style={styles.createBandText}>Create a band</Text>
          </Pressable>
        ) : null}

        {/* Recommended for you */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <Pressable onPress={() => router.push("/discover")}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendedRow}
        >
          {PLACEHOLDER_RECOMMENDED.map((band) => (
            <Pressable key={band.id} onPress={() => handleBandPress(band)}>
              <BlurView intensity={40} tint="light" style={styles.recommendedCard}>
                <View style={styles.recommendedAvatar} />
                <Text style={styles.recommendedName}>{band.name}</Text>
                <Text style={styles.recommendedTags}>{band.tags}</Text>
              </BlurView>
            </Pressable>
          ))}
        </ScrollView>

        {/* Fellow musician */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Fellow musician</Text>
          <Pressable onPress={() => router.push("/discover")}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        {PLACEHOLDER_FELLOW_MUSICIANS.map((person) => (
          <BlurView key={person.id} intensity={40} tint="light" style={styles.personRow}>
            <View style={styles.personAvatar} />
            <View style={styles.personText}>
              <Text style={styles.personName}>{person.name}</Text>
              <Text style={styles.personMeta}>
                {person.role} · {person.rating}★
              </Text>
            </View>
            <Pressable
              style={styles.viewProfileButton}
              onPress={() => handleMusicianPress(person)}
            >
              <Text style={styles.viewProfileText}>View Profile</Text>
            </Pressable>
          </BlurView>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav
        homeRoute="/dashboard-musician"
        profileRoute="/profile-musician"
        params={{ fullName, instruments, genres, bandName, bandPhotoUri }}
      />
      {AlertModal}
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
  avatar: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: "rgba(124,58,237,0.12)",
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

  reminderCard: { borderRadius: 20, padding: 16 },
  reminderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  reminderDate: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" },
  confirmedBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confirmedBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  reminderTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 4 },
  reminderMeta: { color: "rgba(255,255,255,0.85)", fontSize: 13 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tagChip: {
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagChipText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  tagChipGreen: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagChipGreenText: { color: "#16a34a", fontSize: 12, fontWeight: "600" },

  statusRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statusCardWrap: { flex: 1 },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    padding: 12,
    alignItems: "flex-start",
  },
  statusDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginBottom: 8,
  },
  statusDotOff: { backgroundColor: "#d1d5db" },
  statusValue: { color: "#111827", fontSize: 13, fontWeight: "700" },
  statusLabel: { color: "#9ca3af", fontSize: 11, marginTop: 2 },

  createBandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.3)",
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  createBandText: { color: PURPLE, fontSize: 13, fontWeight: "600" },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  seeAll: { color: PURPLE, fontSize: 13, fontWeight: "600" },

  recommendedRow: { gap: 12, paddingBottom: 20 },
  recommendedCard: {
    width: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    padding: 12,
  },
  recommendedAvatar: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: "rgba(124,58,237,0.15)",
    marginBottom: 10,
  },
  recommendedName: { color: "#111827", fontSize: 13, fontWeight: "700" },
  recommendedTags: { color: "#9ca3af", fontSize: 11, marginTop: 2 },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    padding: 12,
    marginBottom: 10,
  },
  personAvatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: "rgba(124,58,237,0.15)",
  },
  personText: { flex: 1 },
  personName: { color: "#111827", fontSize: 13, fontWeight: "700" },
  personMeta: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  viewProfileButton: {
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewProfileText: { color: PURPLE, fontSize: 11, fontWeight: "700" },
});