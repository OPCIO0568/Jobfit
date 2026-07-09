import { InputWizard } from "@/components/jobfit/InputWizard";

export const dynamic = "force-dynamic";

export default function Home() {
  const isMockAI = process.env.MOCK_AI?.toLowerCase() === "true";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <InputWizard isMockAI={isMockAI} />
    </main>
  );
}
