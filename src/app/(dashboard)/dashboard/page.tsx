import DashboardPage from "@/views/dashboard/DashboardPage";
import ProtectedPage from "@/services/auth/ProtectedPage";

export default function Page() {
  return (
    <ProtectedPage
      allowedRoles={["EMPLOYEE", "MANAGER", "HR", "SUPER_ADMIN"]}
    >
      <DashboardPage />
    </ProtectedPage>
  );
}