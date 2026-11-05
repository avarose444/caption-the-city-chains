import Link from "next/link";
import ActionForm, { SubmitButton } from "@/components/ActionForm";
import { cardClass, eyebrowClass, inputClass, labelClass } from "@/components/styles";
import { requireAdmin } from "@/lib/admin";
import { createChain } from "./actions";

export const dynamic = "force-dynamic";

type Chain = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  llm_prompt_chain_steps: { title: string; step_order: number }[];
  prompt_chain_mix: { weight: number } | null;
  generation_requests: { count: number }[];
};

export default async function ChainsPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("llm_prompt_chains")
    .select("id, name, description, is_active, llm_prompt_chain_steps (title, step_order), prompt_chain_mix (weight), generation_requests (count)")
    .order("created_at");
  const chains = (data ?? []) as unknown as Chain[];

  return (
    <div className="space-y-6">
      <header>
        <p className={eyebrowClass}>Caption the City</p>
        <h1 className="mt-1 font-display text-5xl uppercase leading-none">Prompt chains</h1>
        <p className="mt-2 max-w-2xl font-mono text-sm text-muted">
          A chain is a series of AI steps. Each step&apos;s output feeds the next, and the last step writes the captions. Build one, reorder its steps, and test it on a photo.
        </p>
      </header>
      {error && <p className="font-mono text-sm text-rouge">Couldn&apos;t load chains: {error.message}</p>}

      <details className={`${cardClass} p-5`} open={chains.length === 0}>
        <summary className="cursor-pointer font-display text-xl uppercase">+ New chain</summary>
        <ActionForm action={createChain} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className={labelClass}>Name *</span>
            <input name="name" required maxLength={80} placeholder="Describe, then joke" className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Description</span>
            <textarea name="description" rows={2} maxLength={500} className={`${inputClass} resize-y`} />
          </label>
          <SubmitButton pendingLabel="Creating…">Create chain</SubmitButton>
        </ActionForm>
      </details>

      <ul className="grid gap-4 md:grid-cols-2">
        {chains.map((chain) => {
          const steps = [...chain.llm_prompt_chain_steps].sort((a, b) => a.step_order - b.step_order);
          return (
            <li key={chain.id}>
              <Link href={`/chains/${chain.id}`} className={`${cardClass} block h-full p-5 transition-colors hover:border-bleu`}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-2xl uppercase leading-tight">{chain.name}</h2>
                  {!chain.is_active && <span className="shrink-0 bg-rule px-2 py-0.5 font-mono text-[11px] uppercase">Inactive</span>}
                </div>
                {chain.description && <p className="mt-1 font-mono text-sm text-muted">{chain.description}</p>}
                <ol className="mt-3 space-y-0.5 font-mono text-xs">
                  {steps.map((s) => (
                    <li key={s.step_order}>
                      {s.step_order}. {s.title}
                    </li>
                  ))}
                  {steps.length === 0 && <li className="text-muted">No steps yet</li>}
                </ol>
                <p className="mt-3 border-t border-rule pt-2 font-mono text-xs text-muted">
                  {chain.generation_requests[0]?.count ?? 0} runs · mix weight {chain.prompt_chain_mix?.weight ?? 0}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
