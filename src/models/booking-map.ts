import type { ResourceStatus, ResourceType } from "@/models/resource";

export type BookingMapSpace = {
  id: number;
  code: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  capacity: number;
  requiresApproval: boolean;
  requiresManager: boolean;
  xPercent: string | null;
  yPercent: string | null;
  widthPercent: string | null;
  heightPercent: string | null;
  rotation: string | null;
  iconName: string | null;
};

export type BookingMapFloor = {
  id: number;
  name: string;
  floorNumber: number | null;
  floorPlanUrl: string | null;
  office: {
    id: number;
    name: string;
  };
  spaces: BookingMapSpace[];
};

export type BookingMapsApiResponse = {
  success: boolean;
  message?: string;
  data?: BookingMapFloor[];
};