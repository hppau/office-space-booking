"use client";

import { useMemo, useState } from "react";

import { changeMyPassword } from "@/api/api-service";

type ChangePasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

type PasswordField = "current" | "new" | "confirm";

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  if (score <= 1) {
    return {
      label: "Weak",
      width: "20%",
      barClassName: "bg-red-500",
      textClassName: "text-red-600 dark:text-red-400",
    };
  }

  if (score <= 3) {
    return {
      label: "Medium",
      width: "60%",
      barClassName: "bg-amber-500",
      textClassName: "text-amber-600 dark:text-amber-400",
    };
  }

  return {
    label: "Strong",
    width: "100%",
    barClassName: "bg-green-500",
    textClassName: "text-green-600 dark:text-green-400",
  };
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [visibleFields, setVisibleFields] = useState<
    Record<PasswordField, boolean>
  >({
    current: false,
    new: false,
    confirm: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const passwordStrength = useMemo(
    () => getPasswordStrength(newPassword),
    [newPassword],
  );

  if (!isOpen) {
    return null;
  }

  function resetAndClose() {
    if (isSubmitting) {
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorMessage("");

    setVisibleFields({
      current: false,
      new: false,
      confirm: false,
    });

    onClose();
  }

  function toggleVisibility(field: PasswordField) {
    setVisibleFields((currentFields) => ({
      ...currentFields,
      [field]: !currentFields[field],
    }));
  }

  function validateForm(): string {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return "All password fields are required.";
    }

    if (newPassword.length < 8) {
      return "New password must contain at least 8 characters.";
    }

    if (!/[a-z]/.test(newPassword)) {
      return "New password must contain at least one lowercase letter.";
    }

    if (!/[A-Z]/.test(newPassword)) {
      return "New password must contain at least one uppercase letter.";
    }

    if (!/[0-9]/.test(newPassword)) {
      return "New password must contain at least one number.";
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return "New password must contain at least one special character.";
    }

    if (newPassword !== confirmPassword) {
      return "The new passwords do not match.";
    }

    return "";
  }

  async function handleSubmit() {
    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const result = await changeMyPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      onSuccess(result.message);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to change password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          resetAndClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="change-password-title"
              className="text-2xl font-black text-slate-950 dark:text-white"
            >
              Change Password
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Enter your current password and choose a secure new
              password.
            </p>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            disabled={isSubmitting}
            aria-label="Close password dialog"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="mt-7 space-y-5">
          <PasswordInput
            id="current-password"
            label="Current password"
            value={currentPassword}
            isVisible={visibleFields.current}
            disabled={isSubmitting}
            onChange={setCurrentPassword}
            onToggleVisibility={() =>
              toggleVisibility("current")
            }
          />

          <PasswordInput
            id="new-password"
            label="New password"
            value={newPassword}
            isVisible={visibleFields.new}
            disabled={isSubmitting}
            onChange={setNewPassword}
            onToggleVisibility={() => toggleVisibility("new")}
          />

          {newPassword && (
            <div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400">
                  Password strength
                </span>

                <span className={passwordStrength.textClassName}>
                  {passwordStrength.label}
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${passwordStrength.barClassName}`}
                  style={{
                    width: passwordStrength.width,
                  }}
                />
              </div>
            </div>
          )}

          <PasswordInput
            id="confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            isVisible={visibleFields.confirm}
            disabled={isSubmitting}
            onChange={setConfirmPassword}
            onToggleVisibility={() =>
              toggleVisibility("confirm")
            }
          />

          <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-400">
            Use at least 8 characters, including an uppercase
            letter, lowercase letter, number and special character.
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <i className="fa-solid fa-circle-exclamation mr-2" />

              {errorMessage}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={resetAndClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isSubmitting}
            className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            <i
              className={`fa-solid ${
                isSubmitting
                  ? "fa-spinner fa-spin"
                  : "fa-lock"
              } mr-2`}
            />

            {isSubmitting
              ? "Changing..."
              : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

type PasswordInputProps = {
  id: string;
  label: string;
  value: string;
  isVisible: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
};

function PasswordInput({
  id,
  label,
  value,
  isVisible,
  disabled,
  onChange,
  onToggleVisibility,
}: PasswordInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-300"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          value={value}
          disabled={disabled}
          autoComplete={
            id === "current-password"
              ? "current-password"
              : "new-password"
          }
          onChange={(event) => {
            onChange(event.target.value);
          }}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />

        <button
          type="button"
          onClick={onToggleVisibility}
          disabled={disabled}
          aria-label={
            isVisible ? "Hide password" : "Show password"
          }
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 transition hover:text-slate-900 disabled:opacity-50 dark:hover:text-white"
        >
          <i
            className={`fa-solid ${
              isVisible ? "fa-eye-slash" : "fa-eye"
            }`}
          />
        </button>
      </div>
    </div>
  );
}