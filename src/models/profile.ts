export type ProfileRole =
  | "SUPER_ADMIN"
  | "HR"
  | "MANAGER"
  | "EMPLOYEE";

export type ProfileDepartment = {
  id: number;
  name: string;
};

export type ProfileManager = {
  id: number;
  fullName: string;
  email: string;
};

export type UserProfile = {
  id: number;
  employeeCode: string | null;
  fullName: string;
  email: string;
  role: ProfileRole;

  profileImageUrl: string | null;
  coverImageUrl: string | null;
  phoneNumber: string | null;
  jobTitle: string | null;
  bio: string | null;

  isActive: boolean;

  department: ProfileDepartment | null;
  manager: ProfileManager | null;

  createdAt: string;
  updatedAt: string;
};

export type UpdateProfileRequest = {
  fullName: string;
  phoneNumber: string | null;
  jobTitle: string | null;
  bio: string | null;
};

export type UpdateProfileResponse = {
  message: string;
  profile: UserProfile;
};

export type UploadProfileImageResponse = {
  message: string;
  profileImageUrl: string;
};

export type UploadCoverImageResponse = {
  message: string;
  coverImageUrl: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordResponse = {
  message: string;
};