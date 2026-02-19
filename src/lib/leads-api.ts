import { supabase } from "@/integrations/supabase/client";

export interface Lead {
  id?: string;
  nome: string;
  ramo: string | null;
  endereco: string | null;
  telefone: string | null;
  whatsapp_link: string | null;
  avaliacao: number;
  total_avaliacoes: number;
  website: string | null;
  cidade: string | null;
  status?: string;
  busca_id?: string | null;
  created_at?: string;
  is_celular?: boolean;
}

export interface SearchResult {
  leads: Lead[];
  total: number;
  busca_id: string;
}

export async function searchLeads(ramo: string, cidade: string): Promise<SearchResult> {
  const { data, error } = await supabase.functions.invoke("search-leads", {
    body: { ramo, cidade, query: `${ramo} em ${cidade}` },
  });

  if (error) throw new Error(error.message || "Erro ao buscar leads");
  return data as SearchResult;
}

export async function getSavedLeads(filters?: {
  ramo?: string;
  cidade?: string;
  status?: string;
}) {
  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.ramo) query = query.ilike("ramo", `%${filters.ramo}%`);
  if (filters?.cidade) query = query.ilike("cidade", `%${filters.cidade}%`);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateLeadStatus(id: string, status: string) {
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function getSearchHistory() {
  const { data, error } = await supabase
    .from("search_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

export function exportToCSV(leads: Lead[]) {
  const headers = ["Nome", "Ramo", "Endereço", "Telefone", "WhatsApp", "Avaliação", "Website", "Cidade", "Status"];
  const rows = leads.map((l) => [
    l.nome,
    l.ramo || "",
    l.endereco || "",
    l.telefone || "",
    l.whatsapp_link || "",
    l.avaliacao,
    l.website || "",
    l.cidade || "",
    l.status || "novo",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
