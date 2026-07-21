import ApprovalsPage from "@/views/approvals/ApprovalsPage";
import ProtectedPage from "@/services/auth/ProtectedPage";

export default function Page() {
  return (
    <ProtectedPage allowedRoles={["HR", "MANAGER", "SUPER_ADMIN"]}>
      <ApprovalsPage />
    </ProtectedPage>
  );
}