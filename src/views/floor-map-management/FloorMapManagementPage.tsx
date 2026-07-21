"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function FloorMapManagementPage() {
  const [floors, setFloors] = useState<ManagedFloor[]>([]);
  const [spaces, setSpaces] = useState<ManagedSpace[]>([]);

  const [selectedFloorId, setSelectedFloorId] = useState<number>(0);
  const [selectedSpaceId, setSelectedSpaceId] = useState<number>(0);

  const [widthPercent, setWidthPercent] = useState(5);
  const [heightPercent, setHeightPercent] = useState(5);
  const [rotation, setRotation] = useState(0);
  const [iconName, setIconName] = useState("desk");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPosition, setIsSavingPosition] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    async function loadPageData() {
      try {
        setIsLoading(true);
        setLoadError("");

        const [floorRecords, spaceRecords] = await Promise.all([
          getFloorsForManagement(),
          getManagedSpaces(),
        ]);

        setFloors(floorRecords);
        setSpaces(spaceRecords);

        const firstFloorWithImage = floorRecords.find(
          (floor) => floor.isActive && floor.floorPlanUrl,
        );

        if (firstFloorWithImage) {
          setSelectedFloorId(firstFloorWithImage.id);
        }
      } catch (error) {
        console.error("Failed to load floor map data:", error);

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
    return floors.filter((floor) => floor.isActive && floor.floorPlanUrl);
  }, [floors]);

  const selectedFloor = useMemo(() => {
    return floors.find((floor) => floor.id === selectedFloorId) ?? null;
  }, [floors, selectedFloorId]);

  const spacesOnSelectedFloor = useMemo(() => {
    return spaces.filter(
      (space) => space.floorId === selectedFloorId && space.isActive,
    );
  }, [spaces, selectedFloorId]);

  const selectedSpace = useMemo(() => {
    return (
      spacesOnSelectedFloor.find((space) => space.id === selectedSpaceId) ??
      null
    );
  }, [spacesOnSelectedFloor, selectedSpaceId]);

  useEffect(() => {
    const firstSpace = spacesOnSelectedFloor[0];

    if (!selectedSpaceId && firstSpace) {
      setSelectedSpaceId(firstSpace.id);
    }

    if (
      selectedSpaceId &&
      !spacesOnSelectedFloor.some((space) => space.id === selectedSpaceId)
    ) {
      setSelectedSpaceId(firstSpace?.id ?? 0);
    }
  }, [selectedSpaceId, spacesOnSelectedFloor]);

  useEffect(() => {
    if (!selectedSpace) {
      return;
    }

    setWidthPercent(toNumber(selectedSpace.widthPercent) ?? 5);
    setHeightPercent(toNumber(selectedSpace.heightPercent) ?? 5);
    setRotation(toNumber(selectedSpace.rotation) ?? 0);
    setIconName(selectedSpace.iconName || "desk");
  }, [selectedSpace]);

  async function handleMapClick(
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) {
    if (!selectedFloor || !selectedSpace) {
      return;
    }

    const mapElement = event.currentTarget;
    const rect = mapElement.getBoundingClientRect();

    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const xPercentValue = (clickX / rect.width) * 100;
    const yPercentValue = (clickY / rect.height) * 100;

    const adjustedXPercent = Math.max(
      0,
      Math.min(100 - widthPercent, xPercentValue - widthPercent / 2),
    );

    const adjustedYPercent = Math.max(
      0,
      Math.min(100 - heightPercent, yPercentValue - heightPercent / 2),
    );

    try {
      setIsSavingPosition(true);
      setActionMessage("");

      const updatedSpace = await updateSpaceMapPosition(selectedSpace.id, {
        xPercent: Number(adjustedXPercent.toFixed(4)),
        yPercent: Number(adjustedYPercent.toFixed(4)),
        widthPercent,
        heightPercent,
        rotation,
        iconName,
      });

      setSpaces((currentSpaces) =>
        currentSpaces.map((space) =>
          space.id === updatedSpace.id ? updatedSpace : space,
        ),
      );

      setActionMessage(`${updatedSpace.code} position saved successfully.`);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to save space position.",
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

      const updatedSpace = await removeSpaceMapPosition(selectedSpace.id);

      setSpaces((currentSpaces) =>
        currentSpaces.map((space) =>
          space.id === updatedSpace.id ? updatedSpace : space,
        ),
      );

      setActionMessage(`${updatedSpace.code} was removed from the map.`);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to remove space position.",
      );
    } finally {
      setIsSavingPosition(false);
    }
  }

  async function handleSaveSelectedSpaceSettings() {
    if (!selectedSpace) {
      return;
    }

    const xPercent = toNumber(selectedSpace.xPercent);
    const yPercent = toNumber(selectedSpace.yPercent);

    if (xPercent === null || yPercent === null) {
      window.alert("Please click on the map first to place this space.");
      return;
    }

    try {
      setIsSavingPosition(true);
      setActionMessage("");

      const updatedSpace = await updateSpaceMapPosition(selectedSpace.id, {
        xPercent,
        yPercent,
        widthPercent,
        heightPercent,
        rotation,
        iconName,
      });

      setSpaces((currentSpaces) =>
        currentSpaces.map((space) =>
          space.id === updatedSpace.id ? updatedSpace : space,
        ),
      );

      setActionMessage(`${updatedSpace.code} settings updated.`);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to update space settings.",
      );
    } finally {
      setIsSavingPosition(false);
    }
  }

  const placedSpaceCount = spacesOnSelectedFloor.filter(
    (space) => space.xPercent !== null && space.yPercent !== null,
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
                Place workspace location pins on uploaded floor plan images
                so employees can book spaces visually.
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

      {!isLoading && !loadError && floorsWithImages.length === 0 && (
        <section className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="text-5xl">🗺️</div>

          <h3 className="mt-4 text-xl font-black text-amber-900 dark:text-amber-200">
            No floor plan image uploaded yet
          </h3>

          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
            Please upload a floor plan image from Office / Floor Management
            first.
          </p>
        </section>
      )}

      {!isLoading && !loadError && floorsWithImages.length > 0 && (
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
                Placed Pins
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
                Place workspace pin
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
                      setSelectedFloorId(Number(event.target.value));
                      setSelectedSpaceId(0);
                      setActionMessage("");
                    }}
                    className={selectClassName}
                  >
                    {floorsWithImages.map((floor) => (
                      <option key={floor.id} value={floor.id}>
                        {floor.office.name} · {floor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="space-select"
                    className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                  >
                    Space
                  </label>

                  <select
                    id="space-select"
                    value={selectedSpaceId}
                    onChange={(event) => {
                      setSelectedSpaceId(Number(event.target.value));
                      setActionMessage("");
                    }}
                    className={selectClassName}
                  >
                    <option value={0}>Select space</option>

                    {spacesOnSelectedFloor.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.code} · {space.name}
                      </option>
                    ))}
                  </select>

                  {spacesOnSelectedFloor.length === 0 && (
                    <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-300">
                      No active spaces found on this floor. Create spaces first
                      from Space Management.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="icon-name"
                    className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                  >
                    Space type icon for employee view
                  </label>

                  <select
                    id="icon-name"
                    value={iconName}
                    onChange={(event) => setIconName(event.target.value)}
                    className={selectClassName}
                  >
                    <option value="desk">Desk</option>
                    <option value="seat">Seat</option>
                    <option value="meeting-room">Meeting Room</option>
                    <option value="phone-booth">Phone Booth</option>
                  </select>
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
                      max={50}
                      step={0.5}
                      value={widthPercent}
                      onChange={(event) =>
                        setWidthPercent(Number(event.target.value))
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
                      max={50}
                      step={0.5}
                      value={heightPercent}
                      onChange={(event) =>
                        setHeightPercent(Number(event.target.value))
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rotation"
                    className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                  >
                    Rotation
                  </label>

                  <input
                    id="rotation"
                    type="number"
                    min={-360}
                    max={360}
                    step={5}
                    value={rotation}
                    onChange={(event) =>
                      setRotation(Number(event.target.value))
                    }
                    className={inputClassName}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleSaveSelectedSpaceSettings()}
                  disabled={!selectedSpace || isSavingPosition}
                  className="w-full rounded-2xl bg-[#c65f2e] px-5 py-3 font-bold text-white transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-orange-500 dark:hover:bg-orange-600"
                >
                  {isSavingPosition ? "Saving..." : "Save Icon Settings"}
                </button>

                <button
                  type="button"
                  onClick={() => void handleRemoveSelectedSpacePosition()}
                  disabled={!selectedSpace || isSavingPosition}
                  className="w-full rounded-2xl border border-red-300 bg-white px-5 py-3 font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  Remove From Map
                </button>

                <div className="rounded-2xl border border-pink-200 bg-pink-50 p-4 text-sm font-semibold text-pink-700 dark:border-pink-900/60 dark:bg-pink-950/30 dark:text-pink-300">
                  Select a space, then click directly on the floor plan image.
                  The pink location pin will be placed on the selected point.
                </div>
              </div>
            </aside>

            <main className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {selectedFloor?.floorPlanUrl ? (
                <>
                  <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e] dark:text-orange-300">
                        Floor Plan
                      </p>

                      <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
                        {selectedFloor.office.name} · {selectedFloor.name}
                      </h3>

                      <p className="mt-2 text-sm text-[#74786d] dark:text-slate-400">
                        Click on the image to place the selected space.
                        Hover over a pin to view details.
                      </p>
                    </div>

                    {isSavingPosition && (
                      <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-600 dark:bg-pink-500/20 dark:text-pink-300">
                        Saving...
                      </span>
                    )}
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(event) => void handleMapClick(event)}
                    className="relative overflow-hidden rounded-[2rem] border border-[#ded6c7] bg-[#f3efe3] dark:border-slate-800 dark:bg-slate-950"
                  >
                    <img
                      src={selectedFloor.floorPlanUrl}
                      alt={`${selectedFloor.name} floor plan`}
                      className="block w-full select-none"
                      draggable={false}
                    />

                    {spacesOnSelectedFloor.map((space) => {
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

                      const centerX = x + width / 2;
                      const centerY = y + height / 2;

                      const isSelected = space.id === selectedSpaceId;

                      return (
                        <button
                          key={space.id}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedSpaceId(space.id);
                          }}
                          className="group absolute flex -translate-x-1/2 -translate-y-full items-center justify-center"
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
                                : "text-pink-400 ring-pink-200 hover:scale-105 hover:text-pink-500 hover:ring-pink-300 dark:text-pink-300 dark:ring-pink-500/50"
                            }`}
                          >
                            <i className="fa-solid fa-location-dot" />
                          </span>

                          <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-56 -translate-x-1/2 rounded-xl border border-[#ded6c7] bg-white px-3 py-2 text-left text-xs font-semibold text-[#3f463b] shadow-lg group-hover:block dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                            <span className="block">
                              {space.code} · {space.name}
                            </span>

                            <span className="mt-1 block font-normal text-[#74786d] dark:text-slate-400">
                              {space.floor.office.name} · {space.floor.name}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  No image found for selected floor.
                </div>
              )}
            </main>
          </section>
        </>
      )}
    </div>
  );
}