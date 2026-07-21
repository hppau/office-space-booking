"use client";

import { useEffect, useMemo, useState } from "react";
import { getBookingMaps } from "@/api/api-service";
import type {
  BookingMapFloor,
  BookingMapSpace,
} from "@/models/booking-map";

type BookingMapSelectorProps = {
  selectedSpaceId: number | null;
  unavailableResourceIds: Set<number>;
  onSelectSpace: (space: BookingMapSpace) => void;
};

const selectClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

function toNumber(
  value: string | number | null | undefined,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function getSpaceTypeLabel(space: BookingMapSpace): string {
  switch (space.type) {
    case "MEETING_ROOM":
      return "Meeting room";

    case "PRIVATE_ROOM":
      return "Private room";

    case "TRAINING_ROOM":
      return "Training room";

    case "HOT_DESK":
      return "Shared working area";

    case "OTHER":
      return "Office area";

    case "DESK":
      return "Working area";

    case "CHAIR":
      return "Seating area";

    default:
      return "Bookable space";
  }
}

function hasValidArea(space: BookingMapSpace): boolean {
  const x = toNumber(space.xPercent);
  const y = toNumber(space.yPercent);
  const width = toNumber(space.widthPercent);
  const height = toNumber(space.heightPercent);

  return (
    x !== null &&
    y !== null &&
    width !== null &&
    height !== null &&
    width > 0 &&
    height > 0
  );
}

export default function BookingMapSelector({
  selectedSpaceId,
  unavailableResourceIds,
  onSelectSpace,
}: BookingMapSelectorProps) {
  const [maps, setMaps] = useState<BookingMapFloor[]>([]);
  const [selectedFloorId, setSelectedFloorId] =
    useState<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadMaps() {
      try {
        setIsLoading(true);
        setLoadError("");

        const bookingMaps = await getBookingMaps();

        const mapsWithAssignedAreas = bookingMaps.map(
          (map) => ({
            ...map,
            spaces: map.spaces.filter(hasValidArea),
          }),
        );

        setMaps(mapsWithAssignedAreas);

        const firstMap = mapsWithAssignedAreas.find(
          (map) =>
            Boolean(map.floorPlanUrl) &&
            map.spaces.length > 0,
        );

        if (firstMap) {
          setSelectedFloorId(firstMap.id);
        }
      } catch (error) {
        console.error(
          "Failed to load booking maps:",
          error,
        );

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load the booking map.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadMaps();
  }, []);

  const availableMaps = useMemo(() => {
    return maps.filter(
      (map) =>
        Boolean(map.floorPlanUrl) &&
        map.spaces.length > 0,
    );
  }, [maps]);

  const selectedMap = useMemo(() => {
    return (
      availableMaps.find(
        (map) => map.id === selectedFloorId,
      ) ?? null
    );
  }, [availableMaps, selectedFloorId]);

  const selectedSpace = useMemo(() => {
    return (
      selectedMap?.spaces.find(
        (space) => space.id === selectedSpaceId,
      ) ?? null
    );
  }, [selectedMap, selectedSpaceId]);

  const availableCount = useMemo(() => {
    if (!selectedMap) {
      return 0;
    }

    return selectedMap.spaces.filter(
      (space) =>
        !unavailableResourceIds.has(space.id),
    ).length;
  }, [selectedMap, unavailableResourceIds]);

  const unavailableCount = useMemo(() => {
    if (!selectedMap) {
      return 0;
    }

    return selectedMap.spaces.filter((space) =>
      unavailableResourceIds.has(space.id),
    ).length;
  }, [selectedMap, unavailableResourceIds]);

  if (isLoading) {
    return (
      <section className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e] dark:border-slate-700 dark:border-t-orange-300" />

        <p className="mt-4 text-sm font-semibold text-[#5f6658] dark:text-slate-300">
          Loading room layout...
        </p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-7 text-center dark:border-red-900/60 dark:bg-red-950/40">
        <div className="text-4xl">⚠️</div>

        <h3 className="mt-4 font-black text-red-900 dark:text-red-200">
          Unable to load room layout
        </h3>

        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          {loadError}
        </p>
      </section>
    );
  }

  if (availableMaps.length === 0) {
    return (
      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
        <div className="text-5xl">🗺️</div>

        <h3 className="mt-4 text-xl font-black text-amber-900 dark:text-amber-200">
          No room layout available
        </h3>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-amber-800 dark:text-amber-300">
          HR must upload a room image and draw at least
          one bookable area before employees can make a
          visual booking.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e] dark:text-orange-300">
            Room Layout
          </p>

          <h3 className="mt-2 text-3xl font-black text-[#3f463b] dark:text-white">
            Choose an Available Space
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#74786d] dark:text-slate-400">
            Green areas are available for the selected
            date and time. Red areas are already booked or
            pending approval.
          </p>
        </div>

        <div className="w-full lg:w-80">
          <label
            htmlFor="employee-floor-map"
            className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
          >
            Office and room
          </label>

          <select
            id="employee-floor-map"
            value={selectedFloorId}
            onChange={(event) =>
              setSelectedFloorId(
                Number(event.target.value),
              )
            }
            className={selectClassName}
          >
            {availableMaps.map((map) => (
              <option key={map.id} value={map.id}>
                {map.office.name} · {map.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900/60 dark:bg-green-950/30">
          <p className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-300">
            Available
          </p>

          <p className="mt-1 text-2xl font-black text-green-900 dark:text-green-100">
            {availableCount}
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
            Unavailable
          </p>

          <p className="mt-1 text-2xl font-black text-red-900 dark:text-red-100">
            {unavailableCount}
          </p>
        </div>

        <div className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 dark:border-pink-900/60 dark:bg-pink-950/30">
          <p className="text-xs font-bold uppercase tracking-wider text-pink-700 dark:text-pink-300">
            Selected
          </p>

          <p className="mt-1 truncate text-base font-black text-pink-900 dark:text-pink-100">
            {selectedSpace?.name ?? "None"}
          </p>
        </div>
      </div>

      {selectedMap?.floorPlanUrl ? (
        <>
          <div className="mt-6 overflow-hidden rounded-[2rem] border border-[#ded6c7] bg-[#f3efe3] shadow-inner dark:border-slate-800 dark:bg-slate-950">
            <div className="relative">
              <img
                src={selectedMap.floorPlanUrl}
                alt={`${selectedMap.name} room layout`}
                className="pointer-events-none block w-full select-none"
                draggable={false}
              />

              {selectedMap.spaces.map((space) => {
                const x = toNumber(space.xPercent);
                const y = toNumber(space.yPercent);
                const width = toNumber(
                  space.widthPercent,
                );
                const height = toNumber(
                  space.heightPercent,
                );

                if (
                  x === null ||
                  y === null ||
                  width === null ||
                  height === null
                ) {
                  return null;
                }

                const isSelected =
                  space.id === selectedSpaceId;

                const isUnavailable =
                  unavailableResourceIds.has(space.id);

                return (
                  <button
                    key={space.id}
                    type="button"
                    disabled={isUnavailable}
                    onClick={() => onSelectSpace(space)}
                    className={`group absolute flex items-center justify-center rounded-lg border-2 transition sm:rounded-xl ${
                      isSelected
                        ? "z-30 border-pink-700 bg-pink-400/55 ring-4 ring-pink-300/60"
                        : isUnavailable
                          ? "z-10 cursor-not-allowed border-red-700 bg-red-500/50 opacity-90"
                          : "z-20 border-green-700 bg-green-400/45 hover:bg-green-400/60 hover:ring-4 hover:ring-green-300/40"
                    }`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    aria-label={`${space.name}, ${
                      isUnavailable
                        ? "unavailable"
                        : isSelected
                          ? "selected"
                          : "available"
                    }`}
                  >
                    <span className="pointer-events-none max-w-[92%] rounded-lg bg-white/90 px-1.5 py-1 text-center shadow-sm backdrop-blur dark:bg-slate-950/90 sm:px-3 sm:py-2">
                      <span className="block truncate text-[8px] font-black leading-tight text-[#3f463b] dark:text-white sm:text-sm">
                        {space.name}
                      </span>

                      <span
                        className={`mt-0.5 hidden text-[10px] font-bold uppercase tracking-wide sm:block ${
                          isSelected
                            ? "text-pink-700 dark:text-pink-300"
                            : isUnavailable
                              ? "text-red-700 dark:text-red-300"
                              : "text-green-700 dark:text-green-300"
                        }`}
                      >
                        {isSelected
                          ? "Selected"
                          : isUnavailable
                            ? "Unavailable"
                            : "Available"}
                      </span>
                    </span>

                    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-max max-w-64 -translate-x-1/2 rounded-xl border border-[#ded6c7] bg-white px-3 py-2 text-left text-xs text-[#3f463b] shadow-xl group-hover:block dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <span className="block font-black">
                        {space.code} · {space.name}
                      </span>

                      <span className="mt-1 block text-[#74786d] dark:text-slate-400">
                        {getSpaceTypeLabel(space)}
                      </span>

                      <span className="mt-1 block text-[#74786d] dark:text-slate-400">
                        Capacity: {space.capacity}
                      </span>

                      <span
                        className={`mt-2 block font-black ${
                          isSelected
                            ? "text-pink-600 dark:text-pink-300"
                            : isUnavailable
                              ? "text-red-600 dark:text-red-300"
                              : "text-green-700 dark:text-green-300"
                        }`}
                      >
                        {isSelected
                          ? "Currently selected"
                          : isUnavailable
                            ? "Not available for this time"
                            : "Click to select this space"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold">
            <span className="rounded-full border border-green-300 bg-green-100 px-3 py-1.5 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
              <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-green-500" />
              Available
            </span>

            <span className="rounded-full border border-red-300 bg-red-100 px-3 py-1.5 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-red-500" />
              Unavailable
            </span>

            <span className="rounded-full border border-pink-300 bg-pink-100 px-3 py-1.5 text-pink-800 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-300">
              <span className="mr-2 inline-block h-3 w-3 rounded-sm bg-pink-500" />
              Selected
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedMap.spaces.map((space) => {
              const isUnavailable =
                unavailableResourceIds.has(space.id);

              const isSelected =
                space.id === selectedSpaceId;

              return (
                <button
                  key={space.id}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => onSelectSpace(space)}
                  className={`rounded-2xl border-2 px-4 py-4 text-left transition ${
                    isSelected
                      ? "border-pink-500 bg-pink-50 ring-4 ring-pink-200/60 dark:border-pink-400 dark:bg-pink-950/30"
                      : isUnavailable
                        ? "cursor-not-allowed border-red-200 bg-red-50 opacity-70 dark:border-red-900/60 dark:bg-red-950/30"
                        : "border-green-200 bg-green-50 hover:-translate-y-0.5 hover:border-green-400 hover:shadow-md dark:border-green-900/60 dark:bg-green-950/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[#3f463b] dark:text-white">
                        {space.name}
                      </p>

                      <p className="mt-1 text-xs text-[#74786d] dark:text-slate-400">
                        {space.code} · Capacity{" "}
                        {space.capacity}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                        isSelected
                          ? "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300"
                          : isUnavailable
                            ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                            : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                      }`}
                    >
                      {isSelected
                        ? "Selected"
                        : isUnavailable
                          ? "Unavailable"
                          : "Available"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          No room image is available for the selected
          floor.
        </div>
      )}
    </section>
  );
}