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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

// GigMatch — sign-up screen (Expo / React Native)
// Route: app/sign-up.jsx  →  "/sign-up"
// Flow: this is step 1 of 3. Step 2 is role-select.jsx ("/role-select"),
// step 3 is profile-setup.jsx or profile-setup-organizer.jsx depending on role.

export default function GigMatchSignUp() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const next = {};

    const trimmedName = name.trim();
    if (!trimmedName) next.name = "Enter your full name";
    else if (!/^[A-Za-z\s]{1,40}$/.test(trimmedName))
      next.name = "Letters only, max 40 characters";

    const trimmedEmail = email.trim();
    if (!trimmedEmail) next.email = "Enter your email";
    else if (!/^[^\s@]+@gmail\.com$/i.test(trimmedEmail))
      next.email = "Must be a @gmail.com address";

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) next.phone = "Enter your phone number";
    else if (!/^09\d{9}$/.test(trimmedPhone))
      next.phone = "11 digits, starting with 09";

    if (!password) next.password = "Enter a password";
    else if (password.length < 8) next.password = "At least 8 characters";

    if (!confirmPassword) next.confirmPassword = "Confirm your password";
    else if (confirmPassword !== password)
      next.confirmPassword = "Passwords don't match";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const passwordsMatch =
    password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    passwordsMatch;

  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitting(true);
    // Wire this up to your real signup endpoint / auth provider.
    // Simulated here so the flow is fully clickable end-to-end.
    setTimeout(() => {
      setSubmitting(false);
      router.push({ pathname: "/role-select", params: { fullName: name.trim() } });
    }, 700);
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
                <Pressable
                  onPress={() => router.push("/")}
                  hitSlop={10}
                  style={styles.backButton}
                >
                  <Text style={styles.backArrow}>←</Text>
                </Pressable>
                <Text style={styles.stepLabel}>Step 1 of 3</Text>
              </View>

              {/* Progress bar */}
              <View style={styles.progressRow}>
                <View style={[styles.progressSegment, styles.progressFilled]} />
                <View style={styles.progressSegment} />
                <View style={styles.progressSegment} />
              </View>

              {/* Heading */}
              <Text style={styles.heading}>Create your account</Text>
              <Text style={styles.subheading}>
                Join GigMatch and start booking gigs today.
              </Text>

              {/* Full name */}
              <View style={styles.field}>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  value={name}
                  onChangeText={(v) => {
                    const filtered = v.replace(/[^A-Za-z\s]/g, "").slice(0, 40);
                    setName(filtered);
                    if (errors.name) setErrors((e) => ({ ...e, name: null }));
                  }}
                  placeholder="Jane Rivera"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  maxLength={40}
                  style={[styles.input, errors.name && styles.inputError]}
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>

              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (errors.email) setErrors((e) => ({ ...e, email: null }));
                  }}
                  placeholder="you@gmail.com"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, errors.email && styles.inputError]}
                />
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              {/* Phone number */}
              <View style={styles.field}>
                <Text style={styles.label}>Phone number</Text>
                <TextInput
                  value={phone}
                  onChangeText={(v) => {
                    const filtered = v.replace(/[^\d]/g, "").slice(0, 11);
                    setPhone(filtered);
                    if (errors.phone) setErrors((e) => ({ ...e, phone: null }));
                  }}
                  placeholder="09123456789"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  keyboardType="phone-pad"
                  maxLength={11}
                  style={[styles.input, errors.phone && styles.inputError]}
                />
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              </View>

              {/* Password */}
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputGroup}>
                  <TextInput
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (errors.password) setErrors((e) => ({ ...e, password: null }));
                    }}
                    placeholder="At least 8 characters"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.inputPassword, errors.password && styles.inputError]}
                  />
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.toggle}
                    hitSlop={8}
                  >
                    <Text style={styles.toggleText}>{showPassword ? "Hide" : "Show"}</Text>
                  </Pressable>
                </View>
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              </View>

              {/* Confirm password */}
              <View style={styles.field}>
                <Text style={styles.label}>Confirm password</Text>
                <View style={styles.inputGroup}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      if (errors.confirmPassword)
                        setErrors((e) => ({ ...e, confirmPassword: null }));
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    secureTextEntry={!showConfirm}
                    style={[
                      styles.input,
                      styles.inputPassword,
                      errors.confirmPassword && styles.inputError,
                    ]}
                  />
                  <Pressable
                    onPress={() => setShowConfirm((v) => !v)}
                    style={styles.toggle}
                    hitSlop={8}
                  >
                    <Text style={styles.toggleText}>{showConfirm ? "Hide" : "Show"}</Text>
                  </Pressable>
                </View>
                {errors.confirmPassword ? (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                ) : confirmPassword.length > 0 && passwordsMatch ? (
                  <Text style={styles.successText}>Passwords match</Text>
                ) : null}
              </View>

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={submitting || !canSubmit}
                style={({ pressed }) => [pressed && canSubmit && styles.pressed]}
              >
                <LinearGradient
                  colors={
                    canSubmit ? ["#8b5cf6", "#d946ef"] : ["#3f3a52", "#3f3a52"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.submit, submitting && styles.submitDisabled]}
                >
                  <Text
                    style={[styles.submitText, !canSubmit && styles.submitTextDisabled]}
                  >
                    {submitting ? "Creating account…" : "Continue"}
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* Footer → back to login */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Pressable onPress={() => router.replace("/")} hitSlop={8}>
                  <Text style={styles.footerLink}>Log in</Text>
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

  heading: { color: "#fff", fontSize: 26, fontWeight: "700", marginBottom: 8 },
  subheading: { color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 20, marginBottom: 24 },

  field: { marginBottom: 14 },
  label: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500", marginBottom: 6 },
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
  inputError: {
    borderColor: "rgba(248,113,113,0.7)",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 12,
    marginTop: 4,
  },
  successText: {
    color: "#86efac",
    fontSize: 12,
    marginTop: 4,
  },
  inputGroup: { position: "relative", justifyContent: "center" },
  inputPassword: { paddingRight: 48 },
  toggle: { position: "absolute", right: 14 },
  toggleText: { color: "rgba(255,255,255,0.55)", fontSize: 12 },

  submit: { marginTop: 8, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  submitTextDisabled: { color: "rgba(255,255,255,0.5)" },
  pressed: { opacity: 0.85 },

  footer: { marginTop: 24, flexDirection: "row", justifyContent: "center", flexWrap: "wrap" },
  footerText: { color: "rgba(255,255,255,0.65)", fontSize: 14 },
  footerLink: { color: "#d8b4fe", fontSize: 14, fontWeight: "500" },
});