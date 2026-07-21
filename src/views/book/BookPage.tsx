"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getResources,
  getUnavailableBookings,
} from "@/api/api-service";
import type { OfficeResource } from "@/models/resource";
import type { UnavailableBooking } from "@/models/booking-availability";
import type { BookingMapSpace } from "@/models/booking-map";
import BookingDetailsForm from "./BookingDetailsForm";
import BookingMapSelector from "./components/BookingMapSelector";

type SpaceDisplayStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "MAINTENANCE";

const inputClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

function getDisplayStatus(
  resource: OfficeResource,
  unavailableResourceIds: Set<number>,
): SpaceDisplayStatus {
  if (resource.status === "MAINTENANCE") {
    return "MAINTENANCE";
  }

  if (
    resource.status === "BLOCKED" ||
    resource.status === "INACTIVE"
  ) {
    return "BOOKED";
  }

  if (unavailableResourceIds.has(resource.id)) {
    return "BOOKED";
  }

  return "AVAILABLE";
}

function getAmenities(
  resource: OfficeResource,
): string[] {
  if (!Array.isArray(resource.amenities)) {
    return [];
  }

  return resource.amenities.filter(
    (item): item is string =>
      typeof item === "string",
  );
}

function isRoomType(
  resource: OfficeResource,
): boolean {
  return [
    "MEETING_ROOM",
    "PRIVATE_ROOM",
    "TRAINING_ROOM",
    "OTHER",
  ].includes(resource.type);
}

function getResourceTypeLabel(
  resource: OfficeResource,
): string {
  switch (resource.type) {
    case "MEETING_ROOM":
      return "Meeting room";

    case "PRIVATE_ROOM":
      return "Private room";

    case "TRAINING_ROOM":
      return "Training room";

    case "HOT_DESK":
      return "Shared working area";

    case "DESK":
      return "Working area";

    case "CHAIR":
      return "Seating area";

    case "OTHER":
      return "Office area";

    default:
      return "Bookable area";
  }
}

function getTodayDate(): string {
  const today = new Date();
  const timezoneOffset =
    today.getTimezoneOffset() * 60_000;

  return new Date(
    today.getTime() - timezoneOffset,
  )
    .toISOString()
    .split("T")[0];
}

