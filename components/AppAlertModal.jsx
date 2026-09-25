import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// GigMatch — shared alert/confirmation modal, replacing plain native
// Alert.alert() with something that matches the app's glass design.
// Lives at /components/AppAlertModal.jsx (sibling of app/, not inside it).
//
// Usually used via the useAppAlert() hook (components/useAppAlert.js)
// rather than directly — see that file for the simple API.

const TONE_COLORS = {
  info: { bg: "rgba(124,58,237,0.12)", fg: "#7c3aed" },
  success: { bg: "rgba(34,197,94,0.12)", fg: "#16a34a" },
  warning: { bg: "rgba(245,158,11,0.14)", fg: "#d97706" },
  danger: { bg: "rgba(239,68,68,0.12)", fg: "#dc2626" },
};

export default function AppAlertModal({
  visible,
  onClose,
  icon = "information-circle",
  tone = "info",
  title,
  message,
  buttons,
}) {
  const toneColors = TONE_COLORS[tone] ?? TONE_COLORS.info;
  const resolvedButtons =
    buttons && buttons.length > 0 ? buttons : [{ label: "OK", style: "primary", onPress: onClose }];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <BlurView intensity={50} tint="light" style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: toneColors.bg }]}>
            <Ionicons name={icon} size={24} color={toneColors.fg} />
          </View>

          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View
            style={[
              styles.buttonRow,
              resolvedButtons.length > 2 && styles.buttonColumn,
            ]}
          >
            {resolvedButtons.map((button, index) => {
              const isPrimary = button.style !== "secondary" && button.style !== "destructive";
              const isDestructive = button.style === "destructive";
              return (
                <Pressable
                  key={`${button.label}-${index}`}
                  onPress={() => {
                    button.onPress?.();
                    if (button.style !== "noClose") onClose?.();
                  }}
                  style={({ pressed }) => [
                    styles.buttonWrap,
                    resolvedButtons.length > 2 && styles.buttonWrapFull,
                    pressed && styles.pressed,
                  ]}
                >
                  {isPrimary ? (
                    <LinearGradient
                      colors={["#8b5cf6", "#d946ef"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.buttonPrimary}
                    >
                      <Text style={styles.buttonPrimaryText}>{button.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.buttonSecondary,
                        isDestructive && styles.buttonDestructive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.buttonSecondaryText,
                          isDestructive && styles.buttonDestructiveText,
                        ]}
                      >
                        {button.label}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.55)",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: "center",
  },
  iconCircle: {
    height: 52,
    width: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  message: {
    color: "#6b7280",
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  buttonColumn: {
    flexDirection: "column",
  },
  buttonWrap: { flex: 1 },
  buttonWrapFull: { flex: undefined, width: "100%" },
  pressed: { opacity: 0.85 },
  buttonPrimary: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonPrimaryText: { color: "#fff", fontSize: 13.5, fontWeight: "700" },
  buttonSecondary: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  buttonSecondaryText: { color: "#374151", fontSize: 13.5, fontWeight: "600" },
  buttonDestructive: {
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.06)",
  },
  buttonDestructiveText: { color: "#dc2626" },
});