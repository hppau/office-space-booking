"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  | "PENDING"
  | "MAINTENANCE";

type SpaceTypeFilter =
  | "ALL"
  | "DESK"
  | "CHAIR"
  | "MEETING_ROOM"
  | "PRIVATE_ROOM"
  | "TRAINING_ROOM"
  | "HOT_DESK"
  | "OTHER";

const inputClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition placeholder:text-[#aaa08c] focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

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

function getStatusStyles(status: SpaceDisplayStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "border-pink-200 bg-[#fffdf6] text-[#3f463b] hover:border-pink-300 hover:bg-pink-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-pink-400/60 dark:hover:bg-pink-950/20";

    case "BOOKED":
      return "cursor-not-allowed border-rose-200 bg-rose-50 text-rose-500 opacity-70 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300";

    case "PENDING":
      return "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-600 opacity-80 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";

    case "MAINTENANCE":
      return "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-500 opacity-80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400";
  }
}

function getStatusLabel(status: SpaceDisplayStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "Available";

    case "BOOKED":
      return "Unavailable";

    case "PENDING":
      return "Pending";

    case "MAINTENANCE":
      return "Maintenance";
  }
}

function getAmenities(resource: OfficeResource): string[] {
  if (!Array.isArray(resource.amenities)) {
    return [];
  }

  return resource.amenities.filter(
    (item): item is string => typeof item === "string",
  );
}

function isDeskType(resource: OfficeResource): boolean {
  return ["DESK", "CHAIR", "HOT_DESK"].includes(resource.type);
}

function isRoomType(resource: OfficeResource): boolean {
  return [
    "MEETING_ROOM",
    "PRIVATE_ROOM",
    "TRAINING_ROOM",
  ].includes(resource.type);
}

function getResourceIcon(resource: OfficeResource) {
  if (resource.iconName === "desk" || resource.type === "DESK") {
    return <i className="fa-solid fa-desktop" />;
  }

  if (resource.iconName === "seat" || resource.type === "CHAIR") {
    return <i className="fa-solid fa-chair" />;
  }

  if (
    resource.iconName === "meeting-room" ||
    resource.type === "MEETING_ROOM" ||
    resource.type === "PRIVATE_ROOM" ||
    resource.type === "TRAINING_ROOM"
  ) {
    return <i className="fa-solid fa-door-open" />;
  }

  if (resource.iconName === "phone-booth") {
    return <i className="fa-solid fa-phone" />;
  }

  if (resource.type === "HOT_DESK") {
    return <i className="fa-solid fa-laptop" />;
  }

  return <i className="fa-solid fa-location-dot" />;
}

function getResourceTypeLabel(resource: OfficeResource): string {
  switch (resource.type) {
    case "DESK":
      return "Workspace desk";

    case "CHAIR":
      return "Chair";

    case "HOT_DESK":
      return "Hot desk";

    case "MEETING_ROOM":
      return "Meeting room";

    case "PRIVATE_ROOM":
      return "Private room";

    case "TRAINING_ROOM":
      return "Training room";

    case "OTHER":
      return "Other space";

    default:
      return "Office space";
  }
}

function getTodayDate(): string {
  const today = new Date();
  const timezoneOffset = today.getTimezoneOffset() * 60_000;

  return new Date(today.getTime() - timezoneOffset)
    .toISOString()
    .split("T")[0];
}

