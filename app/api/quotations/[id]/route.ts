import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSolarCost } from "@/lib/solar-cost";

type Ctx = { params: Promise<{ id: string }> };

function parseOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

async function getQuotation(id: string, userId: string, role: string) {
  const q = await prisma.quotation.findUnique({
    where: { id },
    include: { user: { select: { id: true, username: true, name: true, lastName: true, email: true, role: true } } },
  });
  if (!q) return null;
  if (role !== "admin" && q.userId !== userId) return null;
  return q;
}

export async function GET(_req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const q = await getQuotation(id, session.user.id, session.user.role);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(q);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const q = await getQuotation(id, session.user.id, session.user.role);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  for (const key of [
    "clientName", "clientEmail", "clientPhone", "clientAddress", "country", "state", "city",
    "notes", "visitNotes", "annotationData",
  ] as const) {
    if (body[key] !== undefined) {
      if (key === "clientName") {
        const clientName = String(body[key] ?? "").trim();
        if (!clientName) {
          return NextResponse.json({ error: "clientName required" }, { status: 400 });
        }
        data[key] = clientName;
      } else {
        data[key] = body[key];
      }
    }
  }
  if (body.imagePath !== undefined) data.imagePath = body.imagePath;
  if (body.latitude !== undefined) {
    const latitude = parseOptionalNumber(body.latitude);
    if (Number.isNaN(latitude)) {
      return NextResponse.json({ error: "latitude invalid" }, { status: 400 });
    }
    data.latitude = latitude;
  }
  if (body.longitude !== undefined) {
    const longitude = parseOptionalNumber(body.longitude);
    if (Number.isNaN(longitude)) {
      return NextResponse.json({ error: "longitude invalid" }, { status: 400 });
    }
    data.longitude = longitude;
  }
  for (const key of [
    "consumoKwh", "tarifaKwh", "contribucion", "alumbrado",
    "autoconsumo", "hbs", "generacion", "adicionales", "descuento", "ahorroMes",
  ] as const) {
    if (body[key] !== undefined) {
      const value = parseOptionalNumber(body[key]);
      if (Number.isNaN(value)) {
        return NextResponse.json({ error: `${key} invalid` }, { status: 400 });
      }
      if (key === "ahorroMes" && (value == null || value <= 0)) {
        return NextResponse.json({ error: `${key} required` }, { status: 400 });
      }
      data[key] = value;
    }
  }
  if (body.isOfficial !== undefined) data.isOfficial = Boolean(body.isOfficial);

  const nextGeneracion =
    data.generacion !== undefined ? (data.generacion as number | null) : q.generacion;
  const nextHbs = data.hbs !== undefined ? (data.hbs as number | null) : q.hbs;
  const nextAdicionales =
    data.adicionales !== undefined ? (data.adicionales as number | null) : q.adicionales;
  const nextDescuento =
    data.descuento !== undefined ? (data.descuento as number | null) : q.descuento;
  const costBreakdown = calculateSolarCost({
    generacion: nextGeneracion,
    hbs: nextHbs,
    adicionales: nextAdicionales,
    descuento: nextDescuento,
  });
  if (nextGeneracion != null && !costBreakdown) {
    return NextResponse.json({ error: "generacion invalid" }, { status: 400 });
  }
  if (costBreakdown) {
    data.costoTotal = costBreakdown.finalCost;
  }

  const nextIsOfficial = data.isOfficial ?? q.isOfficial;
  const nextAhorroMes =
    data.ahorroMes !== undefined ? (data.ahorroMes as number | null) : q.ahorroMes;
  const nextCostoTotal = costBreakdown?.finalCost ?? q.costoTotal;
  if (nextIsOfficial && (!nextCostoTotal || !nextAhorroMes)) {
    return NextResponse.json(
      { error: "generacion and ahorroMes required to promote" },
      { status: 400 }
    );
  }

  // Save version snapshot before applying changes
  if (Object.keys(data).length > 0) {
    await prisma.quotationVersion.create({
      data: {
        quotationId: id,
        editedBy: session.user.id,
        snapshot: JSON.stringify(q),
      },
    });
  }

  const updated = await prisma.quotation.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const q = await getQuotation(id, session.user.id, session.user.role);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.quotation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
