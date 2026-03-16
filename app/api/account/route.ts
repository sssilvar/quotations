import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserAvatarUrl } from "@/lib/user-avatar";

function serializeUser(user: {
  id: string;
  username: string;
  name: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: string;
}) {
  return {
    ...user,
    image: getUserAvatarUrl(user),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json(serializeUser(user));
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const data: {
    username?: string;
    name?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    passwordHash?: string;
  } = {};
  const canEditIdentityFields = session.user.role === "admin";

  if (body.username !== undefined) {
    if (!canEditIdentityFields) {
      return NextResponse.json({ error: "Solo los administradores pueden cambiar su usuario" }, { status: 403 });
    }
    const username = String(body.username).trim();
    if (!username) {
      return NextResponse.json({ error: "Usuario requerido" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "Usuario ya existe" }, { status: 409 });
    }
    data.username = username;
  }

  if (body.name !== undefined) {
    if (!canEditIdentityFields) {
      return NextResponse.json({ error: "Solo los administradores pueden cambiar su nombre" }, { status: 403 });
    }
    data.name = String(body.name || "").trim() || null;
  }
  if (body.lastName !== undefined) {
    if (!canEditIdentityFields) {
      return NextResponse.json({ error: "Solo los administradores pueden cambiar su apellido" }, { status: 403 });
    }
    data.lastName = String(body.lastName || "").trim() || null;
  }
  if (body.email !== undefined) {
    if (!canEditIdentityFields) {
      return NextResponse.json({ error: "Solo los administradores pueden cambiar su email" }, { status: 403 });
    }
    data.email = String(body.email || "").trim() || null;
  }
  if (body.avatarUrl !== undefined) data.avatarUrl = String(body.avatarUrl || "").trim() || null;

  const nextPassword = String(body.newPassword || "").trim();
  if (nextPassword) {
    const currentPassword = String(body.currentPassword || "");
    if (!currentPassword) {
      return NextResponse.json({ error: "Contraseña actual requerida" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!existingUser || !(await bcrypt.compare(currentPassword, existingUser.passwordHash))) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
    }

    data.passwordHash = await bcrypt.hash(nextPassword, 10);
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
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

  return NextResponse.json(serializeUser(user));
}
