import { requireAdmin } from "@/lib/admin";
import { runChain } from "../../../actions";
import GenerateForm from "./GenerateForm";

export const dynamic = "force-dynamic";

export default async function GeneratePage({ params }: PageProps<"/chains/[id]/generate">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: photos }, { count }] = await Promise.all([
    supabase.from("photos").select("id, image_url, neighborhood").order("created_at", { ascending: false }).limit(12),
    supabase.from("llm_prompt_chain_steps").select("id", { count: "exact", head: true }).eq("chain_id", id),
  ]);

  return <GenerateForm action={runChain.bind(null, id)} photos={photos ?? []} stepCount={count ?? 0} />;
}
