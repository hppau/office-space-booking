import ProtectedPage from "@/services/auth/ProtectedPage";
import RoomDesignerPage from "@/views/room-designer/RoomDesignerPage";

export default function Page() {
  return (
    <ProtectedPage allowedRoles={["HR", "SUPER_ADMIN"]}>
      <RoomDesignerPage />
    </ProtectedPage>
  );
}