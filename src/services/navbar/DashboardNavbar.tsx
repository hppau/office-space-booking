"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getCurrentSignedInUser,
  logoutUser,
} from "@/api/api-service";
import type { CurrentUser } from "@/models/auth";

type NavItem = {
  label: string;
  href: string;
  iconClassName: string;
  allowedRoles: CurrentUser["role"][];
};

type ThemeMode = "light" | "dark";

const navItems: NavItem[] = [
  {
    label: "Book Room",
    href: "/book",
    iconClassName: "fa-solid fa-calendar-plus",
    allowedRoles: ["SUPER_ADMIN", "EMPLOYEE"],
  },
  {
    label: "My Bookings",
    href: "/my-bookings",
    iconClassName: "fa-solid fa-list-check",
    allowedRoles: ["SUPER_ADMIN", "EMPLOYEE"],
  },
  {
    label: "Approvals",
    href: "/approvals",
    iconClassName: "fa-solid fa-circle-check",
    allowedRoles: ["SUPER_ADMIN", "HR", "MANAGER"],
  },
  {
    label: "Approval History",
    href: "/approval-history",
    iconClassName: "fa-solid fa-clock-rotate-left",
    allowedRoles: ["SUPER_ADMIN", "HR", "MANAGER"],
  },
  {
    label: "Space Management",
    href: "/space-management",
    iconClassName: "fa-solid fa-layer-group",
    allowedRoles: ["HR", "SUPER_ADMIN"],
  },
  {
    label: "Room Management",
    href: "/room-management",
    iconClassName: "fa-solid fa-door-open",
    allowedRoles: ["HR", "SUPER_ADMIN"],
  },
  {
    label: "Room Area Designer",
    href: "/room-area-management",
    iconClassName: "fa-solid fa-map-location-dot",
    allowedRoles: ["HR", "SUPER_ADMIN"],
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
    default:
      return "User";
  }
}

function getHomeRoute(role: CurrentUser["role"]): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "HR":
      return "/room-management";
    case "MANAGER":
      return "/approvals";
    case "EMPLOYEE":
      return "/book";
    default:
      return "/";
  }
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function DashboardNavbar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoutError, setLogoutError] = useState("");
  const [themeMode, setThemeMode] =
    useState<ThemeMode>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem(
      "office-booking-theme",
    ) as ThemeMode | null;

    const initialTheme: ThemeMode =
      savedTheme ??
      (document.documentElement.classList.contains("dark")
        ? "dark"
        : "light");

    setThemeMode(initialTheme);
    document.documentElement.classList.toggle(
      "dark",
      initialTheme === "dark",
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        const user = await getCurrentSignedInUser();

        if (isMounted) {
          setCurrentUser(user);
        }
      } catch {
        if (isMounted) {
          router.replace("/login");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const visibleNavItems = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return navItems.filter((item) =>
      item.allowedRoles.includes(currentUser.role),
    );
  }, [currentUser]);

  const homeHref = currentUser
    ? getHomeRoute(currentUser.role)
    : "/";

  function handleToggleTheme() {
    const nextTheme: ThemeMode =
      themeMode === "dark" ? "light" : "dark";

    setThemeMode(nextTheme);
    localStorage.setItem(
      "office-booking-theme",
      nextTheme,
    );
    document.documentElement.classList.toggle(
      "dark",
      nextTheme === "dark",
    );
  }

  async function handleLogout() {
    try {
      setLogoutError("");
      await logoutUser();

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Unable to log out.",
      );
    }
  }

  if (isLoading) {
    return (
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-9 w-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </header>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 shadow-none backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-4 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={homeHref}
              aria-label="Open home page"
              className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-600 text-xl text-white shadow-none transition hover:bg-blue-700"
            >
              <i className="fa-solid fa-building" />
            </Link>

            <div>
              <Link
                href={homeHref}
                className="text-xl font-bold text-slate-900 dark:text-white"
              >
                Office Room Booking
              </Link>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Smart room and workspace reservation system
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <nav
              aria-label="Main navigation"
              className="flex flex-wrap gap-2"
            >
              {visibleNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-none"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <i className={item.iconClassName} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {getInitials(currentUser.fullName)}
                </div>

                <div className="min-w-0">
                  <p className="max-w-44 truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {currentUser.fullName}
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {getRoleLabel(currentUser.role)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleTheme}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                title="Toggle dark or light mode"
                aria-label="Toggle dark or light mode"
              >
                <i
                  className={
                    themeMode === "dark"
                      ? "fa-solid fa-sun"
                      : "fa-solid fa-moon"
                  }
                />
              </button>

              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <i className="fa-solid fa-right-from-bracket" />
                Logout
              </button>
            </div>

            {logoutError && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {logoutError}
              </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
