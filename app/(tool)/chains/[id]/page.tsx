import ActionForm, { SubmitButton } from "@/components/ActionForm";
import ConfirmButton from "@/components/ConfirmButton";
import MoveButtons from "@/components/MoveButtons";
import { cardClass, eyebrowClass, ghostButtonClass, inputClass, labelClass } from "@/components/styles";
import { requireAdmin } from "@/lib/admin";
import { createStep, deleteChain, deleteStep, updateChain, updateStep } from "../../actions";

export const dynamic = "force-dynamic";

type Step = {
  id: string;
  step_order: number;
  title: string;
  model_id: string | null;
  include_image: boolean;
  prompt_template: string;
};
type Model = { id: string; name: string };

const PLACEHOLDERS = [
  ["{{previous}}", "The previous step's output"],
  ["{{count}}", "How many captions to write"],
  ["{{neighborhood}}", "Where the photo was taken"],
  ["{{note}}", "The poster's note"],
  ["{{terms}}", "Your Terms list"],
  ["{{examples}}", "Your example captions"],
  ["{{avoid}}", "Captions not to repeat"],
];

export default async function StepsPage({ params }: PageProps<"/chains/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: chain }, { data: stepRows }, { data: modelRows }] = await Promise.all([
    supabase.from("llm_prompt_chains").select("id, name, description, is_active").eq("id", id).single(),
    supabase.from("llm_prompt_chain_steps").select("id, step_order, title, model_id, include_image, prompt_template").eq("chain_id", id).order("step_order"),
    supabase.from("llm_models").select("id, name").eq("is_active", true).order("priority"),
  ]);
  const steps = (stepRows ?? []) as Step[];
  const models = (modelRows ?? []) as Model[];

  return (
    <div className="space-y-6">
      <details className={`${cardClass} p-5`}>
        <summary className="cursor-pointer font-display text-xl uppercase">Chain settings</summary>
        <ActionForm action={updateChain.bind(null, id)} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className={labelClass}>Name *</span>
            <input name="name" required maxLength={80} defaultValue={chain?.name} className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Description</span>
            <textarea name="description" rows={2} maxLength={500} defaultValue={chain?.description ?? ""} className={`${inputClass} resize-y`} />
          </label>
          <label className="flex items-center gap-2 font-mono text-sm">
            <input type="checkbox" name="is_active" defaultChecked={chain?.is_active} className="h-4 w-4" />
            Active (can be used by Caption the City)
          </label>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SubmitButton pendingLabel="Saving…">Save chain</SubmitButton>
            <ConfirmButton
              action={deleteChain.bind(null, id)}
              label="Delete chain"
              message={`Delete “${chain?.name}” and its ${steps.length} steps? Past runs stay in the logs.`}
            />
          </div>
        </ActionForm>
      </details>

      <ol className="space-y-3">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const usesPrevious = step.prompt_template.includes("{{previous}}");
          return (
            <li key={step.id} className={`${cardClass} p-4`}>
              <div className="flex items-start gap-3">
                <span className="font-display text-4xl leading-none text-rouge">{step.step_order}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-xl uppercase leading-tight">{step.title}</h2>
                  <p className="mt-1 font-mono text-xs text-muted">
                    {models.find((m) => m.id === step.model_id)?.name ?? "Best active model"}
                    {step.include_image && " · sees the photo"}
                    {isLast ? " · returns the captions" : " · output feeds the next step"}
                  </p>
                </div>
                <MoveButtons stepId={step.id} chainId={id} order={step.step_order} isFirst={i === 0} isLast={isLast} />
              </div>
              {i > 0 && !usesPrevious && (
                <p className="mt-2 font-mono text-xs text-rouge">
                  ! This step doesn&apos;t use {"{{previous}}"}, so it ignores the step before it.
                </p>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer font-mono text-xs underline underline-offset-4">Edit step</summary>
                <ActionForm action={updateStep.bind(null, step.id, id)} className="mt-3 space-y-3">
                  <StepFields step={step} models={models} />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <SubmitButton pendingLabel="Saving…" className={ghostButtonClass}>Save step</SubmitButton>
                    <ConfirmButton action={deleteStep.bind(null, step.id, id)} label="Delete step" message={`Delete step ${step.step_order}, “${step.title}”?`} />
                  </div>
                </ActionForm>
              </details>
            </li>
          );
        })}
        {steps.length === 0 && <li className="font-mono text-sm text-muted">No steps yet. Add the first one below.</li>}
      </ol>

      <section className={`${cardClass} p-5`}>
        <h2 className="font-display text-xl uppercase">+ Add a step</h2>
        <p className="mt-1 font-mono text-xs text-muted">New steps go at the end. Use the arrows to reorder.</p>
        {/* key resets the form after a step is added */}
        <ActionForm key={steps.length} action={createStep.bind(null, id)} className="mt-4 space-y-3">
          <StepFields models={models} />
          <SubmitButton pendingLabel="Adding…">Add step</SubmitButton>
        </ActionForm>
      </section>

      <section>
        <p className={eyebrowClass}>Placeholders you can use in prompts</p>
        <dl className="mt-2 grid gap-x-4 gap-y-1 font-mono text-xs sm:grid-cols-[9rem_1fr]">
          {PLACEHOLDERS.map(([name, meaning]) => (
            <div key={name} className="contents">
              <dt className="font-bold">{name}</dt>
              <dd className="text-muted">{meaning}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

function StepFields({ step, models }: { step?: Step; models: Model[] }) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1">
          <span className={labelClass}>Title *</span>
          <input name="title" required maxLength={120} defaultValue={step?.title} placeholder="Describe the image" className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Model</span>
          <select name="model_id" defaultValue={step?.model_id ?? ""} className={inputClass}>
            <option value="">Best active model</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1">
        <span className={labelClass}>Prompt *</span>
        <textarea
          name="prompt_template"
          required
          rows={step ? 10 : 5}
          maxLength={8000}
          defaultValue={step?.prompt_template}
          placeholder="Take this description and say something funny about it: {{previous}}"
          className={`${inputClass} resize-y`}
        />
      </label>
      <label className="flex items-center gap-2 font-mono text-sm">
        <input type="checkbox" name="include_image" defaultChecked={step?.include_image ?? false} className="h-4 w-4" />
        Send the photo to the model in this step
      </label>
    </>
  );
}
