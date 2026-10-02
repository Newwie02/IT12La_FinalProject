import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { getMusicians } from "../api";

// GigMatch — Musician / Band dashboard (home)
// Route: app/dashboard-musician.jsx  →  "/dashboard-musician"

const PLACEHOLDER_USER = {
  bandName: "The Band",
};

const PLACEHOLDER_REMINDER = {
  date: "Sat, Oct 18 · 6:00 PM",
  status: "Confirmed",
  title: "Wedding Reception — Live Set",
  location: "Visayan Village, Tagum",
  price: "₱17,000",
};

const PLACEHOLDER_STATUS = [
  { key: "active", label: "Active status", value: "Online" },
  { key: "band", label: "Band Status", value: "Banded" },
  { key: "availability", label: "Availability", value: "Available" },
];

const PLACEHOLDER_RECOMMENDED = [
  { id: "1", name: "Ctrl+S", tags: "Pop, R&B Band" },
  { id: "2", name: "IV of Speeds", tags: "Rock, Pop, R&B Band" },
];

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "home", route: "/dashboard-musician" },
  { key: "discover", label: "Discover", icon: "compass", route: "/discover" },
  { key: "messages", label: "Messages", icon: "chatbubble-ellipses", route: "/messages" },
  { key: "profile", label: "Profile", icon: "person", route: "/profile-musician" },
];

export default function DashboardMusician() {
  const router = useRouter();
  const { fullName, instruments, genres } = useLocalSearchParams();
  const [identity, setIdentity] = useState("musician");
  const [activeTab, setActiveTab] = useState("home");

  const [musicians, setMusicians] = useState([]);
  const [loadingMusicians, setLoadingMusicians] = useState(true);

  const musicianName = fullName?.trim() ? fullName.trim() : "Musician";
  const instrumentTags = instruments ? instruments.split(",").filter(Boolean) : [];
  const genreTags = genres ? genres.split(",").filter(Boolean) : [];

  const isBand = identity === "band";
  const displayName = isBand ? PLACEHOLDER_USER.bandName : musicianName;
  const headerLabel = isBand ? `Band — ${PLACEHOLDER_USER.bandName}` : `Musician — ${musicianName}`;

  const loadMusicians = useCallback(async () => {
    try {
      const data = await getMusicians();
      setMusicians(data);
    } catch (err) {
      setMusicians([]);
    }
  }, []);

  useEffect(() => {
    setLoadingMusicians(true);
    loadMusicians().finally(() => setLoadingMusicians(false));
  }, [loadMusicians]);

  const toggleIdentity = () => {
    setIdentity((prev) => (prev === "musician" ? "band" : "musician"));
  };

  const handleCreateBand = () => {
    Alert.alert(
      "Create a band",
      "This is a placeholder — wire this up to your real create-band flow / route."
    );
  };

  const openMusicianProfile = (person) => {
    router.push({
      pathname: "/musician-profile",
      params: {
        userId: person.id,
        name: person.name,
        tags: person.role ?? "",
        fullName,
        instruments,
        genres,
      },
    });
  };

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />
      <View style={[styles.blob, styles.blobBlue]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <BlurView intensity={50} tint="light" style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Pressable onPress={toggleIdentity} style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons
                  name={isBand ? "people" : "person"}
                  size={20}
                  color="#7c3aed"
                />
              </View>
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{headerLabel}</Text>
              <Text style={styles.headerSubtitle}>Good day, {displayName.split(" ")[0]}</Text>
            </View>
            <Pressable style={styles.bellButton} hitSlop={8}>
              <Ionicons name="notifications" size={20} color="#7c3aed" />
            </Pressable>
          </View>
          <Text style={styles.identityHint}>
            Tap your avatar to preview band mode (placeholder)
          </Text>
        </BlurView>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reminder</Text>
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
        </View>

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

        <View style={styles.statusRow}>
          {PLACEHOLDER_STATUS.map((item) => (
            <BlurView key={item.key} intensity={40} tint="light" style={styles.statusCard}>
              <View style={styles.statusDot} />
              <Text style={styles.statusValue}>{item.value}</Text>
              <Text style={styles.statusLabel}>{item.label}</Text>
            </BlurView>
          ))}
        </View>

        {!isBand ? (
          <Pressable onPress={handleCreateBand} style={styles.createBandButton}>
            <Ionicons name="add-circle" size={18} color="#7c3aed" />
            <Text style={styles.createBandText}>Create a band</Text>
          </Pressable>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <Pressable>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendedRow}
        >
          {PLACEHOLDER_RECOMMENDED.map((band) => (
            <BlurView key={band.id} intensity={40} tint="light" style={styles.recommendedCard}>
              <View style={styles.recommendedAvatar} />
              <Text style={styles.recommendedName}>{band.name}</Text>
              <Text style={styles.recommendedTags}>{band.tags}</Text>
            </BlurView>
          ))}
        </ScrollView>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Fellow musician</Text>
          <Pressable>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        {loadingMusicians ? (
          <Text style={styles.emptyText}>Loading musicians...</Text>
        ) : musicians.length === 0 ? (
          <Text style={styles.emptyText}>No other musicians yet.</Text>
        ) : (
          musicians.map((person) => (
            <BlurView key={person.id} intensity={40} tint="light" style={styles.personRow}>
              <View style={styles.personAvatar} />
              <View style={styles.personText}>
                <Text style={styles.personName}>{person.name}</Text>
                <Text style={styles.personMeta}>{person.role}</Text>
              </View>
              <Pressable
                style={styles.viewProfileButton}
                onPress={() => openMusicianProfile(person)}
              >
                <Text style={styles.viewProfileText}>View Profile</Text>
              </Pressable>
            </BlurView>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BlurView intensity={60} tint="light" style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                setActiveTab(item.key);
                if (item.key !== "home") {
                  router.push({
                    pathname: item.route,
                    params: { fullName, instruments, genres },
                  });
                }
              }}
              style={styles.navItem}
            >
              <Ionicons
                name={isActive ? item.icon : `${item.icon}-outline`}
                size={22}
                color={isActive ? "#7c3aed" : "#9ca3af"}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
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
  statusCard: {
    flex: 1,
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

  emptyText: { color: "#9ca3af", fontSize: 13, marginBottom: 16 },

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

  bottomNav: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    flexDirection: "row",
    paddingVertical: 12,
  },
  navItem: { flex: 1, alignItems: "center", gap: 3 },
  navLabel: { color: "#9ca3af", fontSize: 10, fontWeight: "600" },
  navLabelActive: { color: PURPLE },
});