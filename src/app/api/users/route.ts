import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { pagination, parseBody, requirePermission, serializeDocument } from "@/lib/api-utils";
import { User } from "@/models/User";

export async function GET(request: Request) {
  const { error } = await requirePermission("manage_users");
  if (error) return error;
  await connectDB();
  const { limit, skip, searchParams } = pagination(request);
  const role = searchParams.get("role");
  const query: Record<string, unknown> = role ? { role } : {};
  const [users, total] = await Promise.all([
    User.find(query).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(query)
  ]);
  return NextResponse.json({ users: users.map(serializeDocument), total });
}

export async function POST(request: Request) {
  const { error } = await requirePermission("manage_users");
  if (error) return error;
  const body = await parseBody(request);
  if (!body?.name || !body?.email || !body?.password) {
    return NextResponse.json({ message: "Name, email, and password are required" }, { status: 400 });
  }
  await connectDB();
  const password = await bcrypt.hash(body.password, 12);
  const user = await User.create({ ...body, password });
  const safeUser = user.toObject();
  delete safeUser.password;
  return NextResponse.json({ user: serializeDocument(safeUser) }, { status: 201 });
}
