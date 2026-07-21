"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RegisterApiResponse = {
  success: boolean;
  message: string;
  data?: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
};

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
          confirmPassword,
        }),
      });

      const result = (await response.json()) as RegisterApiResponse;

      if (!result.success) {
        setErrorMessage(result.message || "Unable to create account.");
        return;
      }

      setSuccessMessage(result.message || "Account created successfully.");

      window.setTimeout(() => {
        router.push("/login");
      }, 1200);
    } catch (error) {
      console.error("Register failed:", error);
      setErrorMessage("Unable to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white">
            <i className="fa-solid fa-user-plus" />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Create Account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign up as a new employee user.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleRegister} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="full-name"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Full Name
            </label>

            <input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter full name"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="employee2@officebooking.local"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Confirm Password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter password"
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            Back to login
          </a>
        </div>
      </section>
    </main>
  );
}