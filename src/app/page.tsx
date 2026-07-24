import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white">
          <i className="fa-solid fa-building" />
        </div>

        <h1 className="mt-6 text-3xl font-bold text-slate-900 dark:text-white">
          Office Room Booking System
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Sign in to reserve rooms and bookable work
          areas, or create a new employee account.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Log In
          </Link>

          <Link
            href="/register"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Sign Up
          </Link>
        </div>

        <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
          <p className="font-semibold">
            Development accounts
          </p>

          <p className="mt-2">
            Super Admin, HR, Manager, and Employee
            accounts can sign in from the login page.
          </p>
        </div>
      </section>
    </main>
  );
}