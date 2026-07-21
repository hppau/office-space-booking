import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Office Space Booking",
    template: "%s | Office Space Booking",
  },
  description:
    "An internal office desk, room and shared-space booking and approval system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    try {
      const storedTheme = localStorage.getItem("office-booking-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

      if (storedTheme === "dark" || (!storedTheme && prefersDark)) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {
      document.documentElement.classList.remove("dark");
    }
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />

        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>

      <body className="min-h-screen bg-[#f3efe3] text-[#3f463b] antialiased transition-colors duration-300 dark:bg-[#06070b] dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}