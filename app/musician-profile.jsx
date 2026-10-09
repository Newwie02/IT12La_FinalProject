import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMusicianById, getUserRatingSummary, getMyBand, inviteMusician, resolveUrl } from "../api";

// GigMatch — Another musician's profile
// Route: app/musician-profile.jsx  →  "/musician-profile"
// Opened with params: id, name, tags
// Shows their received rating average (from gigs they performed at).
// Band leaders also get a "Hire musician" button for solo (not banded) targets.

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return value.split(",").map((s) => s.trim());
  return [];
}

export default function MusicianProfile() {
  const router = useRouter();
  const { id, name, tags } = useLocalSearchParams();

  // DEBUG: should print a long id like "a7a53dbf-9e1b-...". If it prints undefined,
  // the screen that opens this one is not passing the id.
  console.log("PROFILE ID:", id);

  const [user, setUser] = useState(null);
  const [ratingInfo, setRatingInfo] = useState(null); // { average, count }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [myBand, setMyBand] = useState(null); // the viewer's band (null = none)
  const [invited, setInvited] = useState(false); // invitation already sent from here
  const [hireOpen, setHireOpen] = useState(false); // message box visible
  const [hireMessage, setHireMessage] = useState(""); // the leader's note to the musician
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) {
      // Before: this quit silently and showed empty "Not set" fields.
      setError("Couldn't load this profile (no user id was passed to this screen).");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      getMusicianById(String(id)),
      getUserRatingSummary(String(id)).catch(() => null), // ratings are extra
      getMyBand().catch(() => null), // viewer's band → decides the Hire button
    ])
      .then(([data, rating, viewerBand]) => {
        setUser(data);
        setRatingInfo(rating);
        setMyBand(viewerBand);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Full name is the identity on profiles — stage names aren't displayed
  const displayName = user?.name?.trim() || name || "Musician";
  const instruments = toList(user?.instruments);
  const genres = toList(user?.genres);
  const photo = resolveUrl(user?.photoUrl);
  const showPhoto = photo && !photoFailed;

  const handleMessage = () => {
    router.push({
      pathname: "/messages",
      params: { withId: String(id), with: displayName },
    });
  };

  // Hire button: only a band LEADER viewing a SOLO musician (not banded, not a
  // client, not themselves — leading a band already puts `user.band` on them).
  const canHire =
    !!myBand?.isLeader &&
    !!user &&
    !user.band &&
    user.role !== "client" &&
    user.role !== "organizer";

  // Hire: the leader writes a message so the musician knows WHY they're being
  // hired. The message travels with the invitation — it shows up in the
  // musician's notification AND on the Band invitations card.
  const sendInvite = async () => {
    if (sending) return;
    setSending(true);
    try {
      await inviteMusician({
        userId: String(id),
        message: hireMessage.trim() || undefined,
      });
      setInvited(true);
      setHireOpen(false);
      Alert.alert(
        "Invitation sent",
        `${displayName.split(" ")[0]} will see your invitation in their notifications and Band invitations.`
      );
    } catch (err) {
      Alert.alert("Couldn't send invitation", err.message || "Something went wrong.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
                <Ionicons name="person" size={30} color="rgba(124,58,237,0.6)" />
              )}
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.subtitle}>
                {instruments[0] || tags || "Musician"}
                {user?.barangay ? ` · ${user.barangay}` : ""}
              </Text>
              {user?.band ? (
                <Text style={styles.bandLine}>
                  {user.band.isLeader ? "Leads" : "Member of"} {user.band.name}
                </Text>
              ) : null}
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
              {canHire ? (
                hireOpen && !invited ? (
                  <View style={styles.hireBox}>
                    <Text style={styles.hireBoxLabel}>
                      Invite {displayName.split(" ")[0]} to join {myBand?.name ?? "your band"}
                    </Text>
                    <TextInput
                      style={styles.hireInput}
                      placeholder="Write a message so they know why you're hiring them…"
                      placeholderTextColor="#9ca3af"
                      multiline
                      maxLength={300}
                      value={hireMessage}
                      onChangeText={setHireMessage}
                    />
                    <View style={styles.hireActions}>
                      <Pressable
                        disabled={sending}
                        onPress={() => setHireOpen(false)}
                        style={[styles.hireAction, styles.hireCancel]}
                      >
                        <Text style={styles.hireCancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        disabled={sending}
                        onPress={sendInvite}
                        style={[styles.hireAction, styles.hireSend]}
                      >
                        <Text style={styles.hireSendText}>
                          {sending ? "Sending…" : "Send invitation"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    disabled={invited}
                    onPress={() => setHireOpen(true)}
                    style={[styles.hireButton, invited && styles.hireButtonDone]}
                  >
                    <Ionicons
                      name={invited ? "checkmark-circle" : "person-add"}
                      size={18}
                      color={invited ? "#16a34a" : PURPLE}
                    />
                    <Text style={[styles.hireButtonText, invited && styles.hireButtonTextDone]}>
                      {invited ? "Invitation sent" : "Hire musician"}
                    </Text>
                  </Pressable>
                )
              ) : null}

              <Pressable onPress={handleMessage} style={styles.messageButton}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                <Text style={styles.messageButtonText}>Message</Text>
              </Pressable>

              {/* Rating from clients after performed gigs */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Rating</Text>
                {ratingInfo?.count > 0 ? (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={18} color="#f59e0b" />
                    <Text style={styles.ratingValue}>
                      {Number(ratingInfo.average).toFixed(1)}
                    </Text>
                    <Text style={styles.bodyText}>
                      ({ratingInfo.count} rating{ratingInfo.count === 1 ? "" : "s"})
                    </Text>
                  </View>
                ) : (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star-outline" size={18} color="#9ca3af" />
                    <Text style={styles.bodyText}>No ratings yet</Text>
                  </View>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>About</Text>
                <Text style={styles.bodyText}>{user?.bio?.trim() || "No bio yet."}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Instruments</Text>
                <View style={styles.chipRow}>
                  {instruments.length === 0 ? (
                    <Text style={styles.bodyText}>Not set</Text>
                  ) : (
                    instruments.map((i) => (
                      <View key={i} style={styles.chipGreen}>
                        <Text style={styles.chipGreenText}>{i}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Genres</Text>
                <View style={styles.chipRow}>
                  {genres.length === 0 ? (
                    <Text style={styles.bodyText}>Not set</Text>
                  ) : (
                    genres.map((g) => (
                      <View key={g} style={styles.chip}>
                        <Text style={styles.chipText}>{g}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Contact</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#6b7280" />
                  <Text style={styles.bodyText}>{user?.barangay || "Barangay not set"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={16} color="#6b7280" />
                  <Text style={styles.bodyText}>{user?.phone || "Phone not set"}</Text>
                </View>
              </View>
            </>
          )}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const PURPLE = "#7c3aed";

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },

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

  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PURPLE,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  messageButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  bandLine: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600", marginTop: 3 },

  hireButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: PURPLE,
    backgroundColor: "rgba(124,58,237,0.06)",
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  hireButtonDone: { borderColor: "rgba(22,163,74,0.5)", backgroundColor: "rgba(34,197,94,0.08)" },
  hireButtonText: { color: PURPLE, fontSize: 15, fontWeight: "700" },
  hireButtonTextDone: { color: "#16a34a" },

  hireBox: {
    borderWidth: 1.5,
    borderColor: "rgba(124,58,237,0.35)",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  hireBoxLabel: { color: "#111827", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  hireInput: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "#f8f7fb",
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: "#111827",
    textAlignVertical: "top",
  },
  hireActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  hireAction: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  hireCancel: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  hireCancelText: { color: "#4b5563", fontSize: 13, fontWeight: "700" },
  hireSend: { backgroundColor: PURPLE },
  hireSendText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: "#111827", fontSize: 14, fontWeight: "700", marginBottom: 8 },
  bodyText: { color: "#4b5563", fontSize: 13, lineHeight: 19 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },

  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingValue: { color: "#111827", fontSize: 16, fontWeight: "800" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  chipGreen: { backgroundColor: "rgba(34,197,94,0.12)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipGreenText: { color: "#16a34a", fontSize: 12, fontWeight: "600" },
});