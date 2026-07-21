import type { BookingStatus } from "@/models/booking";

export type UnavailableBooking = {
  id: number;
  bookingNumber: string;
  resourceId: number;
  startAt: string;
  endAt: string;
  status: BookingStatus;
};

export type UnavailableBookingsApiResponse = {
  success: boolean;
  message?: string;
  data?: UnavailableBooking[];
};