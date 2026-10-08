import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Image, RefreshControl, Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import {
  getBands, getGigs, getMusicians, getMyBand, getMyApplications, resolveUrl,
} from "../api";

// GigMatch — Discover screen (role-aware)
// Route: app/discover.jsx → "/discover"
//   leader  (owns a band)          → gig postings
//   solo    (musician, no band)    → bands
//   member  (accepted into a band) → all musicians

const PURPLE = "#7c3aed";

const COPY = {
  leader: {
    subtitle: "Gig postings from clients.",
    empty: "No gig postings yet.",
    icon: "megaphone-outline",
  },
  solo: {
    subtitle: "Bands looking for members.",
    empty: "No bands yet.",
    icon: "compass-outline",
  },
  member: {
    subtitle: "Musicians on GigMatch.",
    empty: "No other musicians yet.",
    icon: "people-outline",
  },
};

export default function Discover() {
  const router = useRouter();
  const { fullName, instruments, genres, bandName, bandPhotoUri } = useLocalSearchParams();

  const [mode, setMode] = useState(bandName ? "leader" : null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [myBand, mine] = await Promise.all([
        getMyBand().catch(() => null),
        getMyApplications().catch(() => []),
      ]);

      let next = "solo";
      if (myBand || bandName) next = "leader";
      else if (mine.some((a) => a.status === "accepted")) next = "member";
      setMode(next);

      if (next === "leader") setItems(await getGigs());
      else if (next === "member") setItems(await getMusicians());
      else setItems(await getBands());
    } catch (err) {
      setError(err.message || "Couldn't load. Is the server running?");
    }
  }, [bandName]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const navParams = { fullName, instruments, genres, bandName, bandPhotoUri };
  const isLeader = mode === "leader";

  const renderBand = (band) => (
    <Pressable
      key={band.id}
      style={styles.card}
      onPress={() =>
        router.push({ pathname: "/band-profile", params: { id: String(band.id), name: band.name } })
      }
    >
      <View style={styles.avatar}>
        {band.photoUrl ? (
          <Image source={{ uri: resolveUrl(band.photoUrl) }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="people" size={22} color={PURPLE} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{band.name}</Text>
        {band.genre ? <Text style={styles.meta}>{band.genre}</Text> : null}
        {band.location ? <Text style={styles.metaSecondary}>{band.location}</Text> : null}
        {band.bio ? <Text style={styles.bio} numberOfLines={2}>{band.bio}</Text> : null}
      </View>
    </Pressable>
  );

  const renderGig = (gig) => (
    <Pressable
      key={gig.id}
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/gig-detail",
          params: {
            id: String(gig.id),
            posterName: gig.title,
            location: gig.location,
            price: gig.pay,
            description: gig.description,
            tags: gig.date,
            ...navParams,
          },
        })
      }
    >
      <View style={styles.avatar}>
        <Ionicons name="megaphone-outline" size={22} color={PURPLE} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{gig.title}</Text>
        {gig.pay ? <Text style={styles.meta}>{gig.pay}</Text> : null}
        {gig.location ? <Text style={styles.metaSecondary}>{gig.location}</Text> : null}
        {gig.description ? <Text style={styles.bio} numberOfLines={2}>{gig.description}</Text> : null}
      </View>
    </Pressable>
  );

  const renderMusician = (m) => {
    const photo = resolveUrl(m.photoUrl);
    return (
      <Pressable
        key={m.id}
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/musician-profile",
            params: { id: String(m.id), name: m.name, tags: m.role },
          })
        }
      >
        <View style={styles.avatar}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={22} color={PURPLE} />
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{m.name}</Text>
          <Text style={styles.meta}>{m.role}</Text>
        </View>
      </Pressable>
    );
  };

  const renderItem = (item) =>
    mode === "leader" ? renderGig(item) : mode === "member" ? renderMusician(item) : renderBand(item);

  const copy = COPY[mode] || COPY.solo;

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
      >
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        {loading ? (
          <View style={styles.centerBox}><ActivityIndicator size="large" color={PURPLE} /></View>
        ) : error ? (
          <View style={styles.placeholderCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
            <Text style={styles.placeholderText}>{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.placeholderCard}>
            <Ionicons name={copy.icon} size={28} color={PURPLE} />
            <Text style={styles.placeholderText}>{copy.empty}</Text>
          </View>
        ) : (
          <View style={styles.list}>{items.map(renderItem)}</View>
        )}
      </ScrollView>

      <BottomNav
        homeRoute={isLeader ? "/dashboard-band" : "/dashboard-musician"}
        profileRoute="/profile-musician"
        params={navParams}
        showGigs={isLeader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  blob: { position: "absolute", borderRadius: 9999, opacity: 0.25 },
  blobViolet: { top: -60, left: -60, height: 220, width: 220, backgroundColor: "#c4b5fd" },
  blobPink: { top: 200, right: -80, height: 220, width: 220, backgroundColor: "#f5d0fe" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
  title: { color: "#111827", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#6b7280", fontSize: 13, marginBottom: 20 },

  centerBox: { paddingVertical: 40, alignItems: "center" },
  placeholderCard: {
    backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 18, borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)", padding: 20, alignItems: "center", gap: 10,
  },
  placeholderText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },

  list: { gap: 12 },
  card: {
    flexDirection: "row", gap: 12, backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", padding: 14,
  },
  avatar: {
    height: 48, width: 48, borderRadius: 24, backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  info: { flex: 1 },
  name: { color: "#111827", fontSize: 15, fontWeight: "700" },
  meta: { color: PURPLE, fontSize: 12, fontWeight: "600", marginTop: 2 },
  metaSecondary: { color: "#9ca3af", fontSize: 12, marginTop: 1 },
  bio: { color: "#6b7280", fontSize: 12, marginTop: 6, lineHeight: 17 },
});