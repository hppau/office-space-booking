import Link from "next/link";

type AccessDeniedProps = {
  title?: string;
  message?: string;
};

export default function AccessDenied({
  title = "Access denied",
  message = "You do not have permission to view this page.",
}: AccessDeniedProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-3xl border border-red-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
          🚫
        </div>

        <h1 className="mt-6 text-2xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-3 leading-7 text-slate-600">
          {message}
        </p>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Back to Dashboard
        </Link>
      </section>
    </div>
  );
}