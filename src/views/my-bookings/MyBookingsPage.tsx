"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  cancelBooking,
  getMyBookings,
} from "@/api/api-service";
import type {
  BookingRecord,
  BookingStatus,
} from "@/models/booking";

type StatusFilter = "ALL" | BookingStatus;

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

function getStatusLabel(status: BookingStatus): string {
  switch (status) {
    case "PENDING_MANAGER":
      return "Pending Manager";

    case "PENDING_HR":
      return "Pending HR";

    case "APPROVED":
      return "Approved";

    case "REJECTED":
      return "Rejected";

    case "CANCELLED":
      return "Cancelled";

    case "CHECKED_IN":
      return "Checked In";

    case "COMPLETED":
      return "Completed";

    case "NO_SHOW":
      return "No Show";

    case "DRAFT":
      return "Draft";
  }
}

function getStatusStyles(status: BookingStatus): string {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700";

    case "PENDING_MANAGER":
    case "PENDING_HR":
      return "bg-amber-100 text-amber-700";

    case "REJECTED":
      return "bg-red-100 text-red-700";

    case "CANCELLED":
      return "bg-slate-200 text-slate-600";

    case "CHECKED_IN":
      return "bg-blue-100 text-blue-700";

    case "COMPLETED":
      return "bg-indigo-100 text-indigo-700";

    case "NO_SHOW":
      return "bg-orange-100 text-orange-700";

    case "DRAFT":
      return "bg-slate-100 text-slate-700";
  }
}

function getResourceIcon(booking: BookingRecord): string {
  if (
    [
      "MEETING_ROOM",
      "PRIVATE_ROOM",
      "TRAINING_ROOM",
    ].includes(booking.resource.type)
  ) {
    return "🚪";
  }

  return "🪑";
}

function getEquipment(booking: BookingRecord): string[] {
  if (!Array.isArray(booking.requiredEquipment)) {
    return [];
  }

  return booking.requiredEquipment.filter(
    (item): item is string => typeof item === "string",
  );
}

