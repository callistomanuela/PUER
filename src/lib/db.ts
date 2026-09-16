import { supabase } from "./supabase";
import type { Famiglia, Minore } from "../types";

export type FamigliaInput = Omit<Famiglia, "id" | "user_id" | "minori">;
export type MinoreInput = Omit<Minore, "id" | "famiglia_id">;

/** Carica tutte le famiglie con i minori collegati. */
export async function caricaFamiglie(): Promise<Famiglia[]> {
  const { data, error } = await supabase
    .from("famiglie")
    .select("*, minori(*)")
    .order("adulto1_cognome", { ascending: true })
    .order("adulto1_nome", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((f: any) => ({
    ...f,
    email: f.email ?? [],
    minori: (f.minori ?? [])
      .map((m: any) => ({ ...m, periodo: m.periodo ?? [] }))
      .sort((a: Minore, b: Minore) =>
        (a.cognome + a.nome).localeCompare(b.cognome + b.nome, "it")
      ),
  })) as Famiglia[];
}

/** Crea o aggiorna una famiglia + sincronizza i suoi minori. */
export async function salvaFamiglia(
  famigliaId: string | null,
  fam: FamigliaInput,
  minori: MinoreInput[]
): Promise<void> {
  let id = famigliaId;

  if (id) {
    const { error } = await supabase.from("famiglie").update(fam).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("famiglie")
      .insert(fam)
      .select("id")
      .single();
    if (error) throw error;
    id = data.id;
  }

  // Sostituisce i minori: cancella i vecchi e reinserisce quelli correnti.
  const { error: delErr } = await supabase.from("minori").delete().eq("famiglia_id", id);
  if (delErr) throw delErr;

  const puliti = minori
    .filter((m) => (m.cognome?.trim() || m.nome?.trim()))
    .map((m) => ({ ...m, famiglia_id: id }));

  if (puliti.length > 0) {
    const { error: insErr } = await supabase.from("minori").insert(puliti);
    if (insErr) throw insErr;
  }
}

/** Cancella una famiglia (i minori vengono rimossi in cascata dal DB). */
export async function cancellaFamiglia(id: string): Promise<void> {
  const { error } = await supabase.from("famiglie").delete().eq("id", id);
  if (error) throw error;
}
