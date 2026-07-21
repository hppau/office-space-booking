import type { BookingStatus } from "@/models/booking";

export type ApprovalAction = "APPROVE" | "REJECT";

export type PendingApprovalBooking = {
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
  createdAt: string;
  updatedAt: string;

  user: {
    id: number;
    employeeCode: string | null;
    fullName: string;
    email: string;
    role: "SUPER_ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";

    department: {
      id: number;
      name: string;
    } | null;
  };

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
    requiresApproval: boolean;
    requiresManager: boolean;

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

export type PendingApprovalsApiResponse = {
  success: boolean;
  message?: string;
  data?: PendingApprovalBooking[];
};

export type ProcessApprovalRequest = {
  action: ApprovalAction;
  comment?: string;
};

export type ProcessApprovalResult = {
  id: number;
  bookingNumber: string;
  status: BookingStatus;
  rejectionReason: string | null;
  updatedAt: string;
};

export type ProcessApprovalApiResponse = {
  success: boolean;
  message: string;
  data?: ProcessApprovalResult;
};