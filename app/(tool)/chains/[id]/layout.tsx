import Link from "next/link";
import { notFound } from "next/navigation";
import ChainTabs from "@/components/ChainTabs";
import { requireAdmin } from "@/lib/admin";

export default async function ChainLayout({ children, params }: LayoutProps<"/chains/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data: chain } = await supabase.from("llm_prompt_chains").select("id, name, description").eq("id", id).maybeSingle();
  if (!chain) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="font-mono text-sm underline underline-offset-4">← All chains</Link>
        <h1 className="mt-3 font-display text-5xl uppercase leading-none">{chain.name}</h1>
        {chain.description && <p className="mt-2 max-w-2xl font-mono text-sm text-muted">{chain.description}</p>}
      </div>
      <ChainTabs chainId={chain.id} />
      {children}
    </div>
  );
}
