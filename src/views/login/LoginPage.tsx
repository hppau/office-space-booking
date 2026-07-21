"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  success: boolean;
  message: string;
  data?: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState(
    "employee@officebooking.local",
  );

  const [password, setPassword] =
    useState("Password123!");

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const result =
        (await response.json()) as LoginResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to sign in.",
        );
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white">
            🏢
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Office Space Booking
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in using your company account.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-slate-700"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="mt-5">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">
          <p>
            Employee: employee@officebooking.local
          </p>

          <p>
            Manager: manager@officebooking.local
          </p>

          <p>HR: hr@officebooking.local</p>

          <p>Admin: admin@officebooking.local</p>

          <p className="mt-2 font-semibold">
            Development password: Password123!
          </p>
        </div>
      </section>
    </main>
  );
}