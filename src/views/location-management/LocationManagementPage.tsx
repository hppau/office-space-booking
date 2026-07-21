"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createFloorForManagement,
  createManagedOffice,
  deactivateFloorForManagement,
  deactivateManagedOffice,
  getFloorsForManagement,
  getManagedOffices,
  updateFloorForManagement,
  updateManagedOffice,
  uploadFloorPlanImage,
} from "@/api/api-service";
import type {
  FloorFormData,
  ManagedFloor,
  ManagedOffice,
  OfficeFormData,
} from "@/models/location-management";

const emptyOfficeForm: OfficeFormData = {
  name: "",
  address: "",
  timezone: "Asia/Singapore",
  isActive: true,
};

const emptyFloorForm: FloorFormData = {
  name: "",
  officeId: 0,
  floorNumber: "",
  isActive: true,
};

const inputClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition placeholder:text-[#aaa08c] focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

const selectClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

const textareaClassName =
  "w-full resize-none rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition placeholder:text-[#aaa08c] focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

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

  const [activeTab, setActiveTab] = useState<"OFFICES" | "FLOORS">(
    "OFFICES",
  );

  const [officeSearch, setOfficeSearch] = useState("");
  const [floorSearch, setFloorSearch] = useState("");

  const [isOfficeFormOpen, setIsOfficeFormOpen] = useState(false);
  const [editingOfficeId, setEditingOfficeId] = useState<number | null>(
    null,
  );
  const [officeForm, setOfficeForm] =
    useState<OfficeFormData>(emptyOfficeForm);
  const [officeFormError, setOfficeFormError] = useState("");
  const [isSavingOffice, setIsSavingOffice] = useState(false);

  const [isFloorFormOpen, setIsFloorFormOpen] = useState(false);
  const [editingFloorId, setEditingFloorId] = useState<number | null>(
    null,
  );
  const [floorForm, setFloorForm] =
    useState<FloorFormData>(emptyFloorForm);
  const [floorFormError, setFloorFormError] = useState("");
  const [isSavingFloor, setIsSavingFloor] = useState(false);

  const [uploadFloor, setUploadFloor] = useState<ManagedFloor | null>(
    null,
  );
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
        console.error("Failed to load location management data:", error);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load location management data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPageData();
  }, []);

  const activeOffices = useMemo(() => {
    return offices.filter((office) => office.isActive);
  }, [offices]);

  const filteredOffices = useMemo(() => {
    const normalizedSearch = officeSearch.trim().toLowerCase();

    return offices.filter((office) => {
      return (
        !normalizedSearch ||
        office.name.toLowerCase().includes(normalizedSearch) ||
        office.timezone.toLowerCase().includes(normalizedSearch) ||
        (office.address ?? "")
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [offices, officeSearch]);

  const filteredFloors = useMemo(() => {
    const normalizedSearch = floorSearch.trim().toLowerCase();

    return floors.filter((floor) => {
      return (
        !normalizedSearch ||
        floor.name.toLowerCase().includes(normalizedSearch) ||
        floor.office.name.toLowerCase().includes(normalizedSearch) ||
        String(floor.floorNumber ?? "").includes(normalizedSearch)
      );
    });
  }, [floors, floorSearch]);

  function updateOfficeForm<K extends keyof OfficeFormData>(
    key: K,
    value: OfficeFormData[K],
  ) {
    setOfficeForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  function updateFloorForm<K extends keyof FloorFormData>(
    key: K,
    value: FloorFormData[K],
  ) {
    setFloorForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  function openCreateOfficeForm() {
    setEditingOfficeId(null);
    setOfficeForm(emptyOfficeForm);
    setOfficeFormError("");
    setActionMessage("");
    setIsOfficeFormOpen(true);
  }

  function openEditOfficeForm(office: ManagedOffice) {
    setEditingOfficeId(office.id);
    setOfficeForm({
      name: office.name,
      address: office.address ?? "",
      timezone: office.timezone,
      isActive: office.isActive,
    });
    setOfficeFormError("");
    setActionMessage("");
    setIsOfficeFormOpen(true);
  }

  function closeOfficeForm() {
    if (isSavingOffice) {
      return;
    }

    setIsOfficeFormOpen(false);
    setEditingOfficeId(null);
    setOfficeForm(emptyOfficeForm);
    setOfficeFormError("");
  }

  function openCreateFloorForm() {
    setEditingFloorId(null);
    setFloorForm({
      ...emptyFloorForm,
      officeId: activeOffices[0]?.id ?? 0,
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

  function validateOfficeForm(): string {
    if (!officeForm.name.trim()) {
      return "Office name is required.";
    }

    if (officeForm.name.trim().length > 150) {
      return "Office name cannot exceed 150 characters.";
    }

    if (officeForm.address.length > 500) {
      return "Address cannot exceed 500 characters.";
    }

    if (!officeForm.timezone.trim()) {
      return "Timezone is required.";
    }

    if (officeForm.timezone.trim().length > 100) {
      return "Timezone cannot exceed 100 characters.";
    }

    return "";
  }

  function validateFloorForm(): string {
    if (!floorForm.name.trim()) {
      return "Floor name is required.";
    }

    if (floorForm.name.trim().length > 100) {
      return "Floor name cannot exceed 100 characters.";
    }

    if (!floorForm.officeId) {
      return "Please select an office.";
    }

    if (
      floorForm.floorNumber !== "" &&
      (!Number.isInteger(Number(floorForm.floorNumber)) ||
        Number(floorForm.floorNumber) < 0)
    ) {
      return "Floor number must be 0 or above.";
    }

    return "";
  }

  async function handleSaveOffice() {
    const validationError = validateOfficeForm();

    if (validationError) {
      setOfficeFormError(validationError);
      return;
    }

    try {
      setIsSavingOffice(true);
      setOfficeFormError("");
      setActionMessage("");

      const request = {
        name: officeForm.name.trim(),
        address: officeForm.address.trim() || null,
        timezone: officeForm.timezone.trim() || "Asia/Singapore",
        isActive: officeForm.isActive,
      };

      if (editingOfficeId) {
        const updatedOffice = await updateManagedOffice(
          editingOfficeId,
          request,
        );

        setOffices((currentOffices) =>
          currentOffices.map((office) =>
            office.id === updatedOffice.id ? updatedOffice : office,
          ),
        );

        setFloors((currentFloors) =>
          currentFloors.map((floor) =>
            floor.officeId === updatedOffice.id
              ? {
                  ...floor,
                  office: {
                    ...floor.office,
                    name: updatedOffice.name,
                  },
                }
              : floor,
          ),
        );

        setActionMessage("Office updated successfully.");
      } else {
        const createdOffice = await createManagedOffice(request);

        setOffices((currentOffices) => [
          ...currentOffices,
          createdOffice,
        ]);

        setActionMessage("Office created successfully.");
      }

      setIsOfficeFormOpen(false);
      setEditingOfficeId(null);
      setOfficeForm(emptyOfficeForm);
    } catch (error) {
      setOfficeFormError(
        error instanceof Error
          ? error.message
          : "Unable to save office.",
      );
    } finally {
      setIsSavingOffice(false);
    }
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

        setActionMessage("Floor updated successfully.");
      } else {
        const createdFloor = await createFloorForManagement(request);

        setFloors((currentFloors) => [...currentFloors, createdFloor]);

        setActionMessage("Floor created successfully.");
      }

      setIsFloorFormOpen(false);
      setEditingFloorId(null);
      setFloorForm(emptyFloorForm);
    } catch (error) {
      setFloorFormError(
        error instanceof Error
          ? error.message
          : "Unable to save floor.",
      );
    } finally {
      setIsSavingFloor(false);
    }
  }

  async function handleDeactivateOffice(office: ManagedOffice) {
    const confirmed = window.confirm(
      `Deactivate office "${office.name}"? This will not delete existing floors or spaces.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionMessage("");

      const deactivatedOffice = await deactivateManagedOffice(office.id);

      setOffices((currentOffices) =>
        currentOffices.map((currentOffice) =>
          currentOffice.id === deactivatedOffice.id
            ? deactivatedOffice
            : currentOffice,
        ),
      );

      setActionMessage("Office deactivated successfully.");
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to deactivate office.",
      );
    }
  }

  async function handleDeactivateFloor(floor: ManagedFloor) {
    const confirmed = window.confirm(
      `Deactivate floor "${floor.name}"? This will not delete existing spaces.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionMessage("");

      const deactivatedFloor = await deactivateFloorForManagement(
        floor.id,
      );

      setFloors((currentFloors) =>
        currentFloors.map((currentFloor) =>
          currentFloor.id === deactivatedFloor.id
            ? deactivatedFloor
            : currentFloor,
        ),
      );

      setActionMessage("Floor deactivated successfully.");
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to deactivate floor.",
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

      setActionMessage("Floor plan uploaded successfully.");
      setUploadFloor(null);
      setSelectedFloorPlanFile(null);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Unable to upload floor plan.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  const activeOfficeCount = offices.filter((office) => office.isActive).length;
  const activeFloorCount = floors.filter((floor) => floor.isActive).length;
  const floorPlanCount = floors.filter((floor) => floor.floorPlanUrl).length;

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
                Office / Floor Management
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[#5e6558] dark:text-slate-300">
                Manage office locations, floor records, and uploaded floor
                plan images before creating bookable spaces.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openCreateOfficeForm}
                className="rounded-2xl bg-[#c65f2e] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-[#a94f26] dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                <i className="fa-solid fa-plus mr-2" />
                Add Office
              </button>

              <button
                type="button"
                onClick={openCreateFloorForm}
                disabled={activeOffices.length === 0}
                className="rounded-2xl border border-white/70 bg-white/70 px-5 py-3 font-bold text-[#5f6658] shadow-sm backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <i className="fa-solid fa-layer-group mr-2 text-[#c65f2e] dark:text-orange-300" />
                Add Floor
              </button>
            </div>
          </div>
        </div>
      </section>

      {actionMessage && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
          {actionMessage}
        </div>
      )}

      {activeOffices.length === 0 && !isLoading && !loadError && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          Please create at least one active office before creating a floor.
        </div>
      )}

      <section className="mt-8 grid gap-5 sm:grid-cols-3">
        <div className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-[#74786d] dark:text-slate-400">
            Active Offices
          </p>

          <p className="mt-3 text-4xl font-black text-[#3f463b] dark:text-white">
            {activeOfficeCount}
          </p>
        </div>

        <div className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold text-[#74786d] dark:text-slate-400">
            Active Floors
          </p>

          <p className="mt-3 text-4xl font-black text-[#3f463b] dark:text-white">
            {activeFloorCount}
          </p>
        </div>

        <div className="rounded-[2rem] border border-pink-200 bg-pink-50 p-6 dark:border-pink-900/60 dark:bg-pink-950/30">
          <p className="text-sm font-bold text-pink-700 dark:text-pink-200">
            Floor Plans
          </p>

          <p className="mt-3 text-4xl font-black text-pink-900 dark:text-pink-100">
            {floorPlanCount}
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveTab("OFFICES")}
            className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
              activeTab === "OFFICES"
                ? "bg-[#c65f2e] text-white shadow-sm dark:bg-orange-500"
                : "text-[#5f6658] hover:bg-[#fffdf6] dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Offices
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("FLOORS")}
            className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
              activeTab === "FLOORS"
                ? "bg-[#c65f2e] text-white shadow-sm dark:bg-orange-500"
                : "text-[#5f6658] hover:bg-[#fffdf6] dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Floors
          </button>
        </div>
      </section>

      {isLoading && (
        <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e] dark:border-slate-700 dark:border-t-orange-300" />

          <p className="mt-5 font-bold text-[#5f6658] dark:text-slate-300">
            Loading office and floor data...
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

      {!isLoading && !loadError && activeTab === "OFFICES" && (
        <>
          <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label
              htmlFor="office-search"
              className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
            >
              Search offices
            </label>

            <input
              id="office-search"
              type="search"
              value={officeSearch}
              onChange={(event) => setOfficeSearch(event.target.value)}
              placeholder="Search by office name, address or timezone"
              className={inputClassName}
            />
          </section>

          {filteredOffices.length === 0 ? (
            <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-5xl">🏢</div>

              <h3 className="mt-5 text-xl font-black text-[#3f463b] dark:text-white">
                No offices found
              </h3>

              <p className="mt-2 text-[#74786d] dark:text-slate-400">
                Create an office first before adding floors.
              </p>
            </section>
          ) : (
            <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#ded6c7] dark:divide-slate-800">
                  <thead className="bg-[#fffdf6] dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Office
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Address
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Timezone
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
                    {filteredOffices.map((office) => (
                      <tr
                        key={office.id}
                        className="transition hover:bg-[#fffdf6] dark:hover:bg-slate-950"
                      >
                        <td className="px-6 py-4">
                          <p className="font-black text-[#3f463b] dark:text-white">
                            {office.name}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-[#5f6658] dark:text-slate-300">
                          {office.address || "No address"}
                        </td>

                        <td className="px-6 py-4 text-sm text-[#5f6658] dark:text-slate-300">
                          {office.timezone}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getActiveStyles(
                              office.isActive,
                            )}`}
                          >
                            {getActiveLabel(office.isActive)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditOfficeForm(office)}
                              className="rounded-xl border border-[#ded6c7] bg-[#fffdf6] px-3 py-2 text-sm font-bold text-[#5f6658] transition hover:bg-[#f3efe3] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Edit
                            </button>

                            {office.isActive && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeactivateOffice(office)
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
        </>
      )}

      {!isLoading && !loadError && activeTab === "FLOORS" && (
        <>
          <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <label
              htmlFor="floor-search"
              className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
            >
              Search floors
            </label>

            <input
              id="floor-search"
              type="search"
              value={floorSearch}
              onChange={(event) => setFloorSearch(event.target.value)}
              placeholder="Search by floor name, number or office"
              className={inputClassName}
            />
          </section>

          {filteredFloors.length === 0 ? (
            <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-5xl">🏬</div>

              <h3 className="mt-5 text-xl font-black text-[#3f463b] dark:text-white">
                No floors found
              </h3>

              <p className="mt-2 text-[#74786d] dark:text-slate-400">
                Create a floor under an active office.
              </p>
            </section>
          ) : (
            <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#ded6c7] dark:divide-slate-800">
                  <thead className="bg-[#fffdf6] dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Floor
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Office
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Floor Number
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-[#87977b] dark:text-slate-500">
                        Floor Plan
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
                    {filteredFloors.map((floor) => (
                      <tr
                        key={floor.id}
                        className="transition hover:bg-[#fffdf6] dark:hover:bg-slate-950"
                      >
                        <td className="px-6 py-4">
                          <p className="font-black text-[#3f463b] dark:text-white">
                            {floor.name}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-[#5f6658] dark:text-slate-300">
                          {floor.office.name}
                        </td>

                        <td className="px-6 py-4 text-sm text-[#5f6658] dark:text-slate-300">
                          {floor.floorNumber ?? "Not set"}
                        </td>

                        <td className="px-6 py-4 text-sm text-[#5f6658] dark:text-slate-300">
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
                              className="rounded-xl border border-pink-300 bg-white px-3 py-2 text-sm font-bold text-pink-600 transition hover:bg-pink-50 dark:border-pink-500/60 dark:bg-slate-950 dark:text-pink-300 dark:hover:bg-pink-950/30"
                            >
                              Upload Plan
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditFloorForm(floor)}
                              className="rounded-xl border border-[#ded6c7] bg-[#fffdf6] px-3 py-2 text-sm font-bold text-[#5f6658] transition hover:bg-[#f3efe3] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Edit
                            </button>

                            {floor.isActive && (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeactivateFloor(floor)
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
        </>
      )}

      {isOfficeFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] text-[#3f463b] shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <header className="flex items-start justify-between border-b border-[#ded6c7] px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold text-[#c65f2e] dark:text-orange-300">
                  {editingOfficeId ? "Edit office" : "Create office"}
                </p>

                <h3 className="mt-1 text-xl font-black text-[#3f463b] dark:text-white">
                  {editingOfficeId
                    ? "Update office details"
                    : "Add new office"}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeOfficeForm}
                disabled={isSavingOffice}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[#74786d] transition hover:bg-[#fffdf6] disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </header>

            <div className="space-y-5 px-6 py-6">
              <div>
                <label
                  htmlFor="office-name"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  Office name <span className="text-red-500">*</span>
                </label>

                <input
                  id="office-name"
                  value={officeForm.name}
                  onChange={(event) =>
                    updateOfficeForm("name", event.target.value)
                  }
                  placeholder="Example: Singapore Office"
                  className={inputClassName}
                />
              </div>

              <div>
                <label
                  htmlFor="office-address"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  Address
                </label>

                <textarea
                  id="office-address"
                  value={officeForm.address}
                  onChange={(event) =>
                    updateOfficeForm("address", event.target.value)
                  }
                  rows={3}
                  maxLength={500}
                  placeholder="Office address"
                  className={textareaClassName}
                />

                <p className="mt-1 text-right text-xs text-[#9b927f] dark:text-slate-500">
                  {officeForm.address.length}/500
                </p>
              </div>

              <div>
                <label
                  htmlFor="office-timezone"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  Timezone
                </label>

                <input
                  id="office-timezone"
                  value={officeForm.timezone}
                  onChange={(event) =>
                    updateOfficeForm("timezone", event.target.value)
                  }
                  placeholder="Example: Asia/Singapore"
                  className={inputClassName}
                />
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-[#ded6c7] bg-[#fffdf6] p-4 text-sm font-bold text-[#5f6658] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={officeForm.isActive}
                  onChange={(event) =>
                    updateOfficeForm("isActive", event.target.checked)
                  }
                  className="h-4 w-4 accent-[#c65f2e]"
                />
                Office is active
              </label>

              {officeFormError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {officeFormError}
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-[#ded6c7] px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={closeOfficeForm}
                disabled={isSavingOffice}
                className="rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-5 py-3 font-bold text-[#5f6658] transition hover:bg-[#f3efe3] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSaveOffice()}
                disabled={isSavingOffice}
                className="rounded-2xl bg-[#c65f2e] px-6 py-3 font-bold text-white transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:bg-orange-300 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                {isSavingOffice
                  ? "Saving..."
                  : editingOfficeId
                    ? "Update Office"
                    : "Create Office"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {isFloorFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] text-[#3f463b] shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <header className="flex items-start justify-between border-b border-[#ded6c7] px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold text-[#c65f2e] dark:text-orange-300">
                  {editingFloorId ? "Edit floor" : "Create floor"}
                </p>

                <h3 className="mt-1 text-xl font-black text-[#3f463b] dark:text-white">
                  {editingFloorId
                    ? "Update floor details"
                    : "Add new floor"}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeFloorForm}
                disabled={isSavingFloor}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[#74786d] transition hover:bg-[#fffdf6] disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </header>

            <div className="space-y-5 px-6 py-6">
              <div>
                <label
                  htmlFor="floor-office"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  Office <span className="text-red-500">*</span>
                </label>

                <select
                  id="floor-office"
                  value={floorForm.officeId}
                  onChange={(event) =>
                    updateFloorForm(
                      "officeId",
                      Number(event.target.value),
                    )
                  }
                  className={selectClassName}
                >
                  <option value={0}>Select office</option>

                  {activeOffices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="floor-name"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  Floor name <span className="text-red-500">*</span>
                </label>

                <input
                  id="floor-name"
                  value={floorForm.name}
                  onChange={(event) =>
                    updateFloorForm("name", event.target.value)
                  }
                  placeholder="Example: Level 3"
                  className={inputClassName}
                />
              </div>

              <div>
                <label
                  htmlFor="floor-number"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  Floor number
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

              <label className="flex items-center gap-3 rounded-2xl border border-[#ded6c7] bg-[#fffdf6] p-4 text-sm font-bold text-[#5f6658] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={floorForm.isActive}
                  onChange={(event) =>
                    updateFloorForm("isActive", event.target.checked)
                  }
                  className="h-4 w-4 accent-[#c65f2e]"
                />
                Floor is active
              </label>

              {floorFormError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {floorFormError}
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-[#ded6c7] px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={closeFloorForm}
                disabled={isSavingFloor}
                className="rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-5 py-3 font-bold text-[#5f6658] transition hover:bg-[#f3efe3] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSaveFloor()}
                disabled={isSavingFloor}
                className="rounded-2xl bg-[#c65f2e] px-6 py-3 font-bold text-white transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:bg-orange-300 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                {isSavingFloor
                  ? "Saving..."
                  : editingFloorId
                    ? "Update Floor"
                    : "Create Floor"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {uploadFloor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] text-[#3f463b] shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <header className="flex items-start justify-between border-b border-[#ded6c7] px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold text-[#c65f2e] dark:text-orange-300">
                  Upload floor plan
                </p>

                <h3 className="mt-1 text-xl font-black text-[#3f463b] dark:text-white">
                  {uploadFloor.office.name} · {uploadFloor.name}
                </h3>

                <p className="mt-1 text-sm text-[#74786d] dark:text-slate-400">
                  JPG, PNG or WEBP. Maximum size 5MB.
                </p>
              </div>

              <button
                type="button"
                onClick={closeUploadFloorPlanForm}
                disabled={isUploading}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[#74786d] transition hover:bg-[#fffdf6] disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </header>

            <div className="space-y-5 px-6 py-6">
              {uploadFloor.floorPlanUrl && (
                <div className="rounded-2xl border border-[#ded6c7] bg-[#fffdf6] p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-sm font-bold text-[#5f6658] dark:text-slate-300">
                    Current floor plan
                  </p>

                  <img
                    src={uploadFloor.floorPlanUrl}
                    alt={`${uploadFloor.name} floor plan`}
                    className="mt-3 max-h-64 w-full rounded-2xl border border-[#ded6c7] object-contain dark:border-slate-700"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="floor-plan-file"
                  className="mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300"
                >
                  New floor plan image
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
                  className="w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] file:mr-4 file:rounded-xl file:border-0 file:bg-pink-50 file:px-4 file:py-2 file:font-bold file:text-pink-600 hover:file:bg-pink-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:file:bg-pink-500/20 dark:file:text-pink-300"
                />

                {selectedFloorPlanFile && (
                  <p className="mt-2 text-sm text-[#74786d] dark:text-slate-400">
                    Selected: {selectedFloorPlanFile.name}
                  </p>
                )}
              </div>

              {uploadError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {uploadError}
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-[#ded6c7] px-6 py-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={closeUploadFloorPlanForm}
                disabled={isUploading}
                className="rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-5 py-3 font-bold text-[#5f6658] transition hover:bg-[#f3efe3] disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleUploadFloorPlan()}
                disabled={isUploading}
                className="rounded-2xl bg-[#c65f2e] px-6 py-3 font-bold text-white transition hover:bg-[#a94f26] disabled:cursor-not-allowed disabled:bg-orange-300 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                {isUploading ? "Uploading..." : "Upload Floor Plan"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}