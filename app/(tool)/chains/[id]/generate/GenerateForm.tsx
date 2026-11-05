"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/ActionForm";
import { cardClass, eyebrowClass, inputClass, labelClass } from "@/components/styles";
import type { GenerateState } from "../../../actions";

type Photo = { id: string; image_url: string; neighborhood: string | null };

export default function GenerateForm({
  action,
  photos,
  stepCount,
}: {
  action: (prev: GenerateState, formData: FormData) => Promise<GenerateState>;
  photos: Photo[];
  stepCount: number;
}) {
  const [state, formAction] = useActionState(action, {});
  const [selected, setSelected] = useState<string | null>(photos[0]?.id ?? null);
  const [upload, setUpload] = useState<string | null>(null);

  if (stepCount === 0) {
    return <p className="font-mono text-sm text-muted">This chain has no steps yet. Add one on the Steps tab first.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={formAction} className={`${cardClass} h-fit space-y-4 p-5`}>
        <div className="space-y-2">
          <span className={labelClass}>Upload a photo</span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className={inputClass}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setUpload(file ? URL.createObjectURL(file) : null);
            }}
          />
          {upload && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img src={upload} alt="Your upload" className="max-h-48 border-2 border-ink" />
          )}
        </div>

        {!upload && photos.length > 0 && (
          <fieldset className="space-y-2">
            <legend className={labelClass}>Or pick a recent photo</legend>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((photo) => (
                <label key={photo.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="photo_id"
                    value={photo.id}
                    checked={selected === photo.id}
                    onChange={() => setSelected(photo.id)}
                    className="peer sr-only"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.image_url}
                    alt={photo.neighborhood ?? "City photo"}
                    className="aspect-square w-full border-2 border-rule object-cover peer-checked:border-bleu peer-checked:outline-2 peer-checked:outline-bleu peer-focus-visible:outline-2"
                  />
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
          <label className="block space-y-1">
            <span className={labelClass}>Captions</span>
            <input type="number" name="count" min={1} max={10} defaultValue={5} className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className={labelClass}>Note (optional)</span>
            <input name="note" maxLength={140} placeholder="Context for the AI" className={inputClass} />
          </label>
        </div>

        <SubmitButton pendingLabel={`Running ${stepCount} step${stepCount === 1 ? "" : "s"}…`}>Run chain</SubmitButton>
        {state.error && <p className="font-mono text-sm text-rouge" role="alert">{state.error}</p>}
      </form>

      <div className="space-y-4" aria-live="polite">
        {!state.captions && <p className="font-mono text-sm text-muted">Results appear here, with every step&apos;s output. Each run is saved to the Media tab.</p>}
        {state.captions && (
          <section className={`${cardClass} overflow-hidden`}>
            {state.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.imageUrl} alt="" className="max-h-72 w-full object-cover" />
            )}
            <div className="p-4">
              <p className={eyebrowClass}>Captions</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 font-mono text-sm">
                {state.captions.map((caption) => (
                  <li key={caption}>{caption}</li>
                ))}
              </ol>
            </div>
          </section>
        )}
        {state.steps?.map((step) => (
          <details key={step.step_order} className={`${cardClass} p-4`} open={state.steps!.length > 1 && step.step_order < state.steps!.length}>
            <summary className="cursor-pointer font-mono text-xs font-bold">
              Step {step.step_order}: {step.title} <span className="font-normal text-muted">· {step.model}</span>
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs">{step.output}</pre>
          </details>
        ))}
      </div>
    </div>
  );
}
