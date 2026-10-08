import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getBandProfile,
  getMyApplications,
  getMyBand,
  applyToBand,
  resolveUrl,
} from "../api";

// GigMatch — Band profile (opened with "View Profile" on a recommended band)
// Route: app/band-profile.jsx  →  "/band-profile"
// Params: id (band id), name
// Shows the band's details and lets a musician apply to join.

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((s) => s.trim());
  return [];
}

function ChipRow({ items, green }) {
  if (items.length === 0) return <Text style={styles.bodyText}>Not set</Text>;
  return (
    <View style={styles.chipRow}>
      {items.map((item) => (
        <View key={item} style={green ? styles.chipGreen : styles.chip}>
          <Text style={green ? styles.chipGreenText : styles.chipText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function BandProfile() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();

  const [band, setBand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  const [appStatus, setAppStatus] = useState(null); // null | "pending" | "accepted" | "rejected"
  const [isMyBand, setIsMyBand] = useState(false); // this exact band is mine
  const [ownsBand, setOwnsBand] = useState(false); // I own some band
  const [isMember, setIsMember] = useState(false); // I was accepted into some band
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Couldn't load this band (no band id was passed to this screen).");
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([
      getBandProfile(String(id)),
      getMyApplications().catch(() => []),
      getMyBand().catch(() => null),
    ])
      .then(([profile, mine, myBand]) => {
        if (!active) return;
        setBand(profile);
        const existing = mine.find((a) => String(a.bandId) === String(id));
        setAppStatus(existing ? existing.status : null);
        setIsMyBand(!!myBand && String(myBand.id) === String(id));
        setOwnsBand(!!myBand);
        setIsMember(mine.some((a) => a.status === "accepted"));
      })
      .catch((e) => {
        if (active) setError(e.message || "Couldn't load this band.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const submitApplication = async () => {
    setApplying(true);
    try {
      await applyToBand({ bandId: String(id) });
      setAppStatus("pending");
      Alert.alert(
        "Application sent",
        `The leader of ${band?.name ?? "this band"} will review your application.`
      );
    } catch (err) {
      Alert.alert("Couldn't apply", err.message || "Something went wrong.");
    } finally {
      setApplying(false);
    }
  };

  const confirmApply = () => {
    Alert.alert(
      `Apply to ${band?.name ?? "this band"}?`,
      "Your musician profile will be sent to the band's leader.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Apply", onPress: submitApplication },
      ]
    );
  };

  const displayName = band?.name || name || "Band";
  const photo = resolveUrl(band?.photoUrl);
  const showPhoto = photo && !photoFailed;

  const primaryGenres = toList(band?.genre);
  const secondaryGenres = toList(band?.secondaryGenres);
  const eventTypes = toList(band?.eventTypes);
  const songs = Array.isArray(band?.songs) ? band.songs : [];
  const hasRating = band?.rating != null;

  // Label + style of the Apply button at the bottom
  let applyLabel = "Apply";
  let applyDisabled = false;
  if (applying) {
    applyLabel = "Applying...";
    applyDisabled = true;
  } else if (ownsBand) {
    applyLabel = "You already have your own band";
    applyDisabled = true;
  } else if (isMember && appStatus !== "accepted") {
    applyLabel = "You're already in another band";
    applyDisabled = true;
  } else if (appStatus === "pending") {
    applyLabel = "Applied · waiting for the leader";
    applyDisabled = true;
  } else if (appStatus === "accepted") {
    applyLabel = "Accepted — you're in this band";
    applyDisabled = true;
  } else if (appStatus === "rejected") {
    applyLabel = "Rejected — apply again";
  }

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                <Ionicons name="people" size={30} color="rgba(124,58,237,0.6)" />
              )}
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.subtitle}>
                {band?.bandType || "Band"}
                {band?.location ? ` · ${band.location}` : ""}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerAccent} />

        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 30 }} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <>
              {/* Ratings */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Ratings</Text>
                {hasRating ? (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={18} color="#f59e0b" />
                    <Text style={styles.ratingValue}>{Number(band.rating).toFixed(1)}</Text>
                    <Text style={styles.bodyText}>
                      ({band.ratingCount} rating{band.ratingCount === 1 ? "" : "s"})
                    </Text>
                  </View>
                ) : (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star-outline" size={18} color="#9ca3af" />
                    <Text style={styles.bodyText}>No ratings yet</Text>
                  </View>
                )}
              </View>

              {/* Band name + description */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Band name</Text>
                <Text style={styles.valueText}>{displayName}</Text>
                <Text style={[styles.cardTitle, styles.cardTitleSpaced]}>Band description</Text>
                <Text style={styles.bodyText}>{band?.bio?.trim() || "No description yet."}</Text>
              </View>

              {/* Location + band type */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Location (barangay)</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#6b7280" />
                  <Text style={styles.bodyText}>{band?.location || "Not set"}</Text>
                </View>
                <Text style={[styles.cardTitle, styles.cardTitleSpaced]}>Band type</Text>
                <Text style={styles.bodyText}>{band?.bandType || "Not set"}</Text>
              </View>

              {/* Genres */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Primary genre</Text>
                <ChipRow items={primaryGenres} green />
                <Text style={[styles.cardTitle, styles.cardTitleSpaced]}>Secondary genre</Text>
                <ChipRow items={secondaryGenres} />
              </View>

              {/* Event types */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Available event types</Text>
                <ChipRow items={eventTypes} />
              </View>

              {/* Songs */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Songs</Text>
                {songs.length === 0 ? (
                  <Text style={styles.bodyText}>No songs added yet.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {songs.map((song, index) => (
                      <View key={song.id ?? index} style={styles.songRow}>
                        <View style={styles.songBadge}>
                          <Text style={styles.songBadgeText}>
                            {song.type === "cover" ? "Cover" : "Original"}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.songTitle}>{song.title}</Text>
                          {song.artist ? <Text style={styles.songArtist}>{song.artist}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Apply button */}
      {!loading && !error && !isMyBand ? (
        <View style={styles.footer}>
          <Pressable
            onPress={confirmApply}
            disabled={applyDisabled}
            style={[styles.applyButton, applyDisabled && styles.applyButtonDisabled]}
          >
            <Text style={[styles.applyButtonText, applyDisabled && styles.applyButtonTextDisabled]}>
              {applyLabel}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const PURPLE = "#7c3aed";

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  scrollContent: { paddingBottom: 110 },

  header: { backgroundColor: PURPLE, paddingTop: 54, paddingHorizontal: 20, paddingBottom: 24 },
  headerAccent: { height: 3, backgroundColor: "#60a5fa" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18 },
  backText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    height: 76,
    width: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  identityText: { flex: 1 },
  name: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13 },

  body: { paddingHorizontal: 16, paddingTop: 18 },
  errorText: { color: "#dc2626", fontSize: 14, textAlign: "center", marginTop: 30 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: "#111827", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  cardTitleSpaced: { marginTop: 16 },
  bodyText: { color: "#4b5563", fontSize: 13, lineHeight: 19 },
  valueText: { color: "#111827", fontSize: 15, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingValue: { color: "#111827", fontSize: 18, fontWeight: "700" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  chipGreen: { backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipGreenText: { color: "#16a34a", fontSize: 12, fontWeight: "600" },

  songRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    backgroundColor: "#faf9fd",
    borderRadius: 12,
    padding: 10,
  },
  songBadge: { backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  songBadgeText: { color: PURPLE, fontSize: 10, fontWeight: "700" },
  songTitle: { color: "#111827", fontSize: 13, fontWeight: "700" },
  songArtist: { color: "#9ca3af", fontSize: 11, marginTop: 1 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(248,247,251,0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  applyButton: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  applyButtonDisabled: { backgroundColor: "#e5e0f5" },
  applyButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  applyButtonTextDisabled: { color: "#7c3aed" },
});