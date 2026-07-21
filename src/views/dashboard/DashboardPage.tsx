"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentSignedInUser } from "@/api/api-service";
import type { CurrentUser } from "@/models/auth";

type DashboardAction = {
  title: string;
  description: string;
  href: string;
  iconClassName: string;
  buttonLabel: string;
  allowedRoles: CurrentUser["role"][];
};

type WorkflowStep = {
  title: string;
  description: string;
  iconClassName: string;
};

const dashboardActions: DashboardAction[] = [
  {
    title: "Book Space",
    description:
      "Reserve an available desk, chair, meeting room, or shared workspace for your selected date and time.",
    href: "/book",
    iconClassName: "fa-solid fa-location-dot",
    buttonLabel: "Book Now",
    allowedRoles: ["SUPER_ADMIN", "EMPLOYEE"],
  },
  {
    title: "My Bookings",
    description:
      "View your current bookings, approval status, booking details, and previous reservations.",
    href: "/my-bookings",
    iconClassName: "fa-solid fa-clipboard-list",
    buttonLabel: "View Bookings",
    allowedRoles: ["SUPER_ADMIN", "EMPLOYEE"],
  },
  {
    title: "Approvals",
    description:
      "Review submitted booking requests and approve or reject them based on availability and policy.",
    href: "/approvals",
    iconClassName: "fa-solid fa-circle-check",
    buttonLabel: "Review Approvals",
    allowedRoles: ["SUPER_ADMIN", "HR", "MANAGER"],
  },
  {
    title: "Approval History",
    description:
      "Check completed approval records, reviewer comments, and previous booking decisions.",
    href: "/approval-history",
    iconClassName: "fa-solid fa-clock-rotate-left",
    buttonLabel: "View Records",
    allowedRoles: ["SUPER_ADMIN", "HR", "MANAGER"],
  },
  {
    title: "Space Management",
    description:
      "Add, update, and manage bookable office resources such as desks, seats, and rooms.",
    href: "/space-management",
    iconClassName: "fa-solid fa-chair",
    buttonLabel: "Manage Spaces",
    allowedRoles: ["SUPER_ADMIN", "HR"],
  },
  {
    title: "Office / Floor",
    description:
      "Maintain office locations, floor details, and uploaded floor plan images.",
    href: "/location-management",
    iconClassName: "fa-solid fa-building",
    buttonLabel: "Manage Locations",
    allowedRoles: ["SUPER_ADMIN", "HR"],
  },
  {
    title: "Floor Map",
    description:
      "Place and update workspace markers on floor plans for visual booking selection.",
    href: "/floor-map-management",
    iconClassName: "fa-solid fa-map-location-dot",
    buttonLabel: "Manage Map",
    allowedRoles: ["SUPER_ADMIN", "HR"],
  },
];

const workflowSteps: WorkflowStep[] = [
  {
    title: "Select Space",
    description:
      "Employees choose an available workspace from the booking page or floor map.",
    iconClassName: "fa-solid fa-map-location-dot",
  },
  {
    title: "Submit Booking",
    description:
      "The booking request is submitted with the selected date, time, and reason.",
    iconClassName: "fa-solid fa-paper-plane",
  },
  {
    title: "Approval Review",
    description:
      "Managers or HR review the request and approve or reject it based on the rules.",
    iconClassName: "fa-solid fa-user-check",
  },
  {
    title: "Record Updated",
    description:
      "The booking status and approval history are saved for future reference.",
    iconClassName: "fa-solid fa-database",
  },
];

