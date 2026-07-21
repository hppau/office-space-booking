import type { BookingStatus } from "@/models/booking";

export type ApprovalDecision = "APPROVED" | "REJECTED" | "MORE_INFORMATION_REQUIRED";

export type ApprovalHistoryRecord = {
  id: number;
  bookingId: number;
  approverId: number;
  stage: string;
  decision: ApprovalDecision;
  comment: string | null;
  decidedAt: string;

  approver: {
    id: number;
    fullName: string;
    email: string;
    role: "SUPER_ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";
  };

  booking: {
    id: number;
    bookingNumber: string;
    startAt: string;
    endAt: string;
    reason: string;
    attendeeCount: number;
    status: BookingStatus;
    rejectionReason: string | null;
    createdAt: string;

    user: {
      id: number;
      employeeCode: string | null;
      fullName: string;
      email: string;
      department: {
        id: number;
        name: string;
      } | null;
    };

    resource: {
      id: number;
      code: string;
      name: string;
      type: string;
      capacity: number;
      floor: {
        id: number;
        name: string;
        office: {
          id: number;
          name: string;
        };
      };
    };
  };
};

export type ApprovalHistoryApiResponse = {
  success: boolean;
  message?: string;
  data?: ApprovalHistoryRecord[];
};