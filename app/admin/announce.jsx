import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AdminShell, { adminStyles as s } from "../../components/admin/AdminShell";
import { sendAdminAnnouncement } from "../../api";

// GigMatch — system announcements.
// Route: app/admin/announce  →  "/admin/announce"
//
// One message, broadcast to every member. It lands in their notification
// centre immediately and is also pushed to any device that has push enabled
// (see components/usePushNotifications.js on the client and
// server/utils/notify.js on the server).
//
// The backend stamps the send time into the body itself, so every recipient
// can see exactly when the announcement went out.

export default function AdminAnnounce() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null); // { recipients, sent, title }

  const trimmedTitle = title.trim();
  const trimmedMessage = message.trim();
  // Both fields are required server-side too; keeping the button in step
  // avoids a guaranteed 400.
  const canSend = trimmedTitle.length > 0 && trimmedMessage.length > 0 && !sending;

  const send = () => {
    if (!canSend) return;

    Alert.alert(
      "Send to every member?",
      "This announcement goes to all members' notification centres, and as a push to devices that allow it. It can't be recalled.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            setSending(true);
            try {
              const result = await sendAdminAnnouncement({
                title: trimmedTitle,
                message: trimmedMessage,
              });
              setLastSent({ ...result, title: trimmedTitle });
              setTitle("");
              setMessage("");
            } catch (err) {
              Alert.alert("Couldn't send", err.message || "Something went wrong.");
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <AdminShell
      title="System announcement"
      subtitle="Send one message to every member at once."
      scroll={false}
    >
      {lastSent ? (
        <View style={styles.sentBanner}>
          <Text style={styles.sentTitle}>Sent to {lastSent.recipients} member{lastSent.recipients === 1 ? "" : "s"}</Text>
          <Text style={styles.sentSub}>“{lastSent.title}” is now in their notification centre.</Text>
        </View>
      ) : null}

      <Text style={s.sectionTitle}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Scheduled maintenance tonight"
        placeholderTextColor="rgba(255,255,255,0.35)"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />

      <Text style={s.sectionTitle}>Message</Text>
      <TextInput
        style={[styles.input, styles.messageBox]}
        placeholder="Explain what's happening and what members should do."
        placeholderTextColor="rgba(255,255,255,0.35)"
        value={message}
        onChangeText={setMessage}
        multiline
        textAlignVertical="top"
      />

      <Text style={styles.hint}>
        The date and time of sending is added automatically, so members always know when it went out.
      </Text>

      <Pressable onPress={send} disabled={!canSend} style={{ marginTop: 16 }}>
        <LinearGradient
          colors={["#8b5cf6", "#d946ef"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.sendButton, !canSend && { opacity: 0.5 }]}
        >
          <Text style={styles.sendText}>{sending ? "Sending…" : "Send announcement"}</Text>
        </LinearGradient>
      </Pressable>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  sentBanner: {
    borderRadius: 14,
    backgroundColor: "rgba(52,211,153,0.12)",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.3)",
    padding: 12,
    marginBottom: 16,
  },
  sentTitle: { color: "#6ee7b7", fontSize: 13, fontWeight: "600" },
  sentSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 3 },

  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 14,
    padding: 12,
  },
  messageBox: { minHeight: 140 },

  hint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },

  sendButton: { borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  sendText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
