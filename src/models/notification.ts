export type NotificationType =
  | "BOOKING_SUBMITTED"
  | "NEW_BOOKING_REQUEST"
  | "BOOKING_APPROVED"
  | "BOOKING_REJECTED"
  | "BOOKING_CANCELLED"
  | "ROOM_CREATED"
  | "ROOM_UPDATED"
  | "ROOM_IMAGE_UPDATED"
  | "ROOM_AREA_UPDATED"
  | "SYSTEM";

export type NotificationRecord = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  relatedId: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsApiResponse = {
  success: boolean;
  message?: string;
  data?: NotificationRecord[];
  unreadCount?: number;
};

export type NotificationActionApiResponse = {
  success: boolean;
  message?: string;
  data?: NotificationRecord;
  unreadCount?: number;
};
