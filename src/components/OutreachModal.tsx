import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, Mail, Sparkles, Upload, X, ExternalLink,
  Send, Loader2, FileText, Image,
} from "lucide-react";
import type { Lead } from "@/lib/leads-api";

interface OutreachModalProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}

type Canal = "whatsapp" | "email" | "ambos";

const MAX_FILE_MB = 10;

export function OutreachModal({ lead, open, onClose }: OutreachModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [mensagem, setMensagem] = useState("");
  const [emailDestino, setEmailDestino] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [gerando, setGerando] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: `Máximo ${MAX_FILE_MB}MB.`, variant: "destructive" });
      return;
    }
    setArquivo(file);
  };

  const removeFile = () => {
    setArquivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const gerarProposta = async () => {
    setGerando(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-proposal", {
        body: { lead, canal, mensagemBase: mensagem },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setMensagem(data.proposta || "");
      toast({ title: "Proposta gerada!", description: "Revise e edite antes de enviar." });
    } catch (err: unknown) {
      toast({
        title: "Erro ao gerar proposta",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setGerando(false);
    }
  };

  const salvarLog = async (arquivoUrl?: string) => {
    if (!lead.id) return;
    await supabase.from("outreach_logs").insert({
      lead_id: lead.id,
      canal,
      mensagem,
      arquivo_nome: arquivo?.name ?? null,
      arquivo_url: arquivoUrl ?? null,
      enviado_whatsapp: canal === "whatsapp" || canal === "ambos",
      enviado_email: canal === "email" || canal === "ambos",
      email_destino: emailDestino || null,
      status: "enviado",
    });
    // Atualiza status do lead para "contatado"
    await supabase.from("leads").update({ status: "contatado" }).eq("id", lead.id);
    queryClient.invalidateQueries({ queryKey: ["saved-leads"] });
  };

  const uploadArquivo = async (): Promise<string | undefined> => {
    if (!arquivo) return undefined;
    const ext = arquivo.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("outreach-files")
      .upload(path, arquivo, { upsert: false });
    if (error) throw new Error("Erro ao fazer upload: " + error.message);
    const { data } = supabase.storage.from("outreach-files").getPublicUrl(path);
    return data.publicUrl;
  };

  const enviarWhatsApp = async () => {
    if (!mensagem.trim()) {
      toast({ title: "Escreva uma mensagem antes de enviar.", variant: "destructive" });
      return;
    }
    if (!lead.whatsapp_link && !lead.telefone) {
      toast({ title: "Lead sem número de WhatsApp.", variant: "destructive" });
      return;
    }

    try {
      let arquivoUrl: string | undefined;
      if (arquivo) arquivoUrl = await uploadArquivo();

      let texto = mensagem;
      if (arquivoUrl) texto += `\n\n📎 Arquivo: ${arquivoUrl}`;

      const numero = lead.whatsapp_link
        ? lead.whatsapp_link.replace("https://wa.me/", "")
        : lead.telefone?.replace(/\D/g, "");

      const waUrl = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
      window.open(waUrl, "_blank");

      await salvarLog(arquivoUrl);
      toast({ title: "WhatsApp aberto!", description: "Converse com o lead." });
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao enviar",
        variant: "destructive",
      });
    }
  };

  const enviarEmail = async () => {
    if (!mensagem.trim()) {
      toast({ title: "Escreva uma mensagem antes de enviar.", variant: "destructive" });
      return;
    }
    const destino = emailDestino.trim() || lead.website;
    if (!destino) {
      toast({ title: "Informe um e-mail de destino.", variant: "destructive" });
      return;
    }

    try {
      let arquivoUrl: string | undefined;
      if (arquivo) arquivoUrl = await uploadArquivo();

      let corpo = mensagem;
      if (arquivoUrl) corpo += `\n\nArquivo em anexo: ${arquivoUrl}`;

      const mailUrl = `mailto:${encodeURIComponent(destino)}?subject=${encodeURIComponent(
        `Proposta para ${lead.nome}`
      )}&body=${encodeURIComponent(corpo)}`;
      window.open(mailUrl, "_blank");

      await salvarLog(arquivoUrl);
      toast({ title: "Cliente de e-mail aberto!", description: "Revise e envie." });
      onClose();
    } catch (err: unknown) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao enviar",
        variant: "destructive",
      });
    }
  };

  const handleEnviar = () => {
    if (canal === "whatsapp") enviarWhatsApp();
    else if (canal === "email") enviarEmail();
    else {
      enviarWhatsApp().then(() => enviarEmail());
    }
  };

  const fileIcon = arquivo
    ? arquivo.type.startsWith("image/")
      ? <Image className="h-4 w-4 text-primary" />
      : <FileText className="h-4 w-4 text-primary" />
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar mensagem para
            <span className="font-bold text-primary">{lead.nome}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Info do lead */}
          <div className="flex flex-wrap gap-2 rounded-lg bg-secondary/50 p-3">
            {lead.ramo && <Badge variant="secondary">{lead.ramo}</Badge>}
            {lead.cidade && <Badge variant="outline">{lead.cidade}</Badge>}
            {lead.telefone && (
              <Badge variant="outline" className="text-accent border-accent">
                📞 {lead.telefone}
              </Badge>
            )}
            {lead.whatsapp_link && (
              <Badge className="bg-accent/20 text-accent border-accent/30">
                ✅ WhatsApp
              </Badge>
            )}
          </div>

          {/* Canal */}
          <div className="space-y-2">
            <Label>Canal de envio</Label>
            <Tabs value={canal} onValueChange={(v) => setCanal(v as Canal)}>
              <TabsList className="w-full">
                <TabsTrigger value="whatsapp" className="flex-1 gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="email" className="flex-1 gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </TabsTrigger>
                <TabsTrigger value="ambos" className="flex-1 gap-2">
                  <Send className="h-4 w-4" />
                  Ambos
                </TabsTrigger>
              </TabsList>

              {(canal === "email" || canal === "ambos") && (
                <TabsContent value={canal} className="mt-3">
                  <div className="space-y-1">
                    <Label htmlFor="email-destino">E-mail de destino</Label>
                    <Input
                      id="email-destino"
                      type="email"
                      placeholder="contato@empresa.com.br"
                      value={emailDestino}
                      onChange={(e) => setEmailDestino(e.target.value)}
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="mensagem">Mensagem</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={gerarProposta}
                disabled={gerando}
                className="gap-2 text-xs"
              >
                {gerando ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 text-primary" />
                )}
                {gerando ? "Gerando..." : "Gerar com IA"}
              </Button>
            </div>
            <Textarea
              id="mensagem"
              placeholder="Escreva sua mensagem ou clique em 'Gerar com IA' para uma proposta personalizada..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{mensagem.length} caracteres</p>
          </div>

          {/* Upload de arquivo */}
          <div className="space-y-2">
            <Label>Arquivo (opcional)</Label>
            {arquivo ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-3">
                {fileIcon}
                <span className="flex-1 truncate text-sm font-medium">{arquivo.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                </span>
                <Button size="sm" variant="ghost" onClick={removeFile} className="h-7 w-7 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-secondary/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary/40"
              >
                <Upload className="h-5 w-5" />
                <span>
                  Clique para selecionar um arquivo
                  <span className="ml-1 text-xs">(PDF, imagem, doc — máx. {MAX_FILE_MB}MB)</span>
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif"
              onChange={handleFile}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={!mensagem.trim()}
            className="gap-2"
          >
            {canal === "whatsapp" && <MessageCircle className="h-4 w-4" />}
            {canal === "email" && <Mail className="h-4 w-4" />}
            {canal === "ambos" && <Send className="h-4 w-4" />}
            {canal === "whatsapp" && "Abrir WhatsApp"}
            {canal === "email" && "Abrir E-mail"}
            {canal === "ambos" && "Enviar nos 2 canais"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
