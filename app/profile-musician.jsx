import { View, Text, Pressable, StyleSheet, ScrollView, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import { useAppAlert } from "../components/useAppAlert";

// GigMatch — Musician profile screen
// Route: app/profile-musician.jsx  →  "/profile-musician"
// Reached by tapping the Profile tab in BottomNav. No backend yet, so
// account/availability/payment/ID/ratings rows are placeholders that just
// navigate — swap PLACEHOLDER_* fallbacks for real data once profile
// fields are actually collected and persisted.
//
// Note: params like headline/location/gender/birthday aren't produced by
// any screen yet (only fullName/instruments/genres/bandName flow through
// today). This screen accepts them if present and falls back to sensible
// placeholders otherwise, the same pattern the dashboards use.

const MENU_ITEMS = [
  { key: "account", icon: "settings-outline", label: "Account Settings", route: "/account-settings" },
  { key: "availability", icon: "calendar-outline", label: "Availability Calendar", route: "/availability-calendar" },
  { key: "payment", icon: "card-outline", label: "Payment Method", route: "/payment-method" },
  { key: "id", icon: "shield-checkmark-outline", label: "ID Verification", route: "/id-verification" },
  { key: "ratings", icon: "star-outline", label: "Ratings Review", route: "/ratings-review" },
];

export default function ProfileMusician() {
  const router = useRouter();
  const {
    fullName,
    instruments,
    genres,
    bandName,
    bandPhotoUri,
    headline,
    location,
    gender,
    birthday,
    photoUri,
  } = useLocalSearchParams();
  const { showAlert, AlertModal } = useAppAlert();

  const instrumentTags = instruments ? instruments.split(",").filter(Boolean) : [];

  const resolvedName = fullName?.trim() ? fullName.trim() : "Your name";
  const resolvedHeadline = headline?.trim()
    ? headline.trim()
    : instrumentTags[0] || "Musician";
  const resolvedLocation = location?.trim() ? location.trim() : "Location not set";
  const resolvedGender = gender?.trim() ? gender.trim() : "Not specified";
  const resolvedBirthday = birthday?.trim() ? birthday.trim() : "Not set";

  const handleMenuPress = (item) => {
    router.push({
      pathname: item.route,
      params: { fullName, instruments, genres, bandName, bandPhotoUri },
    });
  };

  const handleLogout = () => {
    showAlert({
      icon: "log-out",
      tone: "warning",
      title: "Log out?",
      message: "You'll need to sign in again to access your account.",
      buttons: [
        { label: "Cancel", style: "cancel" },
        {
          label: "Log out",
          style: "destructive",
          onPress: () => router.replace("/"),
        },
      ],
    });
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={8}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              {bandPhotoUri || photoUri ? (
                <Image source={{ uri: photoUri || bandPhotoUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={26} color="rgba(255,255,255,0.6)" />
              )}
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name}>{resolvedName}</Text>
              <Text style={styles.subtitle}>
                {resolvedHeadline} · {resolvedLocation}
              </Text>
              <Text style={styles.subtitle}>
                {resolvedGender} · {resolvedBirthday}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerAccent} />

        {/* Menu */}
        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => handleMenuPress(item)}
              style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            >
              <View style={styles.menuIconWrap}>
                <Ionicons name={item.icon} size={18} color="#111827" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </Pressable>
          ))}

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
          >
            <View style={styles.menuIconWrap}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            </View>
            <Text style={styles.logoutLabel}>Log out</Text>
          </Pressable>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav
        homeRoute={bandName ? "/dashboard-band" : "/dashboard-musician"}
        profileRoute="/profile-musician"
        params={{ fullName, instruments, genres, bandName, bandPhotoUri }}
        showGigs={false}
      />
      {AlertModal}
    </View>
  );
}

const PURPLE = "#7c3aed";
const BLUE_ACCENT = "#60a5fa";

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  scrollContent: { paddingBottom: 0 },

  header: {
    backgroundColor: PURPLE,
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerAccent: { height: 3, backgroundColor: BLUE_ACCENT },

  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 },
  backText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  identityText: { flex: 1 },
  name: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 18 },

  menu: { paddingHorizontal: 16, paddingTop: 18 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  menuRowPressed: { backgroundColor: "#f9fafb" },
  menuIconWrap: {
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, color: "#111827", fontSize: 14, fontWeight: "600" },
  logoutLabel: { flex: 1, color: "#ef4444", fontSize: 14, fontWeight: "600" },
});