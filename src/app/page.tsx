import { LandingHeader, LandingContent } from "@/components/landing";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <LandingHeader />
      <main>
        <LandingContent />
      </main>
    </div>
  );
}
