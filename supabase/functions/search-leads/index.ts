import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatWhatsApp(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const br = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${br}`;
}

function isCelular(phone: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  // Remove country code 55 if present
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  // After DDD (2 digits), mobile starts with 9 and has 9 digits total
  if (local.length >= 10) {
    return local[2] === "9";
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, ramo, cidade } = await req.json();
    const searchTerm = query || `${ramo} em ${cidade}`;

    const serperKey = Deno.env.get("SERPER_API_KEY");
    if (!serperKey) {
      return new Response(
        JSON.stringify({ error: "SERPER_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Serper.dev Maps API
    const serperRes = await fetch("https://google.serper.dev/maps", {
      method: "POST",
      headers: {
        "X-API-KEY": serperKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: searchTerm,
        gl: "br",
        hl: "pt-br",
      }),
    });

    if (!serperRes.ok) {
      const errText = await serperRes.text();
      return new Response(
        JSON.stringify({ error: `Serper API error: ${errText}` }),
        { status: serperRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await serperRes.json();
    const places = data.places || [];

    // Process leads
    const leads = places.map((p: any) => ({
      nome: p.title || "Sem nome",
      ramo: p.category || ramo || "Não informado",
      endereco: p.address || null,
      telefone: p.phoneNumber || null,
      whatsapp_link: formatWhatsApp(p.phoneNumber),
      avaliacao: p.rating || 0,
      total_avaliacoes: p.ratingCount || 0,
      website: p.website || null,
      cidade: cidade || null,
      is_celular: isCelular(p.phoneNumber),
    }));

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save search history
    const { data: searchRecord, error: searchError } = await supabase
      .from("search_history")
      .insert({
        termo_busca: searchTerm,
        ramo: ramo || null,
        cidade: cidade || null,
        total_resultados: leads.length,
      })
      .select()
      .single();

    if (searchError) {
      console.error("Error saving search:", searchError);
    }

    // Save leads with busca_id
    if (leads.length > 0 && searchRecord) {
      const leadsToInsert = leads.map((l: any) => {
        const { is_celular, ...rest } = l;
        return { ...rest, busca_id: searchRecord.id };
      });

      const { error: leadsError } = await supabase
        .from("leads")
        .insert(leadsToInsert);

      if (leadsError) {
        console.error("Error saving leads:", leadsError);
      }
    }

    return new Response(
      JSON.stringify({
        leads,
        total: leads.length,
        busca_id: searchRecord?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
