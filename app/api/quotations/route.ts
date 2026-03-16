import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSolarCost } from "@/lib/solar-cost";

function parseOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = session.user.role === "admin" ? {} : { userId: session.user.id };
  const list = await prisma.quotation.findMany({
    where,
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userExists = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!userExists) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const clientName = String(body.clientName ?? "").trim();
  if (!clientName) {
    return NextResponse.json({ error: "clientName required" }, { status: 400 });
  }

  const ahorroMes = parseOptionalNumber(body.ahorroMes);
  if (ahorroMes == null || Number.isNaN(ahorroMes) || ahorroMes <= 0) {
    return NextResponse.json({ error: "ahorroMes required" }, { status: 400 });
  }

  const optionalNumericFields = {
    latitude: parseOptionalNumber(body.latitude),
    longitude: parseOptionalNumber(body.longitude),
    consumoKwh: parseOptionalNumber(body.consumoKwh),
    tarifaKwh: parseOptionalNumber(body.tarifaKwh),
    contribucion: parseOptionalNumber(body.contribucion),
    alumbrado: parseOptionalNumber(body.alumbrado),
    autoconsumo: parseOptionalNumber(body.autoconsumo),
    hbs: parseOptionalNumber(body.hbs),
    generacion: parseOptionalNumber(body.generacion),
    adicionales: parseOptionalNumber(body.adicionales),
    descuento: parseOptionalNumber(body.descuento),
  };

  for (const [key, value] of Object.entries(optionalNumericFields)) {
    if (Number.isNaN(value)) {
      return NextResponse.json({ error: `${key} invalid` }, { status: 400 });
    }
  }

  const costBreakdown = calculateSolarCost({
    generacion: optionalNumericFields.generacion,
    hbs: optionalNumericFields.hbs,
    adicionales: optionalNumericFields.adicionales,
    descuento: optionalNumericFields.descuento,
  });
  if (!costBreakdown) {
    return NextResponse.json({ error: "generacion required" }, { status: 400 });
  }

  const q = await prisma.quotation.create({
    data: {
      userId: session.user.id,
      clientName,
      clientEmail: body.clientEmail ?? null,
      clientPhone: body.clientPhone ?? null,
      clientAddress: body.clientAddress ?? null,
      country: body.country ?? "Colombia",
      state: body.state ?? null,
      city: body.city ?? null,
      latitude: optionalNumericFields.latitude,
      longitude: optionalNumericFields.longitude,
      consumoKwh: optionalNumericFields.consumoKwh,
      tarifaKwh: optionalNumericFields.tarifaKwh,
      contribucion: optionalNumericFields.contribucion,
      alumbrado: optionalNumericFields.alumbrado,
      autoconsumo: optionalNumericFields.autoconsumo,
      hbs: optionalNumericFields.hbs,
      generacion: optionalNumericFields.generacion,
      adicionales: optionalNumericFields.adicionales,
      descuento: optionalNumericFields.descuento,
      costoTotal: costBreakdown.finalCost,
      ahorroMes,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(q);
}
