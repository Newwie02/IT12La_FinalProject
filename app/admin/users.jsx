import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AdminShell, { adminStyles as s, StatusPill } from "../../components/admin/AdminShell";
import {
  getAdminUsers,
  getAdminVerifications,
  reviewVerification,
  setAdminUserVerified,
  setAdminUserStatus,
  resolveUrl,
} from "../../api";

// GigMatch — user verification + moderation.
// Route: app/admin/users  →  "/admin/users" (optional ?tab=verification|moderation)
//
// Two tabs over the same member list:
//   verification — the pending ID queue, approve / reject
//   moderation   — warn / suspend / ban / restore any account

const TABS = [
  { key: "verification", label: "Verification" },
  { key: "moderation", label: "Moderation" },
];

// Actions an admin can take on an account, in escalating order.
const STATUS_ACTIONS = [
  { status: "active", label: "Restore", tone: "good" },
  { status: "warned", label: "Warn", tone: "warn" },
  { status: "suspended", label: "Suspend 7d", tone: "warn" },
  { status: "banned", label: "Ban", tone: "bad" },
];

export default function AdminUsers() {
  const params = useLocalSearchParams();
  const initialTab = params.tab === "moderation" ? "moderation" : "verification";

  const [tab, setTab] = useState(initialTab);
  const [pending, setPending] = useState(null); // verification queue
  const [members, setMembers] = useState(null); // moderation list
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null); // row being acted on
  const [viewerUri, setViewerUri] = useState(null); // full-size ID photo

  const load = useCallback(async () => {
    setError(null);
    try {
      if (tab === "verification") {
        setPending(await getAdminVerifications());
      } else {
        setMembers(await getAdminUsers({ q: query || undefined }));
      }
    } catch (err) {
      setError(err.message || "Couldn't load members.");
    }
  }, [tab, query]);

  // Re-fetch whenever the tab changes or the screen regains focus, so a
  // decision made here shows up after navigating back.
  useTabFocus(tab, load);

  // Debounce the search box so we don't hit the API on every keystroke.
  useDebounced(query, () => {
    if (tab === "moderation") load();
  }, 400);

  const busy = (id) => setBusyId(id);
  const done = () => setBusyId(null);

  const decide = async (user, decision) => {
    busy(user.id);
    try {
      await reviewVerification(user.id, decision);
      setPending((prev) => (prev || []).filter((u) => u.id !== user.id));
    } catch (err) {
      Alert.alert("Couldn't save", err.message || "Something went wrong.");
    } finally {
      done();
    }
  };

  const toggleBadge = async (user) => {
    busy(user.id);
    try {
      const res = await setAdminUserVerified(user.id, !user.verified);
      setMembers((prev) =>
        (prev || []).map((u) => (u.id === user.id ? { ...u, verified: res.verified } : u))
      );
    } catch (err) {
      Alert.alert("Couldn't save", err.message || "Something went wrong.");
    } finally {
      done();
    }
  };

  const changeStatus = async (user, status) => {
    const destructive = status === "banned" || status === "suspended";
    if (destructive) {
      const ok = await confirmAsync(
        status === "banned"
          ? `Ban ${user.name}? They will no longer be able to sign in.`
          : `Suspend ${user.name} for 7 days?`
      );
      if (!ok) return;
    }

    busy(user.id);
    try {
      const res = await setAdminUserStatus(user.id, {
        status,
        reason:
          status === "warned"
            ? "Warning issued by an administrator"
            : status === "active"
              ? null
              : `Account ${status} by an administrator`,
        days: status === "suspended" ? 7 : undefined,
      });
      setMembers((prev) =>
        (prev || []).map((u) =>
          u.id === user.id
            ? { ...u, accountStatus: res.accountStatus, suspendedUntil: res.suspendedUntil }
            : u
        )
      );
    } catch (err) {
      Alert.alert("Couldn't save", err.message || "Something went wrong.");
    } finally {
      done();
    }
  };

  return (
    <AdminShell
      title="Users"
      subtitle="Verify identities and moderate member accounts."
    >
      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {tab === "verification" ? (
        pending === null ? (
          <Loading />
        ) : pending.length === 0 ? (
          <Empty text="No pending verification requests. 🎉" />
        ) : (
          pending.map((u) => (
            <VerificationCard
              key={u.id}
              user={u}
              busy={busyId === u.id}
              onApprove={() => decide(u, "approve")}
              onReject={() => decide(u, "reject")}
              onViewDoc={(uri) => setViewerUri(uri)}
            />
          ))
        )
      ) : (
        <>
          <TextInput
            style={styles.search}
            placeholder="Search by name or email…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
          {members === null ? (
            <Loading />
          ) : members.length === 0 ? (
            <Empty text={query ? "No members match that search." : "No members yet."} />
          ) : (
            members.map((u) => (
              <ModerationCard
                key={u.id}
                user={u}
                busy={busyId === u.id}
                onToggleBadge={() => toggleBadge(u)}
                onStatus={(status) => changeStatus(u, status)}
              />
            ))
          )}
        </>
      )}

      {/* Full-size ID viewer */}
      <Modal
        visible={!!viewerUri}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
      >
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewerUri(null)}>
          <Image
            source={{ uri: viewerUri }}
            style={styles.viewerImage}
            resizeMode="contain"
          />
          <Text style={styles.viewerHint}>Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </AdminShell>
  );
}

