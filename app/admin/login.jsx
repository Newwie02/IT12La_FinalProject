import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";
import { adminLogin, saveToken } from "../../api";

// GigMatch — administrator sign-in.
// Route: app/admin/login.jsx  →  "/admin/login"
//
// This is a SEPARATE door from the member login at "/" (/auth/login). The
// server enforces that split from both directions: /auth/login answers 403
// for admin accounts, and the endpoint behind this screen answers 403 for
// accounts that aren't admins. There is deliberately no link between the two
// screens — staff reach this by URL, not from the member login form.
//
// Administrator: platform staff responsible for user verification, content
// moderation, dispute resolution, and system analytics. Admins cannot be
// created in-app; run `node scripts/make-admin.js` from server/.

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError("Enter your administrator email and password.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const { token } = await adminLogin({
        email: trimmedEmail,
        password,
      });

      await saveToken(token);

      // The admin shell re-verifies the token against /admin/me on mount, so a
      // member token that somehow got here can't render staff screens.
      router.replace("/admin/users");
    } catch (err) {
      // Shown inline rather than via Alert — Alert is a no-op on web.
      setError(err.message || "Sign in failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobFuchsia]} />
      <View style={[styles.blob, styles.blobIndigo]} />

      <KeyboardAvoidingView
        style={styles.flexFill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.wrap}>
            <BlurView intensity={40} tint="dark" style={styles.card}>
              {/* Top bar: back to the member app */}
              <View style={styles.topBar}>
                <Pressable
                  onPress={() => router.push("/")}
                  hitSlop={10}
                  style={styles.backButton}
                >
                  <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.stepLabel}>Staff access</Text>
              </View>

              {/* Shield badge — distinguishes this from the member login */}
              <View style={styles.badge}>
                <Svg width={22} height={22} viewBox="0 0 24 24">
                  <Path
                    fill="#a78bfa"
                    d="M12 2 4 5.5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5.5L12 2Zm0 4.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm0 11.5c-2.07 0-3.91-1.04-5-2.63.03-1.64 3.33-2.56 5-2.56s4.97.92 5 2.56c-1.09 1.59-2.93 2.63-5 2.63Z"
                  />
                </Svg>
              </View>

              <Text style={styles.heading}>Administrator sign in</Text>
              <Text style={styles.subheading}>
                Platform staff — user verification, content moderation, dispute
                resolution, and system analytics.
              </Text>

              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>Admin email</Text>
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (error) setError(null);
                  }}
                  placeholder="admin@gmail.com"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>

              {/* Password */}
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputGroup}>
                  <TextInput
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (error) setError(null);
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    style={[styles.input, styles.inputPassword]}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.toggle}
                    hitSlop={8}
                  >
                    <Text style={styles.toggleText}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Inline error — Alert.alert is a no-op on web */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <LinearGradient
                  colors={["#8b5cf6", "#d946ef"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.submit, submitting && styles.submitDisabled]}
                >
                  <Text style={styles.submitText}>
                    {submitting ? "Signing in…" : "Sign in as administrator"}
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* Members are pointed back to the regular login */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Not staff? </Text>
                <Pressable onPress={() => router.replace("/")} hitSlop={8}>
                  <Text style={styles.footerLink}>Back to GigMatch</Text>
                </Pressable>
              </View>
            </BlurView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const CARD_MAX_WIDTH = 384;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0c0a18" },
  flexFill: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  blob: { position: "absolute", borderRadius: 9999, opacity: 0.35 },
  blobViolet: { top: -80, left: -60, height: 280, width: 280, backgroundColor: "#7c3aed" },
  blobFuchsia: { top: "28%", right: -80, height: 320, width: 320, backgroundColor: "#d946ef" },
  blobIndigo: { bottom: -100, left: "20%", height: 320, width: 320, backgroundColor: "#6366f1" },

  wrap: { width: "100%", maxWidth: CARD_MAX_WIDTH },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    height: 32,
    width: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  backArrow: { color: "#fff", fontSize: 16 },
  stepLabel: { color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "500" },

  badge: {
    height: 48,
    width: 48,
    borderRadius: 9999,
    backgroundColor: "rgba(167,139,250,0.15)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  heading: { color: "#fff", fontSize: 26, fontWeight: "700", marginBottom: 8 },
  subheading: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },

  field: { marginBottom: 16 },
  label: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#fff",
  },
  inputGroup: { position: "relative", justifyContent: "center" },
  inputPassword: { paddingRight: 48 },
  toggle: { position: "absolute", right: 14 },
  toggleText: { color: "rgba(255,255,255,0.55)", fontSize: 12 },

  errorText: {
    color: "#fca5a5",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },

  submit: { marginTop: 8, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  pressed: { opacity: 0.85 },

  footer: { marginTop: 24, flexDirection: "row", justifyContent: "center", flexWrap: "wrap" },
  footerText: { color: "rgba(255,255,255,0.65)", fontSize: 14 },
  footerLink: { color: "#d8b4fe", fontSize: 14, fontWeight: "500" },
});
