import { Redirect } from "expo-router";

// GigMatch — /admin
//
// There is no separate dashboard/home screen anymore. The section nav lives in
// the shared admin header (see components/admin/AdminShell.jsx), and admins
// land straight on the verification + moderation list. This file only exists so
// a bare /admin (e.g. an old bookmark) lands somewhere sensible.
export default function AdminIndex() {
  return <Redirect href="/admin/users" />;
}
