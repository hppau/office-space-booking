"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from "@/api/api-service";
import type { NotificationRecord } from "@/models/notification";

type Filter = "all" | "unread" | "bookings" | "rooms";

function formatTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function iconClass(type: NotificationRecord["type"]) {
  if (type.includes("APPROVED")) return "fa-solid fa-circle-check text-emerald-600";
  if (type.includes("REJECTED")) return "fa-solid fa-circle-xmark text-red-600";
  if (type.includes("ROOM")) return "fa-solid fa-door-open text-blue-600";
  return "fa-solid fa-calendar-check text-orange-600";
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setItems(await getNotifications(filter)); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [filter]);

  async function openNotification(item: NotificationRecord) {
    if (!item.isRead) { await markNotificationRead(item.id); setItems((current) => current.map((n) => n.id === item.id ? { ...n, isRead: true } : n)); }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div><h1 className="text-3xl font-bold text-slate-950 dark:text-white">Notifications</h1><p className="mt-2 text-slate-600 dark:text-slate-400">Booking activity, approval decisions and room updates.</p></div>
        <button type="button" onClick={async () => { await markAllNotificationsRead(); setItems((x) => x.map((n) => ({ ...n, isRead: true }))); }} className="text-sm font-semibold text-blue-600 hover:text-blue-700">Mark all as read</button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 py-4 dark:border-slate-800">
        {(["all", "unread", "bookings", "rooms"] as Filter[]).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${filter === value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>{value}</button>)}
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {loading ? <p className="py-10 text-slate-500">Loading notifications...</p> : items.length === 0 ? <p className="py-16 text-center text-slate-500">No notifications found.</p> : items.map((item) => (
          <article key={item.id} className={`flex gap-4 py-5 ${item.isRead ? "" : "bg-blue-50/50 dark:bg-blue-950/20"}`}>
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900"><i className={iconClass(item.type)} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950 dark:text-white">{item.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{item.message}</p><p className="mt-2 text-xs text-slate-400">{formatTime(item.createdAt)}</p></div>{!item.isRead && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />}</div>
              <div className="mt-3 flex gap-4 text-sm font-semibold">{item.actionUrl && <Link href={item.actionUrl} onClick={() => void openNotification(item)} className="text-blue-600 hover:text-blue-700">Open</Link>}<button type="button" onClick={() => void openNotification(item)} className="text-slate-600 hover:text-slate-900 dark:text-slate-400">Mark read</button><button type="button" onClick={async () => { await deleteNotification(item.id); setItems((x) => x.filter((n) => n.id !== item.id)); }} className="text-red-600">Delete</button></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
