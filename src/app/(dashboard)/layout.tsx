import DashboardNavbar from "@/services/navbar/DashboardNavbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardNavbar />

      <main className="px-6 py-8">{children}</main>
    </div>
  );
}