import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../api";

// GigMatch — Notifications list
// Route: app/notifications.jsx  →  "/notifications"
// Tapping the bell on any dashboard opens this screen. Each card opens
// /notification-detail with the full message. Long-press or the trash
// button deletes; "Mark all as read" clears the unread badges.

const PURPLE = "#7c3aed";

// Icon + color per notification type (everything else falls back to info)
const TYPE_STYLE = {
  removed: { icon: "person-remove-outline", color: "#dc2626", tint: "rgba(220,38,38,0.1)" },
  accepted: { icon: "checkmark-circle-outline", color: "#16a34a", tint: "rgba(34,197,94,0.12)" },
  rejected: { icon: "close-circle-outline", color: "#dc2626", tint: "rgba(220,38,38,0.1)" },
  "gig-application": { icon: "document-text-outline", color: PURPLE, tint: "rgba(124,58,237,0.1)" },
  rating: { icon: "star", color: "#f59e0b", tint: "rgba(245,158,11,0.14)" },
  info: { icon: "notifications-outline", color: PURPLE, tint: "rgba(124,58,237,0.1)" },
};

function styleFor(type) {
  return TYPE_STYLE[type] ?? TYPE_STYLE.info;
}

function formatDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday - day) / 86400000);

  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function Notifications() {
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data.filter(Boolean) : []);
    } catch (err) {
      setError(err.message || "Couldn't load notifications.");
    }
  }, []);

  // Refetch every time the screen comes into view (e.g. after deleting one)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const openNotification = (n) => {
    // Optimistic read so the dot disappears immediately
    if (!n.isRead) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
      );
      markNotificationRead(n.id).catch(() => {});
    }
    router.push({
      pathname: "/notification-detail",
      params: {
        id: String(n.id),
        title: String(n.title ?? ""),
        message: String(n.message ?? ""),
        createdAt: String(n.createdAt ?? ""),
        type: String(n.type ?? "info"),
      },
    });
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      Alert.alert("Couldn't update", err.message || "Something went wrong.");
    } finally {
      setMarkingAll(false);
    }
  };

  const confirmDelete = (n) => {
    Alert.alert("Delete notification?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNotification(n.id);
            setNotifications((prev) => prev.filter((item) => item.id !== n.id));
          } catch (err) {
            Alert.alert("Couldn't delete", err.message || "Something went wrong.");
          }
        },
      },
    ]);
  };

  const subtitle = loading
    ? " "
    : unreadCount > 0
    ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
    : "You're all caught up";

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
        }
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          {unreadCount > 0 ? (
            <Pressable
              onPress={markAllAsRead}
              disabled={markingAll}
              style={styles.markAllButton}
              hitSlop={10}
            >
              <Ionicons
                name={markingAll ? "hourglass-outline" : "checkmark-done-outline"}
                size={14}
                color={PURPLE}
              />
              <Text style={styles.markAllText}>
                {markingAll ? "Marking…" : "Mark all as read"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 30 }} />
        ) : error ? (
          <View style={styles.messageCard}>
            <Ionicons name="cloud-offline-outline" size={28} color="#dc2626" />
            <Text style={styles.messageText}>{error}</Text>
            <Pressable onPress={() => onRefresh()} style={styles.retryButton}>
              <Ionicons name="refresh" size={14} color={PURPLE} />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.messageCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={28} color={PURPLE} />
            </View>
            <Text style={styles.messageTitle}>You're all caught up</Text>
            <Text style={styles.messageText}>
              No notifications yet. We'll let you know when something happens.
            </Text>
          </View>
        ) : (
          notifications.map((n) => {
            const look = styleFor(n.type);
            return (
              <View key={String(n.id)} style={[styles.card, !n.isRead && styles.cardUnread]}>
                <Pressable
                  onPress={() => openNotification(n)}
                  onLongPress={() => confirmDelete(n)}
                  style={styles.cardPress}
                >
                  <View style={[styles.iconWrap, { backgroundColor: look.tint }]}>
                    <Ionicons name={look.icon} size={20} color={look.color} />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {n.title}
                      </Text>
                      {!n.isRead ? <View style={styles.unreadDot} /> : null}
                    </View>
                    <Text style={styles.cardDate}>{formatDate(n.createdAt)}</Text>
                    <Text style={styles.cardMessage} numberOfLines={3}>
                      {n.message}
                    </Text>
                  </View>
                </Pressable>

                <View style={styles.cardFooter}>
                  <Pressable onPress={() => openNotification(n)} style={styles.readMore} hitSlop={6}>
                    <Text style={styles.readMoreText}>Read more</Text>
                    <Ionicons name="chevron-forward" size={13} color={PURPLE} />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDelete(n)}
                    style={styles.deleteButton}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={15} color="#dc2626" />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  blob: { position: "absolute", borderRadius: 9999, opacity: 0.25 },
  blobViolet: { top: -60, left: -60, height: 220, width: 220, backgroundColor: "#c4b5fd" },
  blobPink: { top: 240, right: -80, height: 220, width: 220, backgroundColor: "#f5d0fe" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 40 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  markAllText: { color: PURPLE, fontSize: 11, fontWeight: "700" },

  title: { color: "#111827", fontSize: 24, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: "#6b7280", fontSize: 13, marginBottom: 18 },

  messageCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: "rgba(124,58,237,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  messageTitle: { color: "#111827", fontSize: 15, fontWeight: "700" },
  messageText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(124,58,237,0.1)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  retryText: { color: PURPLE, fontSize: 12, fontWeight: "700" },

  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 14,
    marginBottom: 12,
  },
  cardUnread: {
    borderColor: "rgba(124,58,237,0.35)",
    backgroundColor: "#fff",
    shadowColor: "#7c3aed",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardPress: { flexDirection: "row", gap: 12 },
  iconWrap: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, color: "#111827", fontSize: 14, fontWeight: "700" },
  unreadDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: PURPLE },
  cardDate: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  cardMessage: { color: "#4b5563", fontSize: 13, lineHeight: 19, marginTop: 6 },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  readMore: { flexDirection: "row", alignItems: "center", gap: 2 },
  readMoreText: { color: PURPLE, fontSize: 12, fontWeight: "700" },
  deleteButton: {
    height: 28,
    width: 28,
    borderRadius: 14,
    backgroundColor: "rgba(220,38,38,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
});
