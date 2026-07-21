import MyBookingsPage from "@/views/my-bookings/MyBookingsPage";
import ProtectedPage from "@/services/auth/ProtectedPage";

export default function Page() {
  return (
    <ProtectedPage allowedRoles={["EMPLOYEE", "SUPER_ADMIN"]}>
      <MyBookingsPage />
    </ProtectedPage>
  );
}