// GigMatch — one source of truth for how a notification is presented.
//
// The list screen and the detail screen used to each keep their own copy of
// this map, and they had already drifted apart (the detail screen was missing
// "accepted" and "rejected", so those opened with a generic bell). One module
// means a new notification type can never render one way in the list and
// another way when tapped.

export const PURPLE = "#7c3aed";

// Icon + color per notification type. Everything not listed falls back to
// "info", so a brand-new type still renders sensibly.
export const TYPE_STYLE = {
  removed: { icon: "person-remove-outline", color: "#dc2626", tint: "rgba(220,38,38,0.1)" },
  accepted: { icon: "checkmark-circle-outline", color: "#16a34a", tint: "rgba(34,197,94,0.12)" },
  rejected: { icon: "close-circle-outline", color: "#dc2626", tint: "rgba(220,38,38,0.1)" },
  "gig-application": { icon: "document-text-outline", color: PURPLE, tint: "rgba(124,58,237,0.1)" },
  rating: { icon: "star", color: "#f59e0b", tint: "rgba(245,158,11,0.14)" },

  // --- Driven by an administrator's action ---------------------------
  // One entry per server-side notification type (see server/utils/notify.js).
  admin_verification: {
    icon: "shield-checkmark-outline",
    color: "#16a34a",
    tint: "rgba(34,197,94,0.12)",
  },
  admin_status: { icon: "alert-circle-outline", color: "#d97706", tint: "rgba(217,119,6,0.14)" },
  admin_report: { icon: "flag-outline", color: "#dc2626", tint: "rgba(220,38,38,0.1)" },
  admin_dispute: { icon: "scale-outline", color: "#0891b2", tint: "rgba(8,145,178,0.12)" },
  admin_announcement: { icon: "megaphone-outline", color: PURPLE, tint: "rgba(124,58,237,0.1)" },
  gig_moderation: { icon: "document-check-outline", color: "#7c3aed", tint: "rgba(124,58,237,0.1)" },

  info: { icon: "notifications-outline", color: PURPLE, tint: "rgba(124,58,237,0.1)" },
};

export function styleFor(type) {
  return TYPE_STYLE[type] ?? TYPE_STYLE.info;
}

// "Today, 3:45 PM" / "Yesterday, 3:45 PM" / "October 9, 2026 at 3:45 PM".
//
// The list keeps the friendly relative labels because that's what makes it
// scannable, but the fallback includes the TIME as well as the day — an admin
// action has to be traceable to a moment, not just a date. (The message body
// also embeds an explicit "Action taken on …" line, so the detail is never
// ambiguous even where a screen chooses not to render a timestamp.)
export function formatNotificationDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";

  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfToday - day) / 86400000);

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;

  return `${d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })} at ${time}`;
}
