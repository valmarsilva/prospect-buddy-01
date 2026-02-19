
-- Tabela de leads capturados
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ramo TEXT,
  endereco TEXT,
  telefone TEXT,
  whatsapp_link TEXT,
  avaliacao NUMERIC(2,1) DEFAULT 0,
  total_avaliacoes INTEGER DEFAULT 0,
  website TEXT,
  cidade TEXT,
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'contatado', 'interessado', 'descartado')),
  busca_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de histórico de buscas
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  termo_busca TEXT NOT NULL,
  ramo TEXT,
  cidade TEXT,
  total_resultados INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar FK de leads para search_history
ALTER TABLE public.leads ADD CONSTRAINT fk_leads_busca FOREIGN KEY (busca_id) REFERENCES public.search_history(id) ON DELETE SET NULL;

-- RLS habilitado mas com acesso público (sem auth)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to search_history" ON public.search_history FOR ALL USING (true) WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_leads_ramo ON public.leads(ramo);
CREATE INDEX idx_leads_cidade ON public.leads(cidade);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_busca_id ON public.leads(busca_id);
