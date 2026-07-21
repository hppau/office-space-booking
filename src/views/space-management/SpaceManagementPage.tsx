"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createManagedSpace,
  deactivateManagedSpace,
  getManagedFloors,
  getManagedSpaces,
  updateManagedSpace,
} from "@/api/api-service";
import type {
  ManagedFloor,
  ManagedSpace,
  SpaceFormData,
} from "@/models/space-management";
import type {
  ResourceStatus,
  ResourceType,
} from "@/models/resource";

const emptyForm: SpaceFormData = {
  code: "",
  name: "",
  type: "DESK",
  status: "ACTIVE",
  capacity: 1,
  description: "",
  amenitiesText: "",
  requiresApproval: true,
  requiresManager: false,
  floorId: 0,
};

const inputClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition placeholder:text-[#aaa08c] focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

const selectClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

const textareaClassName =
  "w-full resize-none rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition placeholder:text-[#aaa08c] focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

function getStatusStyles(status: ResourceStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200";

    case "MAINTENANCE":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200";

    case "BLOCKED":
      return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200";

    case "INACTIVE":
      return "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

function getTypeLabel(type: ResourceType): string {
  switch (type) {
    case "DESK":
      return "Desk";

    case "CHAIR":
      return "Chair";

    case "HOT_DESK":
      return "Hot Desk";

    case "MEETING_ROOM":
      return "Meeting Room";

    case "PRIVATE_ROOM":
      return "Private Room";

    case "TRAINING_ROOM":
      return "Training Room";

    case "OTHER":
      return "Other";
  }
}

function getAmenitiesText(space: ManagedSpace): string {
  if (!Array.isArray(space.amenities)) {
    return "";
  }

  return space.amenities
    .filter((item): item is string => typeof item === "string")
    .join(", ");
}

function convertFormToRequest(form: SpaceFormData) {
  const amenities = form.amenitiesText
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return {
    code: form.code.trim(),
    name: form.name.trim(),
    type: form.type,
    status: form.status,
    capacity: Number(form.capacity),
    description: form.description.trim() || null,
    amenities,
    requiresApproval: form.requiresApproval,
    requiresManager: form.requiresManager,
    floorId: Number(form.floorId),
  };
}

export default function SpaceManagementPage() {
  const [spaces, setSpaces] = useState<ManagedSpace[]>([]);
  const [floors, setFloors] = useState<ManagedFloor[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ResourceStatus | "ALL">("ALL");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(
    null,
  );

  const [form, setForm] = useState<SpaceFormData>(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    async function loadPageData() {
      try {
        setIsLoading(true);
        setLoadError("");

        const [spaceRecords, floorRecords] = await Promise.all([
          getManagedSpaces(),
          getManagedFloors(),
        ]);

        setSpaces(spaceRecords);
        setFloors(floorRecords);
      } catch (error) {
        console.error("Failed to load space management data:", error);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load space management data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPageData();
  }, []);

  const availableFloors = useMemo(() => {
    return [...floors].sort((a, b) =>
      `${a.office.name} ${a.name}`.localeCompare(
        `${b.office.name} ${b.name}`,
      ),
    );
  }, [floors]);

  const filteredSpaces = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return spaces.filter((space) => {
      const matchesStatus =
        statusFilter === "ALL" || space.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        space.code.toLowerCase().includes(normalizedSearch) ||
        space.name.toLowerCase().includes(normalizedSearch) ||
        space.floor.name.toLowerCase().includes(normalizedSearch) ||
        space.floor.office.name
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [spaces, search, statusFilter]);

  function openCreateForm() {
    const firstFloorId = availableFloors[0]?.id ?? 0;

    setEditingSpaceId(null);
    setForm({
      ...emptyForm,
      floorId: firstFloorId,
    });
    setFormError("");
    setActionMessage("");
    setIsFormOpen(true);
  }

  function openEditForm(space: ManagedSpace) {
    setEditingSpaceId(space.id);
    setForm({
      code: space.code,
      name: space.name,
      type: space.type,
      status: space.status,
      capacity: space.capacity,
      description: space.description ?? "",
      amenitiesText: getAmenitiesText(space),
      requiresApproval: space.requiresApproval,
      requiresManager: space.requiresManager,
      floorId: space.floorId,
    });
    setFormError("");
    setActionMessage("");
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingSpaceId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function updateForm<K extends keyof SpaceFormData>(
    key: K,
    value: SpaceFormData[K],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  function validateForm(): string {
    if (!form.code.trim()) {
      return "Space code is required.";
    }

    if (!form.name.trim()) {
      return "Space name is required.";
    }

    if (!form.floorId) {
      return "Please select a floor.";
    }

    if (!Number.isInteger(Number(form.capacity)) || form.capacity < 1) {
      return "Capacity must be at least 1.";
    }

    if (form.description.length > 500) {
      return "Description cannot exceed 500 characters.";
    }

    return "";
  }

  async function handleSaveSpace() {
    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setFormError("");
      setActionMessage("");

      const request = convertFormToRequest(form);

      if (editingSpaceId) {
        const updatedSpace = await updateManagedSpace(
          editingSpaceId,
          request,
        );

        setSpaces((currentSpaces) =>
          currentSpaces.map((space) =>
            space.id === updatedSpace.id ? updatedSpace : space,
          ),
        );

        setActionMessage("Space updated successfully.");
      } else {
        const createdSpace = await createManagedSpace(request);

        setSpaces((currentSpaces) => [...currentSpaces, createdSpace]);

        setActionMessage("Space created successfully.");
      }

      setIsFormOpen(false);
      setEditingSpaceId(null);
      setForm(emptyForm);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save space.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateSpace(space: ManagedSpace) {
    const confirmed = window.confirm(
      `Deactivate ${space.code} - ${space.name}? This will set the space status to INACTIVE.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionMessage("");

      const deactivatedSpace = await deactivateManagedSpace(space.id);

      setSpaces((currentSpaces) =>
        currentSpaces.map((currentSpace) =>
          currentSpace.id === deactivatedSpace.id
            ? deactivatedSpace
            : currentSpace,
        ),
      );

      setActionMessage("Space deactivated successfully.");
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to deactivate space.",
      );
    }
  }

  const activeCount = spaces.filter((space) => space.status === "ACTIVE").length;
  const maintenanceCount = spaces.filter(
    (space) => space.status === "MAINTENANCE",
  ).length;
  const inactiveCount = spaces.filter(
    (space) => space.status === "INACTIVE",
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
                Space Management
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[#5e6558] dark:text-slate-300">
                Create, update, and manage bookable office spaces used for
                employee workspace reservations.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              disabled={availableFloors.length === 0}
              className="rounded-2xl bg-[#c65f2e] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-orange-500 dark:hover:bg-orange-600"
            >
              <i className="fa-solid fa-plus mr-2" />
              Add Space
            </button>
          </div>
        </div>
      </section>

      {availableFloors.length === 0 && !isLoading && !loadError && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          No floors found. Please create an office and floor first before
          adding spaces.
        </div>
      )}

      {actionMessage && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
          {actionMessage}
        </div>
      )}

      <section className="mt-8 grid gap-5 sm:grid-cols-4">
        <div className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-[#74786d] dark:text-slate-400">
            Total Spaces
          </p>

          <p className="mt-3 text-4xl font-black text-[#3f463b] dark:text-white">
            {spaces.length}
          </p>
        </div>

        <div className="rounded-[2rem] border border-green-200 bg-green-50 p-6 dark:border-green-900/60 dark:bg-green-950/30">
          <p className="text-sm font-bold text-green-700 dark:text-green-200">
            Active
          </p>

          <p className="mt-3 text-4xl font-black text-green-900 dark:text-green-100">
            {activeCount}
          </p>
        </div>

        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/60 dark:bg-amber-950/30">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-200">
            Maintenance
          </p>

          <p className="mt-3 text-4xl font-black text-amber-900 dark:text-amber-100">
            {maintenanceCount}
          </p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
            Inactive
          </p>

          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">
            {inactiveCount}
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <label
              htmlFor="space-search"
              className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
            >
              Search
            </label>

            <input
              id="space-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by code, name, office or floor"
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="status-filter"
              className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
            >
              Status
            </label>

            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as ResourceStatus | "ALL",
                )
              }
              className={selectClassName}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="BLOCKED">Blocked</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </section>

      {isLoading && (
        <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e] dark:border-slate-700 dark:border-t-orange-300" />

          <p className="mt-5 font-bold text-[#5f6658] dark:text-slate-300">
            Loading spaces...
          </p>
        </section>
      )}

      {!isLoading && loadError && (
        <section className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/60 dark:bg-red-950/40">
          <div className="text-4xl">⚠️</div>

          <h3 className="mt-4 text-lg font-bold text-red-900 dark:text-red-200">
            Unable to load spaces
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

      {!isLoading && !loadError && filteredSpaces.length === 0 && (
        <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-5xl">🏢</div>

          <h3 className="mt-5 text-xl font-black text-[#3f463b] dark:text-white">
            No spaces found
          </h3>

          <p className="mt-2 text-[#74786d] dark:text-slate-400">
            Add a new space or adjust your filter.
          </p>
        </section>
      )}

      {!isLoading && !loadError && filteredSpaces.length > 0 && (
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#ded6c7] dark:divide-slate-800">
              <thead className="bg-[#fffdf6] dark:bg-slate-950">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                    Space
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                    Location
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                    Type
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                    Capacity
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                    Approval
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#ded6c7] bg-[#f8f3e7] dark:divide-slate-800 dark:bg-slate-900">
                {filteredSpaces.map((space) => (
                  <tr
                    key={space.id}
                    className="transition hover:bg-[#fffdf6] dark:hover:bg-slate-950"
                  >
                    <td className="px-6 py-4">
                      <p className="font-black text-[#3f463b] dark:text-white">
                        {space.code}
                      </p>

                      <p className="mt-1 text-sm text-[#74786d] dark:text-slate-400">
                        {space.name}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-[#5f6658] dark:text-slate-300">
                      {space.floor.office.name}
                      <br />
                      <span className="text-[#9b927f] dark:text-slate-500">
                        {space.floor.name}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm font-bold text-[#5f6658] dark:text-slate-300">
                      {getTypeLabel(space.type)}
                    </td>

                    <td className="px-6 py-4 text-sm font-bold text-[#5f6658] dark:text-slate-300">
                      {space.capacity}
                    </td>

                    <td className="px-6 py-4 text-sm text-[#5f6658] dark:text-slate-300">
                      {space.requiresManager && (
                        <span className="mr-2 rounded-full bg-[#eef0e2] px-3 py-1 text-xs font-bold text-[#74786d] dark:bg-slate-800 dark:text-slate-300">
                          Manager
                        </span>
                      )}

                      {space.requiresApproval && (
                        <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-600 dark:bg-pink-500/20 dark:text-pink-300">
                          HR
                        </span>
                      )}

                      {!space.requiresManager &&
                        !space.requiresApproval && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            Auto
                          </span>
                        )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyles(
                          space.status,
                        )}`}
                      >
                        {space.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(space)}
                          className="rounded-xl border border-[#ded6c7] bg-[#fffdf6] px-3 py-2 text-sm font-bold text-[#5f6658] transition hover:bg-[#f3efe3] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Edit
                        </button>

                        {space.status !== "INACTIVE" && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleDeactivateSpace(space)
                            }
                            className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] text-[#3f463b] shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <header className="flex items-start justify-between border-b border-[#ded6c7] px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold text-[#c65f2e] dark:text-orange-300">
                  {editingSpaceId ? "Edit space" : "Create space"}
                </p>

                <h3 className="mt-1 text-xl font-black text-[#3f463b] dark:text-white">
                  {editingSpaceId
                    ? "Update office space"
                    : "Add new office space"}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[#74786d] transition hover:bg-[#fffdf6] disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </header>

            <div className="space-y-5 px-6 py-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="space-code"
                    className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                  >
                    Space code <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="space-code"
                    value={form.code}
                    onChange={(event) =>
                      updateForm("code", event.target.value)
                    }
                    placeholder="Example: A-01"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label
                    htmlFor="space-name"
                    className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                  >
                    Space name <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="space-name"
                    value={form.name}
                    onChange={(event) =>
                      updateForm("name", event.target.value)
                    }
                    placeholder="Example: Desk A-01"
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="space-type-form"
                    className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                  >
                    Type
                  </label>

                  <select
                    id="space-type-form"
                    value={form.type}
                    onChange={(event) =>
                      updateForm(
                        "type",
                        event.target.value as ResourceType,
                      )
                    }
                    className={selectClassName}
                  >
                    <option value="DESK">Desk</option>
                    <option value="CHAIR">Chair</option>
                    <option value="HOT_DESK">Hot desk</option>
                    <option value="MEETING_ROOM">Meeting room</option>
                    <option value="PRIVATE_ROOM">Private room</option>
                    <option value="TRAINING_ROOM">Training room</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="space-status-form"
                    className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                  >
                    Status
                  </label>

                  <select
                    id="space-status-form"
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value as ResourceStatus,
                      )
                    }
                    className={selectClassName}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="space-capacity"
                    className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                  >
                    Capacity
                  </label>

                  <input
                    id="space-capacity"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(event) =>
                      updateForm(
                        "capacity",
                        Number(event.target.value),
                      )
                    }
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="space-floor"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  Floor
                </label>

                <select
                  id="space-floor"
                  value={form.floorId}
                  onChange={(event) =>
                    updateForm("floorId", Number(event.target.value))
                  }
                  className={selectClassName}
                >
                  <option value={0}>Select floor</option>

                  {availableFloors.map((floorOption) => (
                    <option
                      key={floorOption.id}
                      value={floorOption.id}
                    >
                      {floorOption.office.name} · {floorOption.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="space-description"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  Description
                </label>

                <textarea
                  id="space-description"
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  rows={3}
                  maxLength={500}
                  placeholder="Optional description for this space"
                  className={textareaClassName}
                />

                <p className="mt-1 text-right text-xs text-[#9b927f] dark:text-slate-500">
                  {form.description.length}/500
                </p>
              </div>

              <div>
                <label
                  htmlFor="space-amenities"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  Amenities
                </label>

                <input
                  id="space-amenities"
                  value={form.amenitiesText}
                  onChange={(event) =>
                    updateForm("amenitiesText", event.target.value)
                  }
                  placeholder="Example: Monitor, Power socket, Whiteboard"
                  className={inputClassName}
                />

                <p className="mt-1 text-xs text-[#9b927f] dark:text-slate-500">
                  Separate amenities with commas.
                </p>
              </div>

              <div className="rounded-[2rem] border border-[#ded6c7] bg-[#fffdf6] p-5 dark:border-slate-800 dark:bg-slate-950">
                <p className="font-black text-[#3f463b] dark:text-white">
                  Approval requirement
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-2xl border border-[#ded6c7] bg-[#f8f3e7] p-4 text-sm font-bold text-[#5f6658] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.requiresManager}
                      onChange={(event) =>
                        updateForm(
                          "requiresManager",
                          event.target.checked,
                        )
                      }
                      className="h-4 w-4 accent-[#c65f2e]"
                    />
                    Requires Manager approval
                  </label>

                  <label className="flex items-center gap-3 rounded-2xl border border-[#ded6c7] bg-[#f8f3e7] p-4 text-sm font-bold text-[#5f6658] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.requiresApproval}
                      onChange={(event) =>
                        updateForm(
                          "requiresApproval",
                          event.target.checked,
                        )
                      }
                      className="h-4 w-4 accent-[#c65f2e]"
                    />
                    Requires HR approval
                  </label>
                </div>
              </div>

              {formError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {formError}
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-[#ded6c7] px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                className="rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-5 py-3 font-bold text-[#5f6658] transition hover:bg-[#f3efe3] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSaveSpace()}
                disabled={isSaving}
                className="rounded-2xl bg-[#c65f2e] px-6 py-3 font-bold text-white transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:bg-orange-300 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                {isSaving
                  ? "Saving..."
                  : editingSpaceId
                    ? "Update Space"
                    : "Create Space"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}