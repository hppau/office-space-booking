import Link from "next/link";
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <section className="w-full max-w-4xl rounded-3xl bg-white px-8 py-14 text-center shadow-lg sm:px-14">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white">
          🏢
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Office Management System
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Office Space Booking
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Reserve desks, meeting rooms and shared office spaces through an
          interactive floor plan.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Sign In
          </Link>

          <button
            type="button"
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View Available Spaces
          </button>
        </div>

        <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 p-5">
            <div className="text-2xl">🪑</div>
            <h2 className="mt-3 font-semibold text-slate-900">
              Book Workspaces
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Select available desks, chairs and office areas.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 p-5">
            <div className="text-2xl">📅</div>
            <h2 className="mt-3 font-semibold text-slate-900">
              Choose Date and Time
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Submit the booking date, duration and reason.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 p-5">
            <div className="text-2xl">✅</div>
            <h2 className="mt-3 font-semibold text-slate-900">
              Receive Approval
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Get booking approval or rejection notifications by email.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}