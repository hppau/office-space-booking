export type ResourceType =
  | "DESK"
  | "CHAIR"
  | "MEETING_ROOM"
  | "PRIVATE_ROOM"
  | "TRAINING_ROOM"
  | "HOT_DESK"
  | "OTHER";

export type ResourceStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "MAINTENANCE"
  | "BLOCKED";

export type OfficeResource = {
  id: number;
  floorId: number;
  code: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  description: string | null;
  capacity: number;
  amenities: unknown;
  requiresApproval: boolean;
  requiresManager: boolean;
  xPercent: string | null;
  yPercent: string | null;
  widthPercent: string | null;
  heightPercent: string | null;
  rotation: string | null;
  iconName: string | null;
  isActive: boolean;
  floor: {
    id: number;
    name: string;
    floorNumber: number | null;
    floorPlanUrl: string | null;
    office: {
      id: number;
      name: string;
      address: string | null;
      timezone: string;
    };
  };
};

export type ResourcesApiResponse = {
  success: boolean;
  data?: OfficeResource[];
  message?: string;
};