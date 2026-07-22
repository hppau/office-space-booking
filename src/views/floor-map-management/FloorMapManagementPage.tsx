"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createManagedSpace,
  deactivateManagedSpace,
  getFloorsForManagement,
  getManagedSpaces,
  removeSpaceMapPosition,
  updateManagedSpace,
  updateSpaceMapPosition,
} from "@/api/api-service";

import type { ManagedFloor } from "@/models/location-management";
import type {
  CreateSpaceRequest,
  ManagedSpace,
  SpaceMapPositionRequest,
  UpdateSpaceRequest,
} from "@/models/space-management";
import type {
  ResourceStatus,
  ResourceType,
} from "@/models/resource";

const selectClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

const inputClassName =
  "w-full rounded-2xl border border-[#ded6c7] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[#3f463b] outline-none transition placeholder:text-[#aaa08c] focus:border-[#c65f2e] focus:ring-2 focus:ring-[#c65f2e]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-orange-300 dark:focus:ring-orange-300/20";

const labelClassName =
  "mb-2 block text-sm font-bold text-[#5f6658] dark:text-slate-300";

const resourceTypes: Array<{
  value: ResourceType;
  label: string;
}> = [
  { value: "DESK", label: "Desk" },
  { value: "CHAIR", label: "Chair" },
  { value: "MEETING_ROOM", label: "Meeting Room" },
  { value: "PRIVATE_ROOM", label: "Private Room" },
  { value: "TRAINING_ROOM", label: "Training Room" },
  { value: "HOT_DESK", label: "Hot Desk" },
  { value: "OTHER", label: "Other" },
];

const resourceStatuses: Array<{
  value: ResourceStatus;
  label: string;
}> = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "BLOCKED", label: "Blocked" },
];

type EditorMode = "select" | "draw" | "duplicate";
type ResizeHandle = "nw" | "ne" | "sw" | "se";

type Point = {
  x: number;
  y: number;
};

type Rect = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type SpaceForm = {
  code: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  capacity: number;
  description: string;
  amenitiesText: string;
  requiresApproval: boolean;
  requiresManager: boolean;
};

type Interaction =
  | {
      type: "draw";
      pointerId: number;
      start: Point;
    }
  | {
      type: "move";
      pointerId: number;
      spaceId: number;
      pointerStart: Point;
      originalRect: Rect;
      hasMoved: boolean;
    }
  | {
      type: "resize";
      pointerId: number;
      spaceId: number;
      originalRect: Rect;
      handle: ResizeHandle;
    }
  | null;

type CreateModalState = {
  mode: "create" | "duplicate";
  rect: Rect;
  form: SpaceForm;
} | null;

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

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function roundPercent(value: number): number {
  return Number(value.toFixed(4));
}

function rectFromSpace(space: ManagedSpace): Rect | null {
  const xPercent = toNumber(space.xPercent);
  const yPercent = toNumber(space.yPercent);
  const widthPercent = toNumber(space.widthPercent);
  const heightPercent = toNumber(space.heightPercent);

  if (
    xPercent === null ||
    yPercent === null ||
    widthPercent === null ||
    heightPercent === null
  ) {
    return null;
  }

  return {
    xPercent,
    yPercent,
    widthPercent,
    heightPercent,
  };
}

function createRect(start: Point, end: Point): Rect {
  return {
    xPercent: Math.min(start.x, end.x),
    yPercent: Math.min(start.y, end.y),
    widthPercent: Math.abs(end.x - start.x),
    heightPercent: Math.abs(end.y - start.y),
  };
}

function emptySpaceForm(): SpaceForm {
  return {
    code: "",
    name: "",
    type: "MEETING_ROOM",
    status: "ACTIVE",
    capacity: 1,
    description: "",
    amenitiesText: "",
    requiresApproval: true,
    requiresManager: false,
  };
}

function spaceFormFromSpace(space: ManagedSpace): SpaceForm {
  const amenities = Array.isArray(space.amenities)
    ? space.amenities
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .join(", ")
    : "";

  return {
    code: space.code,
    name: space.name,
    type: space.type,
    status: space.status,
    capacity: space.capacity,
    description: space.description ?? "",
    amenitiesText: amenities,
    requiresApproval: space.requiresApproval,
    requiresManager: space.requiresManager,
  };
}

function buildSpaceRequest(
  form: SpaceForm,
  floorId: number,
): CreateSpaceRequest {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    type: form.type,
    status: form.status,
    capacity: Number(form.capacity),
    description: form.description.trim() || null,
    amenities: form.amenitiesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    requiresApproval: form.requiresApproval,
    requiresManager: form.requiresManager,
    floorId,
  };
}

function buildMapRequest(
  rect: Rect,
): SpaceMapPositionRequest {
  return {
    xPercent: roundPercent(rect.xPercent),
    yPercent: roundPercent(rect.yPercent),
    widthPercent: roundPercent(rect.widthPercent),
    heightPercent: roundPercent(rect.heightPercent),
    rotation: 0,
    iconName: "area",
  };
}

