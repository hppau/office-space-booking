"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBookingMaps } from "@/api/api-service";
import type { BookingMapFloor, BookingMapSpace } from "@/models/booking-map";

type BookingMapSelectorProps = {
  selectedSpaceId: number | null;
  unavailableResourceIds: Set<number>;
  onSelectSpace: (space: BookingMapSpace) => void;
};

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasValidArea(space: BookingMapSpace): boolean {
  const x = toNumber(space.xPercent);
  const y = toNumber(space.yPercent);
  const width = toNumber(space.widthPercent);
  const height = toNumber(space.heightPercent);
  return x !== null && y !== null && width !== null && height !== null && width > 0 && height > 0;
}

function getSpaceTypeLabel(space: BookingMapSpace): string {
  switch (space.type) {
    case "MEETING_ROOM": return "Meeting room";
    case "PRIVATE_ROOM": return "Private room";
    case "TRAINING_ROOM": return "Training room";
    case "HOT_DESK": return "Shared working area";
    case "DESK": return "Working area";
    case "CHAIR": return "Seating area";
    default: return "Bookable area";
  }
}

export default function BookingMapSelector({
  selectedSpaceId,
  unavailableResourceIds,
  onSelectSpace,
}: BookingMapSelectorProps) {
  const searchParams = useSearchParams();
  const requestedRoomId = Number(searchParams.get("roomId") ?? 0);
  const [maps, setMaps] = useState<BookingMapFloor[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function loadMaps() {
      try {
        setIsLoading(true);
        setLoadError("");
        const records = await getBookingMaps();
        const usableMaps = records
          .filter((map) => Boolean(map.floorPlanUrl))
          .map((map) => ({ ...map, spaces: map.spaces.filter(hasValidArea) }));
        setMaps(usableMaps);
        const requested = usableMaps.find((map) => map.id === requestedRoomId);
        setSelectedFloorId((requested ?? usableMaps[0])?.id ?? 0);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load room layouts.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadMaps();
  }, [requestedRoomId]);

  const selectedMap = useMemo(
    () => maps.find((map) => map.id === selectedFloorId) ?? null,
    [maps, selectedFloorId],
  );

  const selectedSpace = useMemo(
    () => selectedMap?.spaces.find((space) => space.id === selectedSpaceId) ?? null,
    [selectedMap, selectedSpaceId],
  );

  if (isLoading) {
    return <div className="flex min-h-[420px] items-center justify-center border-y border-slate-200 dark:border-slate-800"><div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600 dark:border-slate-700"/><p className="mt-4 text-sm font-semibold text-slate-500">Loading rooms...</p></div></div>;
  }

  if (loadError) {
    return <div className="border-y border-red-200 bg-red-50 px-6 py-10 text-center text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">{loadError}</div>;
  }

  if (maps.length === 0) {
    return <div className="border-y border-slate-200 px-6 py-12 text-center dark:border-slate-800"><h3 className="font-bold text-slate-900 dark:text-white">No room images available</h3><p className="mt-2 text-sm text-slate-500">HR must upload a room image and assign bookable areas first.</p></div>;
  }

  return (
    <section className="overflow-hidden border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="grid min-h-[650px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r dark:border-slate-800 dark:bg-slate-900/40">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-600">Rooms</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Choose a room</h3>
            <p className="mt-1 text-sm text-slate-500">Select an image to display its available areas.</p>
          </div>

          <div className="max-h-[585px] overflow-y-auto p-3">
            {maps.map((map) => {
              const active = map.id === selectedFloorId;
              const available = map.spaces.filter((space) => !unavailableResourceIds.has(space.id)).length;
              return (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => setSelectedFloorId(map.id)}
                  className={`mb-2 flex w-full gap-3 border-l-4 p-3 text-left transition ${active ? "border-orange-600 bg-white shadow-sm dark:bg-slate-950" : "border-transparent hover:bg-white dark:hover:bg-slate-950/70"}`}
                >
                  <img src={map.floorPlanUrl ?? ""} alt={`${map.name} preview`} className="h-16 w-20 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-700" />
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-slate-900 dark:text-white">{map.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{map.office.name}</span>
                    <span className={`mt-2 inline-flex text-xs font-semibold ${available > 0 ? "text-green-700 dark:text-green-300" : "text-slate-400"}`}>{available} available area{available === 1 ? "" : "s"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0">
          <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedMap?.name}</h3>
              <p className="text-sm text-slate-500">{selectedMap?.office.name} · Click a green area to select it</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <span className="flex items-center gap-2 text-green-700 dark:text-green-300"><span className="h-3 w-3 bg-green-500"/>Available</span>
              <span className="flex items-center gap-2 text-red-700 dark:text-red-300"><span className="h-3 w-3 bg-red-500"/>Unavailable</span>
              <span className="flex items-center gap-2 text-blue-700 dark:text-blue-300"><span className="h-3 w-3 bg-blue-500"/>Selected</span>
            </div>
          </header>

          <div className="p-4 sm:p-6">
            {selectedMap?.floorPlanUrl && (
              <div className="relative mx-auto max-w-5xl overflow-hidden border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                <img src={selectedMap.floorPlanUrl} alt={`${selectedMap.name} room layout`} className="pointer-events-none block w-full select-none" draggable={false}/>
                {selectedMap.spaces.map((space) => {
                  const x = toNumber(space.xPercent); const y = toNumber(space.yPercent);
                  const width = toNumber(space.widthPercent); const height = toNumber(space.heightPercent);
                  if (x === null || y === null || width === null || height === null) return null;
                  const isSelected = space.id === selectedSpaceId;
                  const unavailable = unavailableResourceIds.has(space.id) || space.status !== "ACTIVE";
                  return (
                    <button
                      key={space.id}
                      type="button"
                      disabled={unavailable}
                      onClick={() => onSelectSpace(space)}
                      title={`${space.name} · ${getSpaceTypeLabel(space)} · Capacity ${space.capacity}`}
                      className={`absolute flex items-center justify-center border-2 text-center transition ${isSelected ? "z-30 border-blue-700 bg-blue-500/55 ring-4 ring-blue-300/50" : unavailable ? "z-10 cursor-not-allowed border-red-700 bg-red-500/50" : "z-20 border-green-700 bg-green-400/45 hover:bg-green-400/65 hover:ring-4 hover:ring-green-200/60"}`}
                      style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` }}
                    >
                      <span className="max-w-[94%] truncate bg-white/90 px-2 py-1 text-[9px] font-bold text-slate-900 shadow-sm sm:text-xs dark:bg-slate-950/90 dark:text-white">{space.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            {selectedSpace ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Selected area</p><p className="mt-1 font-bold text-slate-900 dark:text-white">{selectedSpace.name} · Capacity {selectedSpace.capacity}</p></div>
                <span className="text-sm text-slate-500">{getSpaceTypeLabel(selectedSpace)}</span>
              </div>
            ) : <p className="text-sm text-slate-500">No area selected yet.</p>}
          </footer>
        </div>
      </div>
    </section>
  );
}
