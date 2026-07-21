"use client";

import { ReactNode, useEffect, useState } from "react";
import { getCurrentSignedInUser } from "@/api/api-service";
import type { CurrentUser } from "@/models/auth";
import AccessDenied from "./AccessDenied";

type ProtectedPageProps = {
  children: ReactNode;
  allowedRoles: CurrentUser["role"][];
};

export default function ProtectedPage({
  children,
  allowedRoles,
}: ProtectedPageProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        setLoadError("");

        const user = await getCurrentSignedInUser();

        setCurrentUser(user);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to verify your account.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadUser();
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-5 font-medium text-slate-700">
            Checking access...
          </p>
        </section>
      </div>
    );
  }

  if (loadError || !currentUser) {
    return (
      <AccessDenied
        title="Sign in required"
        message="Please sign in before viewing this page."
      />
    );
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <AccessDenied
        title="Access denied"
        message="Your account role does not have permission to view this page."
      />
    );
  }

  return <>{children}</>;
}