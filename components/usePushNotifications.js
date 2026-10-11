import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getToken, savePushToken } from "../api";

// GigMatch — device push registration.
//
// Every admin-driven notification already lands in the in-app notification
// center. This hook is the extra channel for devices that have opted in: it
// asks for permission, fetches this device's Expo push token, and hands it to
// the backend so server-side notifications can also arrive as a push.
//
// IMPORTANT: call this from a SIGNED-IN screen (the dashboards), NOT from the
// root layout. The root layout renders the navigator itself, so navigation
// hooks aren't available there — and it also mounts before anyone has signed
// in, which makes it the wrong place to ask about a session anyway.

// ---------------------------------------------------------------------------
// expo-notifications is loaded defensively.
//
// It needs its native module to be present, and that isn't guaranteed — most
// notably Expo Go on Android, where remote push has been unavailable since
// SDK 53 and a development build is required. A plain top-level
// `import * as Notifications from "expo-notifications"` is evaluated eagerly
// during module init, so if the native side is missing the throw takes down
// EVERY screen that imports this file — including the sign-out helpers, which
// only ever wanted `unregisterPushToken`.
//
// Requiring it inside a guard turns that crash into a quiet fallback: push
// switches itself off and the in-app notification centre carries on.
// ---------------------------------------------------------------------------
let Notifications = null;
try {
  Notifications = require("expo-notifications");
} catch (err) {
  console.warn("expo-notifications unavailable — push disabled:", err?.message);
}

// Install the handler before any notification arrives, including while the app
// is backgrounded. Note (SDK 57): the behaviour flags are
// shouldShowBanner / shouldShowList — the older shouldShowAlert is no longer used.
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Module-level, not a hook ref: the dashboards are separate component
// instances, so a per-instance ref would let each one try again (and re-prompt
// for permission). This way whichever screen mounts first does the work and
// the rest skip it.
let registrationSettled = false;

async function registerForPushNotificationsAsync() {
  try {
    // Native side isn't there at all — nothing to register with.
    if (!Notifications) return null;

    // Android 13+ gates notifications behind an OS permission prompt, and the
    // prompt will not appear until at least one channel exists — so the
    // channel has to be created BEFORE we ask for permission or fetch a token.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "GigMatch updates",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#7c3aed",
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (existingStatus !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    // The member said no — that's a valid outcome, not an error.
    if (status !== "granted") return null;

    // An Expo push token is only obtainable once the project has an EAS id.
    // A build that hasn't gone through EAS/prebuild (and Expo Go without one)
    // simply has none, so treat that as "push unavailable" rather than a fault.
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data || null;
  } catch (err) {
    // Offline, timed out, or unsupported — all fine, fall back to in-app.
    console.warn("push registration skipped:", err?.message);
    return null;
  }
}

// Registers this device once, on a screen where the member is signed in.
export function usePushNotifications(enabled = true) {
  useEffect(() => {
    if (!enabled || !Notifications || registrationSettled) return undefined;

    let cancelled = false;

    (async () => {
      const session = await getToken();
      if (!session || cancelled) return;

      // Nothing here is worth retrying once we've reached a conclusion —
      // either we get a token, or push isn't available and re-prompting
      // would only nag the member.
      registrationSettled = true;

      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken && !cancelled) {
        await savePushToken(pushToken).catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Push tokens can rotate mid-session; re-register the new one straight away
  // so the backend never keeps pushing to a token that is now dead.
  useEffect(() => {
    if (!enabled || !Notifications) return undefined;
    const subscription = Notifications.addPushTokenListener(async (token) => {
      if (token?.data) await savePushToken(token.data).catch(() => {});
    });
    return () => subscription.remove();
  }, [enabled]);
}

// Called on sign-out so the server stops targeting this device for an account
// that is no longer on it. Safe to call even when push was never available.
export async function unregisterPushToken() {
  try {
    await savePushToken(null);
  } catch {
    // Best-effort: a failed clear just means this device stays registered
    // until the backend expires it (which it does, on DeviceNotRegistered).
  }
}
