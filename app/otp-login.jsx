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
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";
import { sendOtp, verifyOtp, saveToken } from "../api";

// GigMatch — Google-style email verification ("OTP") sign-in.
// Step 1: enter the email on your GigMatch account → we send a 6-digit code.
// Step 2: enter the code → you're signed in (no password needed).

export default function OtpLogin() {
  const router = useRouter();
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
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

  const handleSend = async (isResend = false) => {
    const value = (isResend ? sentTo : email).trim();
    if (!value) {
      setError("Enter your email.");
      return;
    }
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const data = await sendOtp(value);
      setSentTo(value);
      setCode(""); // always start empty — the code comes by email
      setInfo(isResend ? "A new code was sent." : data.message);
      setCooldown(60);
      setStep("code");
    } catch (err) {
      setError(err.message || "We couldn't send the code. Try again.");
      if (err.retryAfterSeconds) setCooldown(err.retryAfterSeconds);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    const value = code.trim();
    if (!/^\d{6}$/.test(value)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { token, user } = await verifyOtp({ email: sentTo, code: value });
      await saveToken(token);

      // Same destination logic as the password sign-in on the login screen.
      const destination =
        user.role === "client" || user.role === "organizer"
          ? "/dashboard-client"
          : "/dashboard-musician";
      router.replace({ pathname: destination, params: { fullName: user.name, role: user.role } });
    } catch (err) {
      setError(err.message || "That code didn't work. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeEmail = () => {
    setStep("email");
    setCode("");
    setInfo(null);
    setError(null);
  };

  return (
    <View style={styles.page}>
      {/* Ambient stage light blobs */}
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
              {/* Brand */}
              <View style={styles.brandRow}>
                <LinearGradient
                  colors={["#a78bfa", "#ec4899"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.brandMark}
                />
                <Text style={styles.brandName}>GigMatch</Text>
              </View>

              {/* Google glyph — this flow replaces the Google button */}
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

              {step === "email" ? (
                <>
                  <Text style={styles.heading}>Sign in with a code</Text>
                  <Text style={styles.subheading}>
                    Google-style verification — enter the email on your GigMatch account and
                    we&apos;ll send a 6-digit code. No password needed.
                  </Text>

                  <View style={styles.field}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      placeholderTextColor="rgba(255,255,255,0.45)"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoFocus
                      style={styles.input}
                      onSubmitEditing={() => handleSend(false)}
                      returnKeyType="send"
                    />
                  </View>

                  <Pressable
                    onPress={() => handleSend(false)}
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
                        {submitting ? "Sending..." : "Send code"}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.heading}>Verify it&apos;s you</Text>
                  <Text style={styles.subheading}>
                    Enter the 6-digit code we sent to {sentTo}.
                  </Text>

                  <View style={styles.field}>
                    <Text style={styles.label}>6-digit code</Text>
                    <TextInput
                      value={code}
                      onChangeText={(v) => setCode(v.replace(/[^\d]/g, "").slice(0, 6))}
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
                        {submitting ? "Verifying..." : "Verify & continue"}
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  {info ? <Text style={styles.infoText}>{info}</Text> : null}

                  <View style={styles.resendRow}>
                    {cooldown > 0 ? (
                      <Text style={styles.resendMuted}>Resend code in {cooldown}s</Text>
                    ) : (
                      <Pressable onPress={() => handleSend(true)} disabled={submitting} hitSlop={8}>
                        <Text style={styles.resendLink}>Resend code</Text>
                      </Pressable>
                    )}
                    <Pressable onPress={handleChangeEmail} disabled={submitting} hitSlop={8}>
                      <Text style={styles.resendLink}>Use a different email</Text>
                    </Pressable>
                  </View>
                </>
              )}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Footer */}
              <View style={styles.footer}>
                <Pressable onPress={() => router.replace("/")} hitSlop={8}>
                  <Text style={styles.footerLink}>Back to sign in</Text>
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
  page: {
    flex: 1,
    backgroundColor: "#0c0a18",
  },
  flexFill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  // Ambient blobs — RN has no CSS blur filter, so these are soft via
  // opacity + large radius rather than an actual blur.
  blob: {
    position: "absolute",
    borderRadius: 9999,
    opacity: 0.35,
  },
  blobViolet: {
    top: -80,
    left: -60,
    height: 280,
    width: 280,
    backgroundColor: "#7c3aed",
  },
  blobFuchsia: {
    top: "28%",
    right: -80,
    height: 320,
    width: 320,
    backgroundColor: "#d946ef",
  },
  blobIndigo: {
    bottom: -100,
    left: "20%",
    height: 320,
    width: 320,
    backgroundColor: "#6366f1",
  },

  wrap: {
    width: "100%",
    maxWidth: CARD_MAX_WIDTH,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  brandMark: {
    height: 32,
    width: 32,
    borderRadius: 9999,
  },
  brandName: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 18,
  },

  googleBadge: {
    height: 44,
    width: 44,
    borderRadius: 9999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  heading: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
  },
  subheading: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },

  field: {
    marginBottom: 16,
  },
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

  submit: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  infoText: {
    color: "#86efac",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.85,
  },

  resendRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
  },
  resendLink: {
    color: "#d8b4fe",
    fontSize: 13,
    fontWeight: "500",
  },
  resendMuted: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },

  footer: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerLink: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
  },
});
