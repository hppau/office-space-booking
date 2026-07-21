import type {
  ResourceStatus,
  ResourceType,
} from "@/models/resource";

export type ManagedSpace = {
  id: number;
  code: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  capacity: number;
  description: string | null;
  amenities: unknown;
  requiresApproval: boolean;
  requiresManager: boolean;
  floorId: number;
  floor: {
    id: number;
    name: string;
    office: {
      id: number;
      name: string;
    };
  };
  createdAt: string;
  updatedAt: string;
  xPercent: string | null;
  yPercent: string | null;
  widthPercent: string | null;
  heightPercent: string | null;
  rotation: string | null;
  iconName: string | null;
  isActive: boolean;
};

export type SpaceFormData = {
  code: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  capacity: number;
  description: string;
  amenitiesText: string;
  requiresApproval: boolean;
  requiresManager: boolean;
  floorId: number;
};

export type SpacesApiResponse = {
  success: boolean;
  message?: string;
  data?: ManagedSpace[];
};

export type SpaceApiResponse = {
  success: boolean;
  message?: string;
  data?: ManagedSpace;
};

export type CreateSpaceRequest = {
  code: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  capacity: number;
  description?: string | null;
  amenities?: string[];
  requiresApproval: boolean;
  requiresManager: boolean;
  floorId: number;
};

export type UpdateSpaceRequest = CreateSpaceRequest;
export type ManagedFloor = {
  id: number;
  name: string;
  officeId: number;
  office: {
    id: number;
    name: string;
  };
};

export type FloorsApiResponse = {
  success: boolean;
  message?: string;
  data?: ManagedFloor[];
};
export type SpaceMapPositionRequest = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  rotation: number;
  iconName: string;
};

export type SpaceMapPositionApiResponse = {
  success: boolean;
  message?: string;
  data?: ManagedSpace;
};