export default function FloorMapManagementPage() {
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [floors, setFloors] = useState<ManagedFloor[]>([]);
  const [spaces, setSpaces] = useState<ManagedSpace[]>([]);

  const [selectedFloorId, setSelectedFloorId] =
    useState(0);
  const [selectedSpaceId, setSelectedSpaceId] =
    useState(0);

  const [mode, setMode] =
    useState<EditorMode>("select");
  const [interaction, setInteraction] =
    useState<Interaction>(null);
  const [draftRect, setDraftRect] =
    useState<Rect | null>(null);

  const [menuSpaceId, setMenuSpaceId] =
    useState<number | null>(null);

  const [createModal, setCreateModal] =
    useState<CreateModalState>(null);
  const [editModalOpen, setEditModalOpen] =
    useState(false);
  const [assignModalOpen, setAssignModalOpen] =
    useState(false);

  const [editForm, setEditForm] =
    useState<SpaceForm>(emptySpaceForm());
  const [editRect, setEditRect] =
    useState<Rect | null>(null);
  const [assignTargetId, setAssignTargetId] =
    useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionMessage, setActionMessage] =
    useState("");

  const floorsWithPlans = useMemo(
    () =>
      floors.filter(
        (floor) =>
          floor.isActive &&
          Boolean(floor.floorPlanUrl),
      ),
    [floors],
  );

  const selectedFloor = useMemo(
    () =>
      floors.find(
        (floor) => floor.id === selectedFloorId,
      ) ?? null,
    [floors, selectedFloorId],
  );

  const spacesOnSelectedFloor = useMemo(
    () =>
      spaces.filter(
        (space) =>
          space.floorId === selectedFloorId &&
          space.isActive,
      ),
    [spaces, selectedFloorId],
  );

  const selectedSpace = useMemo(
    () =>
      spacesOnSelectedFloor.find(
        (space) => space.id === selectedSpaceId,
      ) ?? null,
    [spacesOnSelectedFloor, selectedSpaceId],
  );

  const unplacedSpaces = useMemo(
    () =>
      spacesOnSelectedFloor.filter(
        (space) => rectFromSpace(space) === null,
      ),
    [spacesOnSelectedFloor],
  );

  const placedSpaceCount = useMemo(
    () =>
      spacesOnSelectedFloor.filter(
        (space) => rectFromSpace(space) !== null,
      ).length,
    [spacesOnSelectedFloor],
  );

  useEffect(() => {
    async function loadData() {
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

        const firstFloor = floorRecords.find(
          (floor) =>
            floor.isActive &&
            Boolean(floor.floorPlanUrl),
        );

        if (firstFloor) {
          setSelectedFloorId(firstFloor.id);
        }
      } catch (error) {
        console.error(error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load floor map data.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  useEffect(() => {
    setSelectedSpaceId(0);
    setMenuSpaceId(null);
    setMode("select");
    setDraftRect(null);
    setInteraction(null);
    setActionMessage("");
  }, [selectedFloorId]);

  useEffect(() => {
    if (!selectedSpace) {
      setEditForm(emptySpaceForm());
      setEditRect(null);
      return;
    }

    setEditForm(spaceFormFromSpace(selectedSpace));
    setEditRect(rectFromSpace(selectedSpace));
  }, [selectedSpace]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setMenuSpaceId(null);
      setMode("select");
      setDraftRect(null);
      setInteraction(null);
      setCreateModal(null);
      setEditModalOpen(false);
      setAssignModalOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () =>
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
  }, []);

  function getPoint(
    clientX: number,
    clientY: number,
  ): Point | null {
    const map = mapRef.current;

    if (!map) {
      return null;
    }

    const bounds = map.getBoundingClientRect();

    if (bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }

    return {
      x: clamp(
        ((clientX - bounds.left) / bounds.width) *
          100,
        0,
        100,
      ),
      y: clamp(
        ((clientY - bounds.top) / bounds.height) *
          100,
        0,
        100,
      ),
    };
  }

  function replaceSpace(updatedSpace: ManagedSpace) {
    setSpaces((current) =>
      current.map((space) =>
        space.id === updatedSpace.id
          ? updatedSpace
          : space,
      ),
    );
  }

  function updateSpaceRectLocally(
    spaceId: number,
    rect: Rect,
  ) {
    setSpaces((current) =>
      current.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              xPercent: String(
                roundPercent(rect.xPercent),
              ),
              yPercent: String(
                roundPercent(rect.yPercent),
              ),
              widthPercent: String(
                roundPercent(rect.widthPercent),
              ),
              heightPercent: String(
                roundPercent(rect.heightPercent),
              ),
            }
          : space,
      ),
    );

    if (spaceId === selectedSpaceId) {
      setEditRect(rect);
    }
  }

  function selectSpace(space: ManagedSpace) {
    setSelectedSpaceId(space.id);
    setMenuSpaceId(space.id);
    setMode("select");
    setActionMessage("");
  }

  function openEditModal(space: ManagedSpace) {
    setSelectedSpaceId(space.id);
    setEditForm(spaceFormFromSpace(space));
    setEditRect(rectFromSpace(space));
    setEditModalOpen(true);
    setMenuSpaceId(null);
  }

  function startDuplicate(space: ManagedSpace) {
    const rect = rectFromSpace(space);

    if (!rect) {
      return;
    }

    setSelectedSpaceId(space.id);
    setMode("duplicate");
    setMenuSpaceId(null);
    setActionMessage(
      "Click on the floor plan where the duplicate should be placed.",
    );
  }

  function openAssignModal(space: ManagedSpace) {
    setSelectedSpaceId(space.id);
    setAssignTargetId(0);
    setAssignModalOpen(true);
    setMenuSpaceId(null);
  }

  function beginMapAction(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (
      event.button !== 0 ||
      isSaving ||
      !selectedFloor
    ) {
      return;
    }

    const point = getPoint(
      event.clientX,
      event.clientY,
    );

    if (!point) {
      return;
    }

    if (mode === "select") {
      setMenuSpaceId(null);
      setSelectedSpaceId(0);
      return;
    }

    if (mode === "duplicate") {
      if (!selectedSpace) {
        setMode("select");
        return;
      }

      const sourceRect = rectFromSpace(selectedSpace);

      if (!sourceRect) {
        setMode("select");
        return;
      }

      const duplicateRect: Rect = {
        xPercent: clamp(
          point.x - sourceRect.widthPercent / 2,
          0,
          100 - sourceRect.widthPercent,
        ),
        yPercent: clamp(
          point.y - sourceRect.heightPercent / 2,
          0,
          100 - sourceRect.heightPercent,
        ),
        widthPercent: sourceRect.widthPercent,
        heightPercent: sourceRect.heightPercent,
      };

      setDraftRect(duplicateRect);
      setCreateModal({
        mode: "duplicate",
        rect: duplicateRect,
        form: {
          ...spaceFormFromSpace(selectedSpace),
          code: `${selectedSpace.code}-COPY`,
          name: `${selectedSpace.name} Copy`,
        },
      });
      return;
    }

    event.preventDefault();
    mapRef.current?.setPointerCapture(
      event.pointerId,
    );

    setSelectedSpaceId(0);
    setMenuSpaceId(null);
    setDraftRect({
      xPercent: point.x,
      yPercent: point.y,
      widthPercent: 0,
      heightPercent: 0,
    });

    setInteraction({
      type: "draw",
      pointerId: event.pointerId,
      start: point,
    });
  }

  function beginMove(
    event: React.PointerEvent<HTMLButtonElement>,
    space: ManagedSpace,
  ) {
    if (mode !== "select" || isSaving) {
      return;
    }

    const point = getPoint(
      event.clientX,
      event.clientY,
    );
    const rect = rectFromSpace(space);

    if (!point || !rect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    mapRef.current?.setPointerCapture(
      event.pointerId,
    );

    setSelectedSpaceId(space.id);
    setInteraction({
      type: "move",
      pointerId: event.pointerId,
      spaceId: space.id,
      pointerStart: point,
      originalRect: rect,
      hasMoved: false,
    });
  }

  function beginResize(
    event: React.PointerEvent<HTMLSpanElement>,
    space: ManagedSpace,
    handle: ResizeHandle,
  ) {
    if (isSaving) {
      return;
    }

    const rect = rectFromSpace(space);

    if (!rect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    mapRef.current?.setPointerCapture(
      event.pointerId,
    );

    setSelectedSpaceId(space.id);
    setMenuSpaceId(null);
    setInteraction({
      type: "resize",
      pointerId: event.pointerId,
      spaceId: space.id,
      originalRect: rect,
      handle,
    });
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (!interaction) {
      return;
    }

    const point = getPoint(
      event.clientX,
      event.clientY,
    );

    if (!point) {
      return;
    }

    if (interaction.type === "draw") {
      setDraftRect(
        createRect(interaction.start, point),
      );
      return;
    }

    if (interaction.type === "move") {
      const deltaX =
        point.x - interaction.pointerStart.x;
      const deltaY =
        point.y - interaction.pointerStart.y;

      if (
        Math.abs(deltaX) > 0.1 ||
        Math.abs(deltaY) > 0.1
      ) {
        setInteraction({
          ...interaction,
          hasMoved: true,
        });
      }

      const nextRect: Rect = {
        ...interaction.originalRect,
        xPercent: clamp(
          interaction.originalRect.xPercent + deltaX,
          0,
          100 -
            interaction.originalRect.widthPercent,
        ),
        yPercent: clamp(
          interaction.originalRect.yPercent + deltaY,
          0,
          100 -
            interaction.originalRect.heightPercent,
        ),
      };

      updateSpaceRectLocally(
        interaction.spaceId,
        nextRect,
      );
      return;
    }

    const original = interaction.originalRect;
    const minimum = 1;

    let left = original.xPercent;
    let top = original.yPercent;
    let right =
      original.xPercent + original.widthPercent;
    let bottom =
      original.yPercent + original.heightPercent;

    if (interaction.handle.includes("w")) {
      left = clamp(point.x, 0, right - minimum);
    }

    if (interaction.handle.includes("e")) {
      right = clamp(
        point.x,
        left + minimum,
        100,
      );
    }

    if (interaction.handle.includes("n")) {
      top = clamp(point.y, 0, bottom - minimum);
    }

    if (interaction.handle.includes("s")) {
      bottom = clamp(
        point.y,
        top + minimum,
        100,
      );
    }

    updateSpaceRectLocally(interaction.spaceId, {
      xPercent: left,
      yPercent: top,
      widthPercent: right - left,
      heightPercent: bottom - top,
    });
  }

  async function finishPointerAction(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (!interaction) {
      return;
    }

    if (
      mapRef.current?.hasPointerCapture(
        interaction.pointerId,
      )
    ) {
      mapRef.current.releasePointerCapture(
        interaction.pointerId,
      );
    }

    const completedInteraction = interaction;
    setInteraction(null);

    if (completedInteraction.type === "draw") {
      const point = getPoint(
        event.clientX,
        event.clientY,
      );

      const rect =
        point === null
          ? draftRect
          : createRect(
              completedInteraction.start,
              point,
            );

      if (
        !rect ||
        rect.widthPercent < 1 ||
        rect.heightPercent < 1
      ) {
        setDraftRect(null);
        window.alert(
          "Please draw a larger rectangle.",
        );
        return;
      }

      setDraftRect(rect);
      setCreateModal({
        mode: "create",
        rect,
        form: emptySpaceForm(),
      });
      return;
    }

    if (
      completedInteraction.type === "move" &&
      !completedInteraction.hasMoved
    ) {
      const clickedSpace = spaces.find(
        (space) =>
          space.id === completedInteraction.spaceId,
      );

      if (clickedSpace) {
        selectSpace(clickedSpace);
      }
      return;
    }

    const changedSpace = spaces.find(
      (space) =>
        space.id === completedInteraction.spaceId,
    );
    const changedRect = changedSpace
      ? rectFromSpace(changedSpace)
      : null;

    if (!changedRect) {
      return;
    }

    try {
      setIsSaving(true);

      const updated =
        await updateSpaceMapPosition(
          completedInteraction.spaceId,
          buildMapRequest(changedRect),
        );

      replaceSpace(updated);
      setActionMessage(
        completedInteraction.type === "move"
          ? `${updated.code} moved successfully.`
          : `${updated.code} resized successfully.`,
      );
    } catch (error) {
      updateSpaceRectLocally(
        completedInteraction.spaceId,
        completedInteraction.originalRect,
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to save the rectangle.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function cancelPointerAction() {
    if (
      interaction &&
      interaction.type !== "draw"
    ) {
      updateSpaceRectLocally(
        interaction.spaceId,
        interaction.originalRect,
      );
    }

    setInteraction(null);
    setDraftRect(null);
  }

  async function handleCreateSpace() {
    if (!createModal || !selectedFloor) {
      return;
    }

    const request = buildSpaceRequest(
      createModal.form,
      selectedFloor.id,
    );

    if (!request.code) {
      window.alert("Space code is required.");
      return;
    }

    if (!request.name) {
      window.alert("Space name is required.");
      return;
    }

    if (
      !Number.isInteger(request.capacity) ||
      request.capacity < 1
    ) {
      window.alert(
        "Capacity must be a whole number of at least 1.",
      );
      return;
    }

    try {
      setIsSaving(true);
      setActionMessage("");

      const created =
        await createManagedSpace(request);

      const positioned =
        await updateSpaceMapPosition(
          created.id,
          buildMapRequest(createModal.rect),
        );

      setSpaces((current) => [
        ...current,
        positioned,
      ]);
      setSelectedSpaceId(positioned.id);
      setCreateModal(null);
      setDraftRect(null);
      setMode("select");
      setActionMessage(
        `${positioned.code} created and placed successfully.`,
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to create the space.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (
      !selectedSpace ||
      !selectedFloor ||
      !editRect
    ) {
      return;
    }

    const request = buildSpaceRequest(
      editForm,
      selectedFloor.id,
    ) as UpdateSpaceRequest;

    try {
      setIsSaving(true);

      const details = await updateManagedSpace(
        selectedSpace.id,
        request,
      );

      const position =
        await updateSpaceMapPosition(
          selectedSpace.id,
          buildMapRequest(editRect),
        );

      const merged: ManagedSpace = {
        ...details,
        ...position,
      };

      replaceSpace(merged);
      setEditModalOpen(false);
      setActionMessage(
        `${merged.code} updated successfully.`,
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to save changes.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssignExistingSpace() {
    if (
      !selectedSpace ||
      !assignTargetId
    ) {
      window.alert(
        "Choose an unassigned space first.",
      );
      return;
    }

    const sourceRect = rectFromSpace(selectedSpace);

    if (!sourceRect) {
      return;
    }

    try {
      setIsSaving(true);

      const target =
        await updateSpaceMapPosition(
          assignTargetId,
          buildMapRequest(sourceRect),
        );

      const source =
        await removeSpaceMapPosition(
          selectedSpace.id,
        );

      replaceSpace(source);
      replaceSpace(target);
      setSelectedSpaceId(target.id);
      setAssignModalOpen(false);
      setActionMessage(
        `${target.code} is now assigned to this rectangle.`,
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to assign the space.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveFromMap(
    space: ManagedSpace,
  ) {
    const confirmed = window.confirm(
      `Remove "${space.code}" from the floor plan? The space record will remain.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsSaving(true);

      const updated =
        await removeSpaceMapPosition(space.id);

      replaceSpace(updated);
      setSelectedSpaceId(0);
      setMenuSpaceId(null);
      setActionMessage(
        `${updated.code} was removed from the floor plan.`,
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to remove the rectangle.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivate(
    space: ManagedSpace,
  ) {
    const confirmed = window.confirm(
      `Deactivate "${space.code}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsSaving(true);

      const updated =
        await deactivateManagedSpace(space.id);

      replaceSpace(updated);
      setSelectedSpaceId(0);
      setMenuSpaceId(null);
      setActionMessage(
        `${updated.code} was deactivated.`,
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to deactivate the space.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function renderResizeHandle(
    space: ManagedSpace,
    handle: ResizeHandle,
    positionClass: string,
    cursorClass: string,
  ) {
    return (
      <span
        role="button"
        tabIndex={-1}
        onPointerDown={(event) =>
          beginResize(event, space, handle)
        }
        className={`absolute z-50 h-4 w-4 rounded-sm border-2 border-pink-700 bg-white shadow ${positionClass} ${cursorClass}`}
      />
    );
  }

  function closeCreateModal() {
    setCreateModal(null);
    setDraftRect(null);
    setMode("select");
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <section className="overflow-hidden rounded-[2.5rem] border border-[#d8d0bf] bg-[#e7e3d2] shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative bg-gradient-to-br from-[#c9d2bd] via-[#e8e3d3] to-[#f6efe2] px-8 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-[#06070b] sm:px-12">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#6d7a64] dark:text-slate-400">
            HR Management
          </p>

          <h2 className="mt-5 text-5xl font-black tracking-tight text-white drop-shadow-sm sm:text-6xl">
            Floor Map Designer
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-7 text-[#5e6558] dark:text-slate-300">
            Create and manage bookable areas directly on
            the floor plan.
          </p>
        </div>
      </section>

      {actionMessage && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
          {actionMessage}
        </div>
      )}

      {isLoading && (
        <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ded5c2] border-t-[#c65f2e]" />
          <p className="mt-5 font-bold text-[#5f6658] dark:text-slate-300">
            Loading floor map...
          </p>
        </section>
      )}

      {!isLoading && loadError && (
        <section className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-bold text-red-700">
            {loadError}
          </p>
        </section>
      )}

      {!isLoading &&
        !loadError &&
        floorsWithPlans.length > 0 && (
          <>
            <section className="mt-8 grid gap-5 sm:grid-cols-3">
              <div className="rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-bold text-[#74786d] dark:text-slate-400">
                  Floors With Plans
                </p>
                <p className="mt-3 text-4xl font-black text-[#3f463b] dark:text-white">
                  {floorsWithPlans.length}
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
                  Placed Areas
                </p>
                <p className="mt-3 text-4xl font-black text-pink-900 dark:text-pink-100">
                  {placedSpaceCount}
                </p>
              </div>
            </section>

            <section className="mt-8 rounded-[2rem] border border-[#d8d0bf] bg-[#f8f3e7] p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="grid w-full gap-4 sm:grid-cols-[minmax(220px,360px)_auto] sm:items-end xl:w-auto">
                  <div>
                    <label
                      htmlFor="floor-select"
                      className={labelClassName}
                    >
                      Floor
                    </label>

                    <select
                      id="floor-select"
                      value={selectedFloorId}
                      onChange={(event) =>
                        setSelectedFloorId(
                          Number(event.target.value),
                        )
                      }
                      className={selectClassName}
                    >
                      {floorsWithPlans.map((floor) => (
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

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("select");
                        setDraftRect(null);
                        setMenuSpaceId(null);
                        setActionMessage("");
                      }}
                      className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                        mode === "select"
                          ? "bg-[#3f463b] text-white"
                          : "border border-[#ded6c7] bg-white text-[#5f6658] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                      }`}
                    >
                      Select
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMode("draw");
                        setDraftRect(null);
                        setMenuSpaceId(null);
                        setActionMessage(
                          "Drag on the floor plan to create a new space.",
                        );
                      }}
                      className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${
                        mode === "draw"
                          ? "bg-[#c65f2e] text-white"
                          : "border border-[#ded6c7] bg-white text-[#5f6658] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                      }`}
                    >
                      + Draw New Space
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isSaving && (
                    <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      Saving...
                    </span>
                  )}

                  <a
                    href="/location-management"
                    className="rounded-2xl border border-[#ded6c7] bg-white px-5 py-3 text-sm font-bold text-[#5f6658] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  >
                    Office / Floor Management
                  </a>
                </div>
              </div>

              <div
                ref={mapRef}
                role="application"
                tabIndex={0}
                onPointerDown={beginMapAction}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) =>
                  void finishPointerAction(event)
                }
                onPointerCancel={cancelPointerAction}
                onContextMenu={(event) =>
                  event.preventDefault()
                }
                className={`relative touch-none overflow-visible rounded-[2rem] border border-[#ded6c7] bg-[#f3efe3] select-none dark:border-slate-800 dark:bg-slate-950 ${
                  mode === "draw"
                    ? "cursor-crosshair"
                    : mode === "duplicate"
                      ? "cursor-copy"
                      : "cursor-default"
                }`}
              >
                {selectedFloor?.floorPlanUrl && (
                  <img
                    src={selectedFloor.floorPlanUrl}
                    alt={`${selectedFloor.name} floor plan`}
                    className="pointer-events-none block w-full rounded-[2rem] select-none"
                    draggable={false}
                  />
                )}

                {spacesOnSelectedFloor.map((space) => {
                  const rect = rectFromSpace(space);

                  if (!rect) {
                    return null;
                  }

                  const isSelected =
                    selectedSpaceId === space.id;
                  const showMenu =
                    menuSpaceId === space.id;
                  const isUnavailable =
                    space.status !== "ACTIVE";

                  return (
                    <button
                      key={space.id}
                      type="button"
                      onPointerDown={(event) =>
                        beginMove(event, space)
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        selectSpace(space);
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        selectSpace(space);
                      }}
                      className={`group absolute flex items-center justify-center rounded-xl border-2 transition ${
                        isSelected
                          ? "z-30 border-pink-700 bg-pink-400/45 ring-4 ring-pink-300/40"
                          : isUnavailable
                            ? "z-10 border-red-700 bg-red-500/45 hover:bg-red-500/55"
                            : "z-10 border-green-700 bg-green-400/40 hover:bg-green-400/55"
                      }`}
                      style={{
                        left: `${rect.xPercent}%`,
                        top: `${rect.yPercent}%`,
                        width: `${rect.widthPercent}%`,
                        height: `${rect.heightPercent}%`,
                      }}
                    >
                      <span className="pointer-events-none max-w-[90%] rounded-lg bg-white/90 px-2 py-1 text-center text-[9px] font-black leading-tight text-[#3f463b] shadow-sm backdrop-blur dark:bg-slate-950/85 dark:text-white sm:text-xs">
                        <span className="block truncate">
                          {space.name}
                        </span>

                        <span className="mt-0.5 block text-[8px] font-bold uppercase tracking-wide sm:text-[10px]">
                          {isUnavailable
                            ? "Unavailable"
                            : "Active"}
                        </span>
                      </span>

                      {isSelected &&
                        mode === "select" && (
                          <>
                            {renderResizeHandle(
                              space,
                              "nw",
                              "-left-2 -top-2",
                              "cursor-nw-resize",
                            )}
                            {renderResizeHandle(
                              space,
                              "ne",
                              "-right-2 -top-2",
                              "cursor-ne-resize",
                            )}
                            {renderResizeHandle(
                              space,
                              "sw",
                              "-bottom-2 -left-2",
                              "cursor-sw-resize",
                            )}
                            {renderResizeHandle(
                              space,
                              "se",
                              "-bottom-2 -right-2",
                              "cursor-se-resize",
                            )}
                          </>
                        )}

                      {showMenu && (
                        <div
                          onPointerDown={(event) =>
                            event.stopPropagation()
                          }
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          className="absolute left-1/2 top-full z-[80] mt-3 w-64 -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-700 bg-[#201719] text-left text-sm text-white shadow-2xl"
                        >
                          <div className="border-b border-white/10 px-4 py-3">
                            <p className="truncate font-black">
                              {space.name}
                            </p>
                            <p className="mt-1 text-xs text-white/60">
                              {space.code}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(space)
                            }
                            className="block w-full px-4 py-3 text-left font-semibold hover:bg-white/10"
                          >
                            Edit Details
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              startDuplicate(space)
                            }
                            className="block w-full px-4 py-3 text-left font-semibold hover:bg-white/10"
                          >
                            Duplicate
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openAssignModal(space)
                            }
                            className="block w-full px-4 py-3 text-left font-semibold hover:bg-white/10"
                          >
                            Assign Existing Space
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleRemoveFromMap(
                                space,
                              )
                            }
                            className="block w-full px-4 py-3 text-left font-semibold text-amber-300 hover:bg-white/10"
                          >
                            Remove From Map
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void handleDeactivate(space)
                            }
                            className="block w-full border-t border-white/10 px-4 py-3 text-left font-semibold text-red-300 hover:bg-white/10"
                          >
                            Deactivate Space
                          </button>
                        </div>
                      )}
                    </button>
                  );
                })}

                {draftRect && (
                  <div
                    className="pointer-events-none absolute z-40 rounded-xl border-2 border-dashed border-pink-700 bg-pink-400/35 shadow-lg"
                    style={{
                      left: `${draftRect.xPercent}%`,
                      top: `${draftRect.yPercent}%`,
                      width: `${draftRect.widthPercent}%`,
                      height: `${draftRect.heightPercent}%`,
                    }}
                  >
                    <span className="absolute left-2 top-2 rounded-lg bg-pink-700 px-2 py-1 text-[10px] font-bold text-white">
                      New area
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold">
                <span className="rounded-full border border-green-300 bg-green-100 px-3 py-1.5 text-green-800">
                  Green: Active
                </span>

                <span className="rounded-full border border-red-300 bg-red-100 px-3 py-1.5 text-red-800">
                  Red: Unavailable
                </span>

                <span className="rounded-full border border-pink-300 bg-pink-100 px-3 py-1.5 text-pink-800">
                  Pink: Selected
                </span>
              </div>
            </section>
          </>
        )}

      {!isLoading &&
        !loadError &&
        floorsWithPlans.length === 0 && (
          <section className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center">
            Upload a floor-plan image first.
          </section>
        )}

      {createModal && (
        <SpaceFormModal
          title={
            createModal.mode === "duplicate"
              ? "Create Duplicated Space"
              : "Create New Space"
          }
          form={createModal.form}
          setForm={(form) =>
            setCreateModal((current) =>
              current
                ? {
                    ...current,
                    form,
                  }
                : current,
            )
          }
          isSaving={isSaving}
          onCancel={closeCreateModal}
          onSave={() => void handleCreateSpace()}
          saveLabel="Create Space"
        />
      )}

      {editModalOpen &&
        selectedSpace &&
        editRect && (
          <EditSpaceModal
            form={editForm}
            setForm={setEditForm}
            rect={editRect}
            setRect={setEditRect}
            isSaving={isSaving}
            onCancel={() =>
              setEditModalOpen(false)
            }
            onSave={() =>
              void handleSaveEdit()
            }
          />
        )}

      {assignModalOpen && selectedSpace && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-[#ded6c7] bg-[#fffdf6] p-7 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e]">
              Assign
            </p>

            <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
              Assign Existing Space
            </h3>

            <p className="mt-3 text-sm leading-6 text-[#74786d] dark:text-slate-400">
              The selected rectangle will be transferred
              from {selectedSpace.code} to an unplaced
              existing space.
            </p>

            <div className="mt-6">
              <label className={labelClassName}>
                Unplaced Space
              </label>

              <select
                value={assignTargetId}
                onChange={(event) =>
                  setAssignTargetId(
                    Number(event.target.value),
                  )
                }
                className={selectClassName}
              >
                <option value={0}>
                  Select a space
                </option>

                {unplacedSpaces.map((space) => (
                  <option
                    key={space.id}
                    value={space.id}
                  >
                    {space.code} · {space.name}
                  </option>
                ))}
              </select>

              {unplacedSpaces.length === 0 && (
                <p className="mt-3 text-sm font-semibold text-amber-700">
                  There are no unplaced active spaces on
                  this floor.
                </p>
              )}
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setAssignModalOpen(false)
                }
                className="rounded-2xl border border-[#ded6c7] bg-white px-5 py-3 font-bold text-[#5f6658]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleAssignExistingSpace()
                }
                disabled={
                  isSaving ||
                  assignTargetId === 0
                }
                className="rounded-2xl bg-[#c65f2e] px-5 py-3 font-bold text-white disabled:bg-slate-400"
              >
                {isSaving
                  ? "Assigning..."
                  : "Assign Space"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type SpaceFormModalProps = {
  title: string;
  form: SpaceForm;
  setForm: (form: SpaceForm) => void;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
};

function SpaceFormModal({
  title,
  form,
  setForm,
  isSaving,
  onCancel,
  onSave,
  saveLabel,
}: SpaceFormModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#ded6c7] bg-[#fffdf6] p-7 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e]">
              Space
            </p>

            <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#ded6c7] bg-white px-3 py-2 font-black text-[#5f6658]"
          >
            ✕
          </button>
        </div>

        <SpaceFields
          form={form}
          setForm={setForm}
        />

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-2xl border border-[#ded6c7] bg-white px-5 py-3 font-bold text-[#5f6658]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-2xl bg-[#c65f2e] px-6 py-3 font-bold text-white disabled:bg-slate-400"
          >
            {isSaving ? "Saving..." : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type EditSpaceModalProps = {
  form: SpaceForm;
  setForm: (form: SpaceForm) => void;
  rect: Rect;
  setRect: (rect: Rect) => void;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

function EditSpaceModal({
  form,
  setForm,
  rect,
  setRect,
  isSaving,
  onCancel,
  onSave,
}: EditSpaceModalProps) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-[#ded6c7] bg-[#fffdf6] p-7 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c65f2e]">
              Edit
            </p>

            <h3 className="mt-2 text-2xl font-black text-[#3f463b] dark:text-white">
              Space Details
            </h3>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-[#ded6c7] bg-white px-3 py-2 font-black text-[#5f6658]"
          >
            ✕
          </button>
        </div>

        <SpaceFields
          form={form}
          setForm={setForm}
        />

        <div className="mt-7 border-t border-[#ded6c7] pt-6 dark:border-slate-700">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-[#c65f2e]">
            Position and Size
          </p>

          <div className="grid gap-4 sm:grid-cols-4">
            {(
              [
                ["X %", "xPercent"],
                ["Y %", "yPercent"],
                ["Width %", "widthPercent"],
                ["Height %", "heightPercent"],
              ] as const
            ).map(([label, key]) => (
              <div key={key}>
                <label className={labelClassName}>
                  {label}
                </label>

                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.25}
                  value={roundPercent(rect[key])}
                  onChange={(event) =>
                    setRect({
                      ...rect,
                      [key]: Number(
                        event.target.value,
                      ),
                    })
                  }
                  className={inputClassName}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-2xl border border-[#ded6c7] bg-white px-5 py-3 font-bold text-[#5f6658]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="rounded-2xl bg-[#c65f2e] px-6 py-3 font-bold text-white disabled:bg-slate-400"
          >
            {isSaving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

type SpaceFieldsProps = {
  form: SpaceForm;
  setForm: (form: SpaceForm) => void;
};

function SpaceFields({
  form,
  setForm,
}: SpaceFieldsProps) {
  return (
    <>
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClassName}>
            Space Code
          </label>

          <input
            value={form.code}
            onChange={(event) =>
              setForm({
                ...form,
                code: event.target.value,
              })
            }
            className={inputClassName}
          />
        </div>

        <div>
          <label className={labelClassName}>
            Capacity
          </label>

          <input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(event) =>
              setForm({
                ...form,
                capacity: Number(
                  event.target.value,
                ),
              })
            }
            className={inputClassName}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClassName}>
            Space Name
          </label>

          <input
            value={form.name}
            onChange={(event) =>
              setForm({
                ...form,
                name: event.target.value,
              })
            }
            className={inputClassName}
          />
        </div>

        <div>
          <label className={labelClassName}>
            Type
          </label>

          <select
            value={form.type}
            onChange={(event) =>
              setForm({
                ...form,
                type: event.target
                  .value as ResourceType,
              })
            }
            className={selectClassName}
          >
            {resourceTypes.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClassName}>
            Status
          </label>

          <select
            value={form.status}
            onChange={(event) =>
              setForm({
                ...form,
                status: event.target
                  .value as ResourceStatus,
              })
            }
            className={selectClassName}
          >
            {resourceStatuses.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClassName}>
            Description
          </label>

          <textarea
            rows={3}
            value={form.description}
            onChange={(event) =>
              setForm({
                ...form,
                description: event.target.value,
              })
            }
            className={inputClassName}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClassName}>
            Amenities
          </label>

          <input
            value={form.amenitiesText}
            onChange={(event) =>
              setForm({
                ...form,
                amenitiesText: event.target.value,
              })
            }
            placeholder="TV, Whiteboard, Projector"
            className={inputClassName}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-2xl border border-[#ded6c7] bg-white p-4 text-sm font-bold text-[#5f6658] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.requiresApproval}
            onChange={(event) =>
              setForm({
                ...form,
                requiresApproval:
                  event.target.checked,
              })
            }
            className="h-4 w-4"
          />
          Requires HR approval
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-[#ded6c7] bg-white p-4 text-sm font-bold text-[#5f6658] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.requiresManager}
            onChange={(event) =>
              setForm({
                ...form,
                requiresManager:
                  event.target.checked,
              })
            }
            className="h-4 w-4"
          />
          Requires manager
        </label>
      </div>
    </>
  );
}
