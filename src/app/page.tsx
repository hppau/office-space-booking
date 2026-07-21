export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white">
          <i className="fa-solid fa-building" />
        </div>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Office Space Booking System
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Please log in to continue, or create a new employee account.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <a
            href="/login"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Log In
          </a>

          <a
            href="/register"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Sign Up
          </a>
        </div>

        <div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left text-sm text-blue-800">
          <p className="font-semibold">Demo accounts</p>

          <p className="mt-2">
            Admin, HR, Manager, and Employee demo users can still log in
            from the login page.
          </p>
        </div>
      </section>
    </main>
  );
}