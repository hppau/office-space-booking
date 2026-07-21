export type BookingStatus =
  | "DRAFT"
  | "PENDING_MANAGER"
  | "PENDING_HR"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "NO_SHOW";

export type CreateBookingRequest = {
  resourceId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  attendeeCount: number;
  requiredEquipment: string[];
  notes?: string;
};

export type CreatedBooking = {
  id: number;
  bookingNumber: string;
  resourceId: number;
  startAt: string;
  endAt: string;
  reason: string;
  attendeeCount: number;
  status: BookingStatus;
};

export type BookingRecord = {
  id: number;
  bookingNumber: string;
  userId: number;
  resourceId: number;
  startAt: string;
  endAt: string;
  reason: string;
  attendeeCount: number;
  requiredEquipment: unknown;
  notes: string | null;
  status: BookingStatus;
  rejectionReason: string | null;
  cancellationReason: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  createdAt: string;
  updatedAt: string;

  resource: {
    id: number;
    code: string;
    name: string;
    type:
      | "DESK"
      | "CHAIR"
      | "MEETING_ROOM"
      | "PRIVATE_ROOM"
      | "TRAINING_ROOM"
      | "HOT_DESK"
      | "OTHER";
    capacity: number;
    description: string | null;

    floor: {
      id: number;
      name: string;
      floorNumber: number | null;

      office: {
        id: number;
        name: string;
        address: string | null;
        timezone: string;
      };
    };
  };
};

export type CreateBookingApiResponse = {
  success: boolean;
  message: string;
  data?: CreatedBooking;
};

export type BookingsApiResponse = {
  success: boolean;
  message?: string;
  data?: BookingRecord[];
};
export type CancelBookingRequest = {
  cancellationReason: string;
};

export type CancelBookingResult = {
  id: number;
  bookingNumber: string;
  status: BookingStatus;
  cancellationReason: string | null;
  updatedAt: string;
};

export type CancelBookingApiResponse = {
  success: boolean;
  message: string;
  data?: CancelBookingResult;
};