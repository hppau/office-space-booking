import { supabaseAdmin } from "@/lib/supabase-admin";

const PROFILE_BUCKET = "profile-images";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type ProfileImageType = "avatar" | "cover";

function getFileExtension(file: File): string {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error("Unsupported image format.");
  }
}

export async function uploadProfileImage({
  file,
  userId,
  imageType,
}: {
  file: File;
  userId: number;
  imageType: ProfileImageType;
}): Promise<string> {
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error(
      "Only JPG, PNG and WebP images are allowed.",
    );
  }

  const maximumSize =
    imageType === "avatar"
      ? 5 * 1024 * 1024
      : 8 * 1024 * 1024;

  if (file.size > maximumSize) {
    throw new Error(
      imageType === "avatar"
        ? "Profile photo cannot exceed 5 MB."
        : "Cover photo cannot exceed 8 MB.",
    );
  }

  const extension = getFileExtension(file);

  const folder =
    imageType === "avatar" ? "avatars" : "covers";

  const filePath =
    `${folder}/${userId}/${imageType}-${Date.now()}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from(PROFILE_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw new Error("Unable to upload image.");
  }

  const { data } = supabaseAdmin.storage
    .from(PROFILE_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}