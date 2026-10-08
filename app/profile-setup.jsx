import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

// GigMatch — LEGACY route. "/profile-setup" used to be the shared step-3
// screen for both the musician and band roles. Each role now has its own
// step 3 (see role-select.jsx):
//   musician → "/profile-setup-musician"
//   band     → "/profile-setup-band"
// This screen only redirects so old links keep working.

export default function ProfileSetupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile-setup-musician");
  }, [router]);

  return (
    <View style={styles.page}>
      <ActivityIndicator color="#a78bfa" />
    </View>
  );
}

const styles = {
  page: {
    flex: 1,
    backgroundColor: "#0c0a18",
    alignItems: "center",
    justifyContent: "center",
  },
};
