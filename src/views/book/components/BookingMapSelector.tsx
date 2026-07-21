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

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
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
    case "DESK":
      return "Desk";

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

export default function BookingMapSelector({
  selectedSpaceId,
  unavailableResourceIds,
  onSelectSpace,
}: BookingMapSelectorProps) {
  const [maps, setMaps] = useState<BookingMapFloor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<number>(0);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadMaps() {
      try {
        setIsLoading(true);
        setLoadError("");

        const bookingMaps = await getBookingMaps();

        setMaps(bookingMaps);

        const firstMap = bookingMaps.find(
          (map) => map.floorPlanUrl && map.spaces.length > 0,
        );

        if (firstMap) {
          setSelectedFloorId(firstMap.id);
        }
      } catch (error) {
        console.error("Failed to load booking maps:", error);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load booking map.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadMaps();
  }, []);

  const availableMaps = useMemo(() => {
    return maps.filter((map) => map.floorPlanUrl);
  }, [maps]);

  const selectedMap = useMemo(() => {
    return availableMaps.find((map) => map.id === selectedFloorId) ?? null;
  }, [availableMaps, selectedFloorId]);

  if (isLoading) {
    return (
      <section className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e] dark:border-slate-700 dark:border-t-orange-300" />

        <p className="mt-4 text-sm font-semibold text-[#5f6658] dark:text-slate-300">
          Loading floor map...
        </p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/60 dark:bg-red-950/40">
        <p className="font-bold text-red-800 dark:text-red-200">
          Unable to load floor map
        </p>

        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          {loadError}
        </p>
      </section>
    );
  }

  if (availableMaps.length === 0) {
    return (
      <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
        <div className="text-4xl">🗺️</div>

        <h3 className="mt-3 font-bold text-amber-900 dark:text-amber-200">
          No booking map available
        </h3>

        <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
          HR needs to upload a floor plan and place spaces on the map first.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e] dark:text-orange-300">
            Floor Map
          </p>

          <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
            Select Space from Floor Map
          </h3>

          <p className="mt-2 text-sm text-[#74786d] dark:text-slate-400">
            Click a pink location pin to select a space. Hover over a pin to
            view details.
          </p>
        </div>

        <div className="w-full md:w-80">
          <select
            value={selectedFloorId}
            onChange={(event) =>
              setSelectedFloorId(Number(event.target.value))
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

      {selectedMap?.floorPlanUrl ? (
        <div className="mt-6">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-semibold text-pink-700 dark:border-pink-900/60 dark:bg-pink-950/30 dark:text-pink-300">
              Pink pin = Available
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              Red pin = Unavailable
            </div>

            <div className="rounded-2xl border border-pink-200 bg-[#fffdf6] px-4 py-3 text-sm font-semibold text-[#5f6658] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              Hover pin = View details
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm text-[#5f6658] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            Selected space:{" "}
            <span className="font-bold text-pink-500 dark:text-pink-300">
              {selectedSpaceId
                ? selectedMap.spaces.find(
                    (space) => space.id === selectedSpaceId,
                  )?.code ?? "Selected"
                : "None"}
            </span>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[#ded6c7] bg-[#f3efe3] dark:border-slate-800 dark:bg-slate-950">
            <img
              src={selectedMap.floorPlanUrl}
              alt={`${selectedMap.name} floor plan`}
              className="block w-full select-none"
              draggable={false}
            />

            {selectedMap.spaces.map((space) => {
              const x = toNumber(space.xPercent);
              const y = toNumber(space.yPercent);
              const width = toNumber(space.widthPercent);
              const height = toNumber(space.heightPercent);

              if (
                x === null ||
                y === null ||
                width === null ||
                height === null
              ) {
                return null;
              }

              const centerX = Math.max(0, Math.min(100, x + width / 2));
              const centerY = Math.max(0, Math.min(100, y + height / 2));

              const isSelected = space.id === selectedSpaceId;
              const isUnavailable = unavailableResourceIds.has(space.id);

              return (
                <button
                  key={space.id}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => onSelectSpace(space)}
                  className="group absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center disabled:cursor-not-allowed"
                  style={{
                    left: `${centerX}%`,
                    top: `${centerY}%`,
                  }}
                  title={`${space.code} - ${space.name}`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm shadow-md ring-1 transition dark:bg-slate-900 ${
                      isSelected
                        ? "scale-110 text-pink-500 ring-pink-300 dark:text-pink-300 dark:ring-pink-400"
                        : isUnavailable
                          ? "text-red-600 ring-red-300 opacity-90 dark:text-red-400 dark:ring-red-500/60"
                          : "text-pink-400 ring-pink-200 hover:scale-105 hover:text-pink-500 hover:ring-pink-300 dark:text-pink-300 dark:ring-pink-500/50"
                    }`}
                  >
                    <i className="fa-solid fa-location-dot" />
                  </span>

                  <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-56 -translate-x-1/2 rounded-xl border border-[#ded6c7] bg-white px-3 py-2 text-left text-xs font-semibold text-[#3f463b] shadow-lg group-hover:block dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                    <span className="block">
                      {space.code} · {space.name}
                    </span>

                    <span className="mt-1 block font-normal text-[#74786d] dark:text-slate-400">
                      {getSpaceTypeLabel(space)} · Capacity {space.capacity}
                    </span>

                    <span
                      className={`mt-1 block font-bold ${
                        isUnavailable
                          ? "text-red-600 dark:text-red-300"
                          : isSelected
                            ? "text-pink-500 dark:text-pink-300"
                            : "text-pink-400 dark:text-pink-300"
                      }`}
                    >
                      {isUnavailable
                        ? "Unavailable"
                        : isSelected
                          ? "Selected"
                          : "Available"}
                    </span>
                  </span>

                  <span className="sr-only">
                    {space.code} {space.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedMap.spaces.map((space) => {
              const isUnavailable = unavailableResourceIds.has(space.id);
              const isSelected = space.id === selectedSpaceId;

              return (
                <button
                  key={space.id}
                  type="button"
                  disabled={isUnavailable}
                  onClick={() => onSelectSpace(space)}
                  className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed ${
                    isSelected
                      ? "border-pink-300 bg-pink-50 dark:border-pink-500/60 dark:bg-pink-950/30"
                      : isUnavailable
                      ? "border-red-200 bg-red-50 opacity-70 dark:border-red-900/60 dark:bg-red-950/30"
                        : "border-[#ded6c7] bg-[#fffdf6] hover:bg-pink-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-pink-950/20"
                  }`}
                >
                  <p className="font-bold text-[#3f463b] dark:text-white">
                    {space.code} · {space.name}
                  </p>

                  <p className="mt-1 text-xs text-[#74786d] dark:text-slate-400">
                    {getSpaceTypeLabel(space)} · Capacity {space.capacity}
                  </p>

                  <p
                    className={`mt-2 text-xs font-bold ${
                      isUnavailable
                      ? "text-red-600 dark:text-red-300"
                        : "text-pink-500 dark:text-pink-300"
                    }`}
                  >
                    {isUnavailable ? "Unavailable" : "Available"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          No floor plan found for selected floor.
        </div>
      )}
    </section>
  );
}