export default function BookSpacePage() {
  const [resources, setResources] = useState<OfficeResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [office, setOffice] = useState("");
  const [floor, setFloor] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [spaceType, setSpaceType] =
    useState<SpaceTypeFilter>("ALL");

  const [selectedSpaceId, setSelectedSpaceId] = useState<
    number | null
  >(null);

  const [showBookingForm, setShowBookingForm] = useState(false);

  const [unavailableBookings, setUnavailableBookings] = useState<
    UnavailableBooking[]
  >([]);

  const [isCheckingAvailability, setIsCheckingAvailability] =
    useState(false);

  const [availabilityError, setAvailabilityError] = useState("");
  const selectedSpacePanelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    async function loadResources() {
      try {
        setIsLoading(true);
        setLoadError("");

        const records = await getResources();

        setResources(records);

        if (records.length > 0) {
          setOffice(records[0].floor.office.name);
          setFloor(records[0].floor.name);
        }
      } catch (error) {
        console.error("Failed to load resources:", error);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load office resources.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadResources();
  }, []);

  useEffect(() => {
    async function loadUnavailableBookings() {
      if (!bookingDate || !startTime || !endTime) {
        setUnavailableBookings([]);
        setAvailabilityError("");
        return;
      }

      if (startTime >= endTime) {
        setUnavailableBookings([]);
        setAvailabilityError("");
        return;
      }

      try {
        setIsCheckingAvailability(true);
        setAvailabilityError("");

        const records = await getUnavailableBookings(
          bookingDate,
          startTime,
          endTime,
        );

        setUnavailableBookings(records);

        if (
          selectedSpaceId &&
          records.some(
            (record) => record.resourceId === selectedSpaceId,
          )
        ) {
          setSelectedSpaceId(null);
          setShowBookingForm(false);
        }
      } catch (error) {
        console.error("Failed to check availability:", error);

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
  }, [bookingDate, startTime, endTime, selectedSpaceId]);

  const officeNames = useMemo(() => {
    return Array.from(
      new Set(
        resources.map(
          (resource) => resource.floor.office.name,
        ),
      ),
    );
  }, [resources]);

  const floorNames = useMemo(() => {
    return Array.from(
      new Set(
        resources
          .filter(
            (resource) =>
              resource.floor.office.name === office,
          )
          .map((resource) => resource.floor.name),
      ),
    );
  }, [resources, office]);

  const filteredSpaces = useMemo(() => {
    return resources.filter((resource) => {
      const matchesOffice =
        resource.floor.office.name === office;

      const matchesFloor = resource.floor.name === floor;

      const matchesType =
        spaceType === "ALL" || resource.type === spaceType;

      return matchesOffice && matchesFloor && matchesType;
    });
  }, [resources, office, floor, spaceType]);

  const unavailableResourceIds = useMemo(() => {
    return new Set(
      unavailableBookings.map((booking) => booking.resourceId),
    );
  }, [unavailableBookings]);

  const deskSpaces = useMemo(() => {
    return filteredSpaces.filter(isDeskType);
  }, [filteredSpaces]);

  const roomSpaces = useMemo(() => {
    return filteredSpaces.filter(isRoomType);
  }, [filteredSpaces]);

  const otherSpaces = useMemo(() => {
    return filteredSpaces.filter(
      (resource) =>
        !isDeskType(resource) && !isRoomType(resource),
    );
  }, [filteredSpaces]);

  const selectedSpace =
    resources.find(
      (resource) => resource.id === selectedSpaceId,
    ) ?? null;

  function scrollToSelectedSpacePanel() {
    window.setTimeout(() => {
      selectedSpacePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function handleOfficeChange(selectedOffice: string) {
    setOffice(selectedOffice);
    setSelectedSpaceId(null);
    setShowBookingForm(false);

    const firstMatchingResource = resources.find(
      (resource) =>
        resource.floor.office.name === selectedOffice,
    );

    setFloor(firstMatchingResource?.floor.name ?? "");
  }

  function handleFloorChange(selectedFloor: string) {
    setFloor(selectedFloor);
    setSelectedSpaceId(null);
    setShowBookingForm(false);
  }

  function handleSpaceTypeChange(value: string) {
    setSpaceType(value as SpaceTypeFilter);
    setSelectedSpaceId(null);
    setShowBookingForm(false);
  }

  function handleSelectSpace(resource: OfficeResource) {
    const displayStatus = getDisplayStatus(
      resource,
      unavailableResourceIds,
    );

    if (displayStatus !== "AVAILABLE") {
      return;
    }

    setSelectedSpaceId(resource.id);
    setShowBookingForm(false);
    scrollToSelectedSpacePanel();
  }

  function handleSelectSpaceFromMap(space: BookingMapSpace) {
    const matchingResource = resources.find(
      (resource) => resource.id === space.id,
    );

    if (!matchingResource) {
      window.alert(
        "This mapped space could not be found in the booking resources list.",
      );
      return;
    }

    const displayStatus = getDisplayStatus(
      matchingResource,
      unavailableResourceIds,
    );

    if (displayStatus !== "AVAILABLE") {
      window.alert(
        "This space is not available for the selected date and time.",
      );
      return;
    }

    setOffice(matchingResource.floor.office.name);
    setFloor(matchingResource.floor.name);
    setSpaceType("ALL");
    setSelectedSpaceId(matchingResource.id);
    setShowBookingForm(false);
    scrollToSelectedSpacePanel();
  }

  function handleContinue() {
    if (!bookingDate) {
      window.alert("Please select a booking date.");
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
        "The end time must be later than the start time.",
      );
      return;
    }

    if (!selectedSpace) {
      window.alert("Please select an available workspace.");
      return;
    }

    if (
      getDisplayStatus(selectedSpace, unavailableResourceIds) !==
      "AVAILABLE"
    ) {
      window.alert(
        "The selected workspace is not currently available.",
      );
      return;
    }

    setShowBookingForm(true);
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
                Workspace Reservation
              </p>

              <h2 className="mt-5 text-5xl font-black tracking-tight text-white drop-shadow-sm dark:text-white sm:text-6xl">
                Book a Space
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[#5e6558] dark:text-slate-300">
                Select a date and time, check availability, and reserve a
                workspace that matches your needs.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/60 px-5 py-4 text-sm font-semibold text-[#5f6658] shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
              <i className="fa-solid fa-circle-info mr-2 text-[#c65f2e] dark:text-orange-300" />
              Availability updates automatically after you choose a date
              and time.
            </div>
          </div>
        </div>
      </section>

      {isLoading && (
        <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e] dark:border-slate-700 dark:border-t-orange-300" />

          <p className="mt-5 font-medium text-[#5f6658] dark:text-slate-300">
            Loading office resources...
          </p>

          <p className="mt-2 text-sm text-[#74786d] dark:text-slate-400">
            Retrieving desks and rooms from the database.
          </p>
        </section>
      )}

      {!isLoading && loadError && (
        <section className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/60 dark:bg-red-950/40">
          <div className="text-4xl">⚠️</div>

          <h3 className="mt-4 text-lg font-bold text-red-900 dark:text-red-200">
            Unable to load resources
          </h3>

          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-6 rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </section>
      )}

      {!isLoading && !loadError && resources.length === 0 && (
        <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-5xl">🏢</div>

          <h3 className="mt-5 text-xl font-bold text-[#3f463b] dark:text-white">
            No office resources found
          </h3>

          <p className="mt-2 text-[#74786d] dark:text-slate-400">
            Add desks or rooms through the resource management page first.
          </p>
        </section>
      )}

      {!isLoading && !loadError && resources.length > 0 && (
        <>
          <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e] dark:text-orange-300">
                Booking Filters
              </p>

              <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
                Choose location and time
              </h3>

              <p className="mt-2 text-sm text-[#74786d] dark:text-slate-400">
                Select your preferred office, floor, date, time, and
                workspace type.
              </p>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-6">
              <div className="xl:col-span-2">
                <label
                  htmlFor="office"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  Office
                </label>

                <select
                  id="office"
                  value={office}
                  onChange={(event) =>
                    handleOfficeChange(event.target.value)
                  }
                  className={inputClassName}
                >
                  {officeNames.map((officeName) => (
                    <option key={officeName} value={officeName}>
                      {officeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="floor"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  Floor
                </label>

                <select
                  id="floor"
                  value={floor}
                  onChange={(event) =>
                    handleFloorChange(event.target.value)
                  }
                  className={inputClassName}
                >
                  {floorNames.map((floorName) => (
                    <option key={floorName} value={floorName}>
                      {floorName}
                    </option>
                  ))}
                </select>
              </div>

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
                    setBookingDate(event.target.value)
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
                    setStartTime(event.target.value)
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
                    setEndTime(event.target.value)
                  }
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="space-type"
                className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
              >
                Space type
              </label>

              <select
                id="space-type"
                value={spaceType}
                onChange={(event) =>
                  handleSpaceTypeChange(event.target.value)
                }
                className={`${inputClassName} md:max-w-xs`}
              >
                <option value="ALL">All spaces</option>
                <option value="DESK">Desk</option>
                <option value="CHAIR">Chair</option>
                <option value="HOT_DESK">Hot desk</option>
                <option value="MEETING_ROOM">Meeting room</option>
                <option value="PRIVATE_ROOM">Private room</option>
                <option value="TRAINING_ROOM">Training room</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="mt-5">
              {isCheckingAvailability && (
                <div className="rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-[#5f6658] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  Checking availability for the selected date and time...
                </div>
              )}

              {!isCheckingAvailability &&
                bookingDate &&
                startTime < endTime &&
                unavailableBookings.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    {unavailableBookings.length} space
                    {unavailableBookings.length > 1
                      ? "s are"
                      : " is"}{" "}
                    already booked or pending for this selected time.
                  </div>
                )}

              {!isCheckingAvailability &&
                bookingDate &&
                startTime < endTime &&
                unavailableBookings.length === 0 &&
                !availabilityError && (
                  <div className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-semibold text-pink-700 dark:border-pink-900/60 dark:bg-pink-950/30 dark:text-pink-300">
                    All active spaces are available for the selected time.
                  </div>
                )}

              {availabilityError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {availabilityError}
                </div>
              )}
            </div>
          </section>

          <div className="mt-8">
            <BookingMapSelector
              selectedSpaceId={selectedSpaceId}
              unavailableResourceIds={unavailableResourceIds}
              onSelectSpace={handleSelectSpaceFromMap}
            />
          </div>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
            <article className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e] dark:text-orange-300">
                    Workspace Layout
                  </p>

                  <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
                    {office} · {floor}
                  </h3>

                  <p className="mt-2 text-sm text-[#74786d] dark:text-slate-400">
                    You can also select an available workspace from the
                    card layout below.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-xs font-semibold text-[#5f6658] dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-pink-400" />
                    Available
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-400" />
                    Unavailable
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-400" />
                    Pending
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-slate-400" />
                    Maintenance
                  </div>
                </div>
              </div>

              <div className="mt-7 overflow-x-auto rounded-[2rem] border border-[#ded6c7] bg-[#f3efe3] p-6 dark:border-slate-800 dark:bg-slate-950">
                <div className="min-w-[680px]">
                  {filteredSpaces.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-[#ded6c7] bg-[#fffdf6] px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                      <div className="text-4xl">🔎</div>

                      <p className="mt-4 font-bold text-[#3f463b] dark:text-white">
                        No matching spaces
                      </p>

                      <p className="mt-2 text-sm text-[#74786d] dark:text-slate-400">
                        Change the office, floor, or space type filter.
                      </p>
                    </div>
                  )}

                  {deskSpaces.length > 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-[#ded6c7] bg-[#fffdf6] p-5 dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold uppercase tracking-wider text-[#87977b] dark:text-slate-400">
                          Open Working Area
                        </p>

                        <span className="rounded-xl bg-[#eef0e2] px-3 py-1 text-xs font-semibold text-[#74786d] dark:bg-slate-800 dark:text-slate-300">
                          Entrance →
                        </span>
                      </div>

                      <div className="mt-6 grid grid-cols-3 gap-5">
                        {deskSpaces.map((resource) => {
                          const displayStatus = getDisplayStatus(
                            resource,
                            unavailableResourceIds,
                          );

                          const isSelected =
                            selectedSpaceId === resource.id;

                          return (
                            <button
                              key={resource.id}
                              type="button"
                              disabled={
                                displayStatus !== "AVAILABLE"
                              }
                              onClick={() =>
                                handleSelectSpace(resource)
                              }
                              className={`rounded-2xl border-2 p-4 text-left transition hover:-translate-y-1 ${getStatusStyles(
                                displayStatus,
                              )} ${
                                isSelected
                                  ? "ring-4 ring-pink-200 ring-offset-2 dark:ring-pink-400/40 dark:ring-offset-slate-950"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-2xl text-pink-400 dark:text-pink-300">
                                  {getResourceIcon(resource)}
                                </span>

                                <span className="text-xs font-bold">
                                  {getStatusLabel(displayStatus)}
                                </span>
                              </div>

                              <p className="mt-4 font-black">
                                {resource.code}
                              </p>

                              <p className="mt-1 text-xs opacity-80">
                                {resource.description ??
                                  getResourceTypeLabel(resource)}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {roomSpaces.length > 0 && (
                    <div
                      className={`rounded-2xl border-2 border-dashed border-[#ded6c7] bg-[#fffdf6] p-5 dark:border-slate-700 dark:bg-slate-900 ${
                        deskSpaces.length > 0 ? "mt-6" : ""
                      }`}
                    >
                      <p className="text-sm font-bold uppercase tracking-wider text-[#87977b] dark:text-slate-400">
                        Meeting and Private Rooms
                      </p>

                      <div className="mt-6 grid grid-cols-2 gap-5">
                        {roomSpaces.map((resource) => {
                          const displayStatus = getDisplayStatus(
                            resource,
                            unavailableResourceIds,
                          );

                          const isSelected =
                            selectedSpaceId === resource.id;

                          return (
                            <button
                              key={resource.id}
                              type="button"
                              disabled={
                                displayStatus !== "AVAILABLE"
                              }
                              onClick={() =>
                                handleSelectSpace(resource)
                              }
                              className={`rounded-2xl border-2 p-5 text-left transition hover:-translate-y-1 ${getStatusStyles(
                                displayStatus,
                              )} ${
                                isSelected
                                  ? "ring-4 ring-pink-200 ring-offset-2 dark:ring-pink-400/40 dark:ring-offset-slate-950"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-3xl text-pink-400 dark:text-pink-300">
                                  {getResourceIcon(resource)}
                                </span>

                                <span className="text-xs font-bold">
                                  {getStatusLabel(displayStatus)}
                                </span>
                              </div>

                              <p className="mt-4 font-black">
                                {resource.code}
                              </p>

                              <p className="mt-1 text-sm">
                                Capacity: {resource.capacity}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {otherSpaces.length > 0 && (
                    <div
                      className={`rounded-2xl border-2 border-dashed border-[#ded6c7] bg-[#fffdf6] p-5 dark:border-slate-700 dark:bg-slate-900 ${
                        deskSpaces.length > 0 ||
                        roomSpaces.length > 0
                          ? "mt-6"
                          : ""
                      }`}
                    >
                      <p className="text-sm font-bold uppercase tracking-wider text-[#87977b] dark:text-slate-400">
                        Other Office Spaces
                      </p>

                      <div className="mt-6 grid grid-cols-3 gap-5">
                        {otherSpaces.map((resource) => {
                          const displayStatus = getDisplayStatus(
                            resource,
                            unavailableResourceIds,
                          );

                          const isSelected =
                            selectedSpaceId === resource.id;

                          return (
                            <button
                              key={resource.id}
                              type="button"
                              disabled={
                                displayStatus !== "AVAILABLE"
                              }
                              onClick={() =>
                                handleSelectSpace(resource)
                              }
                              className={`rounded-2xl border-2 p-4 text-left transition hover:-translate-y-1 ${getStatusStyles(
                                displayStatus,
                              )} ${
                                isSelected
                                  ? "ring-4 ring-pink-200 ring-offset-2 dark:ring-pink-400/40 dark:ring-offset-slate-950"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-2xl text-pink-400 dark:text-pink-300">
                                  <i className="fa-solid fa-location-dot" />
                                </span>

                                <span className="text-xs font-bold">
                                  {getStatusLabel(displayStatus)}
                                </span>
                              </div>

                              <p className="mt-4 font-black">
                                {resource.code}
                              </p>

                              <p className="mt-1 text-xs opacity-80">
                                {resource.description ??
                                  "Office space"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>

            <aside
              ref={selectedSpacePanelRef}
              className="scroll-mt-28 h-fit rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-28"
            >
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e] dark:text-orange-300">
                Selection
              </p>

              <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
                Selected space
              </h3>

              {!selectedSpace ? (
                <div className="mt-6 rounded-2xl border border-dashed border-[#ded6c7] bg-[#fffdf6] px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-950">
                  <div className="text-4xl">🪑</div>

                  <p className="mt-4 font-bold text-[#3f463b] dark:text-white">
                    No space selected
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#74786d] dark:text-slate-400">
                    Select a workspace from the floor map or the card
                    layout.
                  </p>
                </div>
              ) : (
                <div className="mt-6">
                  <div className="rounded-2xl bg-[#fffdf6] p-5 dark:bg-slate-950">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-2xl text-pink-500 dark:bg-pink-500/20 dark:text-pink-300">
                      {getResourceIcon(selectedSpace)}
                    </div>

                    <h4 className="mt-4 text-xl font-black text-[#3f463b] dark:text-white">
                      {selectedSpace.name}
                    </h4>

                    <p className="mt-1 text-sm text-[#74786d] dark:text-slate-400">
                      {selectedSpace.floor.office.name} ·{" "}
                      {selectedSpace.floor.name}
                    </p>

                    {selectedSpace.description && (
                      <p className="mt-3 text-sm leading-6 text-[#676b60] dark:text-slate-300">
                        {selectedSpace.description}
                      </p>
                    )}
                  </div>

                  <dl className="mt-6 space-y-4 text-sm">
                    <div className="flex justify-between gap-4 border-b border-[#ded6c7] pb-4 dark:border-slate-800">
                      <dt className="text-[#74786d] dark:text-slate-400">
                        Code
                      </dt>

                      <dd className="font-bold text-[#3f463b] dark:text-white">
                        {selectedSpace.code}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4 border-b border-[#ded6c7] pb-4 dark:border-slate-800">
                      <dt className="text-[#74786d] dark:text-slate-400">
                        Type
                      </dt>

                      <dd className="text-right font-bold text-[#3f463b] dark:text-white">
                        {getResourceTypeLabel(selectedSpace)}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4 border-b border-[#ded6c7] pb-4 dark:border-slate-800">
                      <dt className="text-[#74786d] dark:text-slate-400">
                        Capacity
                      </dt>

                      <dd className="font-bold text-[#3f463b] dark:text-white">
                        {selectedSpace.capacity}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4 border-b border-[#ded6c7] pb-4 dark:border-slate-800">
                      <dt className="text-[#74786d] dark:text-slate-400">
                        Date
                      </dt>

                      <dd className="font-bold text-[#3f463b] dark:text-white">
                        {bookingDate || "Not selected"}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-4">
                      <dt className="text-[#74786d] dark:text-slate-400">
                        Time
                      </dt>

                      <dd className="font-bold text-[#3f463b] dark:text-white">
                        {startTime} – {endTime}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6">
                    <p className="text-sm font-bold text-[#5f6658] dark:text-slate-300">
                      Amenities
                    </p>

                    {getAmenities(selectedSpace).length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {getAmenities(selectedSpace).map(
                          (amenity) => (
                            <span
                              key={amenity}
                              className="rounded-full bg-[#eef0e2] px-3 py-1 text-xs font-semibold text-[#74786d] dark:bg-slate-800 dark:text-slate-300"
                            >
                              {amenity}
                            </span>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-[#74786d] dark:text-slate-400">
                        No amenities listed.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleContinue}
                    className="mt-8 w-full rounded-2xl bg-[#c65f2e] px-5 py-3 font-bold text-white transition hover:bg-[#a94f26] dark:bg-orange-500 dark:hover:bg-orange-600"
                  >
                    Continue Booking
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpaceId(null);
                      setShowBookingForm(false);
                    }}
                    className="mt-3 w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-5 py-3 font-bold text-[#5f6658] transition hover:bg-[#f3efe3] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </aside>
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
            amenities: getAmenities(selectedSpace),
          }}
          office={selectedSpace.floor.office.name}
          floor={selectedSpace.floor.name}
          bookingDate={bookingDate}
          startTime={startTime}
          endTime={endTime}
          onClose={() => setShowBookingForm(false)}
        />
      )}
    </div>
  );
}