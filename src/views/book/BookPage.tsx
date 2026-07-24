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
  "w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

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
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-7 border-b border-slate-200 pb-6 dark:border-slate-800">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-600">Room reservation</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl dark:text-white">Book a Room</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Choose a date and time, select a room from the left panel, then click an available area on the room image.</p>
      </header>

      {isLoading && <div className="border-y border-slate-200 py-16 text-center dark:border-slate-800"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600 dark:border-slate-700"/><p className="mt-4 text-sm font-semibold text-slate-500">Loading booking data...</p></div>}

      {!isLoading && loadError && <div className="border-y border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900/60 dark:bg-red-950/20"><p className="font-bold text-red-800 dark:text-red-300">Unable to load areas</p><p className="mt-2 text-sm text-red-700 dark:text-red-400">{loadError}</p><button type="button" onClick={handleRetry} className="mt-5 bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700">Try Again</button></div>}

      {!isLoading && !loadError && resources.length === 0 && <div className="border-y border-slate-200 py-16 text-center dark:border-slate-800"><h2 className="font-bold text-slate-900 dark:text-white">No bookable areas found</h2><p className="mt-2 text-sm text-slate-500">HR must create areas and place them on a room image first.</p></div>}

      {!isLoading && !loadError && resources.length > 0 && (
        <>
          <section className="mb-6 border-y border-slate-200 bg-white px-1 py-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="grid gap-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
              <div><label htmlFor="booking-date" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Booking date</label><input id="booking-date" type="date" min={getTodayDate()} value={bookingDate} onChange={(event) => handleDateChange(event.target.value)} className={inputClassName}/></div>
              <div><label htmlFor="start-time" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Start time</label><input id="start-time" type="time" value={startTime} onChange={(event) => handleStartTimeChange(event.target.value)} className={inputClassName}/></div>
              <div><label htmlFor="end-time" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">End time</label><input id="end-time" type="time" value={endTime} onChange={(event) => handleEndTimeChange(event.target.value)} className={inputClassName}/></div>
              <div className="pb-1 text-sm font-medium text-slate-500">{bookingDate ? formatBookingDate(bookingDate) : "Select a date"}</div>
            </div>
            <div className="mt-4 min-h-6 text-sm">
              {isCheckingAvailability && <span className="font-semibold text-slate-500"><i className="fa-solid fa-spinner mr-2 animate-spin"/>Checking availability...</span>}
              {!isCheckingAvailability && availabilityError && <span className="font-semibold text-red-600">{availabilityError}</span>}
              {!isCheckingAvailability && bookingDate && !availabilityError && startTime < endTime && <span className={unavailableBookings.length ? "font-semibold text-amber-700 dark:text-amber-300" : "font-semibold text-green-700 dark:text-green-300"}>{unavailableBookings.length ? `${unavailableBookings.length} area${unavailableBookings.length === 1 ? " is" : "s are"} unavailable for this period.` : "All active areas are currently available."}</span>}
            </div>
          </section>

          <BookingMapSelector selectedSpaceId={selectedSpaceId} unavailableResourceIds={unavailableResourceIds} onSelectSpace={handleSelectSpaceFromMap}/>

          <section ref={selectedSpacePanelRef} className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">Booking selection</p>
                {selectedSpace ? <><h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{selectedSpace.name}</h2><p className="mt-1 text-sm text-slate-500">{selectedSpace.floor.office.name} · {selectedSpace.floor.name} · Capacity {selectedSpace.capacity}</p>{selectedSpace.description && <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedSpace.description}</p>}</> : <><h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Select an available area</h2><p className="mt-1 text-sm text-slate-500">Choose a green area from the room image above.</p></>}
              </div>
              <div className="flex flex-wrap gap-3">
                {selectedSpace && <button type="button" onClick={handleClearSelection} className="border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">Clear</button>}
                <button type="button" onClick={handleContinue} disabled={!selectedSpace || selectedSpaceStatus !== "AVAILABLE" || isCheckingAvailability} className="bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700">Continue to Booking</button>
              </div>
            </div>
          </section>
        </>
      )}

      {showBookingForm && selectedSpace && (
        <BookingDetailsForm
          space={{ id: selectedSpace.id, name: selectedSpace.name, type: isRoomType(selectedSpace) ? "MEETING_ROOM" : "DESK", capacity: selectedSpace.capacity, location: `${selectedSpace.floor.office.name} · ${selectedSpace.floor.name}`, amenities: getAmenities(selectedSpace) }}
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
