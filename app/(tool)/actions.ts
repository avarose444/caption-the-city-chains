"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { generateCaptions } from "@/lib/pipeline";

export type ActionState = { error?: string; success?: string };

export type GenerateState = ActionState & {
  captions?: string[];
  steps?: { step_order: number; title: string; model: string; prompt: string; output: string }[];
  imageUrl?: string;
  requestId?: string | null;
};

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
// step_order is unique per chain, so a swap parks one step out of the way first.
const PARKING_OFFSET = 100_000;

function text(formData: FormData, key: string, max: number) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function friendly(message: string) {
  return message.includes("duplicate key") ? "A chain with that name already exists." : message;
}

function refresh(chainId: string) {
  revalidatePath("/");
  revalidatePath(`/chains/${chainId}`, "layout");
}

// Keeps steps numbered 1..n and makes the last one the step that returns JSON.
async function normalizeSteps(supabase: SupabaseClient, chainId: string) {
  const { data } = await supabase
    .from("llm_prompt_chain_steps")
    .select("id, step_order, output_json")
    .eq("chain_id", chainId)
    .order("step_order");
  const steps = data ?? [];
  for (const [i, step] of steps.entries()) {
    const fields = { step_order: i + 1, output_json: i === steps.length - 1 };
    if (step.step_order !== fields.step_order || step.output_json !== fields.output_json) {
      const { error } = await supabase.from("llm_prompt_chain_steps").update(fields).eq("id", step.id);
      if (error) return error.message;
    }
  }
  return null;
}

// Chains ---------------------------------------------------------------------

export async function createChain(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const name = text(formData, "name", 80);
  if (!name) return { error: "Give the chain a name." };
  const { data, error } = await supabase
    .from("llm_prompt_chains")
    .insert({ name, description: text(formData, "description", 500) })
    .select("id")
    .single();
  if (error) return { error: friendly(error.message) };
  revalidatePath("/");
  redirect(`/chains/${data.id}`);
}

export async function updateChain(chainId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const name = text(formData, "name", 80);
  if (!name) return { error: "Give the chain a name." };
  const { error } = await supabase
    .from("llm_prompt_chains")
    .update({ name, description: text(formData, "description", 500), is_active: formData.get("is_active") === "on" })
    .eq("id", chainId);
  if (error) return { error: friendly(error.message) };
  refresh(chainId);
  return { success: "Chain saved." };
}

export async function deleteChain(chainId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("llm_prompt_chains").delete().eq("id", chainId);
  if (error) return { error: error.message };
  revalidatePath("/");
  redirect("/");
}

// Steps ----------------------------------------------------------------------

function stepFields(formData: FormData) {
  return {
    title: text(formData, "title", 120),
    prompt_template: text(formData, "prompt_template", 8000),
    model_id: text(formData, "model_id", 40),
    include_image: formData.get("include_image") === "on",
  };
}

