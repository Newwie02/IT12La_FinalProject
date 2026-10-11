import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { saveMyLocation } from "../api";

// GigMatch — shared "where am I?" helper for the nearby lists.
// Lives at /components/useMyLocation.js and is used by the client and band
// dashboards so they don't each re-implement the permission dance.
//
//   const { coords, status, refresh } = useMyLocation();
//
// status: "locating" | "ready" | "denied" | "unavailable"
//
// Behaviour:
//   • Asks for foreground permission once. "Denied" is remembered for the
//     session so we never re-prompt on every dashboard load.
//   • Uses the last known position when it's recent — a fresh GPS fix can
//     take seconds, and the last pin is good enough to sort a list by.
//   • Sends the pin to the server (PATCH /users/me/location) so OTHER members
//     can measure distance to us. A failed save never breaks the caller; we
//     still return coords so the list can show distances we can compute.
//
// On web there is no expo-location permission prompt to reuse, so we fall
// back to the browser Geolocation API and skip the server save on failure.

// Cached across mounts so navigating between dashboards doesn't re-prompt.
let cachedCoords = null;
let permissionAsked = false;

function webGetCoords() {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  });
}

async function readPosition() {
  // A pin from the last minute or two is plenty for sorting by distance.
  try {
    const last = await Location.getLastKnownPositionAsync({
      maxAge: 2 * 60 * 1000,
    });
    if (last?.coords) {
      return {
        latitude: last.coords.latitude,
        longitude: last.coords.longitude,
      };
    }
  } catch {
    // fall through to a fresh fix
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

export function useMyLocation() {
  const [coords, setCoords] = useState(cachedCoords);
  const [status, setStatus] = useState(cachedCoords ? "ready" : "locating");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setStatus("locating");
    let pin = null;

    if (Platform.OS === "web") {
      pin = await webGetCoords();
    } else {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        permissionAsked = true;
        if (perm !== "granted") {
          if (mounted.current) setStatus("denied");
          return null;
        }
        pin = await readPosition();
      } catch {
        pin = null;
      }
    }

    if (!pin) {
      if (mounted.current) setStatus("unavailable");
      return null;
    }

    cachedCoords = pin;
    if (mounted.current) {
      setCoords(pin);
      setStatus("ready");
    }

    // Best effort — the server storing our pin is what lets OTHER people see
    // us as nearby. Not worth failing the screen over.
    try {
      await saveMyLocation(pin);
    } catch {
      /* ignore */
    }

    return pin;
  }, []);

  useEffect(() => {
    if (cachedCoords) {
      setStatus("ready");
      return;
    }
    if (!permissionAsked || Platform.OS === "web") refresh();
    else setStatus("denied");
  }, [refresh]);

  return { coords, status, refresh };
}

// Human-readable note for the dashboard when we can't measure distance.
export function nearbyNotice(status) {
  if (status === "denied") {
    return "Location is off — showing everyone, unsorted. Enable location to see who's nearest.";
  }
  if (status === "unavailable") {
    return "Couldn't get a location fix. Showing everyone, unsorted.";
  }
  return null;
}
