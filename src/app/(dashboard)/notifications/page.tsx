import ProtectedPage from "@/services/auth/ProtectedPage";
import NotificationsPage from "@/views/notifications/NotificationsPage";

export default function Page() {
  return <ProtectedPage allowedRoles={["SUPER_ADMIN", "HR", "MANAGER", "EMPLOYEE"]}><NotificationsPage /></ProtectedPage>;
}
