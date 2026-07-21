"use client";

import { FormEvent, useState } from "react";
import { createBooking } from "@/api/api-service";
import type { CreatedBooking } from "@/models/booking";

type BookingSpace = {
  id: number;
  name: string;
  type: "DESK" | "MEETING_ROOM";
  capacity: number;
  location: string;
  amenities: string[];
};

type BookingDetailsFormProps = {
  space: BookingSpace;
  office: string;
  floor: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  onClose: () => void;
};

function getStatusLabel(status: CreatedBooking["status"]) {
  switch (status) {
    case "PENDING_MANAGER":
      return "Pending manager approval";

    case "PENDING_HR":
      return "Pending HR approval";

    case "APPROVED":
      return "Approved";

    default:
      return status.replaceAll("_", " ");
  }
}

export default function BookingDetailsForm({
  space,
  office,
  floor,
  bookingDate,
  startTime,
  endTime,
  onClose,
}: BookingDetailsFormProps) {
  const [reason, setReason] = useState("");
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdBooking, setCreatedBooking] =
    useState<CreatedBooking | null>(null);

  const equipmentOptions = [
    "Monitor",
    "Docking Station",
    "Projector",
    "Whiteboard",
    "Video Conference",
  ];

  function handleEquipmentChange(item: string) {
    setEquipment((currentEquipment) => {
      if (currentEquipment.includes(item)) {
        return currentEquipment.filter(
          (equipmentItem) => equipmentItem !== item,
        );
      }

      return [...currentEquipment, item];
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitError("");

    if (!reason.trim()) {
      setSubmitError("Please enter a booking reason.");
      return;
    }

    if (attendeeCount < 1) {
      setSubmitError(
        "The number of attendees must be at least 1.",
      );
      return;
    }

    if (attendeeCount > space.capacity) {
      setSubmitError(
        `This space has a maximum capacity of ${space.capacity}.`,
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const booking = await createBooking({
        resourceId: space.id,
        bookingDate,
        startTime,
        endTime,
        reason: reason.trim(),
        attendeeCount,
        requiredEquipment: equipment,
        notes: notes.trim() || undefined,
      });

      setCreatedBooking(booking);
    } catch (error) {
      console.error("Booking submission failed:", error);

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to submit the booking request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (createdBooking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-8">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            ✅
          </div>

          <h2 className="mt-6 text-2xl font-bold text-slate-900">
            Booking request submitted
          </h2>

          <p className="mt-3 leading-7 text-slate-600">
            Your request for{" "}
            <span className="font-semibold text-slate-900">
              {space.name}
            </span>{" "}
            has been saved successfully.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-left">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">
                  Booking reference
                </dt>

                <dd className="font-semibold text-slate-900">
                  {createdBooking.bookingNumber}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Status</dt>

                <dd className="text-right font-semibold text-amber-600">
                  {getStatusLabel(createdBooking.status)}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Space</dt>

                <dd className="font-medium text-slate-900">
                  {space.name}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Date</dt>

                <dd className="font-medium text-slate-900">
                  {bookingDate}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Time</dt>

                <dd className="font-medium text-slate-900">
                  {startTime} – {endTime}
                </dd>
              </div>
            </dl>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-500">
            HR or Management will review the request. Email
            notifications will be connected in a later step.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-7 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            Close
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-8">
      <div className="flex min-h-full items-center justify-center">
        <section className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
          <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5 sm:px-8">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Booking request
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Complete Booking Details
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Review the selected space and provide the booking
                information.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close booking form"
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ×
            </button>
          </header>

          <form onSubmit={handleSubmit}>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-6 sm:px-8">
              <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-2xl text-white">
                    {space.type === "DESK" ? "🪑" : "🚪"}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {space.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {office} · {floor} · {space.location}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-slate-500">Date</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {bookingDate}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">Time</dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {startTime} – {endTime}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Capacity
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {space.capacity}
                    </dd>
                  </div>
                </dl>
              </section>

              {submitError && (
                <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {submitError}
                </div>
              )}

              <div className="mt-6">
                <label
                  htmlFor="booking-reason"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Booking reason{" "}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  id="booking-reason"
                  type="text"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  maxLength={250}
                  required
                  placeholder="Example: Project meeting with the engineering team"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-2 text-right text-xs text-slate-400">
                  {reason.length}/250
                </p>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="attendee-count"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Number of attendees
                </label>

                <input
                  id="attendee-count"
                  type="number"
                  min={1}
                  max={space.capacity}
                  value={attendeeCount}
                  onChange={(event) =>
                    setAttendeeCount(
                      Number(event.target.value),
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Maximum capacity: {space.capacity}
                </p>
              </div>

              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-slate-700">
                  Required equipment
                </legend>

                <p className="mt-1 text-sm text-slate-500">
                  Select any additional equipment required for
                  this booking.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {equipmentOptions.map((item) => (
                    <label
                      key={item}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={equipment.includes(item)}
                        onChange={() =>
                          handleEquipmentChange(item)
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />

                      <span className="text-sm font-medium text-slate-700">
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-6">
                <label
                  htmlFor="booking-notes"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Additional notes
                </label>

                <textarea
                  id="booking-notes"
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  maxLength={1000}
                  rows={5}
                  placeholder="Enter any special arrangements or additional information."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-2 text-right text-xs text-slate-400">
                  {notes.length}/1000
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-semibold text-amber-900">
                  Approval required
                </h3>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  This request will be sent to HR or Management
                  for review. The booking is not confirmed until
                  it is approved.
                </p>
              </div>
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {isSubmitting
                  ? "Submitting..."
                  : "Submit Booking Request"}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </div>
  );
}