import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { Permission } from "@/types";

export function serializeDocument<T extends { _id?: unknown; createdAt?: unknown; updatedAt?: unknown }>(doc: T) {
  return {
    ...doc,
    _id: doc._id && typeof doc._id === "object" && "toString" in doc._id ? doc._id.toString() : doc._id,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt
  };
}

export function pagination(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  return { page, limit, skip: (page - 1) * limit, searchParams };
}

export async function requirePermission(permission: Permission) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session?.user.role, permission)) {
    return { session, error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { session, error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function parseBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
