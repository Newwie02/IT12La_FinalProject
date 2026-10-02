import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "../components/BottomNav";
import { getConversations, getConversation, sendMessage, getToken } from "../api";

// GigMatch — Messages screen
// Route: app/messages.jsx  →  "/messages"
//
// Two modes on the same screen:
// - No withId param: shows the list of conversations (people you've
//   messaged before), fetched from GET /api/messages.
// - withId param present: shows the chat thread with that specific
//   user, fetched from GET /api/messages/:otherUserId, with a box to
//   send new messages via POST /api/messages.

const PURPLE = "#7c3aed";
const POLL_INTERVAL = 3000;

export default function Messages() {
  const router = useRouter();
  const {
    fullName,
    instruments,
    genres,
    bandName,
    bandPhotoUri,
    withId,
    with: withName,
  } = useLocalSearchParams();

  const [myId, setMyId] = useState(null);

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [thread, setThread] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const pollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setMyId(payload.id);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      setError(err.message || "Couldn't load conversations.");
    }
  }, []);

  const loadThread = useCallback(async () => {
    if (!withId) return;
    try {
      const data = await getConversation(withId);
      setThread(data);
      setError(null);
    } catch (err) {
      setError(err.message || "Couldn't load this conversation.");
    }
  }, [withId]);

  useEffect(() => {
    if (withId) {
      setLoadingThread(true);
      loadThread().finally(() => setLoadingThread(false));
    } else {
      setLoadingList(true);
      loadConversations().finally(() => setLoadingList(false));
    }
  }, [withId, loadThread, loadConversations]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (withId) loadThread();
      else loadConversations();
    }, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [withId, loadThread, loadConversations]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !withId) return;
    setSending(true);
    try {
      await sendMessage({ receiverId: withId, content });
      setDraft("");
      await loadThread();
    } catch (err) {
      setError(err.message || "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  };

  const openConversation = (userId, name) => {
    router.push({
      pathname: "/messages",
      params: {
        fullName,
        instruments,
        genres,
        bandName,
        bandPhotoUri,
        withId: userId,
        with: name,
      },
    });
  };

  const goBackToList = () => {
    router.push({
      pathname: "/messages",
      params: { fullName, instruments, genres, bandName, bandPhotoUri },
    });
  };

  if (withId) {
    return (
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.threadHeader}>
          <Pressable onPress={goBackToList} style={styles.backButton} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <Text style={styles.threadHeaderName}>{withName ?? "Conversation"}</Text>
        </View>

        {loadingThread ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : (
          <FlatList
            data={thread}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.threadList}
            renderItem={({ item }) => {
              const isMine = myId && item.senderId === myId;
              return (
                <View
                  style={[
                    styles.bubble,
                    isMine ? styles.bubbleMine : styles.bubbleTheirs,
                  ]}
                >
                  <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
                    {item.content}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyThreadText}>No messages yet. Say hello!</Text>
            }
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            style={styles.composerInput}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !draft.trim()}
            style={[styles.sendButton, (sending || !draft.trim()) && styles.sendButtonDisabled]}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobPink]} />

      <View style={styles.listHeader}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {loadingList ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : error ? (
        <View style={styles.placeholderCard}>
          <Ionicons name="alert-circle-outline" size={28} color="#dc2626" />
          <Text style={styles.placeholderText}>{error}</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.placeholderCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} color={PURPLE} />
          <Text style={styles.placeholderText}>
            No conversations yet. Message a musician from their profile to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.userId)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={styles.conversationRow}
              onPress={() => openConversation(item.userId, item.name)}
            >
              <View style={styles.conversationAvatar}>
                <Ionicons name="person" size={20} color={PURPLE} />
              </View>
              <View style={styles.conversationText}>
                <Text style={styles.conversationName}>{item.name}</Text>
                <Text style={styles.conversationLastMessage} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

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

  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },

  listHeader: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 },
  title: { color: "#111827", fontSize: 22, fontWeight: "700" },
  listContent: { paddingHorizontal: 20, paddingBottom: 120, gap: 10 },
  placeholderCard: {
    marginHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  placeholderText: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 19 },

  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 12,
  },
  conversationAvatar: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: "rgba(124,58,237,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  conversationText: { flex: 1 },
  conversationName: { color: "#111827", fontSize: 14, fontWeight: "700" },
  conversationLastMessage: { color: "#9ca3af", fontSize: 12, marginTop: 2 },

  threadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  backButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  threadHeaderName: { color: "#111827", fontSize: 16, fontWeight: "700" },

  threadList: { padding: 16, gap: 8, flexGrow: 1 },
  emptyThreadText: { color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 40 },

  bubble: { maxWidth: "75%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: PURPLE, alignSelf: "flex-end" },
  bubbleTheirs: { backgroundColor: "#e5e7eb", alignSelf: "flex-start" },
  bubbleTextMine: { color: "#fff", fontSize: 14 },
  bubbleTextTheirs: { color: "#111827", fontSize: 14 },

  errorText: { color: "#dc2626", fontSize: 12, textAlign: "center", paddingHorizontal: 16 },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    backgroundColor: "#fff",
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
  },
  sendButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
});