// ------------------------------------------------------------------ bits

function VerificationCard({ user, busy, onApprove, onReject, onViewDoc }) {
  const [note, setNote] = useState("");
  const photo = resolveUrl(user.photoUrl);
  const idDoc = resolveUrl(user.idDocUrl);

  return (
    <View style={s.card}>
      <View style={styles.cardHead}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{(user.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={s.muted}>{user.email}</Text>
          <View style={styles.metaRow}>
            <StatusPill label={user.role} tone="info" />
            {user.stageName ? <Text style={s.muted}>· {user.stageName}</Text> : null}
          </View>
        </View>
      </View>

      {user.instruments || user.genres ? (
        <Text style={styles.detail} numberOfLines={2}>
          {[user.instruments, user.genres].filter(Boolean).join(" · ")}
        </Text>
      ) : null}

      {/* The submitted ID, if they attached one. Tap to view full size. */}
      {idDoc ? (
        <Pressable onPress={() => onViewDoc(idDoc)}>
          <Image source={{ uri: idDoc }} style={styles.idDoc} resizeMode="cover" />
          <Text style={styles.idDocHint}>Tap to view the submitted ID</Text>
        </Pressable>
      ) : (
        <Text style={[s.muted, { marginTop: 8 }]}>No ID document attached.</Text>
      )}

      <Text style={styles.waiting}>
        Waiting since {fmtDate(user.verificationRequestedAt)}
      </Text>

      <TextInput
        style={styles.note}
        placeholder="Note to the member (optional, shown if rejected)"
        placeholderTextColor="rgba(255,255,255,0.35)"
        value={note}
        onChangeText={setNote}
        multiline
      />

      <View style={styles.actionRow}>
        <Pressable onPress={onReject} disabled={busy} style={{ flex: 1 }}>
          <View style={[styles.action, styles.reject]}>
            <Text style={styles.actionText}>Reject</Text>
          </View>
        </Pressable>
        <Pressable onPress={onApprove} disabled={busy} style={{ flex: 1 }}>
          <LinearGradient
            colors={["#8b5cf6", "#d946ef"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.action, busy && { opacity: 0.6 }]}
          >
            <Text style={styles.actionText}>{busy ? "Saving…" : "Approve"}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

function ModerationCard({ user, busy, onToggleBadge, onStatus }) {
  const photo = resolveUrl(user.photoUrl);
  const tone =
    user.accountStatus === "banned"
      ? "bad"
      : user.accountStatus === "suspended" || user.accountStatus === "warned"
        ? "warn"
        : "good";

  return (
    <View style={s.card}>
      <View style={styles.cardHead}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatarSm} />
        ) : (
          <View style={[styles.avatarSm, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>{(user.name || "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={s.muted}>{user.email}</Text>
          <View style={styles.metaRow}>
            <StatusPill label={user.role} tone="info" />
            <StatusPill label={user.accountStatus} tone={tone} />
            {user.verified ? <StatusPill label="✓ Verified" tone="good" /> : null}
          </View>
        </View>
      </View>

      {user.accountStatus === "suspended" && user.suspendedUntil ? (
        <Text style={styles.suspendNote}>
          Suspended until {new Date(user.suspendedUntil).toLocaleString()}
        </Text>
      ) : null}

      {/* Verified badge toggle — grant or revoke directly. */}
      <Pressable onPress={onToggleBadge} disabled={busy} style={styles.badgeToggle}>
        <Text style={styles.badgeToggleText}>
          {user.verified ? "Remove verified badge" : "Grant verified badge"}
        </Text>
      </Pressable>

      {/* Moderation actions */}
      <View style={styles.actionRow}>
        {STATUS_ACTIONS.filter((a) => a.status !== user.accountStatus).map((a) => (
          <Pressable
            key={a.status}
            onPress={() => onStatus(a.status)}
            disabled={busy || user.role === "admin"}
            style={{ flex: 1 }}
          >
            <View style={[styles.modAction, a.tone === "bad" && styles.modActionBad]}>
              <Text
                style={[
                  styles.modActionText,
                  a.tone === "bad" && { color: "#fca5a5" },
                ]}
              >
                {a.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {user.role === "admin" ? (
        <Text style={[s.muted, { marginTop: 8 }]}>
          Administrators can't be moderated from here.
        </Text>
      ) : null}
    </View>
  );
}

function Loading() {
  return (
    <View style={{ alignItems: "center", padding: 40 }}>
      <ActivityIndicator color="#a78bfa" size="large" />
    </View>
  );
}

function Empty({ text }) {
  return (
    <View style={s.card}>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ utils

// Re-runs `load` every time the screen is focused OR the tab changes.
// useFocusEffect refetches on each focus, so returning from a detail screen
// always shows fresh data.
function useTabFocus(tab, load) {
  useFocusEffect(
    useCallback(() => {
      load();
    }, [tab, load])
  );
}

// Fires `fn` shortly after `value` stops changing, so the search box doesn't
// hit the API on every keystroke.
function useDebounced(value, fn, delay) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const id = setTimeout(() => fnRef.current(), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
}

function confirmAsync(message) {
  return new Promise((resolve) => {
    Alert.alert("Confirm", message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Yes, proceed", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActive: {
    borderColor: "rgba(167,139,250,0.6)",
    backgroundColor: "rgba(139,92,246,0.22)",
  },
  tabText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#fff" },

  cardHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { height: 52, width: 52, borderRadius: 26 },
  avatarSm: { height: 44, width: 44, borderRadius: 22 },
  avatarFallback: {
    backgroundColor: "rgba(139,92,246,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#fff", fontSize: 18, fontWeight: "700" },
  name: { color: "#fff", fontSize: 15, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" },
  detail: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 10 },

  idDoc: {
    height: 150,
    width: "100%",
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  idDocHint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },

  waiting: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 10 },
  suspendNote: { color: "#fcd34d", fontSize: 12, marginTop: 8 },

  note: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 13,
    padding: 10,
    marginTop: 10,
    minHeight: 44,
  },

  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  action: { borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  reject: {
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.45)",
    backgroundColor: "rgba(248,113,113,0.12)",
  },
  actionText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  badgeToggle: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.4)",
    backgroundColor: "rgba(167,139,250,0.1)",
    paddingVertical: 10,
    alignItems: "center",
  },
  badgeToggleText: { color: "#d8b4fe", fontSize: 13, fontWeight: "600" },

  modAction: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 9,
    alignItems: "center",
  },
  modActionBad: {
    borderColor: "rgba(248,113,113,0.4)",
    backgroundColor: "rgba(248,113,113,0.1)",
  },
  modActionText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },

  search: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 14,
    padding: 12,
    marginBottom: 14,
  },

  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  viewerImage: { width: "100%", height: "80%" },
  viewerHint: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 12 },
});
