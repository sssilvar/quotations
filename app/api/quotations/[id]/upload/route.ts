import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const q = await prisma.quotation.findUnique({ where: { id } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role !== "admin" && q.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize)
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(file.type))
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${id}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const imagePath = `/uploads/${filename}`;
  const updated = await prisma.quotation.update({
    where: { id },
    data: { imagePath },
  });
  return NextResponse.json(updated);
}
