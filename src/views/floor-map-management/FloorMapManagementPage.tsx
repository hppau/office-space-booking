"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getFloorsForManagement,
  getManagedSpaces,
  removeSpaceMapPosition,
  updateSpaceMapPosition,
} from "@/api/api-service";
import type { ManagedFloor } from "@/models/location-management";
import type { ManagedSpace } from "@/models/space-management";

const selectClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

const inputClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition placeholder:text-[#aaa08c] focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

type DragPoint = {
  x: number;
  y: number;
};

type DraftArea = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export default function FloorMapManagementPage() {
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [floors, setFloors] = useState<ManagedFloor[]>([]);
  const [spaces, setSpaces] = useState<ManagedSpace[]>([]);

  const [selectedFloorId, setSelectedFloorId] =
    useState<number>(0);

  const [selectedSpaceId, setSelectedSpaceId] =
    useState<number>(0);

  const [widthPercent, setWidthPercent] = useState(10);
  const [heightPercent, setHeightPercent] = useState(10);

  const [dragStart, setDragStart] =
    useState<DragPoint | null>(null);

  const [draftArea, setDraftArea] =
    useState<DraftArea | null>(null);

  const [isDrawingArea, setIsDrawingArea] =
    useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPosition, setIsSavingPosition] =
    useState(false);

  const [loadError, setLoadError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    async function loadPageData() {
      try {
        setIsLoading(true);
        setLoadError("");

        const [floorRecords, spaceRecords] =
          await Promise.all([
            getFloorsForManagement(),
            getManagedSpaces(),
          ]);

        setFloors(floorRecords);
        setSpaces(spaceRecords);

        const firstFloorWithImage = floorRecords.find(
          (floor) =>
            floor.isActive &&
            Boolean(floor.floorPlanUrl),
        );

        if (firstFloorWithImage) {
          setSelectedFloorId(firstFloorWithImage.id);
        }
      } catch (error) {
        console.error(
          "Failed to load floor map data:",
          error,
        );

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load floor map data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPageData();
  }, []);

  const floorsWithImages = useMemo(() => {
    return floors.filter(
      (floor) =>
        floor.isActive && Boolean(floor.floorPlanUrl),
    );
  }, [floors]);

  const selectedFloor = useMemo(() => {
    return (
      floors.find(
        (floor) => floor.id === selectedFloorId,
      ) ?? null
    );
  }, [floors, selectedFloorId]);

  const spacesOnSelectedFloor = useMemo(() => {
    return spaces.filter(
      (space) =>
        space.floorId === selectedFloorId &&
        space.isActive,
    );
  }, [spaces, selectedFloorId]);

  const selectedSpace = useMemo(() => {
    return (
      spacesOnSelectedFloor.find(
        (space) => space.id === selectedSpaceId,
      ) ?? null
    );
  }, [spacesOnSelectedFloor, selectedSpaceId]);

  useEffect(() => {
    const firstSpace = spacesOnSelectedFloor[0];

    if (!selectedSpaceId && firstSpace) {
      setSelectedSpaceId(firstSpace.id);
      return;
    }

    if (
      selectedSpaceId &&
      !spacesOnSelectedFloor.some(
        (space) => space.id === selectedSpaceId,
      )
    ) {
      setSelectedSpaceId(firstSpace?.id ?? 0);
    }
  }, [selectedSpaceId, spacesOnSelectedFloor]);

  useEffect(() => {
    setDraftArea(null);
    setDragStart(null);
    setIsDrawingArea(false);

    if (!selectedSpace) {
      setWidthPercent(10);
      setHeightPercent(10);
      return;
    }

    setWidthPercent(
      toNumber(selectedSpace.widthPercent) ?? 10,
    );

    setHeightPercent(
      toNumber(selectedSpace.heightPercent) ?? 10,
    );
  }, [selectedSpace]);

  function getPointerPercent(
    event: React.PointerEvent<HTMLDivElement>,
  ): DragPoint | null {
    const mapElement = mapRef.current;

    if (!mapElement) {
      return null;
    }

    const rect = mapElement.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const x =
      ((event.clientX - rect.left) / rect.width) * 100;

    const y =
      ((event.clientY - rect.top) / rect.height) * 100;

    return {
      x: clamp(x, 0, 100),
      y: clamp(y, 0, 100),
    };
  }

  function createAreaFromPoints(
    start: DragPoint,
    end: DragPoint,
  ): DraftArea {
    return {
      xPercent: Math.min(start.x, end.x),
      yPercent: Math.min(start.y, end.y),
      widthPercent: Math.abs(end.x - start.x),
      heightPercent: Math.abs(end.y - start.y),
    };
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (
      !selectedFloor ||
      !selectedSpace ||
      isSavingPosition
    ) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const point = getPointerPercent(event);

    if (!point) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    setActionMessage("");
    setDragStart(point);
    setIsDrawingArea(true);

    setDraftArea({
      xPercent: point.x,
      yPercent: point.y,
      widthPercent: 0,
      heightPercent: 0,
    });
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (!dragStart || !isDrawingArea) {
      return;
    }

    const point = getPointerPercent(event);

    if (!point) {
      return;
    }

    setDraftArea(
      createAreaFromPoints(dragStart, point),
    );
  }

  async function saveDrawnArea(area: DraftArea) {
    if (!selectedSpace) {
      return;
    }

    if (
      area.widthPercent < 1 ||
      area.heightPercent < 1
    ) {
      window.alert(
        "Please drag a larger area. The selected area is too small.",
      );

      setDraftArea(null);
      return;
    }

    try {
      setIsSavingPosition(true);
      setActionMessage("");

      const updatedSpace =
        await updateSpaceMapPosition(
          selectedSpace.id,
          {
            xPercent: Number(
              area.xPercent.toFixed(4),
            ),
            yPercent: Number(
              area.yPercent.toFixed(4),
            ),
            widthPercent: Number(
              area.widthPercent.toFixed(4),
            ),
            heightPercent: Number(
              area.heightPercent.toFixed(4),
            ),
            rotation: 0,
            iconName: "area",
          },
        );

      setSpaces((currentSpaces) =>
        currentSpaces.map((space) =>
          space.id === updatedSpace.id
            ? updatedSpace
            : space,
        ),
      );

      setWidthPercent(
        toNumber(updatedSpace.widthPercent) ??
          area.widthPercent,
      );

      setHeightPercent(
        toNumber(updatedSpace.heightPercent) ??
          area.heightPercent,
      );

      setDraftArea(null);

      setActionMessage(
        `${updatedSpace.code} area saved successfully.`,
      );
    } catch (error) {
      setDraftArea(null);

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to save the selected area.",
      );
    } finally {
      setIsSavingPosition(false);
    }
  }

  async function handlePointerUp(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (!dragStart || !isDrawingArea) {
      return;
    }

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    const endPoint = getPointerPercent(event);

    setDragStart(null);
    setIsDrawingArea(false);

    if (!endPoint) {
      setDraftArea(null);
      return;
    }

    const completedArea = createAreaFromPoints(
      dragStart,
      endPoint,
    );

    setDraftArea(completedArea);

    await saveDrawnArea(completedArea);
  }

  function handlePointerCancel(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    setDragStart(null);
    setDraftArea(null);
    setIsDrawingArea(false);
  }

  async function handleSaveSelectedSpaceSettings() {
    if (!selectedSpace) {
      return;
    }

    const xPercent = toNumber(
      selectedSpace.xPercent,
    );

    const yPercent = toNumber(
      selectedSpace.yPercent,
    );

    if (xPercent === null || yPercent === null) {
      window.alert(
        "Please click and drag on the map first to assign this area.",
      );
      return;
    }

    if (
      !Number.isFinite(widthPercent) ||
      widthPercent <= 0 ||
      widthPercent > 100
    ) {
      window.alert(
        "Width must be greater than 0 and not more than 100.",
      );
      return;
    }

    if (
      !Number.isFinite(heightPercent) ||
      heightPercent <= 0 ||
      heightPercent > 100
    ) {
      window.alert(
        "Height must be greater than 0 and not more than 100.",
      );
      return;
    }

    const adjustedWidth = Math.min(
      widthPercent,
      100 - xPercent,
    );

    const adjustedHeight = Math.min(
      heightPercent,
      100 - yPercent,
    );

    try {
      setIsSavingPosition(true);
      setActionMessage("");

      const updatedSpace =
        await updateSpaceMapPosition(
          selectedSpace.id,
          {
            xPercent,
            yPercent,
            widthPercent: adjustedWidth,
            heightPercent: adjustedHeight,
            rotation: 0,
            iconName: "area",
          },
        );

      setSpaces((currentSpaces) =>
        currentSpaces.map((space) =>
          space.id === updatedSpace.id
            ? updatedSpace
            : space,
        ),
      );

      setWidthPercent(
        toNumber(updatedSpace.widthPercent) ??
          adjustedWidth,
      );

      setHeightPercent(
        toNumber(updatedSpace.heightPercent) ??
          adjustedHeight,
      );

      setActionMessage(
        `${updatedSpace.code} area size updated.`,
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to update area size.",
      );
    } finally {
      setIsSavingPosition(false);
    }
  }

  async function handleRemoveSelectedSpacePosition() {
    if (!selectedSpace) {
      return;
    }

    const confirmed = window.confirm(
      `Remove "${selectedSpace.code}" from this floor map?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsSavingPosition(true);
      setActionMessage("");

      const updatedSpace =
        await removeSpaceMapPosition(
          selectedSpace.id,
        );

      setSpaces((currentSpaces) =>
        currentSpaces.map((space) =>
          space.id === updatedSpace.id
            ? updatedSpace
            : space,
        ),
      );

      setDraftArea(null);

      setActionMessage(
        `${updatedSpace.code} was removed from the map.`,
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to remove space area.",
      );
    } finally {
      setIsSavingPosition(false);
    }
  }

  const placedSpaceCount =
    spacesOnSelectedFloor.filter(
      (space) =>
        space.xPercent !== null &&
        space.yPercent !== null &&
        space.widthPercent !== null &&
        space.heightPercent !== null,
    ).length;

  return (
    <div className="mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-[2.5rem] border border-[#d8d0bf] bg-[#e7e3d2] shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative bg-gradient-to-br from-[#c9d2bd] via-[#e8e3d3] to-[#f6efe2] px-8 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-[#06070b] sm:px-12">
          <div className="absolute right-[-40px] top-[-40px] h-64 w-64 rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-500/10" />

          <div className="absolute bottom-[-60px] left-[-30px] h-72 w-72 rounded-full bg-[#87977b]/30 blur-3xl dark:bg-orange-500/10" />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#6d7a64] dark:text-slate-400">
                HR Management
              </p>

              <h2 className="mt-5 text-5xl font-black tracking-tight text-white drop-shadow-sm dark:text-white sm:text-6xl">
                Floor Map Management
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[#5e6558] dark:text-slate-300">
                Draw bookable areas directly over the
                uploaded room image. Employees will later
                select these areas like seats in a movie
                booking system.
              </p>
            </div>

            <a
              href="/location-management"
              className="rounded-2xl border border-white/70 bg-white/70 px-5 py-3 text-center text-sm font-bold text-[#5f6658] shadow-sm backdrop-blur transition hover:bg-white dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <i className="fa-solid fa-building mr-2 text-[#c65f2e] dark:text-orange-300" />
              Office / Floor Management
            </a>
          </div>
        </div>
      </section>

      {actionMessage && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
          {actionMessage}
        </div>
      )}

      {isLoading && (
        <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e] dark:border-slate-700 dark:border-t-orange-300" />

          <p className="mt-5 font-bold text-[#5f6658] dark:text-slate-300">
            Loading floor map data...
          </p>
        </section>
      )}

      {!isLoading && loadError && (
        <section className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/60 dark:bg-red-950/40">
          <div className="text-4xl">⚠️</div>

          <h3 className="mt-4 text-lg font-bold text-red-900 dark:text-red-200">
            Unable to load data
          </h3>

          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </section>
      )}

      {!isLoading &&
        !loadError &&
        floorsWithImages.length === 0 && (
          <section className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="text-5xl">🗺️</div>

            <h3 className="mt-4 text-xl font-black text-amber-900 dark:text-amber-200">
              No room image uploaded yet
            </h3>

            <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
              Upload a room or floor-plan image from
              Office / Floor Management first.
            </p>
          </section>
        )}

      {!isLoading &&
        !loadError &&
        floorsWithImages.length > 0 && (
          <>
            <section className="mt-8 grid gap-5 sm:grid-cols-3">
              <div className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-bold text-[#74786d] dark:text-slate-400">
                  Floors With Plans
                </p>

                <p className="mt-3 text-4xl font-black text-[#3f463b] dark:text-white">
                  {floorsWithImages.length}
                </p>
              </div>

              <div className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-bold text-[#74786d] dark:text-slate-400">
                  Active Spaces
                </p>

                <p className="mt-3 text-4xl font-black text-[#3f463b] dark:text-white">
                  {spacesOnSelectedFloor.length}
                </p>
              </div>

              <div className="rounded-[2rem] border border-pink-200 bg-pink-50 p-6 dark:border-pink-900/60 dark:bg-pink-950/30">
                <p className="text-sm font-bold text-pink-700 dark:text-pink-200">
                  Assigned Areas
                </p>

                <p className="mt-3 text-4xl font-black text-pink-900 dark:text-pink-100">
                  {placedSpaceCount}
                </p>
              </div>
            </section>

            <section className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
              <aside className="h-fit rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-28">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e] dark:text-orange-300">
                  Map Settings
                </p>

                <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
                  Draw bookable area
                </h3>

                <div className="mt-6 space-y-5">
                  <div>
                    <label
                      htmlFor="floor-select"
                      className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                    >
                      Floor plan
                    </label>

                    <select
                      id="floor-select"
                      value={selectedFloorId}
                      onChange={(event) => {
                        setSelectedFloorId(
                          Number(event.target.value),
                        );

                        setSelectedSpaceId(0);
                        setDraftArea(null);
                        setActionMessage("");
                      }}
                      className={selectClassName}
                    >
                      {floorsWithImages.map((floor) => (
                        <option
                          key={floor.id}
                          value={floor.id}
                        >
                          {floor.office.name} ·{" "}
                          {floor.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="space-select"
                      className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                    >
                      Space / area
                    </label>

                    <select
                      id="space-select"
                      value={selectedSpaceId}
                      onChange={(event) => {
                        setSelectedSpaceId(
                          Number(event.target.value),
                        );

                        setDraftArea(null);
                        setActionMessage("");
                      }}
                      className={selectClassName}
                    >
                      <option value={0}>
                        Select space
                      </option>

                      {spacesOnSelectedFloor.map(
                        (space) => (
                          <option
                            key={space.id}
                            value={space.id}
                          >
                            {space.code} · {space.name}
                          </option>
                        ),
                      )}
                    </select>

                    {spacesOnSelectedFloor.length ===
                      0 && (
                      <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-300">
                        No active spaces found on this
                        floor. Create spaces first from
                        Space Management.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="width-percent"
                        className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                      >
                        Width %
                      </label>

                      <input
                        id="width-percent"
                        type="number"
                        min={1}
                        max={100}
                        step={0.5}
                        value={widthPercent}
                        onChange={(event) =>
                          setWidthPercent(
                            Number(event.target.value),
                          )
                        }
                        className={inputClassName}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="height-percent"
                        className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                      >
                        Height %
                      </label>

                      <input
                        id="height-percent"
                        type="number"
                        min={1}
                        max={100}
                        step={0.5}
                        value={heightPercent}
                        onChange={(event) =>
                          setHeightPercent(
                            Number(event.target.value),
                          )
                        }
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void handleSaveSelectedSpaceSettings()
                    }
                    disabled={
                      !selectedSpace ||
                      isSavingPosition
                    }
                    className="w-full rounded-2xl bg-[#c65f2e] px-5 py-3 font-bold text-white transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-orange-500 dark:hover:bg-orange-600"
                  >
                    {isSavingPosition
                      ? "Saving..."
                      : "Save Area Size"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleRemoveSelectedSpacePosition()
                    }
                    disabled={
                      !selectedSpace ||
                      isSavingPosition
                    }
                    className="w-full rounded-2xl border border-red-300 bg-white px-5 py-3 font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    Remove Area From Map
                  </button>

                  <div className="rounded-2xl border border-pink-200 bg-pink-50 p-4 text-sm font-semibold leading-6 text-pink-700 dark:border-pink-900/60 dark:bg-pink-950/30 dark:text-pink-300">
                    Select a space and then click and drag
                    across the room image. Release the
                    mouse when the required area is
                    covered.
                  </div>

                  <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
                    Green indicates an active area.
                  </div>

                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    Red indicates maintenance or an
                    inactive area.
                  </div>
                </div>
              </aside>

              <main className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {selectedFloor?.floorPlanUrl ? (
                  <>
                    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e] dark:text-orange-300">
                          Room Plan
                        </p>

                        <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
                          {
                            selectedFloor.office
                              .name
                          }{" "}
                          · {selectedFloor.name}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-[#74786d] dark:text-slate-400">
                          Choose a space from the left,
                          then click and drag across the
                          image to assign its selectable
                          booking area.
                        </p>
                      </div>

                      {isSavingPosition && (
                        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-600 dark:bg-pink-500/20 dark:text-pink-300">
                          Saving...
                        </span>
                      )}
                    </div>

                    <div
                      ref={mapRef}
                      role="application"
                      tabIndex={0}
                      onPointerDown={
                        handlePointerDown
                      }
                      onPointerMove={
                        handlePointerMove
                      }
                      onPointerUp={(event) =>
                        void handlePointerUp(event)
                      }
                      onPointerCancel={
                        handlePointerCancel
                      }
                      className={`relative touch-none overflow-hidden rounded-[2rem] border border-[#ded6c7] bg-[#f3efe3] select-none dark:border-slate-800 dark:bg-slate-950 ${
                        selectedSpace &&
                        !isSavingPosition
                          ? "cursor-crosshair"
                          : "cursor-default"
                      }`}
                    >
                      <img
                        src={
                          selectedFloor.floorPlanUrl
                        }
                        alt={`${selectedFloor.name} floor plan`}
                        className="pointer-events-none block w-full select-none"
                        draggable={false}
                      />

                      {spacesOnSelectedFloor.map(
                        (space) => {
                          const x = toNumber(
                            space.xPercent,
                          );

                          const y = toNumber(
                            space.yPercent,
                          );

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
                            space.id ===
                            selectedSpaceId;

                          const isUnavailable =
                            space.status ===
                              "MAINTENANCE" ||
                            space.status ===
                              "INACTIVE" ||
                            !space.isActive;

                          return (
                            <button
                              key={space.id}
                              type="button"
                              onPointerDown={(
                                event,
                              ) => {
                                event.stopPropagation();
                              }}
                              onClick={(event) => {
                                event.stopPropagation();

                                setSelectedSpaceId(
                                  space.id,
                                );

                                setDraftArea(null);
                              }}
                              className={`group absolute flex items-center justify-center rounded-xl border-2 transition ${
                                isSelected
                                  ? "z-20 border-pink-600 bg-pink-400/45 ring-4 ring-pink-300/40"
                                  : isUnavailable
                                    ? "z-10 border-red-700 bg-red-500/45 hover:bg-red-500/55"
                                    : "z-10 border-green-700 bg-green-400/40 hover:bg-green-400/55"
                              }`}
                              style={{
                                left: `${x}%`,
                                top: `${y}%`,
                                width: `${width}%`,
                                height: `${height}%`,
                              }}
                              title={`${space.code} - ${space.name}`}
                            >
                              <span className="pointer-events-none max-w-[90%] rounded-lg bg-white/90 px-2 py-1 text-center text-[9px] font-black leading-tight text-[#3f463b] shadow-sm backdrop-blur dark:bg-slate-950/85 dark:text-white sm:text-xs">
                                <span className="block truncate">
                                  {space.name}
                                </span>

                                <span
                                  className={`mt-0.5 block text-[8px] font-bold uppercase tracking-wide sm:text-[10px] ${
                                    isUnavailable
                                      ? "text-red-700 dark:text-red-300"
                                      : "text-green-700 dark:text-green-300"
                                  }`}
                                >
                                  {isUnavailable
                                    ? "Unavailable"
                                    : "Active Area"}
                                </span>
                              </span>

                              <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-60 -translate-x-1/2 rounded-xl border border-[#ded6c7] bg-white px-3 py-2 text-left text-xs font-semibold text-[#3f463b] shadow-xl group-hover:block dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                                <span className="block">
                                  {space.code} ·{" "}
                                  {space.name}
                                </span>

                                <span className="mt-1 block font-normal text-[#74786d] dark:text-slate-400">
                                  Capacity:{" "}
                                  {space.capacity}
                                </span>

                                <span className="mt-1 block font-normal text-[#74786d] dark:text-slate-400">
                                  Select this space and
                                  drag on the image to
                                  redraw it.
                                </span>
                              </span>
                            </button>
                          );
                        },
                      )}

                      {draftArea && (
                        <div
                          className="pointer-events-none absolute z-30 rounded-xl border-2 border-dashed border-pink-600 bg-pink-400/35 shadow-lg"
                          style={{
                            left: `${draftArea.xPercent}%`,
                            top: `${draftArea.yPercent}%`,
                            width: `${draftArea.widthPercent}%`,
                            height: `${draftArea.heightPercent}%`,
                          }}
                        >
                          <div className="absolute left-2 top-2 rounded-lg bg-pink-600 px-2 py-1 text-[10px] font-bold text-white shadow">
                            New area
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold">
                      <span className="rounded-full border border-green-300 bg-green-100 px-3 py-1.5 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
                        Active
                      </span>

                      <span className="rounded-full border border-red-300 bg-red-100 px-3 py-1.5 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />
                        Unavailable
                      </span>

                      <span className="rounded-full border border-pink-300 bg-pink-100 px-3 py-1.5 text-pink-800 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-300">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-pink-500" />
                        Selected
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    No image found for the selected
                    floor.
                  </div>
                )}
              </main>
            </section>
          </>
        )}
    </div>
  );
}