function canCancelBooking(booking: BookingRecord): boolean {
  return [
    "PENDING_MANAGER",
    "PENDING_HR",
    "APPROVED",
  ].includes(booking.status);
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const [cancelBookingId, setCancelBookingId] = useState<
    number | null
  >(null);

  const [cancellationReason, setCancellationReason] =
    useState("");

  const [cancelError, setCancelError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    async function loadBookings() {
      try {
        setIsLoading(true);
        setLoadError("");

        const records = await getMyBookings();

        setBookings(records);
      } catch (error) {
        console.error("Failed to load bookings:", error);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load bookings.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        booking.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        booking.bookingNumber
          .toLowerCase()
          .includes(normalizedSearch) ||
        booking.resource.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        booking.resource.code
          .toLowerCase()
          .includes(normalizedSearch) ||
        booking.reason.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, search, statusFilter]);

  const bookingBeingCancelled =
    bookings.find((booking) => booking.id === cancelBookingId) ??
    null;

  function openCancelDialog(bookingId: number) {
    setCancelBookingId(bookingId);
    setCancellationReason("");
    setCancelError("");
  }

  function closeCancelDialog() {
    if (isCancelling) {
      return;
    }

    setCancelBookingId(null);
    setCancellationReason("");
    setCancelError("");
  }

  async function handleCancelBooking() {
    if (!cancelBookingId) {
      return;
    }

    if (!cancellationReason.trim()) {
      setCancelError("Please enter a cancellation reason.");
      return;
    }

    if (cancellationReason.length > 500) {
      setCancelError(
        "Cancellation reason cannot exceed 500 characters.",
      );
      return;
    }

    try {
      setIsCancelling(true);
      setCancelError("");

      const result = await cancelBooking(cancelBookingId, {
        cancellationReason: cancellationReason.trim(),
      });

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === result.id
            ? {
                ...booking,
                status: "CANCELLED",
                cancellationReason: result.cancellationReason,
                updatedAt: result.updatedAt,
              }
            : booking,
        ),
      );

      setCancelBookingId(null);
      setCancellationReason("");
    } catch (error) {
      setCancelError(
        error instanceof Error
          ? error.message
          : "Unable to cancel booking.",
      );
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Booking management
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            My Bookings
          </h2>

          <p className="mt-2 text-slate-600">
            View your submitted, approved, rejected, cancelled and
            completed bookings.
          </p>
        </div>

        <Link
          href="/book"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          + New Booking
        </Link>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div>
            <label
              htmlFor="booking-search"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Search
            </label>

            <input
              id="booking-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search booking number, resource or reason"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="status-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Status
            </label>

            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as StatusFilter,
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">All statuses</option>
              <option value="PENDING_MANAGER">
                Pending Manager
              </option>
              <option value="PENDING_HR">Pending HR</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="COMPLETED">Completed</option>
              <option value="NO_SHOW">No Show</option>
            </select>
          </div>
        </div>
      </section>

      {isLoading && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-5 font-medium text-slate-700">
            Loading your bookings...
          </p>
        </section>
      )}

      {!isLoading && loadError && (
        <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="text-4xl">⚠️</div>

          <h3 className="mt-4 text-lg font-semibold text-red-900">
            Unable to load bookings
          </h3>

          <p className="mt-2 text-sm text-red-700">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </section>
      )}

      {!isLoading &&
        !loadError &&
        filteredBookings.length === 0 && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="text-5xl">📅</div>

            <h3 className="mt-5 text-xl font-semibold text-slate-900">
              No bookings found
            </h3>

            <p className="mt-2 text-slate-500">
              You do not have any bookings matching the selected
              filters.
            </p>

            <Link
              href="/book"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Book a Space
            </Link>
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
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                        {getResourceIcon(booking)}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold text-slate-900">
                            {booking.resource.name}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(
                              booking.status,
                            )}`}
                          >
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {booking.resource.floor.office.name} ·{" "}
                          {booking.resource.floor.name} ·{" "}
                          {booking.resource.code}
                        </p>

                        <p className="mt-3 text-sm text-slate-700">
                          <span className="font-semibold">
                            Reason:
                          </span>{" "}
                          {booking.reason}
                        </p>
                      </div>
                    </div>

                    <div className="lg:text-right">
                      <p className="text-sm text-slate-500">
                        Booking reference
                      </p>

                      <p className="mt-1 font-bold text-slate-900">
                        {booking.bookingNumber}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Date
                      </dt>

                      <dd className="mt-2 font-semibold text-slate-900">
                        {formatDate(booking.startAt)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Time
                      </dt>

                      <dd className="mt-2 font-semibold text-slate-900">
                        {formatTime(booking.startAt)} –{" "}
                        {formatTime(booking.endAt)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Attendees
                      </dt>

                      <dd className="mt-2 font-semibold text-slate-900">
                        {booking.attendeeCount}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Submitted
                      </dt>

                      <dd className="mt-2 font-semibold text-slate-900">
                        {formatDate(booking.createdAt)}
                      </dd>
                    </div>
                  </dl>

                  {equipment.length > 0 && (
                    <div className="mt-5">
                      <p className="text-sm font-semibold text-slate-700">
                        Required equipment
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {equipment.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {booking.notes && (
                    <div className="mt-5 rounded-xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-700">
                        Additional notes
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {booking.notes}
                      </p>
                    </div>
                  )}

                  {booking.rejectionReason && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-semibold text-red-800">
                        Rejection reason
                      </p>

                      <p className="mt-2 text-sm text-red-700">
                        {booking.rejectionReason}
                      </p>
                    </div>
                  )}

                  {booking.cancellationReason && (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-700">
                        Cancellation reason
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {booking.cancellationReason}
                      </p>
                    </div>
                  )}

                  {canCancelBooking(booking) && (
                    <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">
                      <button
                        type="button"
                        onClick={() => openCancelDialog(booking.id)}
                        className="rounded-xl border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}

      {cancelBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <section className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-sm font-semibold text-red-600">
                  Cancel booking
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Confirm cancellation
                </h2>

                {bookingBeingCancelled && (
                  <p className="mt-1 text-sm text-slate-500">
                    {bookingBeingCancelled.bookingNumber} ·{" "}
                    {bookingBeingCancelled.resource.name}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={closeCancelDialog}
                disabled={isCancelling}
                aria-label="Close cancellation dialog"
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </header>

            <div className="px-6 py-6">
              <p className="text-sm leading-6 text-slate-600">
                Please enter the reason for cancelling this booking.
                This reason will be saved in the booking history.
              </p>

              <label
                htmlFor="cancellation-reason"
                className="mt-6 block text-sm font-semibold text-slate-700"
              >
                Cancellation reason{" "}
                <span className="text-red-500">*</span>
              </label>

              <textarea
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(event) =>
                  setCancellationReason(event.target.value)
                }
                maxLength={500}
                rows={5}
                placeholder="Example: Meeting was cancelled / I no longer need the space."
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-right text-xs text-slate-400">
                {cancellationReason.length}/500
              </p>

              {cancelError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {cancelError}
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCancelDialog}
                disabled={isCancelling}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Keep Booking
              </button>

              <button
                type="button"
                onClick={() => void handleCancelBooking()}
                disabled={isCancelling}
                className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
              >
                {isCancelling
                  ? "Cancelling..."
                  : "Confirm Cancellation"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}