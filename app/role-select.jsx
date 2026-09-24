import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

// GigMatch — onboarding step 2: "How will you use GigMatch?"
// Flow: sign-up ("/sign-up", step 1) → this screen (step 2) → step 3 (final),
// which branches by role:
//   musician / band   → profile-setup.jsx          ("/profile-setup")
//   organizer / client → profile-setup-organizer.jsx ("/profile-setup-organizer")
// Route suggestion: app/role-select.jsx  →  "/role-select"

const STEP_1_ROUTE = "/sign-up";
const MUSICIAN_BAND_ROUTE = "/profile-setup";
const ORGANIZER_ROUTE = "/profile-setup-organizer";

const ROLES = [
  {
    id: "musician",
    icon: "🎸",
    title: "Musician",
    description: "Get booked for gigs, sessions, and collaborations.",
  },
  {
    id: "band",
    icon: "🎤",
    title: "Band",
    description: "Manage your group profile and recruit members.",
  },
  {
    id: "organizer",
    icon: "📅",
    title: "Event Organizer / Client",
    description: "Find and hire musicians or bands for your events.",
  },
];

export default function OnboardingRoleStep() {
  const router = useRouter();
  const { fullName } = useLocalSearchParams();
  const [selected, setSelected] = useState(null);

  const canContinue = selected !== null;

  const handleContinue = () => {
    if (!canContinue) return;
    const destination =
      selected === "organizer" ? ORGANIZER_ROUTE : MUSICIAN_BAND_ROUTE;
    router.push({ pathname: destination, params: { role: selected, fullName } });
  };

  return (
    <View style={styles.page}>
      <View style={[styles.blob, styles.blobViolet]} />
      <View style={[styles.blob, styles.blobFuchsia]} />
      <View style={[styles.blob, styles.blobIndigo]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.wrap}>
          <BlurView intensity={40} tint="dark" style={styles.card}>
            {/* Top bar: back + step indicator */}
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.push(STEP_1_ROUTE)}
                hitSlop={10}
                style={styles.backButton}
              >
                <Text style={styles.backArrow}>←</Text>
              </Pressable>
              <Text style={styles.stepLabel}>Step 2 of 3</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressRow}>
              <View style={[styles.progressSegment, styles.progressFilled]} />
              <View style={[styles.progressSegment, styles.progressFilled]} />
              <View style={styles.progressSegment} />
            </View>

            {/* Heading */}
            <Text style={styles.heading}>How will you use GigMatch?</Text>
            <Text style={styles.subheading}>Select one to continue.</Text>

            {/* Options — single select */}
            <View style={styles.optionsList}>
              {ROLES.map((role) => {
                const isSelected = selected === role.id;
                return (
                  <Pressable
                    key={role.id}
                    onPress={() => setSelected(role.id)}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.optionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.optionIconBadge}>
                      <Text style={styles.optionIconText}>{role.icon}</Text>
                    </View>
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>{role.title}</Text>
                      <Text style={styles.optionDescription}>
                        {role.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}
                    >
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Continue */}
            <Pressable
              onPress={handleContinue}
              disabled={!canContinue}
              style={({ pressed }) => [pressed && canContinue && styles.pressed]}
            >
              <LinearGradient
                colors={
                  canContinue ? ["#8b5cf6", "#d946ef"] : ["#3f3a52", "#3f3a52"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueButton}
              >
                <Text
                  style={[
                    styles.continueText,
                    !canContinue && styles.continueTextDisabled,
                  ]}
                >
                  Continue
                </Text>
              </LinearGradient>
            </Pressable>
          </BlurView>
        </View>
      </ScrollView>
    </View>
  );
}

const CARD_MAX_WIDTH = 384;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0c0a18" },
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
    paddingHorizontal: 24,
    paddingVertical: 28,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
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

  heading: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subheading: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 22,
  },

  optionsList: { gap: 12, marginBottom: 26 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionSelected: {
    borderColor: "rgba(167,139,250,0.9)",
    backgroundColor: "rgba(167,139,250,0.14)",
  },
  pressed: { opacity: 0.85 },

  optionIconBadge: {
    height: 40,
    width: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  optionIconText: { fontSize: 18 },

  optionText: { flex: 1 },
  optionTitle: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 2 },
  optionDescription: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    lineHeight: 16,
  },

  radioOuter: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: "#a78bfa" },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: "#a78bfa",
  },

  continueButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  continueTextDisabled: { color: "rgba(255,255,255,0.5)" },
});