import type { NotificationActionApiResponse, NotificationRecord, NotificationsApiResponse } from "@/models/notification";
import type {
  ApprovalHistoryApiResponse,
  ApprovalHistoryRecord,
} from "@/models/approval-history";

import type {
  BookingMapFloor,
  BookingMapsApiResponse,
} from "@/models/booking-map";

import type {
  CreateFloorRequest,
  CreateOfficeRequest,
  FloorManagementApiResponse,
  FloorsManagementApiResponse,
  ManagedFloor as LocationManagedFloor,
  ManagedOffice,
  OfficeApiResponse,
  OfficesApiResponse,
  UpdateFloorRequest,
  UpdateOfficeRequest,
  UploadFloorPlanApiResponse,
} from "@/models/location-management";

import type {
  CreateSpaceRequest,
  FloorsApiResponse,
  ManagedFloor,
  ManagedSpace,
  SpaceApiResponse,
  SpacesApiResponse,
  UpdateSpaceRequest,
  SpaceMapPositionApiResponse,
  SpaceMapPositionRequest,
} from "@/models/space-management";

import type {
  UnavailableBooking,
  UnavailableBookingsApiResponse,
} from "@/models/booking-availability";

import type {
  CurrentUser,
  CurrentUserApiResponse,
  LogoutApiResponse,
} from "@/models/auth";

import type {
  BookingRecord,
  BookingsApiResponse,
  CancelBookingApiResponse,
  CancelBookingRequest,
  CancelBookingResult,
  CreateBookingApiResponse,
  CreateBookingRequest,
  CreatedBooking,
} from "@/models/booking";

import type {
  PendingApprovalBooking,
  PendingApprovalsApiResponse,
  ProcessApprovalApiResponse,
  ProcessApprovalRequest,
  ProcessApprovalResult,
} from "@/models/approval";

import type {
  OfficeResource,
  ResourcesApiResponse,
} from "@/models/resource";

import type {
  UpdateProfileRequest,
  UpdateProfileResponse,
  UploadCoverImageResponse,
  UploadProfileImageResponse,
  UserProfile,
} from "@/models/profile";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type ApiRequestOptions = RequestInit & {
  token?: string;
};

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { token, headers, ...requestOptions } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json()) as T;

  return data;
}

export function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "GET",
  });
}

