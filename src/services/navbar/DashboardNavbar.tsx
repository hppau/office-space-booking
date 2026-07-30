"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentSignedInUser,
  getNotificationPreview,
  logoutUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/api-service";
import type { CurrentUser } from "@/models/auth";
import type { NotificationRecord } from "@/models/notification";

type NavItem = { label: string; href: string; iconClassName: string; allowedRoles: CurrentUser["role"][] };
type ThemeMode = "light" | "dark";

const navItems: NavItem[] = [
  { label: "My Bookings", href: "/my-bookings", iconClassName: "fa-solid fa-calendar-days", allowedRoles: ["SUPER_ADMIN", "HR", "MANAGER","EMPLOYEE"] },
  { label: "Approvals", href: "/approvals", iconClassName: "fa-solid fa-circle-check", allowedRoles: ["SUPER_ADMIN", "HR", "MANAGER"] },
  { label: "Approval History", href: "/approval-history", iconClassName: "fa-solid fa-clock-rotate-left", allowedRoles: ["SUPER_ADMIN", "HR", "MANAGER"] },
  {label: "Room Designer", href: "/room-designer", iconClassName: "fa-solid fa-compass-drafting", allowedRoles: ["HR","SUPER_ADMIN","MANAGER"]}
];

function getRoleLabel(role: CurrentUser["role"]) {
  return role === "SUPER_ADMIN" ? "Super Admin" : role === "HR" ? "HR" : role === "MANAGER" ? "Manager" : "Employee";
}
function getHomeRoute(role: CurrentUser["role"]) {
  if (role === "MANAGER") return "/approvals";
  if (role === "SUPER_ADMIN") return "/room-designer";
  return "/book";
}
function getInitials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U"; }
function timeAgo(value: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function DashboardNavbar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const notificationRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoutError, setLogoutError] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("office-booking-theme") as ThemeMode | null;
    const initial = saved ?? (document.documentElement.classList.contains("dark") ? "dark" : "light");
    setThemeMode(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await getCurrentSignedInUser();
        if (!active) return;
        setCurrentUser(user);
        const preview = await getNotificationPreview().catch(() => ({ items: [], unreadCount: 0 }));
        if (active) { setNotifications(preview.items); setUnreadCount(preview.unreadCount); }
      } catch { if (active) router.replace("/login"); }
      finally { if (active) setIsLoading(false); }
    })();
    return () => { active = false; };
  }, [router, pathname]);

  useEffect(() => {
    function close(event: MouseEvent) { if (!notificationRef.current?.contains(event.target as Node)) setNotificationOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const visibleNavItems = useMemo(() => currentUser ? navItems.filter((item) => item.allowedRoles.includes(currentUser.role)) : [], [currentUser]);
  const homeHref = currentUser ? getHomeRoute(currentUser.role) : "/";

  function handleToggleTheme() {
    const next = themeMode === "dark" ? "light" : "dark";
    setThemeMode(next); localStorage.setItem("office-booking-theme", next); document.documentElement.classList.toggle("dark", next === "dark");
  }
  async function handleLogout() {
    try { setLogoutError(""); await logoutUser(); router.replace("/login"); router.refresh(); }
    catch (error) { setLogoutError(error instanceof Error ? error.message : "Unable to log out."); }
  }
  async function openNotification(item: NotificationRecord) {
    if (!item.isRead) {
      await markNotificationRead(item.id).catch(() => undefined);
      setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setNotificationOpen(false);
    if (item.actionUrl) router.push(item.actionUrl);
  }

  if (isLoading) return <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"><div className="mx-auto flex max-w-[1700px] items-center justify-between px-4 py-4 sm:px-6"><div className="h-6 w-48 animate-pulse rounded bg-slate-200" /><div className="h-9 w-28 animate-pulse rounded bg-slate-200" /></div></header>;
  if (!currentUser) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto max-w-[1700px] px-4 sm:px-6">
        <div className="flex items-center gap-5 py-4">
          <div className="flex shrink-0 items-center gap-3">
            <Link href={homeHref} className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-600 text-xl text-white" aria-label="Open home"><i className="fa-solid fa-building" /></Link>
            <div className="hidden min-w-[185px] lg:block"><Link href={homeHref} className="text-xl font-bold text-slate-900 dark:text-white">Office Booking</Link><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Smart room reservation system</p></div>
          </div>

          <nav className="flex min-w-0 flex-1 gap-2 overflow-x-auto" aria-label="Main navigation">
            {visibleNavItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return <Link key={item.href} href={item.href} className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}><i className={item.iconClassName} />{item.label}</Link>;
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <div ref={notificationRef} className="relative">
              <button type="button" onClick={() => setNotificationOpen((value) => !value)} className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="Notifications"><i className="fa-solid fa-bell" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
              {notificationOpen && <div className="absolute right-0 mt-3 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700"><h2 className="font-bold text-slate-950 dark:text-white">Notifications</h2><button type="button" onClick={async () => { await markAllNotificationsRead(); setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))); setUnreadCount(0); }} className="text-xs font-semibold text-blue-600">Mark all read</button></div>
                <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">{notifications.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-500">No notifications yet.</p> : notifications.map((item) => <button key={item.id} type="button" onClick={() => void openNotification(item)} className={`block w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${item.isRead ? "" : "bg-blue-50/70 dark:bg-blue-950/30"}`}><div className="flex gap-3"><span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.isRead ? "bg-slate-300" : "bg-blue-600"}`} /><div><p className="text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400">{item.message}</p><p className="mt-1 text-[11px] text-slate-400">{timeAgo(item.createdAt)}</p></div></div></button>)}</div>
                <Link href="/notifications" onClick={() => setNotificationOpen(false)} className="block border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-blue-600 dark:border-slate-700">View all notifications</Link>
              </div>}
            </div>

            <Link
              href="/profile"
              aria-label="Open profile"
              title="Open profile"
              className={`flex items-center gap-2 rounded-md border px-2 py-2 transition sm:gap-3 sm:px-3 ${
                pathname === "/profile" || pathname.startsWith("/profile/")
                  ? "border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
                  : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-blue-600">
                {currentUser.profileImageUrl ? (
                  <img
                    src={currentUser.profileImageUrl}
                    alt={`${currentUser.fullName}'s profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                    {getInitials(currentUser.fullName)}
                  </div>
                )}
              </div>

              <div className="hidden min-w-0 text-left sm:block">
                <p className="max-w-36 truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {currentUser.fullName}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getRoleLabel(currentUser.role)}
                </p>
              </div>
            </Link>
            <button type="button" onClick={handleToggleTheme} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="Toggle theme"><i className={themeMode === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon"} /></button>
            <button type="button" onClick={() => void handleLogout()} className="hidden items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 sm:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-right-from-bracket" /><span className="hidden 2xl:inline">Logout</span></button>
          </div>
        </div>
        {logoutError && <p className="pb-2 text-sm text-red-600">{logoutError}</p>}
      </div>
    </header>
  );
}