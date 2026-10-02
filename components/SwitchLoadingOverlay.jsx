import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Modal } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

// GigMatch — full-screen loading overlay shown briefly while switching
// between the Musician and Band dashboards. Lives at
// /components/SwitchLoadingOverlay.jsx (sibling of app/, not inside it).
//
// Rendered inside a Modal so it always covers and centers on the full
// device screen — independent of whatever height/flex the calling
// screen's own layout happens to have.

export default function SwitchLoadingOverlay({ visible, label = "Switching..." }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    bounce.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 450,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [visible, bounce]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const scale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.wrap} pointerEvents="auto">
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        <BlurView intensity={50} tint="light" style={styles.card}>
          <View style={styles.iconWrap}>
            <Animated.View
              style={[styles.iconInner, { transform: [{ translateY }, { scale }] }]}
            >
              <Ionicons
                name="musical-notes"
                size={30}
                color="#7c3aed"
                style={styles.icon}
              />
            </Animated.View>
          </View>
          <Text style={styles.label}>{label}</Text>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,24,39,0.12)",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.18)",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 30,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  iconWrap: {
    height: 56,
    width: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,58,237,0.14)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.28)",
    overflow: "hidden",
  },
  iconInner: {
    height: 30,
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    lineHeight: 30,
    // musical-notes glyph carries slightly more visual weight on the right
    // (the note flag/stem), so nudge it back left a hair to sit dead-center
    marginLeft: -1,
  },
  label: { color: "#111827", fontSize: 13, fontWeight: "600" },
});