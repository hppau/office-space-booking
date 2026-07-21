export type ManagedOffice = {
  id: number;
  name: string;
  address: string | null;
  timezone: string;
  isActive: boolean;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ManagedFloor = {
  id: number;
  officeId: number;
  name: string;
  floorNumber: number | null;
  floorPlanUrl: string | null;
  floorPlanWidth: number | null;
  floorPlanHeight: number | null;
  isActive: boolean;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
  office: {
    id: number;
    name: string;
  };
};

export type OfficeFormData = {
  name: string;
  address: string;
  timezone: string;
  isActive: boolean;
};

export type FloorFormData = {
  name: string;
  officeId: number;
  floorNumber: number | "";
  isActive: boolean;
};

export type OfficesApiResponse = {
  success: boolean;
  message?: string;
  data?: ManagedOffice[];
};

export type OfficeApiResponse = {
  success: boolean;
  message?: string;
  data?: ManagedOffice;
};

export type FloorsManagementApiResponse = {
  success: boolean;
  message?: string;
  data?: ManagedFloor[];
};

export type FloorManagementApiResponse = {
  success: boolean;
  message?: string;
  data?: ManagedFloor;
};

export type CreateOfficeRequest = {
  name: string;
  address?: string | null;
  timezone: string;
  isActive: boolean;
};

export type UpdateOfficeRequest = CreateOfficeRequest;

export type CreateFloorRequest = {
  name: string;
  officeId: number;
  floorNumber?: number | null;
  isActive: boolean;
};

export type UpdateFloorRequest = CreateFloorRequest;
export type UploadFloorPlanApiResponse = {
  success: boolean;
  message?: string;
  data?: ManagedFloor;
};