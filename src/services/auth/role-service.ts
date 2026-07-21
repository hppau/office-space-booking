import type { UserRole } from "@/models/auth";

export function canAccessBookSpace(role: UserRole): boolean {
  return role === "EMPLOYEE" || role === "SUPER_ADMIN";
}

export function canAccessMyBookings(role: UserRole): boolean {
  return role === "EMPLOYEE" || role === "SUPER_ADMIN";
}

export function canAccessApprovals(role: UserRole): boolean {
  return role === "HR" || role === "MANAGER" || role === "SUPER_ADMIN";
}

export function canAccessApprovalHistory(role: UserRole): boolean {
  return role === "HR" || role === "MANAGER" || role === "SUPER_ADMIN";
}