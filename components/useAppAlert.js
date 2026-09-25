import { useCallback, useState } from "react";
import AppAlertModal from "./AppAlertModal.jsx";

// GigMatch — drop-in replacement for react-native's Alert.alert(), styled
// to match the app. Lives at /components/useAppAlert.js.
//
// Usage in a screen:
//   const { showAlert, AlertModal } = useAppAlert();
//   showAlert({ title: "Notifications", message: "No new notifications yet." });
//   ...
//   return (
//     <View>
//       ...screen content...
//       {AlertModal}
//     </View>
//   );
//
// showAlert(options):
//   title, message   — strings
//   icon              — Ionicons name, e.g. "notifications", "alert-circle"
//   tone              — "info" | "success" | "warning" | "danger" (controls icon color)
//   buttons           — [{ label, onPress, style }], style: "primary" (default) | "secondary" | "destructive"
//                        omit for a single default "OK" button

export function useAppAlert() {
  const [config, setConfig] = useState(null);

  const showAlert = useCallback((options) => {
    setConfig(options);
  }, []);

  const hideAlert = useCallback(() => setConfig(null), []);

  const AlertModal = (
    <AppAlertModal
      visible={!!config}
      onClose={hideAlert}
      icon={config?.icon}
      tone={config?.tone}
      title={config?.title}
      message={config?.message}
      buttons={config?.buttons}
    />
  );

  return { showAlert, hideAlert, AlertModal };
}