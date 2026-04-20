import { redirect } from "next/navigation";

export default function NotificationsPage() {
  // Keep /notifications as a compatibility alias for the old
  // "all activities" center (interests, views, contacts, notes, etc.).
  redirect("/activities");
}
