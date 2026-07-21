import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(
  password: string,
): Promise<string> {
  if (password.length < 8) {
    throw new Error(
      "Password must contain at least 8 characters.",
    );
  }

  const salt = randomBytes(SALT_LENGTH).toString("hex");

  const derivedKey = (await scrypt(
    password,
    salt,
    KEY_LENGTH,
  )) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedPasswordHash: string,
): Promise<boolean> {
  const [salt, storedKeyHex] =
    storedPasswordHash.split(":");

  if (!salt || !storedKeyHex) {
    return false;
  }

  const storedKey = Buffer.from(storedKeyHex, "hex");

  const derivedKey = (await scrypt(
    password,
    salt,
    storedKey.length,
  )) as Buffer;

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}