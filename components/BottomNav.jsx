import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

// Shared bottom navigation bar — used by dashboard-musician, discover,
// messages, and profile-musician so the active tab always reflects the
// actual current route (via usePathname), not local component state.
// Lives at /components/BottomNav.jsx (sibling of app/, NOT inside app/ —
// putting it inside app/ would make Expo Router treat it as a route).

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "home" },
  { key: "discover", label: "Discover", icon: "compass" },
  { key: "messages", label: "Messages", icon: "chatbubble-ellipses" },
  { key: "profile", label: "Profile", icon: "person" },
];

export default function BottomNav({
  homeRoute = "/dashboard-musician",
  profileRoute = "/profile-musician",
  params = {},
}) {
  const router = useRouter();
  const pathname = usePathname();

  const routes = {
    home: homeRoute,
    discover: "/discover",
    messages: "/messages",
    profile: profileRoute,
  };

  return (
    <BlurView intensity={60} tint="light" style={styles.bottomNav}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === routes[item.key];
        return (
          <Pressable
            key={item.key}
            onPress={() => router.push({ pathname: routes[item.key], params })}
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
  );
}

const styles = StyleSheet.create({
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
  navLabelActive: { color: "#7c3aed" },
});