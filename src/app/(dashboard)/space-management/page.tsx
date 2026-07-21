import SpaceManagementPage from "@/views/space-management/SpaceManagementPage";
import ProtectedPage from "@/services/auth/ProtectedPage";

export default function Page() {
  return (
    <ProtectedPage allowedRoles={["HR", "SUPER_ADMIN"]}>
      <SpaceManagementPage />
    </ProtectedPage>
  );
}