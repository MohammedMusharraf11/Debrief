export default function PingPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="rounded-lg bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Debrief</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Frontend is deployed</h1>
        <p className="mt-2 text-sm text-slate-600">If you can see this, Vercel is serving the Next.js app.</p>
      </div>
    </main>
  );
}
