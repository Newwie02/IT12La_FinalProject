import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";
import { sendSignupOtp, verifySignupOtp, saveToken } from "../api";

// GigMatch — sign-up step 2 of 4: "Verify your email".
// The account does NOT exist yet: step 1 only requested a 6-digit code.
// The server creates the account only when the code typed here matches the
// exact code that was emailed — on success we get the token and move on to
// step 3 (role-select), then step 4 (profile setup), exactly as before.
//
// Demo mode (no SMTP configured): the code comes back from the server and
// is shown in a hint box, pre-filled, so the flow is testable without email.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VerifyEmailStep() {
  const router = useRouter();
  const { fullName, email, phone, password, devCode } = useLocalSearchParams();

  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState(devCode || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  // Resend countdown (mirrors the server's 60s cooldown).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const data = await sendSignupOtp({ email, phone });
      setDemoCode(data.devCode ?? "");
      setCode(data.devCode ?? ""); // demo mode: prefill so it's one tap
      setInfo("A new code was sent.");
      setCooldown(60);
    } catch (err) {
      if (err.retryAfterSeconds) setCooldown(err.retryAfterSeconds);
      if (err.field && err.field !== "code") {
        Alert.alert("Couldn't send the code", err.message || "Try again.");
      } else {
        setError(err.message || "We couldn't send the code. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    const value = String(code || "").trim();
    if (!/^\d{6}$/.test(value)) {
      setError("Enter the 6-digit code.");
      return;
    }
    if (!fullName || !EMAIL_RE.test(String(email)) || !password) {
      // Params got lost (e.g. deep link straight into this screen).
      Alert.alert("Sign up failed", "Your details were lost — please start again.");
      router.replace("/sign-up");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      // The server creates the account ONLY when this code matches the
      // one it emailed — a wrong/expired/used code never signs you up.
      const { token } = await verifySignupOtp({
        name: fullName,
        email,
        phone,
        password,
        code: value,
      });

      await saveToken(token);

      // Step 3 of 4 — same role-select screen as before.
      router.replace({ pathname: "/role-select", params: { fullName } });
    } catch (err) {
      if (err.field === "code") {
        setError(err.message || "That code didn't work. Try again.");
      } else {
        // email / phone / form problems (e.g. already registered).
        Alert.alert("Sign up failed", err.message || "Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeEmail = () => {
    setError(null);
    setInfo(null);
    router.back(); // back to step 1 — the form still has your details
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
              {/* Top bar: back + step indicator */}
              <View style={styles.topBar}>
                <Pressable onPress={handleChangeEmail} hitSlop={10} style={styles.backButton}>
                  <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.stepLabel}>Step 2 of 4</Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressRow}>
                <View style={[styles.progressSegment, styles.progressFilled]} />
                <View style={[styles.progressSegment, styles.progressFilled]} />
                <View style={styles.progressSegment} />
                <View style={styles.progressSegment} />
              </View>

              {/* Google-style verification badge */}
              <View style={styles.googleBadge}>
                <Svg width={20} height={20} viewBox="0 0 18 18">
                  <Path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
                  />
                  <Path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.85.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.92v2.33A9 9 0 0 0 9 18Z"
                  />
                  <Path
                    fill="#FBBC05"
                    d="M3.96 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.92a9 9 0 0 0 0 8.08l3.04-2.33Z"
                  />
                  <Path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .92 4.96l3.04 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
                  />
                </Svg>
              </View>

              <Text style={styles.heading}>Verify your email</Text>
              <Text style={styles.subheading}>
                We sent a 6-digit code to {String(email)}. Enter it below to create
                your account.
              </Text>

              {demoCode ? (
                <View style={styles.demoBox}>
                  <Text style={styles.demoTitle}>Demo mode</Text>
                  <Text style={styles.demoText}>
                    No email service is configured on the server, so here&apos;s your
                    code: <Text style={styles.demoCode}>{demoCode}</Text> (it&apos;s also
                    filled in for you).
                  </Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.label}>6-digit code</Text>
                <TextInput
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.replace(/[^\d]/g, "").slice(0, 6));
                    if (error) setError(null);
                  }}
                  placeholder="000000"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  autoFocus
                  style={[styles.input, styles.codeInput]}
                  onSubmitEditing={handleVerify}
                  returnKeyType="done"
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <Pressable
                onPress={handleVerify}
                disabled={submitting}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <LinearGradient
                  colors={["#8b5cf6", "#d946ef"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submit}
                >
                  <Text style={styles.submitText}>
                    {submitting ? "Verifying…" : "Verify & continue"}
                  </Text>
                </LinearGradient>
              </Pressable>

              {info ? <Text style={styles.infoText}>{info}</Text> : null}

              <View style={styles.resendRow}>
                {cooldown > 0 ? (
                  <Text style={styles.resendMuted}>Resend code in {cooldown}s</Text>
                ) : (
                  <Pressable onPress={handleResend} disabled={submitting} hitSlop={8}>
                    <Text style={styles.resendLink}>Resend code</Text>
                  </Pressable>
                )}
                <Pressable onPress={handleChangeEmail} disabled={submitting} hitSlop={8}>
                  <Text style={styles.resendLink}>Change email</Text>
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

  progressRow: { flexDirection: "row", gap: 6, marginBottom: 22 },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  progressFilled: { backgroundColor: "#a78bfa" },

  googleBadge: {
    height: 44,
    width: 44,
    borderRadius: 9999,
    backgroundColor: "#fff",
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

  demoBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.35)",
    backgroundColor: "rgba(250, 204, 21, 0.10)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  demoTitle: { color: "#fde68a", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  demoText: { color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 18 },
  demoCode: { color: "#fde68a", fontWeight: "700", letterSpacing: 2 },

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
  codeInput: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 10,
    textAlign: "center",
    paddingVertical: 14,
  },

  submit: { marginTop: 8, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  errorText: { color: "#fca5a5", fontSize: 12, marginTop: 8, textAlign: "center" },
  infoText: { color: "#86efac", fontSize: 12, marginTop: 8, textAlign: "center" },
  pressed: { opacity: 0.85 },

  resendRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
  },
  resendLink: { color: "#d8b4fe", fontSize: 13, fontWeight: "500" },
  resendMuted: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
});
