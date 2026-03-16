import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AutoPrintOnLoad } from "@/components/AutoPrintOnLoad";
import { QuotationActionsMenu } from "@/components/QuotationActionsMenu";
import { QuotationDocument } from "@/components/QuotationDocument";

type Props = {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ print?: string }>;
};

export default async function ShareableExportPage({ params, searchParams }: Props) {
  const { uuid } = await params;
  const { print } = await searchParams;
  const q = await prisma.quotation.findUnique({
    where: { shareableId: uuid },
    include: { user: { select: { username: true, name: true, lastName: true, email: true } } },
  });
  if (!q) notFound();

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-6">
      {print === "1" && <AutoPrintOnLoad />}
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex justify-end print:hidden">
          <div className="flex items-center gap-1 rounded-full border bg-background/95 p-1 shadow-sm">
            <QuotationActionsMenu shareableId={q.shareableId} compact />
          </div>
        </div>
        <QuotationDocument q={q} />
      </div>
    </div>
  );
}
