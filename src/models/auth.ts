export type UserRole = "SUPER_ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";

export type CurrentUser = {
  id: number;
  employeeCode: string | null;
  fullName: string;
  email: string;
  role: UserRole;
  department: {
    id: number;
    name: string;
  } | null;
};

export type CurrentUserApiResponse = {
  success: boolean;
  message?: string;
  data?: CurrentUser;
};

export type LogoutApiResponse = {
  success: boolean;
  message: string;
};