export function apiPost<TResponse, TBody>(
  endpoint: string,
  body: TBody,
): Promise<TResponse> {
  return apiRequest<TResponse>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPut<TResponse, TBody>(
  endpoint: string,
  body: TBody,
): Promise<TResponse> {
  return apiRequest<TResponse>(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function apiDelete<TResponse>(
  endpoint: string,
): Promise<TResponse> {
  return apiRequest<TResponse>(endpoint, {
    method: "DELETE",
  });
}

export async function getResources(): Promise<OfficeResource[]> {
  const response =
    await apiGet<ResourcesApiResponse>("/api/resources");

  if (!response.success || !response.data) {
    throw new Error(
      response.message ?? "Unable to load resources.",
    );
  }

  return response.data;
}

export async function createBooking(
  bookingData: CreateBookingRequest,
): Promise<CreatedBooking> {
  const response = await apiPost<
    CreateBookingApiResponse,
    CreateBookingRequest
  >("/api/bookings", bookingData);

  if (!response.success || !response.data) {
    throw new Error(
      response.message || "Unable to create booking.",
    );
  }

  return response.data;
}

export async function getMyBookings(): Promise<BookingRecord[]> {
  const response =
    await apiGet<BookingsApiResponse>("/api/bookings");

  if (!response.success || !response.data) {
    throw new Error(
      response.message || "Unable to load bookings.",
    );
  }

  return response.data;
}

export async function cancelBooking(
  bookingId: number,
  request: CancelBookingRequest,
): Promise<CancelBookingResult> {
  const response = await apiPost<
    CancelBookingApiResponse,
    CancelBookingRequest
  >(`/api/bookings/${bookingId}/cancel`, request);

  if (!response.success || !response.data) {
    throw new Error(
      response.message || "Unable to cancel booking.",
    );
  }

  return response.data;
}

export async function getUnavailableBookings(
  bookingDate: string,
  startTime: string,
  endTime: string,
): Promise<UnavailableBooking[]> {
  const query = new URLSearchParams({
    bookingDate,
    startTime,
    endTime,
  });

  const response =
    await apiGet<UnavailableBookingsApiResponse>(
      `/api/bookings/unavailable?${query.toString()}`,
    );

  if (!response.success || !response.data) {
    throw new Error(
      response.message || "Unable to check availability.",
    );
  }

  return response.data;
}

export async function getPendingApprovals(): Promise<
  PendingApprovalBooking[]
> {
  const response =
    await apiGet<PendingApprovalsApiResponse>(
      "/api/approvals",
    );

  if (!response.success || !response.data) {
    throw new Error(
      response.message ||
        "Unable to load pending approvals.",
    );
  }

  return response.data;
}

export async function processBookingApproval(
  bookingId: number,
  request: ProcessApprovalRequest,
): Promise<ProcessApprovalResult> {
  const response = await apiPost<
    ProcessApprovalApiResponse,
    ProcessApprovalRequest
  >(`/api/approvals/${bookingId}`, request);

  if (!response.success || !response.data) {
    throw new Error(
      response.message ||
        "Unable to process the booking approval.",
    );
  }

  return response.data;
}

export async function getApprovalHistory(): Promise<
  ApprovalHistoryRecord[]
> {
  const response =
    await apiGet<ApprovalHistoryApiResponse>(
      "/api/approvals/history",
    );

  if (!response.success || !response.data) {
    throw new Error(
      response.message || "Unable to load approval history.",
    );
  }

  return response.data;
}

export async function getCurrentSignedInUser(): Promise<CurrentUser> {
  const response =
    await apiGet<CurrentUserApiResponse>("/api/auth/me");

  if (!response.success || !response.data) {
    throw new Error(response.message || "You are not signed in.");
  }

  return response.data;
}

export async function logoutUser(): Promise<void> {
  const response = await apiPost<
    LogoutApiResponse,
    Record<string, never>
  >("/api/auth/logout", {});

  if (!response.success) {
    throw new Error(response.message || "Unable to log out.");
  }
}

export async function getManagedSpaces(): Promise<ManagedSpace[]> {
  const response =
    await apiGet<SpacesApiResponse>("/api/spaces");

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to load spaces.");
  }

  return response.data;
}

export async function createManagedSpace(
  request: CreateSpaceRequest,
): Promise<ManagedSpace> {
  const response = await apiPost<
    SpaceApiResponse,
    CreateSpaceRequest
  >("/api/spaces", request);

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to create space.");
  }

  return response.data;
}

export async function updateManagedSpace(
  spaceId: number,
  request: UpdateSpaceRequest,
): Promise<ManagedSpace> {
  const response = await apiPut<
    SpaceApiResponse,
    UpdateSpaceRequest
  >(`/api/spaces/${spaceId}`, request);

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to update space.");
  }

  return response.data;
}

export async function deactivateManagedSpace(
  spaceId: number,
): Promise<ManagedSpace> {
  const response = await apiDelete<SpaceApiResponse>(
    `/api/spaces/${spaceId}`,
  );

  if (!response.success || !response.data) {
    throw new Error(
      response.message || "Unable to deactivate space.",
    );
  }

  return response.data;
}
export async function getManagedFloors(): Promise<ManagedFloor[]> {
  const response = await apiGet<FloorsApiResponse>("/api/floors");

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to load floors.");
  }

  return response.data;
}
export async function getManagedOffices(): Promise<ManagedOffice[]> {
  const response =
    await apiGet<OfficesApiResponse>("/api/offices");

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to load offices.");
  }

  return response.data;
}

export async function createManagedOffice(
  request: CreateOfficeRequest,
): Promise<ManagedOffice> {
  const response = await apiPost<
    OfficeApiResponse,
    CreateOfficeRequest
  >("/api/offices", request);

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to create office.");
  }

  return response.data;
}

export async function updateManagedOffice(
  officeId: number,
  request: UpdateOfficeRequest,
): Promise<ManagedOffice> {
  const response = await apiPut<
    OfficeApiResponse,
    UpdateOfficeRequest
  >(`/api/offices/${officeId}`, request);

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to update office.");
  }

  return response.data;
}

export async function deactivateManagedOffice(
  officeId: number,
): Promise<ManagedOffice> {
  const response = await apiDelete<OfficeApiResponse>(
    `/api/offices/${officeId}`,
  );

  if (!response.success || !response.data) {
    throw new Error(
      response.message || "Unable to deactivate office.",
    );
  }

  return response.data;
}
export async function getFloorsForManagement(): Promise<
  LocationManagedFloor[]
> {
  const response =
    await apiGet<FloorsManagementApiResponse>(
      "/api/floors-management",
    );

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to load floors.");
  }

  return response.data;
}

export async function createFloorForManagement(
  request: CreateFloorRequest,
): Promise<LocationManagedFloor> {
  const response = await apiPost<
    FloorManagementApiResponse,
    CreateFloorRequest
  >("/api/floors-management", request);

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to create floor.");
  }

  return response.data;
}

