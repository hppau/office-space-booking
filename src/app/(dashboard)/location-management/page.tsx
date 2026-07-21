import LocationManagementPage from "@/views/location-management/LocationManagementPage";
import ProtectedPage from "@/services/auth/ProtectedPage";

export default function Page() {
  return (
    <ProtectedPage allowedRoles={["HR", "SUPER_ADMIN"]}>
      <LocationManagementPage />
    </ProtectedPage>
  );
}