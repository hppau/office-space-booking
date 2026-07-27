"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createFloorForManagement,
  deactivateFloorForManagement,
  getFloorsForManagement,
  getManagedOffices,
  permanentlyDeleteRoom,
  updateFloorForManagement,
  uploadFloorPlanImage,
} from "@/api/api-service";
import type {
  FloorFormData,
  ManagedFloor,
  ManagedOffice,
} from "@/models/location-management";

const emptyFloorForm: FloorFormData = {
  name: "",
  officeId: 0,
  floorNumber: "",
  isActive: true,
};

const inputClassName =
  "w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-[#aaa08c] focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

function getActiveStyles(isActive: boolean): string {
  return isActive
    ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200"
    : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

function getActiveLabel(isActive: boolean): string {
  return isActive ? "Active" : "Inactive";
}

export default function LocationManagementPage() {
  const [offices, setOffices] = useState<ManagedOffice[]>([]);
  const [floors, setFloors] = useState<ManagedFloor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [floorSearch, setFloorSearch] = useState("");

  const [isFloorFormOpen, setIsFloorFormOpen] = useState(false);
  const [editingFloorId, setEditingFloorId] = useState<number | null>(null);
  const [floorForm, setFloorForm] = useState<FloorFormData>(emptyFloorForm);
  const [floorFormError, setFloorFormError] = useState("");
  const [isSavingFloor, setIsSavingFloor] = useState(false);

  const [uploadFloor, setUploadFloor] = useState<ManagedFloor | null>(null);
  const [selectedFloorPlanFile, setSelectedFloorPlanFile] =
    useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    async function loadPageData() {
      try {
        setIsLoading(true);
        setLoadError("");

        const [officeRecords, floorRecords] = await Promise.all([
          getManagedOffices(),
          getFloorsForManagement(),
        ]);

        setOffices(officeRecords);
        setFloors(floorRecords);
      } catch (error) {
        console.error("Failed to load room management data:", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load room management data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPageData();
  }, []);

  const singaporeOffice = useMemo(() => {
    return (
      offices.find(
        (office) =>
          office.isActive &&
          office.name.toLowerCase().includes("singapore"),
      ) ?? offices.find((office) => office.isActive) ?? null
    );
  }, [offices]);

  const filteredFloors = useMemo(() => {
    const normalizedSearch = floorSearch.trim().toLowerCase();

    return floors.filter((floor) => {
      return (
        !normalizedSearch ||
        floor.name.toLowerCase().includes(normalizedSearch) ||
        String(floor.floorNumber ?? "").includes(normalizedSearch) ||
        getActiveLabel(floor.isActive)
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [floors, floorSearch]);

  const activeFloorCount = floors.filter((floor) => floor.isActive).length;
  const floorPlanCount = floors.filter((floor) => floor.floorPlanUrl).length;
  const totalFloorCount = floors.length;

  function updateFloorForm<K extends keyof FloorFormData>(
    key: K,
    value: FloorFormData[K],
  ) {
    setFloorForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  function openCreateFloorForm() {
    if (!singaporeOffice) {
      setActionMessage("");
      window.alert(
        "No active Singapore office was found. Please contact the system administrator.",
      );
      return;
    }

    setEditingFloorId(null);
    setFloorForm({
      ...emptyFloorForm,
      officeId: singaporeOffice.id,
    });
    setFloorFormError("");
    setActionMessage("");
    setIsFloorFormOpen(true);
  }

  function openEditFloorForm(floor: ManagedFloor) {
    setEditingFloorId(floor.id);
    setFloorForm({
      name: floor.name,
      officeId: floor.officeId,
      floorNumber: floor.floorNumber ?? "",
      isActive: floor.isActive,
    });
    setFloorFormError("");
    setActionMessage("");
    setIsFloorFormOpen(true);
  }

  function closeFloorForm() {
    if (isSavingFloor) {
      return;
    }

    setIsFloorFormOpen(false);
    setEditingFloorId(null);
    setFloorForm(emptyFloorForm);
    setFloorFormError("");
  }

  function openUploadFloorPlanForm(floor: ManagedFloor) {
    setUploadFloor(floor);
    setSelectedFloorPlanFile(null);
    setUploadError("");
    setActionMessage("");
  }

  function closeUploadFloorPlanForm() {
    if (isUploading) {
      return;
    }

    setUploadFloor(null);
    setSelectedFloorPlanFile(null);
    setUploadError("");
  }

  function validateFloorForm(): string {
    if (!floorForm.name.trim()) {
      return "Room name is required.";
    }

    if (floorForm.name.trim().length > 100) {
      return "Room name cannot exceed 100 characters.";
    }

    if (!floorForm.officeId) {
      return "The Singapore office could not be assigned.";
    }

    if (
      floorForm.floorNumber !== "" &&
      (!Number.isInteger(Number(floorForm.floorNumber)) ||
        Number(floorForm.floorNumber) < 0)
    ) {
      return "Room number must be 0 or above.";
    }

    return "";
  }

  async function handleSaveFloor() {
    const validationError = validateFloorForm();

    if (validationError) {
      setFloorFormError(validationError);
      return;
    }

    try {
      setIsSavingFloor(true);
      setFloorFormError("");
      setActionMessage("");

      const request = {
        name: floorForm.name.trim(),
        officeId: Number(floorForm.officeId),
        floorNumber:
          floorForm.floorNumber === ""
            ? null
            : Number(floorForm.floorNumber),
        isActive: floorForm.isActive,
      };

      if (editingFloorId) {
        const updatedFloor = await updateFloorForManagement(
          editingFloorId,
          request,
        );

        setFloors((currentFloors) =>
          currentFloors.map((floor) =>
            floor.id === updatedFloor.id ? updatedFloor : floor,
          ),
        );

        setActionMessage("Room updated successfully.");
      } else {
        const createdFloor = await createFloorForManagement(request);
        setFloors((currentFloors) => [...currentFloors, createdFloor]);
        setActionMessage("Room created successfully.");
      }

      setIsFloorFormOpen(false);
      setEditingFloorId(null);
      setFloorForm(emptyFloorForm);
    } catch (error) {
      setFloorFormError(
        error instanceof Error ? error.message : "Unable to save room.",
      );
    } finally {
      setIsSavingFloor(false);
    }
  }

  async function handleDeactivateFloor(floor: ManagedFloor) {
    const confirmed = window.confirm(
      `Deactivate room "${floor.name}"? This will not delete existing bookable areas.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionMessage("");
      const deactivatedFloor = await deactivateFloorForManagement(floor.id);

      setFloors((currentFloors) =>
        currentFloors.map((currentFloor) =>
          currentFloor.id === deactivatedFloor.id
            ? deactivatedFloor
            : currentFloor,
        ),
      );

      setActionMessage("Room deactivated successfully.");
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to deactivate room.",
      );
    }
  }

  async function handleDeleteFloor(floor: ManagedFloor) {
    const confirmed = window.confirm(
      `Permanently delete room "${floor.name}"?\n\nAll spaces inside this room will also be deleted. This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionMessage("");

      const result = await permanentlyDeleteRoom(floor.id);

      setFloors((currentFloors) =>
        currentFloors.filter((currentFloor) => currentFloor.id !== floor.id),
      );

      setActionMessage(
        result?.message ?? "Room permanently deleted successfully.",
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to permanently delete room.",
      );
    }
  }

  async function handleUploadFloorPlan() {
    if (!uploadFloor) {
      return;
    }

    if (!selectedFloorPlanFile) {
      setUploadError("Please choose an image file.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");
      setActionMessage("");

      const updatedFloor = await uploadFloorPlanImage(
        uploadFloor.id,
        selectedFloorPlanFile,
      );

      setFloors((currentFloors) =>
        currentFloors.map((floor) =>
          floor.id === updatedFloor.id ? updatedFloor : floor,
        ),
      );

      setActionMessage("Room image uploaded successfully.");
      setUploadFloor(null);
      setSelectedFloorPlanFile(null);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Unable to upload room image.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#c9d2bd] via-[#e8e3d3] to-[#f6efe2] px-6 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-[#06070b] sm:px-8">
          <div className="absolute right-[-40px] top-[-40px] h-64 w-64 rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-500/10" />
          <div className="absolute bottom-[-60px] left-[-30px] h-72 w-72 rounded-full bg-[#87977b]/30 blur-3xl dark:bg-orange-500/10" />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#6d7a64] dark:text-slate-400">
                HR Management
              </p>

              <h2 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
                Room Management
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5e6558] dark:text-slate-300">
                Create rooms, upload room images, and manage the bookable
                areas shown on each room layout.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-4 py-2 text-sm font-bold text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                <i className="fa-solid fa-location-dot text-[#c65f2e] dark:text-orange-300" />
                {singaporeOffice?.name ?? "Singapore Office"}
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateFloorForm}
              disabled={!singaporeOffice}
              className="rounded-md bg-[#c65f2e] px-5 py-3 font-bold text-white transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-500 dark:hover:bg-orange-600"
            >
              <i className="fa-solid fa-door-open mr-2" />
              Add Room
            </button>
          </div>
        </div>
      </section>

      {actionMessage && (
        <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
          {actionMessage}
        </div>
      )}

      {!singaporeOffice && !isLoading && !loadError && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          No active Singapore office was found. Room creation is temporarily
          unavailable.
        </div>
      )}

      <section className="mt-8 grid gap-5 sm:grid-cols-3">
        <div className="border-b-2 border-[#c65f2e] bg-white px-1 py-5 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Total Rooms
          </p>
          <p className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
            {totalFloorCount}
          </p>
        </div>

        <div className="border-b-2 border-green-500 bg-white px-1 py-5 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Active Rooms
          </p>
          <p className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
            {activeFloorCount}
          </p>
        </div>

        <div className="border-b-2 border-pink-500 bg-white px-1 py-5 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Room Images
          </p>
          <p className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
            {floorPlanCount}
          </p>
        </div>
      </section>

      {isLoading && (
        <section className="mt-8 border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e] dark:border-slate-700 dark:border-t-orange-300" />
          <p className="mt-5 font-bold text-slate-700 dark:text-slate-300">
            Loading room data...
          </p>
        </section>
      )}

      {!isLoading && loadError && (
        <section className="mt-8 border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/60 dark:bg-red-950/40">
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
            className="mt-6 rounded-md bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </section>
      )}

      {!isLoading && !loadError && (
        <>
          <section className="mt-8 border-y border-slate-200 bg-white py-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-xl">
                <label
                  htmlFor="floor-search"
                  className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Search rooms
                </label>
                <input
                  id="floor-search"
                  type="search"
                  value={floorSearch}
                  onChange={(event) => setFloorSearch(event.target.value)}
                  placeholder="Search by room name, number or status"
                  className={inputClassName}
                />
              </div>

              <button
                type="button"
                onClick={openCreateFloorForm}
                disabled={!singaporeOffice}
                className="rounded-md bg-[#c65f2e] px-5 py-3 font-bold text-white transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                <i className="fa-solid fa-plus mr-2" />
                Add Room
              </button>
            </div>
          </section>

          {filteredFloors.length === 0 ? (
            <section className="mt-8 border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="text-5xl">🏬</div>
              <h3 className="mt-5 text-xl font-black text-slate-900 dark:text-white">
                No rooms found
              </h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400">
                Create the first room for the Singapore office.
              </p>
            </section>
          ) : (
            <section className="mt-8 overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Room
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Room Number
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Room Image
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {filteredFloors.map((floor) => (
                      <tr
                        key={floor.id}
                        className="transition hover:bg-slate-50 dark:hover:bg-slate-950"
                      >
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-900 dark:text-white">
                            {floor.name}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                          {floor.floorNumber ?? "Not set"}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                          {floor.floorPlanUrl ? (
                            <a
                              href={floor.floorPlanUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 transition hover:bg-green-200 dark:bg-green-500/20 dark:text-green-200 dark:hover:bg-green-500/30"
                            >
                              View image
                            </a>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              No image
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getActiveStyles(
                              floor.isActive,
                            )}`}
                          >
                            {getActiveLabel(floor.isActive)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openUploadFloorPlanForm(floor)}
                              className="rounded-md border border-pink-300 bg-white px-3 py-2 text-sm font-bold text-pink-600 transition hover:bg-pink-50 dark:border-pink-500/60 dark:bg-slate-950 dark:text-pink-300 dark:hover:bg-pink-950/30"
                            >
                              Upload Image
                            </button>

                            <Link
                              href={`/room-area-management?roomId=${floor.id}`}
                              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                            >
                              <i className="fa-solid fa-map-location-dot" />
                              Manage Areas
                            </Link>

                            <button
                              type="button"
                              onClick={() => openEditFloorForm(floor)}
                              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Edit
                            </button>

                            {floor.isActive && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeactivateFloor(floor)
                                }
                                className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30"
                              >
                                Deactivate
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => void handleDeleteFloor(floor)}
                              className="rounded-md bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                            >
                              <i className="fa-solid fa-trash mr-2" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {isFloorFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold text-[#c65f2e] dark:text-orange-300">
                  {editingFloorId ? "Edit room" : "Create room"}
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {editingFloorId ? "Update room details" : "Add new room"}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Location: {singaporeOffice?.name ?? "Singapore Office"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeFloorForm}
                disabled={isSavingFloor}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </header>

            <div className="space-y-5 px-6 py-6">
              <div>
                <label
                  htmlFor="floor-name"
                  className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Room name <span className="text-red-500">*</span>
                </label>
                <input
                  id="floor-name"
                  value={floorForm.name}
                  onChange={(event) =>
                    updateFloorForm("name", event.target.value)
                  }
                  placeholder="Example: Meeting Room A"
                  className={inputClassName}
                />
              </div>

              <div>
                <label
                  htmlFor="floor-number"
                  className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Room number
                </label>
                <input
                  id="floor-number"
                  type="number"
                  min={0}
                  value={floorForm.floorNumber}
                  onChange={(event) =>
                    updateFloorForm(
                      "floorNumber",
                      event.target.value === ""
                        ? ""
                        : Number(event.target.value),
                    )
                  }
                  placeholder="Example: 3"
                  className={inputClassName}
                />
              </div>

              <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={floorForm.isActive}
                  onChange={(event) =>
                    updateFloorForm("isActive", event.target.checked)
                  }
                  className="h-4 w-4 accent-[#c65f2e]"
                />
                Room is active
              </label>

              {floorFormError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {floorFormError}
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={closeFloorForm}
                disabled={isSavingFloor}
                className="rounded-md border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSaveFloor()}
                disabled={isSavingFloor}
                className="rounded-md bg-[#c65f2e] px-6 py-3 font-bold text-white transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:bg-orange-300 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                {isSavingFloor
                  ? "Saving..."
                  : editingFloorId
                    ? "Update Room"
                    : "Create Room"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {uploadFloor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white text-slate-900 shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold text-[#c65f2e] dark:text-orange-300">
                  Upload room image
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  {uploadFloor.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  JPG, PNG or WEBP. Maximum size 5MB.
                </p>
              </div>

              <button
                type="button"
                onClick={closeUploadFloorPlanForm}
                disabled={isUploading}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </header>

            <div className="space-y-5 px-6 py-6">
              {uploadFloor.floorPlanUrl && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Current room image
                  </p>
                  <img
                    src={uploadFloor.floorPlanUrl}
                    alt={`${uploadFloor.name} room image`}
                    className="mt-3 max-h-64 w-full rounded-md border border-slate-200 object-contain dark:border-slate-700"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="floor-plan-file"
                  className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  New room image
                </label>
                <input
                  id="floor-plan-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setSelectedFloorPlanFile(
                      event.target.files?.[0] ?? null,
                    )
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 file:mr-4 file:rounded-md file:border-0 file:bg-pink-50 file:px-4 file:py-2 file:font-bold file:text-pink-600 hover:file:bg-pink-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:file:bg-pink-500/20 dark:file:text-pink-300"
                />

                {selectedFloorPlanFile && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Selected: {selectedFloorPlanFile.name}
                  </p>
                )}
              </div>

              {uploadError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {uploadError}
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={closeUploadFloorPlanForm}
                disabled={isUploading}
                className="rounded-md border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleUploadFloorPlan()}
                disabled={isUploading}
                className="rounded-md bg-[#c65f2e] px-6 py-3 font-bold text-white transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:bg-orange-300 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                {isUploading ? "Uploading..." : "Upload Room Image"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}