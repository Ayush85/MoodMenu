import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { isValidEmail, normalizeEmail, validatePassword } from "@/lib/password-policy";

const allowedRoles = ["WAITER", "COOK", "CHEF"] as const;

type StaffRole = (typeof allowedRoles)[number];

async function ensureOwnership(restaurantId: string, userId: string) {
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: restaurantId, ownerId: userId },
    select: { id: true },
  });
  return !!restaurant;
}

function toPublicStaff(staff: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    phone: staff.phone,
    role: staff.role,
    isActive: staff.isActive,
    createdAt: staff.createdAt,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const ok = await ensureOwnership(id, session.user.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const staff = await prisma.restaurantStaff.findMany({
    where: { restaurantId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(staff.map(toPublicStaff));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const ok = await ensureOwnership(id, session.user.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const name = (body?.name || "").trim();
  const email = normalizeEmail(String(body?.email || ""));
  const password = String(body?.password || "");
  const phone = (body?.phone || "").trim();
  const role = body?.role as StaffRole;

  if (!name || !email || !password || !role || !allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Name, email, password and valid role are required" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const existing = await prisma.restaurantStaff.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already used by another staff account" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const created = await prisma.restaurantStaff.create({
    data: {
      name,
      email,
      password: passwordHash,
      phone: phone || null,
      role,
      restaurantId: id,
    },
  });

  return NextResponse.json(toPublicStaff(created), { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const ok = await ensureOwnership(id, session.user.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const staffId = body?.staffId as string | undefined;
  const role = body?.role as StaffRole | undefined;
  const isActive = body?.isActive as boolean | undefined;
  const name = body?.name as string | undefined;
  const phone = body?.phone as string | undefined;
  const password = body?.password as string | undefined;

  if (!staffId) {
    return NextResponse.json({ error: "staffId is required" }, { status: 400 });
  }

  if (role && !allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const exists = await prisma.restaurantStaff.findFirst({
    where: { id: staffId, restaurantId: id },
    select: { id: true },
  });

  if (!exists) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const trimmedPassword = typeof password === "string" ? password.trim() : undefined;
  if (trimmedPassword) {
    const passwordError = validatePassword(trimmedPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
  }

  const passwordHash = trimmedPassword ? await bcrypt.hash(trimmedPassword, 12) : undefined;

  const updated = await prisma.restaurantStaff.update({
    where: { id: staffId },
    data: {
      role,
      isActive,
      name: typeof name === "string" ? name.trim() || undefined : undefined,
      phone: typeof phone === "string" ? phone.trim() || null : undefined,
      password: passwordHash,
    },
  });

  return NextResponse.json(toPublicStaff(updated));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.actorType === "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const ok = await ensureOwnership(id, session.user.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const staffId = body?.staffId as string | undefined;

  if (!staffId) {
    return NextResponse.json({ error: "staffId is required" }, { status: 400 });
  }

  await prisma.restaurantStaff.deleteMany({
    where: { id: staffId, restaurantId: id },
  });

  return NextResponse.json({ success: true });
}
