"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent } from "react";

import {
  getMyProfile,
  updateMyProfile,
  uploadMyCoverPhoto,
  uploadMyProfilePhoto,
} from "@/api/api-service";

import type {
  UpdateProfileRequest,
  UserProfile,
} from "@/models/profile";

type ProfileForm = {
  fullName: string;
  phoneNumber: string;
  jobTitle: string;
  bio: string;
};

const emptyForm: ProfileForm = {
  fullName: "",
  phoneNumber: "",
  jobTitle: "",
  bio: "",
};

const inputClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500";

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function getRoleLabel(role: UserProfile["role"]): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "HR":
      return "HR";
    case "MANAGER":
      return "Manager";
    case "EMPLOYEE":
      return "Employee";
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProfilePage() {
  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [form, setForm] =
    useState<ProfileForm>(emptyForm);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const profilePhotoInputRef =
    useRef<HTMLInputElement | null>(null);

  const coverPhotoInputRef =
    useRef<HTMLInputElement | null>(null);

  const [
    isUploadingProfilePhoto,
    setIsUploadingProfilePhoto,
  ] = useState(false);

  const [
    isUploadingCoverPhoto,
    setIsUploadingCoverPhoto,
  ] = useState(false);

  const [imageUploadError, setImageUploadError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setIsLoading(true);
        setLoadError("");

        const result = await getMyProfile();

        if (!active) {
          return;
        }

        setProfile(result);
        setForm({
          fullName: result.fullName,
          phoneNumber: result.phoneNumber ?? "",
          jobTitle: result.jobTitle ?? "",
          bio: result.bio ?? "",
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load profile.",
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const profileCompletion = useMemo(() => {
    if (!profile) {
      return 0;
    }

    const values = [
      profile.fullName,
      profile.email,
      profile.profileImageUrl,
      profile.phoneNumber,
      profile.jobTitle,
      profile.bio,
      profile.department?.name,
    ];

    const completed = values.filter(
      (value) =>
        typeof value === "string" &&
        value.trim().length > 0,
    ).length;

    return Math.round((completed / values.length) * 100);
  }, [profile]);

  function updateForm<K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  }

  function beginEditing() {
    if (!profile) {
      return;
    }

    setForm({
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber ?? "",
      jobTitle: profile.jobTitle ?? "",
      bio: profile.bio ?? "",
    });

    setFormError("");
    setSuccessMessage("");
    setIsEditing(true);
  }

  function cancelEditing() {
    if (!profile || isSaving) {
      return;
    }

    setForm({
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber ?? "",
      jobTitle: profile.jobTitle ?? "",
      bio: profile.bio ?? "",
    });

    setFormError("");
    setIsEditing(false);
  }

  function validateForm(): string {
    if (!form.fullName.trim()) {
      return "Full name is required.";
    }

    if (form.fullName.trim().length > 150) {
      return "Full name cannot exceed 150 characters.";
    }

    if (form.phoneNumber.trim().length > 30) {
      return "Phone number cannot exceed 30 characters.";
    }

    if (form.jobTitle.trim().length > 100) {
      return "Job title cannot exceed 100 characters.";
    }

    if (form.bio.trim().length > 500) {
      return "Bio cannot exceed 500 characters.";
    }

    return "";
  }

  async function handleSaveProfile() {
    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setFormError("");
      setSuccessMessage("");

      const request: UpdateProfileRequest = {
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        jobTitle: form.jobTitle.trim() || null,
        bio: form.bio.trim() || null,
      };

      const result = await updateMyProfile(request);

      setProfile(result.profile);
      setForm({
        fullName: result.profile.fullName,
        phoneNumber:
          result.profile.phoneNumber ?? "",
        jobTitle: result.profile.jobTitle ?? "",
        bio: result.profile.bio ?? "",
      });

      setSuccessMessage(result.message);
      setIsEditing(false);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to update profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function validateSelectedImage(
    file: File,
    maximumSizeInMb: number,
  ): string {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return "Only JPG, PNG and WebP images are allowed.";
    }

    const maximumBytes =
      maximumSizeInMb * 1024 * 1024;

    if (file.size > maximumBytes) {
      return `Image cannot exceed ${maximumSizeInMb} MB.`;
    }

    return "";
  }

  async function handleProfilePhotoSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError = validateSelectedImage(file, 5);

    if (validationError) {
      setImageUploadError(validationError);
      return;
    }

    try {
      setIsUploadingProfilePhoto(true);
      setImageUploadError("");
      setSuccessMessage("");

      const result = await uploadMyProfilePhoto(file);

      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              profileImageUrl: result.profileImageUrl,
            }
          : currentProfile,
      );

      setSuccessMessage(result.message);
    } catch (error) {
      setImageUploadError(
        error instanceof Error
          ? error.message
          : "Unable to upload profile photo.",
      );
    } finally {
      setIsUploadingProfilePhoto(false);
    }
  }

  async function handleCoverPhotoSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const validationError = validateSelectedImage(file, 8);

    if (validationError) {
      setImageUploadError(validationError);
      return;
    }

    try {
      setIsUploadingCoverPhoto(true);
      setImageUploadError("");
      setSuccessMessage("");

      const result = await uploadMyCoverPhoto(file);

      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              coverImageUrl: result.coverImageUrl,
            }
          : currentProfile,
      );

      setSuccessMessage(result.message);
    } catch (error) {
      setImageUploadError(
        error instanceof Error
          ? error.message
          : "Unable to upload cover photo.",
      );
    } finally {
      setIsUploadingCoverPhoto(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />

          <p className="mt-5 font-semibold text-slate-600 dark:text-slate-300">
            Loading your profile...
          </p>
        </section>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center dark:border-red-900/60 dark:bg-red-950/30">
          <i className="fa-solid fa-triangle-exclamation text-4xl text-red-600" />

          <h1 className="mt-4 text-xl font-bold text-red-900 dark:text-red-200">
            Unable to load profile
          </h1>

          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {loadError || "Profile information was not found."}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div
          className="relative h-56 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"
          style={
            profile.coverImageUrl
              ? {
                  backgroundImage: `url("${profile.coverImageUrl}")`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }
              : undefined
          }
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-black/15" />

          <input
            id="cover-photo-input"
            ref={coverPhotoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={(event) => {
              void handleCoverPhotoSelected(event);
            }}
            className="sr-only"
          />

          <label
            htmlFor="cover-photo-input"
            aria-disabled={isUploadingCoverPhoto}
            className={`absolute bottom-4 right-4 z-20 rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm backdrop-blur transition ${
              isUploadingCoverPhoto
                ? "pointer-events-none cursor-not-allowed opacity-70"
                : "cursor-pointer hover:bg-white"
            }`}
          >
            <i
              className={`fa-solid ${
                isUploadingCoverPhoto
                  ? "fa-spinner fa-spin"
                  : "fa-camera"
              } mr-2`}
            />

            {isUploadingCoverPhoto
              ? "Uploading..."
              : "Edit Cover"}
          </label>
        </div>

        <div className="relative px-6 pb-8 sm:px-10">
          <div className="-mt-20 flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className="relative shrink-0">
              {profile.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt={`${profile.fullName}'s profile`}
                  className="h-40 w-40 rounded-full border-8 border-white object-cover shadow-lg dark:border-slate-900"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-full border-8 border-white bg-blue-600 text-5xl font-black text-white shadow-lg dark:border-slate-900">
                  {getInitials(profile.fullName)}
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  profilePhotoInputRef.current?.click()
                }
                disabled={isUploadingProfilePhoto}
                title="Change profile photo"
                className="absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-slate-700 shadow transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-900 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              >
                <i
                  className={`fa-solid ${
                    isUploadingProfilePhoto
                      ? "fa-spinner fa-spin"
                      : "fa-camera"
                  }`}
                />
              </button>

              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  void handleProfilePhotoSelected(event)
                }
                className="hidden"
              />
            </div>

            <div className="min-w-0 flex-1 pb-3">
              <h1 className="truncate text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
                {profile.fullName}
              </h1>

              <p className="mt-2 text-base font-semibold text-slate-600 dark:text-slate-300">
                {profile.jobTitle || getRoleLabel(profile.role)}
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {profile.department?.name ||
                  "No department assigned"}
              </p>
            </div>

            <div className="pb-3">
              {!isEditing && (
                <button
                  type="button"
                  onClick={beginEditing}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
                >
                  <i className="fa-solid fa-pen mr-2" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {successMessage && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
          <i className="fa-solid fa-circle-check mr-2" />
          {successMessage}
        </div>
      )}

      {imageUploadError && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <i className="fa-solid fa-circle-exclamation mr-2" />
          {imageUploadError}
        </div>
      )}

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Personal Information
              </h2>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Update information shown on your profile.
              </p>
            </div>

            {isEditing && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                Editing
              </span>
            )}
          </div>

          <div className="mt-7 space-y-5">
            <div>
              <label
                htmlFor="profile-full-name"
                className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
              >
                Full name
              </label>

              <input
                id="profile-full-name"
                value={form.fullName}
                disabled={!isEditing || isSaving}
                onChange={(event) =>
                  updateForm(
                    "fullName",
                    event.target.value,
                  )
                }
                className={`${inputClassName} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 dark:disabled:bg-slate-800`}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="profile-phone"
                  className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Phone number
                </label>

                <input
                  id="profile-phone"
                  type="tel"
                  value={form.phoneNumber}
                  disabled={!isEditing || isSaving}
                  onChange={(event) =>
                    updateForm(
                      "phoneNumber",
                      event.target.value,
                    )
                  }
                  placeholder="Example: +65 9123 4567"
                  className={`${inputClassName} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 dark:disabled:bg-slate-800`}
                />
              </div>

              <div>
                <label
                  htmlFor="profile-job-title"
                  className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Job title
                </label>

                <input
                  id="profile-job-title"
                  value={form.jobTitle}
                  disabled={!isEditing || isSaving}
                  onChange={(event) =>
                    updateForm(
                      "jobTitle",
                      event.target.value,
                    )
                  }
                  placeholder="Example: Software Engineer"
                  className={`${inputClassName} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 dark:disabled:bg-slate-800`}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="profile-bio"
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Bio
                </label>

                <span className="text-xs text-slate-400">
                  {form.bio.length}/500
                </span>
              </div>

              <textarea
                id="profile-bio"
                rows={5}
                maxLength={500}
                value={form.bio}
                disabled={!isEditing || isSaving}
                onChange={(event) =>
                  updateForm("bio", event.target.value)
                }
                placeholder="Write a short introduction about yourself."
                className={`${inputClassName} resize-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 dark:disabled:bg-slate-800`}
              />
            </div>

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <i className="fa-solid fa-circle-exclamation mr-2" />
                {formError}
              </div>
            )}

            {isEditing && (
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleSaveProfile()
                  }
                  disabled={isSaving}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {isSaving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Account Information
            </h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              These details are managed by HR or an administrator.
            </p>

            <dl className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
              <AccountDetail
                label="Email"
                value={profile.email}
              />

              <AccountDetail
                label="Employee code"
                value={profile.employeeCode || "Not assigned"}
              />

              <AccountDetail
                label="Role"
                value={getRoleLabel(profile.role)}
              />

              <AccountDetail
                label="Department"
                value={
                  profile.department?.name ||
                  "Not assigned"
                }
              />

              <AccountDetail
                label="Manager"
                value={
                  profile.manager?.fullName ||
                  "Not assigned"
                }
              />

              <AccountDetail
                label="Account status"
                value={
                  profile.isActive ? "Active" : "Inactive"
                }
              />

              <AccountDetail
                label="Member since"
                value={formatDate(profile.createdAt)}
              />
            </dl>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Profile Completion
                </h2>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Complete your profile so colleagues can identify you.
                </p>
              </div>

              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {profileCompletion}%
              </span>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${profileCompletion}%`,
                }}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Password & Security
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Password changing and active-session controls will be added in the next step.
            </p>

            <button
              type="button"
              disabled
              className="mt-5 w-full rounded-xl border border-slate-300 bg-slate-100 px-5 py-3 font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            >
              <i className="fa-solid fa-lock mr-2" />
              Change Password
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}

function AccountDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-4">
      <dt className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </dt>

      <dd className="max-w-[60%] text-right text-sm font-bold text-slate-900 dark:text-white">
        {value}
      </dd>
    </div>
  );
}