function getRoleLabel(role: CurrentUser["role"]): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";

    case "HR":
      return "HR";

    case "MANAGER":
      return "Manager";

    case "EMPLOYEE":
      return "Employee";
  }
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export default function DashboardPage() {
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
            : "Unable to load dashboard.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadUser();
  }, []);

  const visibleActions = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return dashboardActions.filter((action) =>
      action.allowedRoles.includes(currentUser.role),
    );
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e] dark:border-slate-700 dark:border-t-orange-400" />

          <p className="mt-5 font-medium text-[#5f6658] dark:text-slate-300">
            Loading dashboard...
          </p>
        </section>
      </div>
    );
  }

  if (loadError || !currentUser) {
    return (
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-red-200 bg-red-50 p-10 text-center dark:border-red-900/60 dark:bg-red-950/40">
          <div className="text-4xl">⚠️</div>

          <h1 className="mt-5 text-2xl font-bold text-red-900 dark:text-red-200">
            Unable to load dashboard
          </h1>

          <p className="mt-3 text-red-700 dark:text-red-300">
            {loadError}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-[2.5rem] border border-[#d8d0bf] bg-[#e7e3d2] shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-h-[340px] bg-gradient-to-br from-[#c9d2bd] via-[#e8e3d3] to-[#f6efe2] px-8 py-10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:px-12">
          <div className="absolute right-[-40px] top-[-40px] h-64 w-64 rounded-full bg-[#c45f31]/20 blur-3xl dark:bg-orange-500/10" />
          <div className="absolute bottom-[-60px] left-[-30px] h-72 w-72 rounded-full bg-[#87977b]/30 blur-3xl dark:bg-blue-500/10" />

          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#6d7a64] dark:text-slate-400">
                Office Space Booking System
              </p>

              <h1 className="mt-8 max-w-3xl text-5xl font-black leading-[0.95] tracking-tight text-white drop-shadow-sm dark:text-white sm:text-7xl">
                Plan your workspace
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-[#5e6558] dark:text-slate-300">
                {getGreeting()},{" "}
                <span className="font-bold text-[#bd5a2f] dark:text-orange-300">
                  {currentUser.fullName}
                </span>
                . Reserve workspaces, manage approvals, and keep office
                space usage organized in one simple system.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <span className="rounded-full bg-white/80 px-5 py-2 text-sm font-bold text-[#c65f2e] shadow-sm ring-1 ring-white/70 dark:bg-slate-800 dark:text-orange-300 dark:ring-slate-700">
                  {getRoleLabel(currentUser.role)}
                </span>

                <span className="rounded-full bg-white/60 px-5 py-2 text-sm font-semibold text-[#5f6658] shadow-sm ring-1 ring-white/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                  {currentUser.department?.name ?? "No department assigned"}
                </span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/55 p-6 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/60">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#87977b] dark:text-slate-400">
                Account Details
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-[#8b8b7a] dark:text-slate-500">
                    Employee Code
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#3f463b] dark:text-white">
                    {currentUser.employeeCode ?? "Not assigned"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#8b8b7a] dark:text-slate-500">
                    Email Address
                  </p>

                  <p className="mt-1 break-all text-sm font-semibold text-[#3f463b] dark:text-white">
                    {currentUser.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#8b8b7a] dark:text-slate-500">
                    User Role
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#3f463b] dark:text-white">
                    {getRoleLabel(currentUser.role)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#f3efe3] px-8 py-10 text-center dark:bg-slate-950 sm:px-12">
          <p className="mx-auto max-w-3xl text-lg leading-8 text-[#686b5f] dark:text-slate-300">
            A centralized platform for booking desks, meeting rooms, and
            shared office spaces, with approval tracking for managers and
            HR teams.
          </p>
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#c65f2e] dark:text-orange-300">
            Quick Access
          </p>

          <h2 className="mt-3 text-3xl font-black text-[#3f463b] dark:text-white">
            Available Services
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#74786d] dark:text-slate-400">
            Access the tools and services available for your assigned role.
          </p>
        </div>

        <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visibleActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-[2rem] border border-[#ded6c7] bg-[#fffdf6] p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef0e2] text-2xl text-[#c65f2e] shadow-sm ring-8 ring-[#f8f3e7] transition group-hover:scale-105 dark:bg-slate-800 dark:text-orange-300 dark:ring-slate-900">
                <i className={action.iconClassName} />
              </div>

              <h3 className="mt-6 text-lg font-black text-[#3f463b] dark:text-white">
                {action.title}
              </h3>

              <p className="mt-3 min-h-20 text-sm leading-6 text-[#72766c] dark:text-slate-400">
                {action.description}
              </p>

              <div className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#c65f2e] dark:text-orange-300">
                {action.buttonLabel}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-52 bg-gradient-to-br from-[#bfcab3] via-[#e5decd] to-[#f8f3e7] dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
            <div className="flex h-full items-center justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/70 text-5xl text-[#c65f2e] shadow-sm dark:bg-slate-800 dark:text-orange-300">
                <i className="fa-solid fa-building-user" />
              </div>
            </div>
          </div>

          <div className="p-7">
            <h2 className="text-3xl font-black text-[#c65f2e] dark:text-orange-300">
              Workspace Management
            </h2>

            <p className="mt-4 leading-7 text-[#676b60] dark:text-slate-300">
              This platform helps employees reserve workspaces in advance,
              while managers and HR teams can review requests, manage office
              resources, and maintain accurate booking records.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#87977b] dark:text-slate-400">
            Booking Process
          </p>

          <h2 className="mt-3 text-3xl font-black text-[#3f463b] dark:text-white">
            How it works
          </h2>

          <div className="mt-7 space-y-4">
            {workflowSteps.map((step, index) => (
              <div
                key={step.title}
                className="flex gap-4 rounded-2xl border border-[#ded6c7] bg-[#fffdf6] p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eef0e2] text-[#c65f2e] dark:bg-slate-800 dark:text-orange-300">
                  <i className={step.iconClassName} />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b1a58f] dark:text-slate-500">
                    Step {index + 1}
                  </p>

                  <h3 className="mt-1 font-black text-[#3f463b] dark:text-white">
                    {step.title}
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#72766c] dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}