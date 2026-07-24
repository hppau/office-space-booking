import DashboardNavbar from "@/services/navbar/DashboardNavbar";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><DashboardNavbar/><main className="px-4 py-7 sm:px-6 lg:px-8">{children}</main></div>;
}
