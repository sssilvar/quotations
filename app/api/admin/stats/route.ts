import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
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
      quotations: {
        select: { isOfficial: true },
      },
    },
    orderBy: { username: "asc" },
  });

  const stats = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    lastName: u.lastName,
    email: u.email,
    avatarUrl: u.avatarUrl,
    image: getUserAvatarUrl(u),
    role: u.role,
    createdAt: u.createdAt,
    total: u._count.quotations,
    official: u.quotations.filter((q) => q.isOfficial).length,
    pending: u.quotations.filter((q) => !q.isOfficial).length,
  }));

  const allQuotations = await prisma.quotation.findMany({
    select: {
      id: true,
      shareableId: true,
      clientName: true,
      isOfficial: true,
      createdAt: true,
      latitude: true,
      longitude: true,
      country: true,
      state: true,
      city: true,
      userId: true,
      user: { select: { username: true, name: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ stats, quotations: allQuotations });
}
