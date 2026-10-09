import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { getMe } from "../api";

// Shared bottom navigation bar — used by dashboard-musician, discover,
// messages, and profile-musician so the active tab always reflects the
// actual current route (via usePathname), not local component state.
// Lives at /components/BottomNav.jsx (sibling of app/, NOT inside app/ —
// putting it inside app/ would make Expo Router treat it as a route).
//
// Home / Profile destinations come from the REAL role on the server: screens
// used to hardcode musician routes, so a client tapping Home from Discover or
// Messages landed on the musician dashboard and the account "looked" switched
// to musician.

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "home" },
  { key: "discover", label: "Discover", icon: "compass" },
  { key: "gigs", label: "Gigs", icon: "megaphone" },
  { key: "messages", label: "Messages", icon: "chatbubble-ellipses" },
  { key: "profile", label: "Profile", icon: "person" },
];

export default function BottomNav({
  homeRoute = "/dashboard-musician",
  profileRoute = "/profile-musician",
  params = {},
  showGigs = true,
}) {
  const router = useRouter();
  const pathname = usePathname();

  // null = still loading the role; "" = unknown (server unreachable)
  const [role, setRole] = useState(null);

  useEffect(() => {
    let active = true;
    getMe()
      .then((me) => active && setRole(me?.role ?? ""))
      .catch(() => active && setRole(""));
    return () => {
      active = false;
    };
  }, []);

  const isClientRole = role === "client" || role === "organizer";
  const isBandRole = role === "band";

  const routes = {
    home: isClientRole ? "/dashboard-client" : isBandRole ? "/dashboard-band" : homeRoute,
    discover: "/discover",
    gigs: "/gig-posting",
    messages: "/messages",
    profile: isClientRole ? "/profile-client" : isBandRole ? "/profile-band" : profileRoute,
  };

  const items = showGigs ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.key !== "gigs");

  const handlePress = (item) => {
    // Hold Home/Profile until the real role is known, so a client can never
    // jump to a musician screen during the first fetch.
    if ((item.key === "home" || item.key === "profile") && role === null) return;
    router.push({ pathname: routes[item.key], params });
  };

  return (
    <BlurView intensity={60} tint="light" style={styles.bottomNav}>
      {items.map((item) => {
        const isActive = pathname === routes[item.key];
        return (
          <Pressable
            key={item.key}
            onPress={() => handlePress(item)}
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