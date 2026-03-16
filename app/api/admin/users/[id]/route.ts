import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserAvatarUrl } from "@/lib/user-avatar";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const data: {
    username?: string;
    role?: string;
    name?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    passwordHash?: string;
  } = {};

  if (body.username !== undefined) {
    const username = String(body.username).trim();
    if (!username) return NextResponse.json({ error: "Usuario requerido" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Usuario ya existe" }, { status: 409 });
    }
    data.username = username;
  }

  if (body.role !== undefined) {
    if (!["admin", "engineer"].includes(body.role)) return NextResponse.json({ error: "role must be admin or engineer" }, { status: 400 });
    data.role = body.role;
  }
  if (body.name !== undefined) data.name = body.name?.trim() || null;
  if (body.lastName !== undefined) data.lastName = body.lastName?.trim() || null;
  if (body.email !== undefined) data.email = body.email?.trim() || null;
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl?.trim() || null;
  if (body.password !== undefined) {
    const password = String(body.password || "").trim();
    if (!password) return NextResponse.json({ error: "Contraseña inválida" }, { status: 400 });
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      name: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      role: true,
    },
  });
  return NextResponse.json({ ...user, image: getUserAvatarUrl(user) });
}
