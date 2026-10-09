import { useState, useEffect, useCallback } from "react";
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
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import SwitchLoadingOverlay from "../components/SwitchLoadingOverlay";
import {
  getMusicians,
  getMyBand,
  getBands,
  getMe,
  getMyApplications,
  getReceivedApplications,
  getNotifications,
  getBookings,
  getMyGigApplications,
  getMyInvitations,
  leaveBand,
  resolveUrl,
} from "../api";

// GigMatch — Musician / Band dashboard (home)
// Route: app/dashboard-musician.jsx  →  "/dashboard-musician"
// "Fellow musician" now loads REAL musicians from the backend (GET /api/users/musicians)
// and "View Profile" opens /musician-profile with the real user id.

function formatPay(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? String(value) : `₱${n.toLocaleString("en-PH")}`;
}

const PLACEHOLDER_STATUS = [
  { key: "active", label: "Active status", value: "Online" },
  { key: "availability", label: "Availability", value: "Available" },
];

const NAV_ITEMS = [
  { key: "home", label: "Home", icon: "home" },
  { key: "discover", label: "Discover", icon: "compass" },
  { key: "messages", label: "Messages", icon: "chatbubble-ellipses" },
  { key: "profile", label: "Profile", icon: "person" },
];

export default function DashboardMusician() {
  const router = useRouter();
  const { fullName, instruments, genres } = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState("home");

  // Does this account own a band? (null = none, object = the band)
  const [myBand, setMyBand] = useState(null);
  const [bandChecked, setBandChecked] = useState(false);

  // Recommended bands (real) + this musician's application status per band
  const [bands, setBands] = useState([]);
  const [loadingBands, setLoadingBands] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState({}); // { [bandId]: "pending" | "accepted" | "rejected" }
  const [pendingCount, setPendingCount] = useState(0); // applications waiting for MY band
  const [unreadCount, setUnreadCount] = useState(0); // unread notifications (bell)
  const [isSwitching, setIsSwitching] = useState(false); // overlay while switching to the band dashboard
  const [me, setMe] = useState(null); // signed-in user (header avatar)
  const [bookings, setBookings] = useState([]); // accepted gigs (mine + my band's)
  const [myGigApps, setMyGigApps] = useState([]); // gig applications I've sent
  const [invites, setInvites] = useState([]); // band leaders' invitations to me

  // Re-check every time this screen comes into view (e.g. after creating a band)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyBand()
        .then((band) => {
          if (active) setMyBand(band);
        })
        .catch(() => {
          if (active) setMyBand(null);
        })
        .finally(() => {
          if (active) setBandChecked(true);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  // Load bands + application info every time this screen comes into view
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        getBands(),
        getMyApplications().catch(() => []),
        getReceivedApplications().catch(() => []),
        getNotifications().catch(() => []),
        getMe().catch(() => null),
        // Real bookings + my sent gig applications (for Upcoming gig / Booking / Pending)
        getBookings().catch(() => []),
        getMyGigApplications().catch(() => []),
        // Invitations from band leaders (Hire from a profile lands here)
        getMyInvitations().catch(() => []),
      ])
        .then(([allBands, mine, received, notifications, meUser, bookingRows, gigApps, inviteRows]) => {
          if (!active) return;
          setBands(allBands);
          setMe(meUser);
          setBookings(Array.isArray(bookingRows) ? bookingRows : []);
          setMyGigApps(Array.isArray(gigApps) ? gigApps : []);
          setInvites(Array.isArray(inviteRows) ? inviteRows : []);
          setUnreadCount(notifications.filter((n) => !n.isRead).length);
          const map = {};
          mine.forEach((a) => {
            map[a.bandId] = a.status;
          });
          setApplicationStatus(map);
          // "Musicians waiting for your answer" = applications TO my band,
          // not the invitations I sent out myself (those await their reply)
          setPendingCount(
            received.filter((a) => a.status === "pending" && a.invitedBy !== "band").length
          );
        })
        .catch(() => {
          if (active) setBands([]);
        })
        .finally(() => {
          if (active) setLoadingBands(false);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  // Real musicians from the backend
  const [musicians, setMusicians] = useState([]);
  const [loadingMusicians, setLoadingMusicians] = useState(true);
  const [musiciansError, setMusiciansError] = useState(null);

  useEffect(() => {
    getMusicians()
      .then((data) => setMusicians(data))
      .catch((e) => setMusiciansError(e.message || "Couldn't load musicians."))
      .finally(() => setLoadingMusicians(false));
  }, []);

  const openProfile = (person) => {
    router.push({
      pathname: "/musician-profile",
      params: { id: String(person.id), name: person.name, tags: person.role },
    });
  };

  const MUSICIAN_PREVIEW_LIMIT = 3;
  const visibleMusicians = musicians.slice(0, MUSICIAN_PREVIEW_LIMIT);

  const musicianName = fullName?.trim() ? fullName.trim() : "Musician";
  const instrumentTags = instruments ? instruments.split(",").filter(Boolean) : [];
  const genreTags = genres ? genres.split(",").filter(Boolean) : [];

   const hasBand = !!myBand;
  const inAnyBand = hasBand || Object.values(applicationStatus).includes("accepted");
  // One band per musician: accepted into someone else's band counts too
  const isMember = Object.values(applicationStatus).includes("accepted");
  const memberBand = bands.find((b) => applicationStatus[b.id] === "accepted");
  const displayName = musicianName;
  const headerLabel = `Musician — ${musicianName}`;

  // Status cards: "Band Status" depends on whether the account has a band
  const statusItems = [
    PLACEHOLDER_STATUS[0],
    { key: "band", label: "Band Status", value: hasBand || isMember ? "Banded" : "No band yet" },
    PLACEHOLDER_STATUS[1],
  ];

  // --- Real bookings + pending gig applications --------------------------
  const dayAnchor = new Date();
  const todayStart = new Date(dayAnchor.getFullYear(), dayAnchor.getMonth(), dayAnchor.getDate());
  // Booked gigs that haven't happened yet (server sorts soonest-first)
  const upcomingBookings = bookings.filter((b) => {
    if (!b.gig || b.gig.status !== "booked") return false;
    if (!b.gig.date) return true;
    return new Date(b.gig.date) >= todayStart;
  });
  const nextGig = upcomingBookings[0] ?? null;
  const nextGigDate = nextGig?.gig?.date ? new Date(nextGig.gig.date) : null;
  const nextGigValid = !!nextGigDate && !isNaN(nextGigDate.getTime());
  // Gig applications I sent that the client hasn't answered yet
  const pendingGigCount = myGigApps.filter((a) => a.status === "pending").length;
  // Band invitations waiting for my accept / decline
  const pendingInvites = invites.filter((i) => i.status === "pending");

  // Leave the band if it's not the right fit (membership is always my choice)
  const confirmLeaveBand = () => {
    const bandName = memberBand?.name ?? myBand?.name ?? "the band";
    Alert.alert(
      `Leave ${bandName}?`,
      "You'll no longer be a member of this band. You can join or create another band anytime.",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave band",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveBand();
              // Remount the dashboard so every band/member state refetches
              router.replace({ pathname: "/dashboard-musician", params: carryParams });
            } catch (err) {
              Alert.alert("Couldn't leave", err.message || "Something went wrong.");
            }
          },
        },
      ]
    );
  };

  // Opens one of my bookings — the gig detail shows the booked state
  const openBooking = (b) => {
    router.push({
      pathname: "/gig-detail",
      params: {
        id: b.gig.id,
        posterName: b.gig.postedBy?.name ?? "Client",
        location: b.gig.location ?? "",
        price: b.gig.pay ?? "",
        description: b.gig.description ?? "",
      },
    });
  };

  // Avatar tap: only accounts with a band can switch to the band dashboard
  const handleSwitchDashboard = () => {
        if (!bandChecked) return;
    const bandToOpen = myBand || memberBand;
    if (!bandToOpen) {
      Alert.alert(
        "No band yet",
        "Create a band first to unlock the band dashboard."
      );
      return;
    }
    if (isSwitching) return;
    setIsSwitching(true);
    setTimeout(() => {
      router.replace({
        pathname: "/dashboard-band",
        params: {
          ...carryParams,
                 bandName: bandToOpen.name ?? "",
          bandPhotoUri: resolveUrl(bandToOpen.photoUrl) ?? "",
          bandDescription: bandToOpen.bio ?? "",
          bandLocation: bandToOpen.location ?? "",
          primaryGenres: bandToOpen.genre ?? "",
          isLeader: myBand && myBand.isLeader !== false ? "true" : "false",
        },
      });
      setIsSwitching(false);
    }, 700);
  };

  // Params passed along so the next screen keeps your name / tags
  const carryParams = Object.fromEntries(
    Object.entries({ fullName, instruments, genres }).filter(([, v]) => v !== undefined)
  );

  const handleNavPress = (key) => {
    if (key === "home") {
      setActiveTab("home");
      return;
    }
    if (key === "discover") {
      router.push({ pathname: "/discover", params: carryParams });
    } else if (key === "messages") {
      router.push("/messages");
    } else if (key === "profile") {
      router.push({ pathname: "/profile-musician", params: carryParams });
    }
  };

  // Bands to recommend: every band except my own
  const recommendedBands = bands.filter((b) => !myBand || b.id !== myBand.id);

  const openBandProfile = (band) => {
    router.push({
      pathname: "/band-profile",
      params: { id: String(band.id), name: band.name },
    });
  };

  const handleCreateBand = () => {
    router.push({ pathname: "/create-band", params: carryParams });
  };

  return (
    <View style={styles.page}>
      {/* Soft pastel blobs for the glass surfaces to refract */}
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />
      <View style={[styles.blob, styles.blobBlue]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <BlurView intensity={50} tint="light" style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Pressable onPress={handleSwitchDashboard} style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {resolveUrl(me?.photoUrl) ? (
                  <Image source={{ uri: resolveUrl(me.photoUrl) }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={20} color="#7c3aed" />
                )}
              </View>
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{headerLabel}</Text>
              <Text style={styles.headerSubtitle}>Good day, {displayName.split(" ")[0]}</Text>
            </View>
            <Pressable
              style={styles.bellButton}
              hitSlop={8}
              onPress={() => router.push("/notifications")}
            >
              <Ionicons name="notifications" size={20} color="#7c3aed" />
              {unreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
          <Text style={styles.identityHint}>
            {!bandChecked
              ? " "
                           : hasBand || isMember
              ? `Tap your avatar to switch to ${(myBand || memberBand)?.name ?? "your band"} (band dashboard)`
              : "Create a band to unlock the band dashboard"}
          </Text>
        </BlurView>

        {/* Upcoming gig — the next gig you were booked for (tap to open) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Upcoming gig</Text>
          {nextGig ? (
            <Pressable onPress={() => openBooking(nextGig)}>
              <LinearGradient
                colors={["#8b5cf6", "#d946ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.reminderCard}
              >
                <View style={styles.reminderTopRow}>
                  <Text style={styles.reminderDate}>
                    {nextGigValid
                      ? nextGigDate.toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Date to be confirmed"}
                  </Text>
                  <View style={styles.confirmedBadge}>
                    <Text style={styles.confirmedBadgeText}>Booked</Text>
                  </View>
                </View>
                <Text style={styles.reminderTitle}>{nextGig.gig.title}</Text>
                <Text style={styles.reminderMeta}>
                  {[nextGig.gig.location, formatPay(nextGig.gig.pay)].filter(Boolean).join(" · ")}
                </Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <LinearGradient
              colors={["#8b5cf6", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.reminderCard}
            >
              <Text style={styles.reminderTitle}>No upcoming gigs</Text>
              <Text style={styles.reminderMeta}>
                Apply to open gigs in Discover — once a client books you, the gig shows up here.
              </Text>
            </LinearGradient>
          )}
        </View>

        {/* Booking / Pending — real counts from the backend */}
        <View style={styles.statsRow}>
          <Pressable
            style={styles.statCard}
            onPress={() => router.push({ pathname: "/my-gigs", params: { tab: "bookings" } })}
          >
            <Text style={styles.statValue}>{upcomingBookings.length}</Text>
            <Text style={styles.statLabel}>Booking</Text>
          </Pressable>
          <Pressable
            style={styles.statCard}
            onPress={() => router.push({ pathname: "/my-gigs", params: { tab: "applications" } })}
          >
            <Text style={styles.statValue}>{pendingGigCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </Pressable>
        </View>

        {/* Band invitations — a leader hired you from your profile (tap to answer) */}
        {pendingInvites.length > 0 ? (
          <Pressable
            onPress={() => router.push("/band-invitations")}
            style={styles.applicationsCard}
          >
            <Ionicons name="person-add" size={20} color="#7c3aed" />
            <View style={{ flex: 1 }}>
              <Text style={styles.applicationsTitle}>Band invitations</Text>
              <Text style={styles.applicationsSub}>
                {pendingInvites.length === 1
                  ? `${pendingInvites[0].band?.name ?? "A band"} invited you to join`
                  : `${pendingInvites.length} bands invited you to join`}
              </Text>
            </View>
            <View style={styles.applicationsBadge}>
              <Text style={styles.applicationsBadgeText}>{pendingInvites.length}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#7c3aed" />
          </Pressable>
        ) : null}

        {/* Tags */}
        <View style={styles.tagRow}>
          {instrumentTags.length > 0 || genreTags.length > 0 ? (
            <>
              {instrumentTags.map((tag) => (
                <View key={`instrument-${tag}`} style={styles.tagChipGreen}>
                  <Text style={styles.tagChipGreenText}>{tag}</Text>
                </View>
              ))}
              {genreTags.map((tag) => (
                <View key={`genre-${tag}`} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.tagChipGreen}>
                <Text style={styles.tagChipGreenText}>Guitarist</Text>
              </View>
              <View style={styles.tagChip}>
                <Text style={styles.tagChipText}>Pop</Text>
              </View>
              <View style={styles.tagChip}>
                <Text style={styles.tagChipText}>Rock</Text>
              </View>
            </>
          )}
        </View>

        {/* Status cards */}
        <View style={styles.statusRow}>
          {statusItems.map((item) => (
            <BlurView key={item.key} intensity={40} tint="light" style={styles.statusCard}>
              <View style={styles.statusDot} />
              <Text style={styles.statusValue}>{item.value}</Text>
              <Text style={styles.statusLabel}>{item.label}</Text>
            </BlurView>
          ))}
        </View>

        {/* Create band CTA — only relevant while in musician mode */}
        {bandChecked && !hasBand && !isMember ? (
          <Pressable onPress={handleCreateBand} style={styles.createBandButton}>
            <Ionicons name="add-circle" size={18} color="#7c3aed" />
            <Text style={styles.createBandText}>Create a band</Text>
          </Pressable>
        ) : null}

        {/* Member of someone else's band */}
        {isMember ? (
          <View style={styles.memberCard}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={styles.memberText}>
              You're a member of {memberBand?.name ?? "a band"}. A musician can only be in one band.
            </Text>
            <Pressable onPress={confirmLeaveBand} style={styles.leaveButton} hitSlop={6}>
              <Ionicons name="exit-outline" size={14} color="#dc2626" />
              <Text style={styles.leaveButtonText}>Leave band</Text>
            </Pressable>
          </View>
        ) : null}

              {/* Band leader: applications from musicians */}
        {myBand?.isLeader ? (
          <Pressable
            onPress={() => router.push("/band-applications")}
            style={styles.applicationsCard}
          >
            <Ionicons name="mail-unread-outline" size={20} color="#7c3aed" />
            <View style={{ flex: 1 }}>
              <Text style={styles.applicationsTitle}>Band applications</Text>
              <Text style={styles.applicationsSub}>
                {pendingCount > 0
                  ? `${pendingCount} musician${pendingCount === 1 ? "" : "s"} waiting for your answer`
                  : "No pending applications"}
              </Text>
            </View>
            {pendingCount > 0 ? (
              <View style={styles.applicationsBadge}>
                <Text style={styles.applicationsBadgeText}>{pendingCount}</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </Pressable>
        ) : null}

               {/* Recommended for you (hidden once the musician is in a band) */}
        {!inAnyBand && (
        <>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recommended for you</Text>
          <Pressable onPress={() => router.push({ pathname: "/discover", params: carryParams })}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>
        {loadingBands ? (
          <ActivityIndicator color={PURPLE} style={{ marginVertical: 20 }} />
        ) : recommendedBands.length === 0 ? (
          <Text style={styles.emptyText}>No bands to recommend yet.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendedRow}
          >
            {recommendedBands.map((band) => {
              const status = applicationStatus[band.id];
              const photo = resolveUrl(band.photoUrl);
              return (
                <BlurView key={band.id} intensity={40} tint="light" style={styles.recommendedCard}>
                  <View style={styles.recommendedAvatar}>
                    {photo ? (
                      <Image source={{ uri: photo }} style={styles.recommendedAvatarImage} />
                    ) : (
                      <Ionicons name="people" size={22} color="#7c3aed" />
                    )}
                  </View>
                  <Text style={styles.recommendedName} numberOfLines={1}>
                    {band.name}
                  </Text>
                  <Text style={styles.recommendedTags} numberOfLines={2}>
                    {[band.genre, band.location].filter(Boolean).join(" · ")}
                  </Text>

                  {status === "pending" || status === "accepted" ? (
                    <View
                      style={[
                        styles.applyStatus,
                        status === "accepted" && styles.applyStatusAccepted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.applyStatusText,
                          status === "accepted" && styles.applyStatusAcceptedText,
                        ]}
                      >
                        {status === "accepted" ? "Accepted" : "Applied · pending"}
                      </Text>
                    </View>
                  ) : null}
                  <Pressable onPress={() => openBandProfile(band)} style={styles.applyButton}>
                    <Text style={styles.applyButtonText}>View Profile</Text>
                  </Pressable>
                </BlurView>
              );
            })}
                    </ScrollView>
        )}
        </>
        )}

        {/* Fellow musician — REAL users from the database */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Fellow musician</Text>
          {musicians.length > MUSICIAN_PREVIEW_LIMIT ? (
            <Pressable onPress={() => router.push("/all-musicians")}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          ) : null}
        </View>

        {loadingMusicians ? (
          <ActivityIndicator color={PURPLE} style={{ marginVertical: 20 }} />
        ) : musiciansError ? (
          <Text style={styles.emptyText}>{musiciansError}</Text>
        ) : musicians.length === 0 ? (
          <Text style={styles.emptyText}>No other musicians yet.</Text>
        ) : (
          visibleMusicians.map((person) => {
            const photo = resolveUrl(person.photoUrl);
            return (
              <BlurView key={person.id} intensity={40} tint="light" style={styles.personRow}>
                <View style={styles.personAvatar}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.personAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={20} color="rgba(124,58,237,0.6)" />
                  )}
                </View>
                <View style={styles.personText}>
                  <Text style={styles.personName}>{person.name}</Text>
                  <Text style={styles.personMeta}>{person.role}</Text>
                </View>
                <Pressable onPress={() => openProfile(person)} style={styles.viewProfileButton}>
                  <Text style={styles.viewProfileText}>View Profile</Text>
                </Pressable>
              </BlurView>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom navigation */}
      <BlurView intensity={60} tint="light" style={styles.bottomNav}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => handleNavPress(item.key)}
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

      <SwitchLoadingOverlay visible={isSwitching} label="Switching to Band dashboard..." />
    </View>
  );
}

const PURPLE = "#7c3aed";

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  blob: { position: "absolute", borderRadius: 9999, opacity: 0.25 },
  blobViolet: { top: -60, left: -60, height: 220, width: 220, backgroundColor: "#c4b5fd" },
  blobPink: { top: 120, right: -80, height: 220, width: 220, backgroundColor: "#f5d0fe" },
  blobBlue: { bottom: -60, left: "30%", height: 220, width: 220, backgroundColor: "#bfdbfe" },

  headerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.12)",
    overflow: "hidden",
    padding: 16,
    marginBottom: 18,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWrap: { borderRadius: 20 },
  avatar: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  headerText: { flex: 1 },
  headerTitle: { color: "#111827", fontSize: 16, fontWeight: "700" },
  headerSubtitle: { color: "#6b7280", fontSize: 13, marginTop: 2 },
  bellButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "rgba(124,58,237,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  identityHint: { color: "#9ca3af", fontSize: 11, marginTop: 10 },

  section: { marginBottom: 16 },
  sectionLabel: { color: "#111827", fontSize: 14, fontWeight: "700", marginBottom: 8 },

  reminderCard: { borderRadius: 20, padding: 16 },
  reminderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  reminderDate: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" },
  confirmedBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confirmedBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  reminderTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 4 },
  reminderMeta: { color: "rgba(255,255,255,0.85)", fontSize: 13 },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: { color: "#111827", fontSize: 18, fontWeight: "700" },
  statLabel: { color: "#9ca3af", fontSize: 11, marginTop: 2 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tagChip: {
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagChipText: { color: PURPLE, fontSize: 12, fontWeight: "600" },
  tagChipGreen: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagChipGreenText: { color: "#16a34a", fontSize: 12, fontWeight: "600" },

  statusRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statusCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    padding: 12,
    alignItems: "flex-start",
  },
  statusDot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginBottom: 8,
  },
  statusValue: { color: "#111827", fontSize: 13, fontWeight: "700" },
  statusLabel: { color: "#9ca3af", fontSize: 11, marginTop: 2 },

  createBandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.3)",
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  createBandText: { color: PURPLE, fontSize: 13, fontWeight: "600" },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  seeAll: { color: PURPLE, fontSize: 13, fontWeight: "600" },

  recommendedRow: { gap: 12, paddingBottom: 20 },
  recommendedCard: {
    width: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    padding: 12,
  },
  recommendedAvatar: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: "rgba(124,58,237,0.15)",
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  recommendedAvatarImage: { width: "100%", height: "100%" },
  recommendedName: { color: "#111827", fontSize: 13, fontWeight: "700" },
  recommendedTags: { color: "#9ca3af", fontSize: 11, marginTop: 2 },

  applyButton: {
    marginTop: 10,
    backgroundColor: PURPLE,
    borderRadius: 999,
    paddingVertical: 7,
    alignItems: "center",
  },
  applyButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  applyStatus: {
    marginTop: 10,
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingVertical: 7,
    alignItems: "center",
  },
  applyStatusAccepted: { backgroundColor: "rgba(34,197,94,0.12)" },
  applyStatusText: { color: PURPLE, fontSize: 11, fontWeight: "700" },
  applyStatusAcceptedText: { color: "#16a34a" },

  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
  },
  memberText: { flex: 1, color: "#166534", fontSize: 12, lineHeight: 17 },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.35)",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  leaveButtonText: { color: "#dc2626", fontSize: 11, fontWeight: "700" },

  applicationsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.2)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  applicationsTitle: { color: "#111827", fontSize: 13, fontWeight: "700" },
  applicationsSub: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  applicationsBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  applicationsBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  emptyText: { color: "#6b7280", fontSize: 13, textAlign: "center", marginVertical: 16 },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    padding: 12,
    marginBottom: 10,
  },
  personAvatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: "rgba(124,58,237,0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  personAvatarImage: { width: "100%", height: "100%" },
  personText: { flex: 1 },
  personName: { color: "#111827", fontSize: 13, fontWeight: "700" },
  personMeta: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  viewProfileButton: {
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  viewProfileText: { color: PURPLE, fontSize: 11, fontWeight: "700" },

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
  navLabelActive: { color: PURPLE },
});