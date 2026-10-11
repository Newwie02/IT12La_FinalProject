import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { getMe, getMyBand } from "../api";

// Shared bottom navigation bar — used by dashboard-musician, discover,
// messages, and profile-musician so the active tab always reflects the
// actual current route (via usePathname), not local component state.
// Lives at /components/BottomNav.jsx (sibling of app/, NOT inside app/ —
// putting it inside app/ would make Expo Router treat it as a route).
//
// Home / Profile destinations come from the REAL account on the server.
// Both used to be hardcoded to musician routes, so a client or a band leader
// tapping Home/Profile from Discover or Messages landed on the musician
// screen and the account "looked" switched to musician.
//
// IMPORTANT — band leadership can NOT be read off `me.role`. Creating a band
// never changes the owner's role; band owners stay `musician` (same reason
// the suspension gate checks Band.ownerId). So leadership is asked for
// explicitly via getMyBand(), whose `isLeader` flag is true only for the
// owner — a member of someone else's band is not a leader and stays on the
// musician screens. `role === "band"` is still honoured as a fallback in case
// that value ever becomes settable.
//
// The role/leadership lookups are async, so Home and Profile are held until
// both settle (see handlePress) — otherwise a client could tap through to a
// musician screen during the first frames.

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

  // null = still loading; "" = unknown (server unreachable)
  const [role, setRole] = useState(null);
  // null = still loading; true only when this account OWNS a band.
  const [isBandLeader, setIsBandLeader] = useState(null);

  useEffect(() => {
    let active = true;
    getMe()
      .then(async (me) => {
        if (!active) return;
        const r = me?.role ?? "";
        setRole(r);

        // Clients and unknown roles can never lead a band — skip the call.
        if (r === "client" || r === "organizer" || r === "") {
          setIsBandLeader(false);
          return;
        }
        try {
          const band = await getMyBand();
          if (active) setIsBandLeader(!!band?.isLeader);
        } catch {
          // No band (the usual case) resolves to null inside getMyBand, so
          // landing here means the request itself failed — treat as not-leader.
          if (active) setIsBandLeader(false);
        }
      })
      .catch(() => {
        if (!active) return;
        setRole("");
        setIsBandLeader(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isClientRole = role === "client" || role === "organizer";
  const leadsBand = isBandLeader === true || role === "band";

  // Until leadership settles, fall back to whatever the screen passed in so
  // the bar still routes somewhere sensible rather than snapping late.
  const routes = {
    home: isClientRole
      ? "/dashboard-client"
      : isBandLeader === null
      ? homeRoute
      : leadsBand
      ? "/dashboard-band"
      : "/dashboard-musician",
    discover: "/discover",
    gigs: "/gig-posting",
    messages: "/messages",
    profile: isClientRole
      ? "/profile-client"
      : isBandLeader === null
      ? profileRoute
      : leadsBand
      ? "/profile-band"
      : "/profile-musician",
  };

  const items = showGigs ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.key !== "gigs");

  const handlePress = (item) => {
    // Hold Home/Profile until the role AND band ownership are known, so a
    // client or a band leader can never jump to a musician screen mid-fetch.
    if ((item.key === "home" || item.key === "profile") && isBandLeader === null) return;
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