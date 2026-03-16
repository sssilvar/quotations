import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserAvatarUrl } from "@/lib/user-avatar";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      _count: { select: { quotations: true } },
    },
    orderBy: { username: "asc" },
  });
  return NextResponse.json(users.map((user) => ({ ...user, image: getUserAvatarUrl(user) })));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { username, password, role = "engineer", name, lastName, email, avatarUrl } = body;
  if (!username?.trim() || !password?.trim())
    return NextResponse.json({ error: "username and password required" }, { status: 400 });
  if (!["admin", "engineer"].includes(role))
    return NextResponse.json({ error: "role must be admin or engineer" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (existing)
    return NextResponse.json({ error: "Usuario ya existe" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password.trim(), 10);
  const user = await prisma.user.create({
    data: {
      username: username.trim(),
      passwordHash,
      role,
      name: name?.trim() || null,
      lastName: lastName?.trim() || null,
      email: email?.trim() || null,
      avatarUrl: avatarUrl?.trim() || null,
    },
    select: {
      id: true,
      username: true,
      name: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ ...user, image: getUserAvatarUrl(user) });
}