export async function createStep(chainId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const fields = stepFields(formData);
  if (!fields.title || !fields.prompt_template) return { error: "A step needs a title and a prompt." };

  const { data: last } = await supabase
    .from("llm_prompt_chain_steps")
    .select("step_order")
    .eq("chain_id", chainId)
    .order("step_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("llm_prompt_chain_steps")
    .insert({ ...fields, chain_id: chainId, step_order: (last?.step_order ?? 0) + 1 });
  if (error) return { error: error.message };

  const normalizeError = await normalizeSteps(supabase, chainId);
  if (normalizeError) return { error: normalizeError };
  refresh(chainId);
  return { success: "Step added." };
}

export async function updateStep(stepId: string, chainId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const fields = stepFields(formData);
  if (!fields.title || !fields.prompt_template) return { error: "A step needs a title and a prompt." };
  const { error } = await supabase.from("llm_prompt_chain_steps").update(fields).eq("id", stepId);
  if (error) return { error: error.message };
  refresh(chainId);
  return { success: "Saved." };
}

export async function deleteStep(stepId: string, chainId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("llm_prompt_chain_steps").delete().eq("id", stepId);
  if (error) return { error: error.message };
  const normalizeError = await normalizeSteps(supabase, chainId);
  if (normalizeError) return { error: normalizeError };
  refresh(chainId);
  return {};
}

// Swap a step with its neighbor. direction: -1 moves it earlier, 1 later.
export async function moveStep(stepId: string, chainId: string, direction: -1 | 1): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("llm_prompt_chain_steps")
    .select("id, step_order")
    .eq("chain_id", chainId)
    .order("step_order");
  const steps = data ?? [];
  const index = steps.findIndex((s) => s.id === stepId);
  const neighbor = steps[index + direction];
  if (index < 0 || !neighbor) return {};
  const step = steps[index];

  const table = () => supabase.from("llm_prompt_chain_steps");
  const parked = await table().update({ step_order: step.step_order + PARKING_OFFSET }).eq("id", step.id);
  if (parked.error) return { error: parked.error.message };
  const moved = await table().update({ step_order: step.step_order }).eq("id", neighbor.id);
  if (moved.error) return { error: moved.error.message };
  const placed = await table().update({ step_order: neighbor.step_order }).eq("id", step.id);
  if (placed.error) return { error: placed.error.message };

  const normalizeError = await normalizeSteps(supabase, chainId);
  if (normalizeError) return { error: normalizeError };
  refresh(chainId);
  return {};
}

// Generate -------------------------------------------------------------------

export async function runChain(chainId: string, _prev: GenerateState, formData: FormData): Promise<GenerateState> {
  const { supabase, user } = await requireAdmin();
  const count = Math.min(10, Math.max(1, Number(formData.get("count")) || 5));
  const note = text(formData, "note", 140);

  const upload = formData.get("photo");
  const photoId = text(formData, "photo_id", 40);
  let bytes: Buffer;
  let mimeType: string;
  let imageUrl: string;
  let neighborhood: string | null = null;
  let photoNote: string | null = note;

  if (upload instanceof File && upload.size > 0) {
    if (!PHOTO_TYPES.includes(upload.type)) return { error: "Photos must be JPG, PNG, or WebP." };
    if (upload.size > MAX_PHOTO_BYTES) return { error: "Photos must be 4 MB or smaller." };
    bytes = Buffer.from(await upload.arrayBuffer());
    mimeType = upload.type;
    const path = `${user.id}/chain-tool/${Date.now()}.${upload.type.split("/")[1]}`;
    const { error } = await supabase.storage.from("city-photos").upload(path, bytes, { contentType: upload.type });
    if (error) return { error: `Upload failed: ${error.message}` };
    imageUrl = supabase.storage.from("city-photos").getPublicUrl(path).data.publicUrl;
  } else if (photoId) {
    const { data: photo } = await supabase.from("photos").select("image_url, neighborhood, note").eq("id", photoId).maybeSingle();
    if (!photo) return { error: "Photo not found." };
    const image = await fetch(photo.image_url);
    if (!image.ok) return { error: "Couldn't load the photo." };
    bytes = Buffer.from(await image.arrayBuffer());
    mimeType = image.headers.get("content-type") ?? "image/jpeg";
    imageUrl = photo.image_url;
    neighborhood = photo.neighborhood;
    photoNote = note ?? photo.note;
  } else {
    return { error: "Choose a photo or upload one." };
  }

  try {
    const result = await generateCaptions({
      supabase,
      userId: user.id,
      source: "tool",
      chainId,
      photoId: upload instanceof File && upload.size > 0 ? null : photoId,
      imageUrl,
      imageBase64: bytes.toString("base64"),
      mimeType,
      neighborhood,
      note: photoNote,
      count,
    });
    revalidatePath(`/chains/${chainId}/media`);
    return { captions: result.captions, steps: result.steps, imageUrl, requestId: result.requestId };
  } catch (error) {
    return { error: (error as Error).message, imageUrl };
  }
}
