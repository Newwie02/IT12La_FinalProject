import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { deleteNotification, markNotificationRead } from "../api";
import { styleFor, formatNotificationDate } from "../components/notificationStyles";

// GigMatch — Full notification message
// Route: app/notification-detail.jsx  →  "/notification-detail"
// Opened from /notifications with { id, title, message, createdAt, type }.
// Icons and timestamps come from the same shared module the list screen uses,
// and the date here now carries the TIME as well as the day so an admin action
// can be traced to a moment.

export default function NotificationDetail() {
  const router = useRouter();
  const { id, title, message, createdAt, type } = useLocalSearchParams();

  // Opening it marks it as read
  useEffect(() => {
    if (id) markNotificationRead(id).catch(() => {});
  }, [id]);

  const confirmDelete = () => {
    Alert.alert("Delete notification?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNotification(id);
            router.back();
          } catch (e) {
            Alert.alert("Couldn't delete", e.message || "Something went wrong.");
          }
        },
      },
    ]);
  };

  const look = styleFor(type);

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.circleButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          {id ? (
            <Pressable onPress={confirmDelete} style={styles.circleButton} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </Pressable>
          ) : null}
        </View>

        {title || message ? (
          <View style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: look.tint }]}>
              <Ionicons name={look.icon} size={24} color={look.color} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {createdAt ? <Text style={styles.date}>{formatNotificationDate(createdAt)}</Text> : null}
            <Text style={styles.message}>{message}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name="notifications-outline" size={24} color="#7c3aed" />
            </View>
            <Text style={styles.title}>Notification unavailable</Text>
            <Text style={styles.message}>
              This notification could not be loaded. Go back and open it from the list.
            </Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f7fb" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 54 },
  topRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  circleButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 20,
  },
  iconWrap: {
    height: 48,
    width: 48,
    borderRadius: 24,
    backgroundColor: "rgba(124,58,237,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { color: "#111827", fontSize: 18, fontWeight: "700" },
  date: { color: "#9ca3af", fontSize: 12, marginTop: 4, marginBottom: 16 },
  message: { color: "#374151", fontSize: 14, lineHeight: 22 },
});