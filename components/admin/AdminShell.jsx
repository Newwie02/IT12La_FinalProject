import { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect, usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { getAdminMe, clearToken } from "../../api";
import { unregisterPushToken } from "../usePushNotifications";
import { useAppAlert } from "../useAppAlert";

// GigMatch — shared frame for every /admin screen.
// Handles the one thing every staff screen must do: prove the stored token
// really belongs to an administrator before rendering anything. A member or
// expired token is bounced to /admin/login.
//
// The header also carries the section nav (Users / Reports / Disputes /
// Analytics / Audit) so every staff screen can reach every other one — there
// is no separate dashboard/home screen. Sign out asks for confirmation first.

const SECTIONS = [
  { key: "users", href: "/admin/users", label: "Users" },
  { key: "gigs", href: "/admin/gigs", label: "Gigs" },
  { key: "cancellations", href: "/admin/cancellations", label: "Cancellations" },
  { key: "reports", href: "/admin/reports", label: "Reports" },
  { key: "disputes", href: "/admin/disputes", label: "Disputes" },
  { key: "announce", href: "/admin/announce", label: "Announce" },
  { key: "analytics", href: "/admin/analytics", label: "Analytics" },
  { key: "audit", href: "/admin/audit", label: "Audit" },
];

export default function AdminShell({ title, subtitle, children, scroll = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const { showAlert, AlertModal } = useAppAlert();
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | denied
  const [error, setError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        setStatus("loading");
        setError(null);
        try {
          const { user } = await getAdminMe();
          if (cancelled) return;
          setMe(user);
          setStatus("ready");
        } catch (err) {
          if (cancelled) return;
          // 401 (bad/expired token) and 403 (right token, wrong role) both
          // mean "you may not be here".
          setStatus("denied");
          setError(err.message || "Your session isn't valid for admin access.");
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Sign out only after the admin confirms — a stray tap shouldn't end the
  // session mid-review.
  const confirmSignOut = () => {
    showAlert({
      title: "Sign out?",
      message: "You'll need to sign in again to access the admin area.",
      icon: "log-out-outline",
      tone: "warning",
      buttons: [
        { label: "Cancel", style: "secondary" },
        {
          label: "Sign out",
          style: "destructive",
          onPress: async () => {
            // Unregister push BEFORE clearing the token — the request to
            // drop this device's token still needs to authenticate.
            await unregisterPushToken();
            await clearToken();
            router.replace("/admin/login");
          },
        },
      ],
    });
  };

  if (status === "loading") {
    return (
      <View style={[styles.page, styles.centered]}>
        <ActivityIndicator color="#a78bfa" size="large" />
        <Text style={styles.loadingText}>Checking administrator access…</Text>
      </View>
    );
  }

  if (status === "denied") {
    return (
      <View style={[styles.page, styles.centered]}>
        <View style={styles.wrap}>
          <Text style={styles.heading}>Administrator access required</Text>
          <Text style={styles.subheading}>{error}</Text>
          <Pressable onPress={() => router.replace("/admin/login")}>
            <LinearGradient
              colors={["#8b5cf6", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Go to admin sign in</Text>
            </LinearGradient>
          </Pressable>
        </View>
        {AlertModal}
      </View>
    );
  }

  const header = (
    <View style={styles.wrap}>
      {/* Signed-in staff + sign out */}
      <View style={styles.identityRow}>
        <LinearGradient
          colors={["#8b5cf6", "#d946ef"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>
            {(me?.name || "A").charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
        <View style={styles.identityText}>
          <Text style={styles.identityName}>{me?.name}</Text>
          <Text style={styles.identityEmail}>{me?.email}</Text>
        </View>
        <Pressable onPress={confirmSignOut} hitSlop={8}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      {/* Section nav */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.navRow}
      >
        {SECTIONS.map((sec) => {
          const active = pathname === sec.href;
          return (
            <Pressable
              key={sec.key}
              onPress={() => router.push(sec.href)}
              style={[styles.navPill, active && styles.navPillActive]}
            >
              <Text style={[styles.navText, active && styles.navTextActive]}>
                {sec.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {title ? <Text style={styles.heading}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subheading}>{subtitle}</Text> : null}
    </View>
  );

  if (!scroll) {
    return (
      <View style={styles.page}>
        <View style={[styles.blob, styles.blobViolet]} />
        <View style={[styles.blob, styles.blobFuchsia]} />
        <ScrollView contentContainerStyle={styles.scrollContentTight} keyboardShouldPersistTaps="handled">
          {header}
          {children}
        </ScrollView>
        {AlertModal}
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobFuchsia]} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {header}
        {children}
      </ScrollView>
      {AlertModal}
    </View>
  );
}

const CARD_MAX_WIDTH = 460;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0c0a18" },
  centered: { alignItems: "center", justifyContent: "center", padding: 20 },
  loadingText: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 12 },

  scrollContent: { padding: 20, paddingBottom: 48 },
  scrollContentTight: { flexGrow: 1, padding: 20, paddingBottom: 48 },

  blob: { position: "absolute", borderRadius: 9999, opacity: 0.28 },
  blobViolet: { top: -80, left: -60, height: 260, width: 260, backgroundColor: "#7c3aed" },
  blobFuchsia: { top: "30%", right: -80, height: 300, width: 300, backgroundColor: "#d946ef" },

  wrap: { width: "100%", maxWidth: CARD_MAX_WIDTH, alignSelf: "center" },

  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 10,
    marginBottom: 12,
  },
  avatar: { height: 40, width: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  identityText: { flex: 1 },
  identityName: { color: "#fff", fontSize: 14, fontWeight: "600" },
  identityEmail: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 1 },
  signOut: { color: "#d8b4fe", fontSize: 12, fontWeight: "500" },

  navRow: { gap: 8, paddingRight: 8, marginBottom: 16 },
  navPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  navPillActive: {
    borderColor: "rgba(167,139,250,0.6)",
    backgroundColor: "rgba(139,92,246,0.25)",
  },
  navText: { color: "rgba(255,255,255,0.65)", fontSize: 12.5, fontWeight: "600" },
  navTextActive: { color: "#fff" },

  heading: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subheading: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },

  button: { borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});

// Shared card + row styles, exported so screens stay visually consistent
// without re-declaring the same glassy surfaces everywhere.
export const adminStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 10,
  },
  emptyText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontStyle: "italic" },
  errorText: { color: "#fca5a5", fontSize: 13, marginBottom: 10 },
  muted: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  primaryButton: { borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});

// Small pill used to show a status chip (e.g. "pending", "suspended").
export function StatusPill({ label, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "rgba(255,255,255,0.1)", fg: "rgba(255,255,255,0.8)" },
    good: { bg: "rgba(52,211,153,0.18)", fg: "#6ee7b7" },
    warn: { bg: "rgba(251,191,36,0.18)", fg: "#fcd34d" },
    bad: { bg: "rgba(248,113,113,0.18)", fg: "#fca5a5" },
    info: { bg: "rgba(167,139,250,0.18)", fg: "#d8b4fe" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <View style={[stylesPill.pill, { backgroundColor: t.bg }]}>
      <Text style={[stylesPill.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const stylesPill = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: { fontSize: 11, fontWeight: "600" },
});
