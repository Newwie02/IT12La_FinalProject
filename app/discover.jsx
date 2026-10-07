import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import { getBands, resolveUrl } from "../api";

// GigMatch — Discover screen
// Route: app/discover.jsx  →  "/discover"
// Fetches every band from the real backend (GET /api/bands) so any band
// created via create-band.jsx shows up here for every user.

export default function Discover() {
  const { fullName, instruments, genres, bandName, bandPhotoUri } = useLocalSearchParams();

  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadBands = useCallback(async () => {
    try {
      setError(null);
      const data = await getBands();
      setBands(data);
    } catch (err) {
      setError(err.message || "Couldn't load bands. Is the server running?");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadBands().finally(() => setLoading(false));
  }, [loadBands]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBands();
    setRefreshing(false);
  };

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
      >
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Bands looking for gigs and members.</Text>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#7c3aed" />
          </View>
        ) : error ? (
          <View style={styles.placeholderCard}>
            <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
            <Text style={styles.placeholderText}>{error}</Text>
          </View>
        ) : bands.length === 0 ? (
          <View style={styles.placeholderCard}>
            <Ionicons name="compass-outline" size={28} color="#7c3aed" />
            <Text style={styles.placeholderText}>
              No bands yet. Be the first to create one!
            </Text>
          </View>
        ) : (
          <View style={styles.bandList}>
            {bands.map((band) => (
              <View key={band.id} style={styles.bandCard}>
                <View style={styles.bandAvatar}>
                  {band.photoUrl ? (
                    <Image
                      source={{ uri: resolveUrl(band.photoUrl) }}
                      style={styles.bandAvatarImage}
                    />
                  ) : (
                    <Ionicons name="people" size={22} color="#7c3aed" />
                  )}
                </View>
                <View style={styles.bandInfo}>
                  <Text style={styles.bandName}>{band.name}</Text>
                  {band.genre ? <Text style={styles.bandMeta}>{band.genre}</Text> : null}
                  {band.location ? (
                    <Text style={styles.bandMetaSecondary}>{band.location}</Text>
                  ) : null}
                  {band.bio ? (
                    <Text style={styles.bandBio} numberOfLines={2}>
                      {band.bio}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomNav
        homeRoute={bandName ? "/dashboard-band" : "/dashboard-musician"}
        profileRoute="/profile-musician"
        params={{ fullName, instruments, genres, bandName, bandPhotoUri }}
        showGigs={!!bandName}
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
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  placeholderText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },

  bandList: { gap: 12 },
  bandCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 14,
  },
  bandAvatar: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bandAvatarImage: { width: "100%", height: "100%" },
  bandInfo: { flex: 1 },
  bandName: { color: "#111827", fontSize: 15, fontWeight: "700" },
  bandMeta: { color: "#7c3aed", fontSize: 12, fontWeight: "600", marginTop: 2 },
  bandMetaSecondary: { color: "#9ca3af", fontSize: 12, marginTop: 1 },
  bandBio: { color: "#6b7280", fontSize: 12, marginTop: 6, lineHeight: 17 },
});