import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead, canal, mensagemBase } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const canalTexto = canal === "whatsapp"
      ? "WhatsApp (mensagem curta, informal e amigável, use emojis relevantes, máx 300 palavras)"
      : canal === "email"
      ? "E-mail profissional (mais formal, estruturado com saudação e despedida, máx 200 palavras)"
      : "WhatsApp e E-mail (versão WhatsApp curta e informal + versão E-mail mais formal, separadas)";

    const systemPrompt = `Você é um especialista em prospecção B2B. Sua tarefa é criar uma mensagem de abordagem comercial personalizada e persuasiva para um lead específico. Escreva APENAS a mensagem final, sem comentários ou explicações adicionais.`;

    const userPrompt = `Crie uma proposta de abordagem para o seguinte lead via ${canalTexto}:

Nome da empresa: ${lead.nome}
Ramo: ${lead.ramo || "não informado"}
Cidade: ${lead.cidade || "não informada"}
Avaliação Google: ${lead.avaliacao > 0 ? `${lead.avaliacao} estrelas (${lead.total_avaliacoes} avaliações)` : "não disponível"}
${mensagemBase ? `\nBase da mensagem (contexto/produto que você oferece): ${mensagemBase}` : ""}

A mensagem deve:
- Ser personalizada com o nome da empresa e ramo
- Despertar interesse imediato
- Ter uma chamada para ação clara
- Ser autêntica e não soar como spam`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em breve." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para geração de IA." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("Erro ao chamar gateway de IA");
    }

    const data = await response.json();
    const proposta = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ proposta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-proposal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
