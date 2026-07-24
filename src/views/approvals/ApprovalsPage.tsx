"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPendingApprovals,
  processBookingApproval,
} from "@/api/api-service";
import type {
  ApprovalAction,
  PendingApprovalBooking,
} from "@/models/approval";

type ApprovalStageFilter =
  | "ALL"
  | "PENDING_MANAGER"
  | "PENDING_HR";

type ApprovalDialogState = {
  booking: PendingApprovalBooking;
  action: ApprovalAction;
} | null;

const inputClassName =
  "w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-[#aaa08c] focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

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

function getStageLabel(
  status: PendingApprovalBooking["status"],
): string {
  if (status === "PENDING_MANAGER") {
    return "Manager Approval";
  }

  if (status === "PENDING_HR") {
    return "HR Approval";
  }

  return status.replaceAll("_", " ");
}

function getStageStyles(
  status: PendingApprovalBooking["status"],
): string {
  if (status === "PENDING_MANAGER") {
    return "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200";
  }

  if (status === "PENDING_HR") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function getResourceIcon(
  booking: PendingApprovalBooking,
) {
  if (
    [
      "MEETING_ROOM",
      "PRIVATE_ROOM",
      "TRAINING_ROOM",
    ].includes(booking.resource.type)
  ) {
    return <i className="fa-solid fa-door-open" />;
  }

  return <i className="fa-solid fa-chair" />;
}

function getEquipment(
  booking: PendingApprovalBooking,
): string[] {
  if (!Array.isArray(booking.requiredEquipment)) {
    return [];
  }

  return booking.requiredEquipment.filter(
    (item): item is string => typeof item === "string",
  );
}

export default function ApprovalsPage() {
  const [bookings, setBookings] = useState<
    PendingApprovalBooking[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  const [stageFilter, setStageFilter] =
    useState<ApprovalStageFilter>("ALL");

  const [dialog, setDialog] =
    useState<ApprovalDialogState>(null);

  const [comment, setComment] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [isProcessing, setIsProcessing] =
    useState(false);

  async function loadApprovals() {
    try {
      setIsLoading(true);
      setLoadError("");

      const records = await getPendingApprovals();

      setBookings(records);
    } catch (error) {
      console.error("Failed to load approvals:", error);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load pending approvals.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadApprovals();
  }, []);

  const filteredBookings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesStage =
        stageFilter === "ALL" ||
        booking.status === stageFilter;

      const matchesSearch =
        !normalizedSearch ||
        booking.bookingNumber
          .toLowerCase()
          .includes(normalizedSearch) ||
        booking.user.fullName
          .toLowerCase()
          .includes(normalizedSearch) ||
        booking.user.email
          .toLowerCase()
          .includes(normalizedSearch) ||
        booking.resource.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        booking.resource.code
          .toLowerCase()
          .includes(normalizedSearch) ||
        booking.reason
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStage && matchesSearch;
    });
  }, [bookings, search, stageFilter]);

  function openDialog(
    booking: PendingApprovalBooking,
    action: ApprovalAction,
  ) {
    setDialog({
      booking,
      action,
    });

    setComment("");
    setDialogError("");
  }

  function closeDialog() {
    if (isProcessing) {
      return;
    }

    setDialog(null);
    setComment("");
    setDialogError("");
  }

  async function handleDecision() {
    if (!dialog) {
      return;
    }

    if (
      dialog.action === "REJECT" &&
      !comment.trim()
    ) {
      setDialogError(
        "Please enter a reason for rejecting this booking.",
      );
      return;
    }

    if (comment.length > 500) {
      setDialogError(
        "The comment cannot exceed 500 characters.",
      );
      return;
    }

    try {
      setIsProcessing(true);
      setDialogError("");

      const result = await processBookingApproval(
        dialog.booking.id,
        {
          action: dialog.action,
          comment: comment.trim() || undefined,
        },
      );

      setBookings((currentBookings) => {
        if (result.status === "PENDING_HR") {
          return currentBookings.map((booking) =>
            booking.id === result.id
              ? {
                  ...booking,
                  status: "PENDING_HR",
                  updatedAt: result.updatedAt,
                }
              : booking,
          );
        }

        return currentBookings.filter(
          (booking) => booking.id !== result.id,
        );
      });

      window.alert(
        result.status === "PENDING_HR"
          ? "Manager approval completed. The request is now waiting for HR approval."
          : dialog.action === "APPROVE"
            ? "Booking approved successfully."
            : "Booking rejected successfully.",
      );

      closeDialog();
    } catch (error) {
      console.error(
        "Failed to process approval:",
        error,
      );

      setDialogError(
        error instanceof Error
          ? error.message
          : "Unable to process this approval.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const managerPendingCount = bookings.filter(
    (booking) =>
      booking.status === "PENDING_MANAGER",
  ).length;

  const hrPendingCount = bookings.filter(
    (booking) => booking.status === "PENDING_HR",
  ).length;

  return (
    <div className="mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-none border border-slate-200 bg-white shadow-none dark:border-slate-800 dark:bg-slate-900">
        <div className="relative bg-gradient-to-br from-[#c9d2bd] via-[#e8e3d3] to-[#f6efe2] px-1 py-6 dark:from-slate-950 dark:via-slate-900 dark:to-[#06070b] sm:px-1">
          <div className="absolute right-[-40px] top-[-40px] h-64 w-64 rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-500/10" />
          <div className="absolute bottom-[-60px] left-[-30px] h-72 w-72 rounded-full bg-[#87977b]/30 blur-3xl dark:bg-orange-500/10" />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#6d7a64] dark:text-slate-400">
                Approval Management
              </p>

              <h2 className="mt-5 text-5xl font-black tracking-tight text-white drop-shadow-none dark:text-white sm:text-6xl">
                Booking Approvals
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[#5e6558] dark:text-slate-300">
                Review workspace booking requests, check booking details,
                and approve or reject requests according to availability and
                workplace policy.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadApprovals()}
              disabled={isLoading}
              className="rounded-md border border-white/70 bg-white/70 px-5 py-3 text-sm font-bold text-slate-700 shadow-none backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <i className="fa-solid fa-rotate-right mr-2 text-[#c65f2e] dark:text-orange-300" />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-none dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Total Pending
          </p>

          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {bookings.length}
          </p>
        </div>

        <div className="rounded-lg border border-purple-200 bg-purple-50 p-6 dark:border-purple-900/60 dark:bg-purple-950/30">
          <p className="text-sm font-bold text-purple-700 dark:text-purple-200">
            Manager Approval
          </p>

          <p className="mt-3 text-4xl font-black text-purple-900 dark:text-purple-100">
            {managerPendingCount}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/60 dark:bg-amber-950/30">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-200">
            HR Approval
          </p>

          <p className="mt-3 text-4xl font-black text-amber-900 dark:text-amber-100">
            {hrPendingCount}
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-7 shadow-none dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <div>
            <label
              htmlFor="approval-search"
              className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
            >
              Search
            </label>

            <input
              id="approval-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search booking, employee or resource"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="stage-filter"
              className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
            >
              Approval stage
            </label>

            <select
              id="stage-filter"
              value={stageFilter}
              onChange={(event) =>
                setStageFilter(
                  event.target
                    .value as ApprovalStageFilter,
                )
              }
              className={inputClassName}
            >
              <option value="ALL">All stages</option>

              <option value="PENDING_MANAGER">
                Manager approval
              </option>

              <option value="PENDING_HR">
                HR approval
              </option>
            </select>
          </div>
        </div>
      </section>

      {isLoading && (
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-12 text-center shadow-none dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e] dark:border-slate-700 dark:border-t-orange-300" />

          <p className="mt-5 font-bold text-slate-700 dark:text-slate-300">
            Loading pending approvals...
          </p>
        </section>
      )}

      {!isLoading && loadError && (
        <section className="mt-8 rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/60 dark:bg-red-950/40">
          <div className="text-4xl">⚠️</div>

          <h3 className="mt-4 text-lg font-bold text-red-900 dark:text-red-200">
            Unable to load approvals
          </h3>

          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() => void loadApprovals()}
            className="mt-6 rounded-md bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </section>
      )}

      {!isLoading &&
        !loadError &&
        filteredBookings.length === 0 && (
          <section className="mt-8 rounded-lg border border-slate-200 bg-white p-12 text-center shadow-none dark:border-slate-800 dark:bg-slate-900">
            <div className="text-5xl">✅</div>

            <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
              No pending approvals
            </h3>

            <p className="mt-2 text-slate-500 dark:text-slate-400">
              There are no booking requests matching the selected filters.
            </p>
          </section>
        )}

      {!isLoading &&
        !loadError &&
        filteredBookings.length > 0 && (
          <section className="mt-8 space-y-5">
            {filteredBookings.map((booking) => {
              const equipment = getEquipment(booking);

              return (
                <article
                  key={booking.id}
                  className="rounded-lg border border-slate-200 bg-white p-7 shadow-none dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-pink-100 text-2xl text-pink-500 dark:bg-pink-500/20 dark:text-pink-300">
                        {getResourceIcon(booking)}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-black text-slate-900 dark:text-white">
                            {booking.resource.name}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getStageStyles(
                              booking.status,
                            )}`}
                          >
                            {getStageLabel(
                              booking.status,
                            )}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {
                            booking.resource.floor.office
                              .name
                          }{" "}
                          · {booking.resource.floor.name} ·{" "}
                          {booking.resource.code}
                        </p>

                        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                          <span className="font-bold">
                            Requested by:
                          </span>{" "}
                          {booking.user.fullName}
                        </p>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {booking.user.employeeCode ??
                            "No employee code"}{" "}
                          · {booking.user.email}
                        </p>
                      </div>
                    </div>

                    <div className="lg:text-right">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Booking reference
                      </p>

                      <p className="mt-1 font-black text-slate-900 dark:text-white">
                        {booking.bookingNumber}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-950">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Date
                      </dt>

                      <dd className="mt-2 font-bold text-slate-900 dark:text-white">
                        {formatDate(booking.startAt)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Time
                      </dt>

                      <dd className="mt-2 font-bold text-slate-900 dark:text-white">
                        {formatTime(booking.startAt)} –{" "}
                        {formatTime(booking.endAt)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Attendees
                      </dt>

                      <dd className="mt-2 font-bold text-slate-900 dark:text-white">
                        {booking.attendeeCount}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Department
                      </dt>

                      <dd className="mt-2 font-bold text-slate-900 dark:text-white">
                        {booking.user.department?.name ??
                          "Not assigned"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Booking reason
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#676b60] dark:text-slate-400">
                      {booking.reason}
                    </p>
                  </div>

                  {equipment.length > 0 && (
                    <div className="mt-5">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Required equipment
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {equipment.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-[#eef0e2] px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {booking.notes && (
                    <div className="mt-5 rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Additional notes
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[#676b60] dark:text-slate-400">
                        {booking.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        openDialog(
                          booking,
                          "REJECT",
                        )
                      }
                      className="rounded-md border border-red-300 bg-white px-5 py-3 font-bold text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openDialog(
                          booking,
                          "APPROVE",
                        )
                      }
                      className="rounded-md bg-[#c65f2e] px-5 py-3 font-bold text-white transition hover:bg-[#a94f26] dark:bg-orange-500 dark:hover:bg-orange-600"
                    >
                      Approve
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <p
                  className={`text-sm font-bold ${
                    dialog.action === "APPROVE"
                      ? "text-[#c65f2e] dark:text-orange-300"
                      : "text-red-600 dark:text-red-300"
                  }`}
                >
                  {dialog.action === "APPROVE"
                    ? "Approve booking"
                    : "Reject booking"}
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {
                    dialog.booking
                      .bookingNumber
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={isProcessing}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-white disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </header>

            <div className="px-6 py-6">
              <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <p className="font-black text-slate-900 dark:text-white">
                  {dialog.booking.resource.name}
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Requested by{" "}
                  {dialog.booking.user.fullName}
                </p>

                <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                  {formatDate(
                    dialog.booking.startAt,
                  )}{" "}
                  ·{" "}
                  {formatTime(
                    dialog.booking.startAt,
                  )}{" "}
                  –{" "}
                  {formatTime(
                    dialog.booking.endAt,
                  )}
                </p>
              </div>

              <label
                htmlFor="approval-comment"
                className="mt-6 block text-sm font-bold text-slate-700 dark:text-slate-300"
              >
                {dialog.action === "REJECT"
                  ? "Rejection reason"
                  : "Approval comment"}{" "}
                {dialog.action === "REJECT" && (
                  <span className="text-red-500">
                    *
                  </span>
                )}
              </label>

              <textarea
                id="approval-comment"
                value={comment}
                onChange={(event) =>
                  setComment(event.target.value)
                }
                maxLength={500}
                rows={5}
                placeholder={
                  dialog.action === "REJECT"
                    ? "Explain why this booking is being rejected."
                    : "Optional approval comment."
                }
                className={`${inputClassName} mt-2 resize-none`}
              />

              <p className="mt-2 text-right text-xs text-[#9b927f] dark:text-slate-500">
                {comment.length}/500
              </p>

              {dialogError && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {dialogError}
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={closeDialog}
                disabled={isProcessing}
                className="rounded-md border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleDecision()
                }
                disabled={isProcessing}
                className={`rounded-md px-6 py-3 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  dialog.action === "APPROVE"
                    ? "bg-[#c65f2e] hover:bg-[#a94f26] dark:bg-orange-500 dark:hover:bg-orange-600"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isProcessing
                  ? "Processing..."
                  : dialog.action === "APPROVE"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}