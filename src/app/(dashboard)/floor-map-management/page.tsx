import FloorMapManagementPage from "@/views/floor-map-management/FloorMapManagementPage";
import ProtectedPage from "@/services/auth/ProtectedPage";

export default function Page() {
  return (
    <ProtectedPage allowedRoles={["HR", "SUPER_ADMIN"]}>
      <FloorMapManagementPage />
    </ProtectedPage>
  );
}