function formatBookingDate(
  bookingDate: string,
): string {
  if (!bookingDate) {
    return "Not selected";
  }

  const parsedDate = new Date(
    `${bookingDate}T00:00:00`,
  );

  if (Number.isNaN(parsedDate.getTime())) {
    return bookingDate;
  }

  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

export default function BookSpacePage() {
  const selectedSpacePanelRef =
    useRef<HTMLElement | null>(null);

  const [resources, setResources] = useState<
    OfficeResource[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [bookingDate, setBookingDate] =
    useState("");

  const [startTime, setStartTime] =
    useState("09:00");

  const [endTime, setEndTime] =
    useState("17:00");

  const [selectedSpaceId, setSelectedSpaceId] =
    useState<number | null>(null);

  const [showBookingForm, setShowBookingForm] =
    useState(false);

  const [
    unavailableBookings,
    setUnavailableBookings,
  ] = useState<UnavailableBooking[]>([]);

  const [
    isCheckingAvailability,
    setIsCheckingAvailability,
  ] = useState(false);

  const [
    availabilityError,
    setAvailabilityError,
  ] = useState("");

  useEffect(() => {
    async function loadResources() {
      try {
        setIsLoading(true);
        setLoadError("");

        const records = await getResources();

        setResources(records);
      } catch (error) {
        console.error(
          "Failed to load resources:",
          error,
        );

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load bookable areas.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadResources();
  }, []);

  useEffect(() => {
    async function loadUnavailableBookings() {
      if (
        !bookingDate ||
        !startTime ||
        !endTime
      ) {
        setUnavailableBookings([]);
        setAvailabilityError("");
        return;
      }

      if (startTime >= endTime) {
        setUnavailableBookings([]);
        setAvailabilityError(
          "End time must be later than start time.",
        );
        return;
      }

      try {
        setIsCheckingAvailability(true);
        setAvailabilityError("");

        const records =
          await getUnavailableBookings(
            bookingDate,
            startTime,
            endTime,
          );

        setUnavailableBookings(records);

        if (
          selectedSpaceId &&
          records.some(
            (record) =>
              record.resourceId ===
              selectedSpaceId,
          )
        ) {
          setSelectedSpaceId(null);
          setShowBookingForm(false);
        }
      } catch (error) {
        console.error(
          "Failed to check availability:",
          error,
        );

        setAvailabilityError(
          error instanceof Error
            ? error.message
            : "Unable to check availability.",
        );
      } finally {
        setIsCheckingAvailability(false);
      }
    }

    void loadUnavailableBookings();
  }, [
    bookingDate,
    startTime,
    endTime,
    selectedSpaceId,
  ]);

  const unavailableResourceIds =
    useMemo(() => {
      return new Set(
        unavailableBookings.map(
          (booking) => booking.resourceId,
        ),
      );
    }, [unavailableBookings]);

  const selectedSpace = useMemo(() => {
    return (
      resources.find(
        (resource) =>
          resource.id === selectedSpaceId,
      ) ?? null
    );
  }, [resources, selectedSpaceId]);

  const selectedSpaceStatus = useMemo(() => {
    if (!selectedSpace) {
      return null;
    }

    return getDisplayStatus(
      selectedSpace,
      unavailableResourceIds,
    );
  }, [
    selectedSpace,
    unavailableResourceIds,
  ]);

  function scrollToSelectedSpacePanel() {
    window.setTimeout(() => {
      selectedSpacePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function handleDateChange(value: string) {
    setBookingDate(value);
    setSelectedSpaceId(null);
    setShowBookingForm(false);
  }

  function handleStartTimeChange(value: string) {
    setStartTime(value);
    setSelectedSpaceId(null);
    setShowBookingForm(false);
  }

  function handleEndTimeChange(value: string) {
    setEndTime(value);
    setSelectedSpaceId(null);
    setShowBookingForm(false);
  }

  function handleSelectSpaceFromMap(
    space: BookingMapSpace,
  ) {
    if (
      !bookingDate ||
      !startTime ||
      !endTime
    ) {
      window.alert(
        "Please select the booking date and time before choosing an area.",
      );
      return;
    }

    if (startTime >= endTime) {
      window.alert(
        "End time must be later than start time.",
      );
      return;
    }

    const matchingResource = resources.find(
      (resource) => resource.id === space.id,
    );

    if (!matchingResource) {
      window.alert(
        "This area could not be found in the booking resources.",
      );
      return;
    }

    const displayStatus = getDisplayStatus(
      matchingResource,
      unavailableResourceIds,
    );

    if (displayStatus !== "AVAILABLE") {
      window.alert(
        "This area is unavailable for the selected date and time.",
      );
      return;
    }

    setSelectedSpaceId(matchingResource.id);
    setShowBookingForm(false);
    scrollToSelectedSpacePanel();
  }

  function handleContinue() {
    if (!bookingDate) {
      window.alert(
        "Please select a booking date.",
      );
      return;
    }

    if (!startTime || !endTime) {
      window.alert(
        "Please select the booking start and end time.",
      );
      return;
    }

    if (startTime >= endTime) {
      window.alert(
        "End time must be later than start time.",
      );
      return;
    }

    if (isCheckingAvailability) {
      window.alert(
        "Please wait while availability is being checked.",
      );
      return;
    }

    if (availabilityError) {
      window.alert(
        "Availability could not be confirmed. Please check the date and time.",
      );
      return;
    }

    if (!selectedSpace) {
      window.alert(
        "Please select an available area from the room layout.",
      );
      return;
    }

    if (selectedSpaceStatus !== "AVAILABLE") {
      window.alert(
        "The selected area is no longer available.",
      );
      return;
    }

    setShowBookingForm(true);
  }

  function handleClearSelection() {
    setSelectedSpaceId(null);
    setShowBookingForm(false);
  }

  function handleRetry() {
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-[2.5rem] border border-[#d8d0bf] bg-[#e7e3d2] shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative bg-gradient-to-br from-[#c9d2bd] via-[#e8e3d3] to-[#f6efe2] px-8 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-[#06070b] sm:px-12">
          <div className="absolute right-[-40px] top-[-40px] h-64 w-64 rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-500/10" />

          <div className="absolute bottom-[-60px] left-[-30px] h-72 w-72 rounded-full bg-[#87977b]/30 blur-3xl dark:bg-orange-500/10" />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#6d7a64] dark:text-slate-400">
                Space Reservation
              </p>

              <h2 className="mt-5 text-5xl font-black tracking-tight text-white drop-shadow-sm sm:text-6xl">
                Book a Space
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[#5e6558] dark:text-slate-300">
                Choose your date and time, view the
                room layout, and select an available
                area.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/60 px-5 py-4 text-sm font-semibold text-[#5f6658] shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
              <i className="fa-solid fa-circle-info mr-2 text-[#c65f2e] dark:text-orange-300" />
              Green areas are available. Red areas
              cannot be selected.
            </div>
          </div>
        </div>
      </section>

      {isLoading && (
        <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e] dark:border-slate-700 dark:border-t-orange-300" />

          <p className="mt-5 font-bold text-[#5f6658] dark:text-slate-300">
            Loading bookable areas...
          </p>
        </section>
      )}

      {!isLoading && loadError && (
        <section className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/60 dark:bg-red-950/40">
          <div className="text-4xl">⚠️</div>

          <h3 className="mt-4 text-lg font-bold text-red-900 dark:text-red-200">
            Unable to load areas
          </h3>

          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-6 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </section>
      )}

      {!isLoading &&
        !loadError &&
        resources.length === 0 && (
          <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-5xl">🏢</div>

            <h3 className="mt-5 text-xl font-bold text-[#3f463b] dark:text-white">
              No bookable areas found
            </h3>

            <p className="mt-2 text-[#74786d] dark:text-slate-400">
              HR must create spaces and assign them
              to the room map first.
            </p>
          </section>
        )}

      {!isLoading &&
        !loadError &&
        resources.length > 0 && (
          <>
            <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e] dark:text-orange-300">
                  Step 1
                </p>

                <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
                  Choose Date and Time
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#74786d] dark:text-slate-400">
                  The room layout will update
                  automatically according to the
                  selected booking period.
                </p>
              </div>

              <div className="mt-7 grid gap-5 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="booking-date"
                    className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                  >
                    Booking date
                  </label>

                  <input
                    id="booking-date"
                    type="date"
                    min={getTodayDate()}
                    value={bookingDate}
                    onChange={(event) =>
                      handleDateChange(
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="start-time"
                    className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                  >
                    Start time
                  </label>

                  <input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(event) =>
                      handleStartTimeChange(
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="end-time"
                    className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                  >
                    End time
                  </label>

                  <input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(event) =>
                      handleEndTimeChange(
                        event.target.value,
                      )
                    }
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="mt-5">
                {isCheckingAvailability && (
                  <div className="rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-[#5f6658] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    <i className="fa-solid fa-spinner mr-2 animate-spin" />
                    Checking availability...
                  </div>
                )}

                {!isCheckingAvailability &&
                  bookingDate &&
                  startTime < endTime &&
                  unavailableBookings.length >
                    0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                      <i className="fa-solid fa-clock mr-2" />
                      {unavailableBookings.length}{" "}
                      area
                      {unavailableBookings.length ===
                      1
                        ? " is"
                        : "s are"}{" "}
                      unavailable during this period.
                    </div>
                  )}

                {!isCheckingAvailability &&
                  bookingDate &&
                  startTime < endTime &&
                  unavailableBookings.length ===
                    0 &&
                  !availabilityError && (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
                      <i className="fa-solid fa-circle-check mr-2" />
                      All active areas are available
                      during this period.
                    </div>
                  )}

                {availabilityError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                    <i className="fa-solid fa-triangle-exclamation mr-2" />
                    {availabilityError}
                  </div>
                )}

                {!bookingDate && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                    Select a date before choosing an
                    area from the room layout.
                  </div>
                )}
              </div>
            </section>

            <div className="mt-8">
              <BookingMapSelector
                selectedSpaceId={selectedSpaceId}
                unavailableResourceIds={
                  unavailableResourceIds
                }
                onSelectSpace={
                  handleSelectSpaceFromMap
                }
              />
            </div>

            <section
              ref={selectedSpacePanelRef}
              className="mt-8 scroll-mt-28 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e] dark:text-orange-300">
                    Step 3
                  </p>

                  <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
                    Selected Area
                  </h3>

                  <p className="mt-2 text-sm text-[#74786d] dark:text-slate-400">
                    Review the selected area before
                    continuing to the booking form.
                  </p>
                </div>

                {selectedSpace && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-2.5 text-sm font-bold text-[#5f6658] transition hover:bg-[#f3efe3] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {!selectedSpace ? (
                <div className="mt-6 rounded-[2rem] border-2 border-dashed border-[#ded6c7] bg-[#fffdf6] px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-950">
                  <div className="text-5xl">🗺️</div>

                  <p className="mt-4 text-lg font-black text-[#3f463b] dark:text-white">
                    No area selected
                  </p>

                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#74786d] dark:text-slate-400">
                    Select a green area from the room
                    layout above. Red areas are not
                    available for the selected time.
                  </p>
                </div>
              ) : (
                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-[2rem] border border-green-200 bg-green-50 p-6 dark:border-green-900/60 dark:bg-green-950/20">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-2xl text-white">
                        <i className="fa-solid fa-location-dot" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="text-2xl font-black text-[#3f463b] dark:text-white">
                            {selectedSpace.name}
                          </h4>

                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase text-green-700 dark:bg-green-500/20 dark:text-green-300">
                            Available
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-[#5f6658] dark:text-slate-300">
                          {
                            selectedSpace.floor.office
                              .name
                          }{" "}
                          · {selectedSpace.floor.name}
                        </p>

                        {selectedSpace.description && (
                          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#676b60] dark:text-slate-300">
                            {
                              selectedSpace.description
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-950/70">
                        <dt className="text-xs font-bold uppercase tracking-wider text-[#74786d] dark:text-slate-400">
                          Area Code
                        </dt>

                        <dd className="mt-2 font-black text-[#3f463b] dark:text-white">
                          {selectedSpace.code}
                        </dd>
                      </div>

                      <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-950/70">
                        <dt className="text-xs font-bold uppercase tracking-wider text-[#74786d] dark:text-slate-400">
                          Type
                        </dt>

                        <dd className="mt-2 font-black text-[#3f463b] dark:text-white">
                          {getResourceTypeLabel(
                            selectedSpace,
                          )}
                        </dd>
                      </div>

                      <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-950/70">
                        <dt className="text-xs font-bold uppercase tracking-wider text-[#74786d] dark:text-slate-400">
                          Capacity
                        </dt>

                        <dd className="mt-2 font-black text-[#3f463b] dark:text-white">
                          {selectedSpace.capacity}{" "}
                          people
                        </dd>
                      </div>

                      <div className="rounded-2xl bg-white/80 p-4 dark:bg-slate-950/70">
                        <dt className="text-xs font-bold uppercase tracking-wider text-[#74786d] dark:text-slate-400">
                          Approval
                        </dt>

                        <dd className="mt-2 font-black text-[#3f463b] dark:text-white">
                          {selectedSpace.requiresApproval
                            ? "Required"
                            : "Automatic"}
                        </dd>
                      </div>
                    </dl>

                    {getAmenities(selectedSpace)
                      .length > 0 && (
                      <div className="mt-6">
                        <p className="text-sm font-bold text-[#5f6658] dark:text-slate-300">
                          Available equipment and
                          amenities
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {getAmenities(
                            selectedSpace,
                          ).map((amenity) => (
                            <span
                              key={amenity}
                              className="rounded-full border border-green-200 bg-white px-3 py-1.5 text-xs font-bold text-green-700 dark:border-green-900 dark:bg-slate-950 dark:text-green-300"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <aside className="rounded-[2rem] border border-[#ded6c7] bg-[#fffdf6] p-6 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c65f2e] dark:text-orange-300">
                      Booking Summary
                    </p>

                    <dl className="mt-5 space-y-4 text-sm">
                      <div className="border-b border-[#ded6c7] pb-4 dark:border-slate-800">
                        <dt className="text-[#74786d] dark:text-slate-400">
                          Date
                        </dt>

                        <dd className="mt-1 font-black text-[#3f463b] dark:text-white">
                          {formatBookingDate(
                            bookingDate,
                          )}
                        </dd>
                      </div>

                      <div className="border-b border-[#ded6c7] pb-4 dark:border-slate-800">
                        <dt className="text-[#74786d] dark:text-slate-400">
                          Time
                        </dt>

                        <dd className="mt-1 font-black text-[#3f463b] dark:text-white">
                          {startTime} – {endTime}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-[#74786d] dark:text-slate-400">
                          Area
                        </dt>

                        <dd className="mt-1 font-black text-[#3f463b] dark:text-white">
                          {selectedSpace.name}
                        </dd>
                      </div>
                    </dl>

                    <button
                      type="button"
                      onClick={handleContinue}
                      disabled={
                        isCheckingAvailability ||
                        selectedSpaceStatus !==
                          "AVAILABLE"
                      }
                      className="mt-7 w-full rounded-2xl bg-[#c65f2e] px-5 py-3.5 font-bold text-white transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-orange-500 dark:hover:bg-orange-600"
                    >
                      {isCheckingAvailability
                        ? "Checking..."
                        : "Continue to Booking"}
                    </button>
                  </aside>
                </div>
              )}
            </section>
          </>
        )}

      {showBookingForm && selectedSpace && (
        <BookingDetailsForm
          space={{
            id: selectedSpace.id,
            name: selectedSpace.name,
            type: isRoomType(selectedSpace)
              ? "MEETING_ROOM"
              : "DESK",
            capacity: selectedSpace.capacity,
            location: `${selectedSpace.floor.office.name} · ${selectedSpace.floor.name}`,
            amenities:
              getAmenities(selectedSpace),
          }}
          office={
            selectedSpace.floor.office.name
          }
          floor={selectedSpace.floor.name}
          bookingDate={bookingDate}
          startTime={startTime}
          endTime={endTime}
          onClose={() =>
            setShowBookingForm(false)
          }
        />
      )}
    </div>
  );
}