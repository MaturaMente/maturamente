import { headers } from "next/headers";
import { connection } from "next/server";

export async function getCurrentUserId(): Promise<string> {
  await connection();
  const headersList = await headers();
  const userId = headersList.get("x-user-id");

  if (!userId) {
    throw new Error("User not authenticated");
  }

  return userId;
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
}> {
  await connection();
  const headersList = await headers();
  const id = headersList.get("x-user-id");
  const email = headersList.get("x-user-email");
  const name = headersList.get("x-user-name");

  if (!id || !email) {
    throw new Error("User not authenticated");
  }

  return {
    id,
    email,
    name,
  };
}

// Optional user functions that return null instead of throwing errors
export async function getCurrentUserIdOptional(): Promise<string | null> {
  await connection();
  const headersList = await headers();
  return headersList.get("x-user-id");
}

export async function getCurrentUserOptional(): Promise<{
  id: string;
  email: string;
  name: string | null;
} | null> {
  await connection();
  const headersList = await headers();
  const id = headersList.get("x-user-id");
  const email = headersList.get("x-user-email");
  const name = headersList.get("x-user-name");

  if (!id || !email) {
    return null;
  }

  return {
    id,
    email,
    name,
  };
}

export async function isAuthenticated(): Promise<boolean> {
  await connection();
  const headersList = await headers();
  const userId = headersList.get("x-user-id");
  const email = headersList.get("x-user-email");

  return !!(userId && email);
}
