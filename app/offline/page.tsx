export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Soinsolar</p>
        <h1 className="mt-3 text-2xl font-semibold">Sin conexion</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          La app esta instalada, pero esta pantalla necesita conexion para cargar datos actualizados.
        </p>
      </div>
    </main>
  );
}
