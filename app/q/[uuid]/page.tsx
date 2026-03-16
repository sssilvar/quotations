import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { QuotationActionsMenu } from "@/components/QuotationActionsMenu";
import { QuotationDocument } from "@/components/QuotationDocument";
import { EditInDashboard } from "./EditInDashboard";

type Props = { params: Promise<{ uuid: string }> };

export default async function ShareablePage({ params }: Props) {
  const { uuid } = await params;
  const q = await prisma.quotation.findUnique({
    where: { shareableId: uuid },
    include: { user: { select: { username: true, name: true, lastName: true, email: true } } },
  });
  if (!q) notFound();

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-12">
      <div className="mx-auto max-w-xl">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-emerald-700">Soinsolar</h1>
          <p className="text-sm text-muted-foreground">Cotización sistema fotovoltaico</p>
        </header>

        <div className="mb-3 flex items-center justify-between gap-3">
          <EditInDashboard quotationId={q.id} userId={q.userId} />
          <QuotationActionsMenu shareableId={q.shareableId} />
        </div>

        <QuotationDocument q={q} />
      </div>
    </div>
  );
}
