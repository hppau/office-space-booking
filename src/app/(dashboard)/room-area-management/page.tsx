import ProtectedPage from "@/services/auth/ProtectedPage";
import FloorMapManagementPage from "@/views/floor-map-management/FloorMapManagementPage";

export default function Page() {
  return (
    <ProtectedPage
      allowedRoles={["HR", "SUPER_ADMIN"]}
    >
      <FloorMapManagementPage />
    </ProtectedPage>
  );
}