export async function updateFloorForManagement(
  floorId: number,
  request: UpdateFloorRequest,
): Promise<LocationManagedFloor> {
  const response = await apiPut<
    FloorManagementApiResponse,
    UpdateFloorRequest
  >(`/api/floors-management/${floorId}`, request);

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to update floor.");
  }

  return response.data;
}

export async function deactivateFloorForManagement(
  floorId: number,
): Promise<LocationManagedFloor> {
  const response = await apiDelete<FloorManagementApiResponse>(
    `/api/floors-management/${floorId}`,
  );

  if (!response.success || !response.data) {
    throw new Error(
      response.message || "Unable to deactivate floor.",
    );
  }

  return response.data;
}
export async function uploadFloorPlanImage(
  floorId: number,
  file: File,
): Promise<LocationManagedFloor> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `/api/floors-management/${floorId}/floor-plan`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = (await response.json()) as UploadFloorPlanApiResponse;

  if (!data.success || !data.data) {
    throw new Error(data.message || "Unable to upload floor plan.");
  }

  return data.data;
}
export async function updateSpaceMapPosition(
  spaceId: number,
  request: SpaceMapPositionRequest,
): Promise<ManagedSpace> {
  const response = await apiPut<
    SpaceMapPositionApiResponse,
    SpaceMapPositionRequest
  >(`/api/spaces/${spaceId}/map-position`, request);

  if (!response.success || !response.data) {
    throw new Error(
      response.message || "Unable to update space position.",
    );
  }

  return response.data;
}
export async function getBookingMaps(): Promise<BookingMapFloor[]> {
  const response = await apiGet<BookingMapsApiResponse>("/api/booking-map");

  if (!response.success || !response.data) {
    throw new Error(response.message || "Unable to load booking maps.");
  }

  return response.data;
}
export async function removeSpaceMapPosition(
  spaceId: number,
): Promise<ManagedSpace> {
  const response = await apiDelete<SpaceMapPositionApiResponse>(
    `/api/spaces/${spaceId}/map-position`,
  );

  if (!response.success || !response.data) {
    throw new Error(
      response.message || "Unable to remove space position.",
    );
  }

  return response.data;
}
export async function permanentlyDeleteRoom(roomId: number) {
  const response = await fetch(
    `/api/floors-management/${roomId}/permanent`,
    {
      method: "DELETE",
    }
  );

  return response.json();
}
export async function permanentlyDeleteSpace(spaceId: number) {
  const response = await fetch(
    `/api/spaces/${spaceId}/permanent`,
    {
      method: "DELETE",
    }
  );

  return response.json();
}
export async function getNotifications(filter = "all", limit = 50): Promise<NotificationRecord[]> {
  const response = await apiGet<NotificationsApiResponse>(`/api/notifications?filter=${encodeURIComponent(filter)}&limit=${limit}`);
  if (!response.success || !response.data) throw new Error(response.message || "Unable to load notifications.");
  return response.data;
}

export async function getNotificationPreview(): Promise<{ items: NotificationRecord[]; unreadCount: number }> {
  const response = await apiGet<NotificationsApiResponse>("/api/notifications?filter=all&limit=5");
  if (!response.success || !response.data) throw new Error(response.message || "Unable to load notifications.");
  return { items: response.data, unreadCount: response.unreadCount ?? 0 };
}

export async function markNotificationRead(id: number): Promise<NotificationRecord> {
  const response = await apiRequest<NotificationActionApiResponse>(`/api/notifications/${id}`, { method: "PATCH", body: JSON.stringify({ isRead: true }) });
  if (!response.success || !response.data) throw new Error(response.message || "Unable to update notification.");
  return response.data;
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await apiRequest<NotificationActionApiResponse>("/api/notifications/read-all", { method: "PATCH" });
  if (!response.success) throw new Error(response.message || "Unable to update notifications.");
}

export async function deleteNotification(id: number): Promise<void> {
  const response = await apiDelete<NotificationActionApiResponse>(`/api/notifications/${id}`);
  if (!response.success) throw new Error(response.message || "Unable to delete notification.");
}
export async function getMyProfile(): Promise<UserProfile> {
  const response = await fetch("/api/profile");

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message);
  }

  return result;
}
export async function updateMyProfile(
  request: UpdateProfileRequest,
): Promise<UpdateProfileResponse> {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to update profile.",
    );
  }

  return result;
}
export async function uploadMyProfilePhoto(
  file: File,
): Promise<UploadProfileImageResponse> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch("/api/profile/photo", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to upload profile photo.",
    );
  }

  return result;
}

export async function uploadMyCoverPhoto(
  file: File,
): Promise<UploadCoverImageResponse> {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch("/api/profile/cover", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to upload cover photo.",
    );
  }

  return result;
}