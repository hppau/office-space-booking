"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSignedInUser } from "@/api/api-service";
import type { CurrentUser } from "@/models/auth";

function getHomeRoute(role: CurrentUser["role"]): string {
  switch (role) {
    case "HR":
    case "EMPLOYEE":
      return "/book";

    case "SUPER_ADMIN":
      return "/room-management";

    case "MANAGER":
      return "/approvals";

    default:
      return "/";
  }
}

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function redirectUser() {
      try {
        const currentUser = await getCurrentSignedInUser();

        if (isMounted) {
          router.replace(getHomeRoute(currentUser.role));
        }
      } catch {
        if (isMounted) {
          router.replace("/login");
        }
      }
    }

    void redirectUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-800 dark:border-t-blue-400" />
        <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Opening your workspace...
        </p>
      </div>
    </section>
  );
}
