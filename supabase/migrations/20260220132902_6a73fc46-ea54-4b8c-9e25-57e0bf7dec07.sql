-- Tabela para histórico de outreach por lead
CREATE TABLE public.outreach_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'email', 'ambos')),
  mensagem TEXT NOT NULL,
  proposta_ia TEXT,
  arquivo_nome TEXT,
  arquivo_url TEXT,
  enviado_whatsapp BOOLEAN DEFAULT false,
  enviado_email BOOLEAN DEFAULT false,
  email_destino TEXT,
  status TEXT NOT NULL DEFAULT 'enviado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to outreach_logs"
  ON public.outreach_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Storage bucket para arquivos de outreach
INSERT INTO storage.buckets (id, name, public)
VALUES ('outreach-files', 'outreach-files', true);

CREATE POLICY "Allow public upload to outreach-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'outreach-files');

CREATE POLICY "Allow public read from outreach-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'outreach-files');

CREATE POLICY "Allow public delete from outreach-files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'outreach-files');
