import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import { useAppAlert } from "../components/useAppAlert";
import { getMyProfile, clearToken } from "../api";

// GigMatch — Client / Event Organizer profile screen (your own profile)
// Route: app/profile-client.jsx  →  "/profile-client"
// Reached by tapping the Profile tab in BottomNav while logged in as a
// client / organizer (the musician role goes to /profile-musician).
// Details load from the server (GET /users/me) on every focus, so edits
// made in Edit Profile show up right away.

const MENU_ITEMS = [
  { key: "edit", icon: "create-outline", label: "Edit Profile", route: "/edit-profile" },
];

function formatBirthday(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function ProfileClient() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert, AlertModal } = useAppAlert();

  const [me, setMe] = useState(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  // Reload every time the screen comes into focus (e.g. after Edit Profile)
  useFocusEffect(
    useCallback(() => {
      getMyProfile()
        .then((data) => {
          setMe(data);
          setPhotoFailed(false);
        })
        .catch((e) => console.log("getMyProfile error:", e.message));
    }, [])
  );

  const fullName = me?.name ?? params.fullName;

  // Only real server URLs can be shown; blob:/file: paths are skipped
  const photo = me?.photoUrl;
  const showPhoto = photo && /^https?:\/\//.test(photo) && !photoFailed;

  const isOrganizer = me?.role === "organizer" || params.role === "organizer";
  const roleLabel = isOrganizer ? "Event Organizer" : "Client";

  const resolvedName = fullName?.trim() ? fullName.trim() : "Your name";
  // The role-specific title saved during step 3 lives in stageName
  // (the organizer setup saves "position" there).
  const resolvedHeadline = me?.stageName?.trim() ? me.stageName.trim() : roleLabel;
  const resolvedLocation = me?.barangay?.trim() ? me.barangay.trim() : "Location not set";
  const resolvedGender = me?.gender?.trim() ? me.gender.trim() : "Not specified";
  const resolvedBirthday = formatBirthday(me?.birthday) ?? "Not set";

  const handleMenuPress = (item) => {
    router.push({
      pathname: item.route,
      params: { fullName, role: me?.role ?? params.role },
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
          onPress: async () => {
            await clearToken();
            router.replace("/");
          },
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
              {showPhoto ? (
                <Image
                  source={{ uri: photo }}
                  style={styles.avatarImage}
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <Ionicons name="calendar" size={26} color="rgba(124,58,237,0.6)" />
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
        homeRoute="/dashboard-client"
        profileRoute="/profile-client"
        params={{ fullName, role: isOrganizer ? "organizer" : "client" }}
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
