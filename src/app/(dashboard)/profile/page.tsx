import ProtectedPage from "@/services/auth/ProtectedPage";
import ProfilePage from "@/views/profile/ProfilePage";

export default function Page() {
  return (
    <ProtectedPage
      allowedRoles={[
        "SUPER_ADMIN",
        "HR",
        "MANAGER",
        "EMPLOYEE",
      ]}
    >
      <ProfilePage />
    </ProtectedPage>
  );
}
