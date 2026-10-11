import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import { useAppAlert } from "../components/useAppAlert";
import { getMyBand, getMe, clearToken, resolveUrl } from "../api";
import { unregisterPushToken } from "../components/usePushNotifications";

// GigMatch — Band profile screen (your band's own profile)
// Route: app/profile-band.jsx  →  "/profile-band"
// Reached by tapping the Profile tab in BottomNav while signed in as the
// band role. Loads GET /api/bands/me (leader or member) on every focus.
// A band-role user who hasn't created a band yet sees a "Create a band" CTA.

const MENU_ITEMS = [
  { key: "edit", icon: "create-outline", label: "Edit Band Profile", route: "/edit-band", leaderOnly: true },
  { key: "song", icon: "musical-notes-outline", label: "Add Song", route: "/add-song", leaderOnly: true },
  { key: "members", icon: "people-outline", label: "Band Members", route: "/band-members", leaderOnly: true },
  { key: "applications", icon: "person-add-outline", label: "Musician Applications", route: "/band-applications", leaderOnly: true },
  { key: "public", icon: "eye-outline", label: "View Public Profile", route: "/band-profile" },
  { key: "verify", icon: "shield-checkmark-outline", label: "ID Verification", route: "/verification" },
  { key: "ratings", icon: "star-outline", label: "Ratings Review", route: "/ratings-review" },
];

// Shown under the "ID Verification" row so the account state is legible
// without opening the screen. Same wording as app/verification.jsx.
// Verification belongs to the member account, not the band, so this reads the
// signed-in user (fetched alongside the band below) rather than band data.
function verifyStatusOf(me) {
  if (me?.verificationStatus === "approved" && me?.verified) {
    return { text: "ID verified", color: "#16a34a" };
  }
  if (me?.verificationStatus === "pending") return { text: "Waiting for review", color: "#d97706" };
  if (me?.verificationStatus === "rejected") return { text: "Not approved", color: "#dc2626" };
  return { text: "Not verified", color: "#9ca3af" };
}

function toList(value) {
  return value ? String(value).split(",").filter(Boolean) : [];
}

export default function ProfileBand() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert, AlertModal } = useAppAlert();

  const [band, setBand] = useState(null);
  const [me, setMe] = useState(null); // the signed-in member, for ID verification
  const [checked, setChecked] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  // Reload every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyBand()
        .then((data) => {
          if (!active) return;
          setBand(data);
          setPhotoFailed(false);
        })
        .catch((e) => {
          console.log("getMyBand error:", e.message);
          if (active) setBand(null);
        })
        .finally(() => {
          if (active) setChecked(true);
        });

      // The signed-in MEMBER, not the band — ID verification belongs to the
      // account. Kept as an independent fetch so it still loads for members
      // who haven't created a band yet.
      getMe()
        .then((data) => {
          if (active) setMe(data);
        })
        .catch((e) => console.log("getMe error:", e.message));

      return () => {
        active = false;
      };
    }, [])
  );

  // Band photo: rebuild stale hosts and skip non-http paths (see resolveUrl)
  const photo = resolveUrl(band?.photoUrl);
  const showPhoto = photo && /^https?:\/\//.test(photo) && !photoFailed;

  const bandDisplayName = band?.name?.trim() ? band.name.trim() : "Your band";
  const bandLocation = band?.location?.trim() ? band.location.trim() : null;
  const primaryGenre = toList(band?.genre)[0] ?? null;
  const isLeader = band ? band.isLeader !== false : false;

  const subtitle = ["Band", bandLocation, primaryGenre].filter(Boolean).join(" · ");

  // Drives the status line under the "ID Verification" menu row.
  const verifyStatus = verifyStatusOf(me);

  const menuItems = MENU_ITEMS.filter((item) => {
    if (item.leaderOnly && !isLeader) return false;
    if (item.route === "/band-profile" && !band) return false;
    return true;
  });

  const handleMenuPress = (item) => {
    if (item.route === "/band-profile") {
      if (!band?.id) return;
      router.push({
        pathname: "/band-profile",
        params: { id: String(band.id), name: band?.name ?? "" },
      });
      return;
    }
    // Add Song runs in "profile mode": it loads the band's saved details
    // itself, appends the song, and comes straight back here.
    if (item.route === "/add-song") {
      if (!band?.id) return;
      router.push({ pathname: "/add-song", params: { from: "profile" } });
      return;
    }
    router.push({
      pathname: item.route,
      params: { bandName: band?.name ?? "", bandPhotoUri: photo ?? "" },
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
            // Unregister push BEFORE clearing the token — the request to
            // drop this device's token still needs to authenticate.
            await unregisterPushToken();
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
                <Ionicons name="people" size={26} color="rgba(124,58,237,0.6)" />
              )}
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name}>{bandDisplayName}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerAccent} />

        {/* Menu / empty state */}
        <View style={styles.menu}>
          {checked && !band ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={26} color={PURPLE} />
              </View>
              <Text style={styles.emptyTitle}>You haven't created a band yet</Text>
              <Text style={styles.emptyText}>
                Create your band to manage members, review musician applications, and post gigs as a band.
              </Text>
              <Pressable
                onPress={() => router.push("/create-band")}
                style={({ pressed }) => [styles.emptyButton, pressed && styles.emptyButtonPressed]}
              >
                <Text style={styles.emptyButtonText}>Create a band</Text>
              </Pressable>
            </View>
          ) : (
            menuItems.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => handleMenuPress(item)}
                style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
              >
                <View style={styles.menuIconWrap}>
                  <Ionicons name={item.icon} size={18} color="#111827" />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.key === "verify" ? (
                    <Text style={[styles.verifyStatus, { color: verifyStatus.color }]}>
                      {verifyStatus.text}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </Pressable>
            ))
          )}

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
        homeRoute="/dashboard-band"
        profileRoute="/profile-band"
        params={{
          fullName: band?.name ?? "",
          bandName: band?.name ?? "",
          bandPhotoUri: photo ?? "",
        }}
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
  menuText: { flex: 1 },
  menuLabel: { color: "#111827", fontSize: 14, fontWeight: "600" },
  verifyStatus: { fontSize: 11.5, fontWeight: "600", marginTop: 2 },
  logoutLabel: { flex: 1, color: "#ef4444", fontSize: 14, fontWeight: "600" },

  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    padding: 22,
    alignItems: "center",
    marginBottom: 12,
  },
  emptyIconWrap: {
    height: 52,
    width: 52,
    borderRadius: 26,
    backgroundColor: "rgba(124,58,237,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { color: "#111827", fontSize: 15, fontWeight: "700", marginBottom: 6 },
  emptyText: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: PURPLE,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyButtonPressed: { opacity: 0.85 },
  emptyButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
