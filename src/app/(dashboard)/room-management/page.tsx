import ProtectedPage from "@/services/auth/ProtectedPage";
import LocationManagementPage from "@/views/location-management/LocationManagementPage";

export default function Page() {
  return (
    <ProtectedPage
      allowedRoles={["HR", "SUPER_ADMIN"]}
    >
      <LocationManagementPage />
    </ProtectedPage>
  );
}