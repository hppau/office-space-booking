import ApprovalHistoryPage from "@/views/approval-history/ApprovalHistoryPage";
import ProtectedPage from "@/services/auth/ProtectedPage";

export default function Page() {
  return (
    <ProtectedPage allowedRoles={["HR", "MANAGER", "SUPER_ADMIN"]}>
      <ApprovalHistoryPage />
    </ProtectedPage>
  );
}