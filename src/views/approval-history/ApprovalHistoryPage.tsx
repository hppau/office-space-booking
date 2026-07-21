"use client";

import { useEffect, useMemo, useState } from "react";
import { getApprovalHistory } from "@/api/api-service";
import type { ApprovalHistoryRecord } from "@/models/approval-history";

type DecisionFilter = "ALL" | "APPROVED" | "REJECTED";

const inputClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition placeholder:text-[#aaa08c] focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

function formatDate(dateValue: string): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore",
  }).format(new Date(dateValue));
}

function formatTime(dateValue: string): string {
  return new Intl.DateTimeFormat("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Singapore",
  }).format(new Date(dateValue));
}

function getDecisionStyles(decision: string): string {
  if (decision === "APPROVED") {
    return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200";
  }

  if (decision === "REJECTED") {
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export default function ApprovalHistoryPage() {
  const [records, setRecords] = useState<ApprovalHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [decisionFilter, setDecisionFilter] =
    useState<DecisionFilter>("ALL");

  useEffect(() => {
    async function loadHistory() {
      try {
        setIsLoading(true);
        setLoadError("");

        const data = await getApprovalHistory();

        setRecords(data);
      } catch (error) {
        console.error("Failed to load approval history:", error);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load approval history.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadHistory();
  }, []);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesDecision =
        decisionFilter === "ALL" ||
        record.decision === decisionFilter;

      const matchesSearch =
        !normalizedSearch ||
        record.booking.bookingNumber
          .toLowerCase()
          .includes(normalizedSearch) ||
        record.booking.user.fullName
          .toLowerCase()
          .includes(normalizedSearch) ||
        record.booking.resource.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        record.booking.resource.code
          .toLowerCase()
          .includes(normalizedSearch) ||
        record.approver.fullName
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesDecision && matchesSearch;
    });
  }, [records, search, decisionFilter]);

  const approvedCount = records.filter(
    (record) => record.decision === "APPROVED",
  ).length;

  const rejectedCount = records.filter(
    (record) => record.decision === "REJECTED",
  ).length;

  return (
    <div className="mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-[2.5rem] border border-[#d8d0bf] bg-[#e7e3d2] shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative bg-gradient-to-br from-[#c9d2bd] via-[#e8e3d3] to-[#f6efe2] px-8 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-[#06070b] sm:px-12">
          <div className="absolute right-[-40px] top-[-40px] h-64 w-64 rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-500/10" />
          <div className="absolute bottom-[-60px] left-[-30px] h-72 w-72 rounded-full bg-[#87977b]/30 blur-3xl dark:bg-orange-500/10" />

          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#6d7a64] dark:text-slate-400">
              Approval Management
            </p>

            <h2 className="mt-5 text-5xl font-black tracking-tight text-white drop-shadow-sm dark:text-white sm:text-6xl">
              Approval History
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[#5e6558] dark:text-slate-300">
              View completed approval decisions, reviewer details, booking
              information, and previous approval comments.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-3">
        <div className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-[#74786d] dark:text-slate-400">
            Total Records
          </p>

          <p className="mt-3 text-4xl font-black text-[#3f463b] dark:text-white">
            {records.length}
          </p>
        </div>

        <div className="rounded-[2rem] border border-green-200 bg-green-50 p-6 dark:border-green-900/60 dark:bg-green-950/30">
          <p className="text-sm font-bold text-green-700 dark:text-green-200">
            Approved
          </p>

          <p className="mt-3 text-4xl font-black text-green-900 dark:text-green-100">
            {approvedCount}
          </p>
        </div>

        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-sm font-bold text-red-700 dark:text-red-200">
            Rejected
          </p>

          <p className="mt-3 text-4xl font-black text-red-900 dark:text-red-100">
            {rejectedCount}
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div>
            <label
              htmlFor="approval-history-search"
              className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
            >
              Search
            </label>

            <input
              id="approval-history-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search booking, employee, resource or approver"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="decision-filter"
              className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
            >
              Decision
            </label>

            <select
              id="decision-filter"
              value={decisionFilter}
              onChange={(event) =>
                setDecisionFilter(event.target.value as DecisionFilter)
              }
              className={inputClassName}
            >
              <option value="ALL">All decisions</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </section>

      {isLoading && (
        <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e] dark:border-slate-700 dark:border-t-orange-300" />

          <p className="mt-5 font-bold text-[#5f6658] dark:text-slate-300">
            Loading approval history...
          </p>
        </section>
      )}

      {!isLoading && loadError && (
        <section className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/60 dark:bg-red-950/40">
          <h3 className="text-lg font-bold text-red-900 dark:text-red-200">
            Unable to load approval history
          </h3>

          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {loadError}
          </p>
        </section>
      )}

      {!isLoading && !loadError && filteredRecords.length === 0 && (
        <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-5xl">📋</div>

          <h3 className="mt-5 text-xl font-black text-[#3f463b] dark:text-white">
            No approval history found
          </h3>

          <p className="mt-2 text-[#74786d] dark:text-slate-400">
            There are no approved or rejected records matching your filters.
          </p>
        </section>
      )}

      {!isLoading && !loadError && filteredRecords.length > 0 && (
        <section className="mt-8 space-y-5">
          {filteredRecords.map((record) => (
            <article
              key={record.id}
              className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-black text-[#3f463b] dark:text-white">
                      {record.booking.resource.name}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${getDecisionStyles(
                        record.decision,
                      )}`}
                    >
                      {record.decision}
                    </span>

                    <span className="rounded-full bg-[#eef0e2] px-3 py-1 text-xs font-bold text-[#74786d] dark:bg-slate-800 dark:text-slate-300">
                      {record.stage}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-[#74786d] dark:text-slate-400">
                    {record.booking.resource.floor.office.name} ·{" "}
                    {record.booking.resource.floor.name} ·{" "}
                    {record.booking.resource.code}
                  </p>

                  <p className="mt-3 text-sm text-[#5f6658] dark:text-slate-300">
                    <span className="font-bold">Requested by:</span>{" "}
                    {record.booking.user.fullName}
                  </p>

                  <p className="mt-1 text-sm text-[#74786d] dark:text-slate-400">
                    {record.booking.user.employeeCode ?? "No employee code"} ·{" "}
                    {record.booking.user.email}
                  </p>
                </div>

                <div className="lg:text-right">
                  <p className="text-sm text-[#74786d] dark:text-slate-400">
                    Booking reference
                  </p>

                  <p className="mt-1 font-black text-[#3f463b] dark:text-white">
                    {record.booking.bookingNumber}
                  </p>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 rounded-[2rem] border border-[#ded6c7] bg-[#fffdf6] p-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                    Booking Date
                  </dt>

                  <dd className="mt-2 font-bold text-[#3f463b] dark:text-white">
                    {formatDate(record.booking.startAt)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                    Booking Time
                  </dt>

                  <dd className="mt-2 font-bold text-[#3f463b] dark:text-white">
                    {formatTime(record.booking.startAt)} –{" "}
                    {formatTime(record.booking.endAt)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                    Decided By
                  </dt>

                  <dd className="mt-2 font-bold text-[#3f463b] dark:text-white">
                    {record.approver.fullName}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                    Decided On
                  </dt>

                  <dd className="mt-2 font-bold text-[#3f463b] dark:text-white">
                    {formatDate(record.decidedAt)}
                  </dd>
                </div>
              </dl>

              <div className="mt-5">
                <p className="text-sm font-bold text-[#5f6658] dark:text-slate-300">
                  Booking reason
                </p>

                <p className="mt-2 text-sm leading-6 text-[#676b60] dark:text-slate-400">
                  {record.booking.reason}
                </p>
              </div>

              {record.comment && (
                <div className="mt-5 rounded-2xl border border-[#ded6c7] bg-[#fffdf6] p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-sm font-bold text-[#5f6658] dark:text-slate-300">
                    Approval comment
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#676b60] dark:text-slate-400">
                    {record.comment}
                  </p>
                </div>
              )}

              {record.booking.rejectionReason && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40">
                  <p className="text-sm font-bold text-red-800 dark:text-red-200">
                    Rejection reason
                  </p>

                  <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                    {record.booking.rejectionReason}
                  </p>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}