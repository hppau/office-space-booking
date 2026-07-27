import BookSpacePage from "@/views/book/BookPage";
import ProtectedPage from "@/services/auth/ProtectedPage";

export default function Page() {
  return (
    <ProtectedPage allowedRoles={["HR", "EMPLOYEE", "SUPER_ADMIN"]}>
      <BookSpacePage />
    </ProtectedPage>
  );
}
