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

// GigMatch — glassmorphism sign-in screen (Expo / React Native)
// Requires: expo install expo-linear-gradient expo-blur react-native-svg
// Uses system fonts by default. To use Sora + Inter, load them with
// expo-font / useFonts in your root layout and swap the fontFamily
// values below.

export default function GigMatchLogin() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

              {/* Heading */}
              <Text style={styles.heading}>Welcome back</Text>
              <Text style={styles.subheading}>
                Find musicians, bands, and gigs that fit your sound.
              </Text>

              {/* Form */}
              <View style={styles.field}>
                <Text style={styles.label}>Email or phone</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.45)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputGroup}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    secureTextEntry={!showPassword}
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

              <Pressable onPress={() => {}} style={({ pressed }) => [pressed && styles.pressed]}>
                <LinearGradient
                  colors={["#8b5cf6", "#d946ef"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submit}
                >
                  <Text style={styles.submitText}>Continue</Text>
                </LinearGradient>
              </Pressable>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google */}
              <Pressable
                onPress={() => {}}
                style={({ pressed }) => [
                  styles.google,
                  pressed && styles.pressed,
                ]}
              >
                <Svg width={16} height={16} viewBox="0 0 18 18">
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
                <Text style={styles.googleText}>Continue with Google</Text>
              </Pressable>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don&apos;t have an account? </Text>
                <Pressable onPress={() => router.push("/sign-up")} hitSlop={8}>
                  <Text style={styles.footerLink}>Sign up</Text>
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
    marginBottom: 32,
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

  heading: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subheading: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
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
  inputGroup: {
    position: "relative",
    justifyContent: "center",
  },
  inputPassword: {
    paddingRight: 48,
  },
  toggle: {
    position: "absolute",
    right: 14,
  },
  toggleText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },

  submit: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },

  divider: {
    marginVertical: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dividerLine: {
    height: 1,
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
  },

  google: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 12,
  },
  googleText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },

  footer: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  footerText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
  },
  footerLink: {
    color: "#d8b4fe",
    fontSize: 14,
    fontWeight: "500",
  },
});