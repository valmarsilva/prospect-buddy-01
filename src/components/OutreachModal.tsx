import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle, Mail, Sparkles, Upload, X, Send, Loader2,
  FileText, Image as ImageIcon, Paperclip, ExternalLink, Copy,
} from "lucide-react";
import type { Lead } from "@/lib/leads-api";

interface OutreachModalProps {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}

type Canal = "whatsapp" | "email" | "ambos";

const MAX_FILE_MB = 10;
const MAX_FILES = 5;
const ACCEPTED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".doc",
  ".docx",
].join(",");
const ACCEPTED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "doc", "docx"];

interface UploadedFile {
  file: File;
  url?: string;
}

export function OutreachModal({ lead, open, onClose }: OutreachModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [mensagem, setMensagem] = useState("");
  const [emailDestino, setEmailDestino] = useState("");
  const [arquivos, setArquivos] = useState<UploadedFile[]>([]);
  const [gerando, setGerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [modoLink, setModoLink] = useState(true);
  const [linkWhatsApp, setLinkWhatsApp] = useState("");
  const [linkWhatsAppSemTexto, setLinkWhatsAppSemTexto] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [textoGerado, setTextoGerado] = useState("");

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const slotsLivres = MAX_FILES - arquivos.length;
    if (files.length > slotsLivres) {
      toast({
        title: `Máximo ${MAX_FILES} arquivos`,
        description: `Você pode adicionar mais ${slotsLivres}.`,
        variant: "destructive",
      });
    }

    const novos: UploadedFile[] = [];
    for (const file of files.slice(0, slotsLivres)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        toast({
          title: "Tipo de arquivo não aceito",
          description: `${file.name} precisa ser PDF, PNG, JPG, WEBP, DOC ou DOCX.`,
          variant: "destructive",
        });
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede ${MAX_FILE_MB}MB.`,
          variant: "destructive",
        });
        continue;
      }
      novos.push({ file });
    }
    limparLinks();
    setArquivos((prev) => [...prev, ...novos]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removerArquivo = (idx: number) => {
    limparLinks();
    setArquivos((prev) => prev.filter((_, i) => i !== idx));
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
      toast({ title: "Proposta gerada!", description: "Revise antes de enviar." });
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

  const uploadArquivos = async (): Promise<UploadedFile[]> => {
    if (!arquivos.length) return [];
    const enviados: UploadedFile[] = [];
    for (const a of arquivos) {
      const ext = a.file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("outreach-files")
        .upload(path, a.file, { upsert: false });
      if (error) throw new Error(`Erro no upload de ${a.file.name}: ${error.message}`);
      const { data } = supabase.storage.from("outreach-files").getPublicUrl(path);
      enviados.push({ file: a.file, url: data.publicUrl });
    }
    return enviados;
  };

  const salvarLog = async (enviados: UploadedFile[]) => {
    if (!lead.id) return;
    const nomes = enviados.map((e) => e.file.name).join(", ") || null;
    const urls = enviados.map((e) => e.url).filter(Boolean).join("\n") || null;
    await supabase.from("outreach_logs").insert({
      lead_id: lead.id,
      canal,
      mensagem,
      arquivo_nome: nomes,
      arquivo_url: urls,
      enviado_whatsapp: canal === "whatsapp" || canal === "ambos",
      enviado_email: canal === "email" || canal === "ambos",
      email_destino: emailDestino || null,
      status: "enviado",
    });
    await supabase.from("leads").update({ status: "contatado" }).eq("id", lead.id);
    queryClient.invalidateQueries({ queryKey: ["saved-leads"] });
    queryClient.invalidateQueries({ queryKey: ["outreach-logs"] });
  };

  const montarTexto = (enviados: UploadedFile[]) => {
    let texto = mensagem;
    if (enviados.length) {
      texto += "\n\n📎 Arquivos:";
      enviados.forEach((e) => {
        texto += `\n• ${e.file.name}: ${e.url}`;
      });
    }
    return texto;
  };

  const getNumeroWhatsApp = () => {
    const numero = lead.whatsapp_link
      ? lead.whatsapp_link.replace(/\D/g, "")
      : lead.telefone?.replace(/\D/g, "");
    if (!numero) throw new Error("Lead sem número de WhatsApp.");
    return numero;
  };

  const buildWhatsAppUrl = () => {
    const numero = getNumeroWhatsApp();
    return `https://api.whatsapp.com/send?phone=${numero}`;
  };

  const copiarMensagem = async () => {
    if (!textoGerado) return;
    try {
      await navigator.clipboard.writeText(textoGerado);
      toast({ title: "Mensagem copiada!", description: "Agora abra o WhatsApp e cole no chat." });
    } catch {
      toast({ title: "Não foi possível copiar", description: "Selecione e copie a mensagem manualmente.", variant: "destructive" });
    }
  };

  const buildEmailUrl = (texto: string) => {
    const destino = emailDestino.trim();
    if (!destino) throw new Error("Informe um e-mail de destino.");
    return `mailto:${encodeURIComponent(destino)}?subject=${encodeURIComponent(
      `Proposta para ${lead.nome}`
    )}&body=${encodeURIComponent(texto)}`;
  };

  const handleEnviar = async () => {
    if (!mensagem.trim()) {
      toast({ title: "Escreva uma mensagem antes de enviar.", variant: "destructive" });
      return;
    }

    if (modoLink) {
      // MODO LINK: faz upload primeiro, depois exibe links clicáveis
      setEnviando(true);
      try {
        const enviados = await uploadArquivos();
        const texto = montarTexto(enviados);

        if (canal === "whatsapp" || canal === "ambos") {
          setLinkWhatsApp(buildWhatsAppUrl());
          setLinkWhatsAppSemTexto(`https://wa.me/${getNumeroWhatsApp()}`);
        }
        if (canal === "email" || canal === "ambos") {
          setLinkEmail(buildEmailUrl(texto));
        }
        setTextoGerado(texto);

        await salvarLog(enviados);
        toast({
          title: "Links gerados!",
          description: "Clique nos links abaixo para abrir WhatsApp/E-mail.",
        });
      } catch (err: unknown) {
        toast({
          title: "Erro",
          description: err instanceof Error ? err.message : "Erro ao gerar links",
          variant: "destructive",
        });
      } finally {
        setEnviando(false);
      }
      return;
    }

    // MODO AUTOMÁTICO: abre as abas IMEDIATAMENTE (resposta síncrona ao clique)
    let waWindow: Window | null = null;
    let mailWindow: Window | null = null;

    if (canal === "whatsapp" || canal === "ambos") {
      waWindow = window.open("about:blank", "_blank");
    }
    if (canal === "email" || canal === "ambos") {
      if (!emailDestino.trim()) {
        toast({ title: "Informe um e-mail de destino.", variant: "destructive" });
        waWindow?.close();
        return;
      }
      mailWindow = window.open("about:blank", "_blank");
    }

    if ((canal === "whatsapp" || canal === "ambos") && !waWindow) {
      toast({
        title: "Pop-up bloqueado",
        description: "Permita pop-ups deste site para abrir o WhatsApp/E-mail.",
        variant: "destructive",
      });
      return;
    }

    setEnviando(true);
    try {
      const enviados = await uploadArquivos();
      const texto = montarTexto(enviados);

      if (waWindow) {
        waWindow.location.href = buildWhatsAppUrl();
      }
      if (mailWindow) {
        mailWindow.location.href = buildEmailUrl(texto);
      }

      await salvarLog(enviados);
      toast({
        title: "Envio registrado!",
        description: enviados.length
          ? `${enviados.length} arquivo(s) anexado(s) e link enviado.`
          : "Mensagem pronta para envio.",
      });
      onClose();
    } catch (err: unknown) {
      waWindow?.close();
      mailWindow?.close();
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro ao enviar",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const iconeArquivo = (file: File) =>
    file.type.startsWith("image/") ? (
      <ImageIcon className="h-4 w-4 text-primary" />
    ) : (
      <FileText className="h-4 w-4 text-primary" />
    );

  const limparLinks = () => {
    setLinkWhatsApp("");
    setLinkWhatsAppSemTexto("");
    setLinkEmail("");
    setTextoGerado("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          limparLinks();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar mensagem para
            <span className="font-bold text-primary">{lead.nome}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            O envio usa links clicáveis por padrão para evitar bloqueio do navegador. Selecione PDF,
            PNG, JPG, WEBP, DOC ou DOCX e clique em gerar link.
          </div>

          <div className="flex flex-wrap gap-2 rounded-lg bg-secondary/50 p-3">
            {lead.ramo && <Badge variant="secondary">{lead.ramo}</Badge>}
            {lead.cidade && <Badge variant="outline">{lead.cidade}</Badge>}
            {lead.telefone && (
              <Badge variant="outline" className="text-accent border-accent">
                📞 {lead.telefone}
              </Badge>
            )}
            {lead.whatsapp_link && (
              <Badge className="bg-accent/20 text-accent border-accent/30">✅ WhatsApp</Badge>
            )}
          </div>

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

          <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Modo seguro sem bloqueio</Label>
              <p className="text-xs text-muted-foreground">
                Faz upload dos arquivos e exibe um link para você clicar. Desligue apenas se quiser abrir abas automaticamente.
              </p>
            </div>
            <Switch
              checked={modoLink}
              onCheckedChange={(v) => {
                setModoLink(v);
                limparLinks();
              }}
            />
          </div>

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
              placeholder="Escreva sua mensagem ou clique em 'Gerar com IA'..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">{mensagem.length} caracteres</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Arquivos (PDF, PNG, JPG…)
              </Label>
              <span className="text-xs text-muted-foreground">
                {arquivos.length}/{MAX_FILES} · máx. {MAX_FILE_MB}MB cada
              </span>
            </div>

            {arquivos.length > 0 && (
              <div className="space-y-2">
                {arquivos.map((a, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-4 py-2"
                  >
                    {iconeArquivo(a.file)}
                    <span className="flex-1 truncate text-sm font-medium">{a.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(a.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removerArquivo(idx)}
                      className="h-7 w-7 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {arquivos.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-secondary/20 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary/40"
              >
                <Upload className="h-5 w-5" />
                <span>Clique para selecionar PDF, PNG, JPG, WEBP, DOC ou DOCX</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept={ACCEPTED}
              onChange={handleFiles}
            />
          </div>

          {(linkWhatsApp || linkEmail) && (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="text-sm font-medium text-primary">
                Links gerados — clique para abrir:
              </p>
              {textoGerado && (canal === "whatsapp" || canal === "ambos") && (
                <div className="space-y-2 rounded-lg border border-border bg-background/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Mensagem pronta para copiar</p>
                    <Button type="button" size="sm" variant="outline" onClick={copiarMensagem} className="gap-2">
                      <Copy className="h-3 w-3" />
                      Copiar
                    </Button>
                  </div>
                  <Textarea value={textoGerado} readOnly rows={5} className="resize-none text-xs" />
                </div>
              )}
              {linkWhatsApp && (
                <a
                  href={linkWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-accent/10 px-4 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
                >
                  <MessageCircle className="h-5 w-5" />
                  Abrir WhatsApp e colar a mensagem copiada
                  <ExternalLink className="ml-auto h-4 w-4" />
                </a>
              )}
              {linkWhatsAppSemTexto && (
                <a
                  href={linkWhatsAppSemTexto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-accent/30 px-4 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
                >
                  <MessageCircle className="h-5 w-5" />
                  Link alternativo wa.me
                  <ExternalLink className="ml-auto h-4 w-4" />
                </a>
              )}
              {linkEmail && (
                <a
                  href={linkEmail}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-500 transition-colors hover:bg-blue-500/20"
                >
                  <Mail className="h-5 w-5" />
                  Abrir cliente de e-mail com proposta
                  <ExternalLink className="ml-auto h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => { limparLinks(); onClose(); }} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={handleEnviar} disabled={!mensagem.trim() || enviando} className="gap-2">
            {enviando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {canal === "whatsapp" && <MessageCircle className="h-4 w-4" />}
                {canal === "email" && <Mail className="h-4 w-4" />}
                {canal === "ambos" && <Send className="h-4 w-4" />}
              </>
            )}
            {enviando
              ? modoLink
                ? "Gerando links..."
                : "Enviando..."
              : modoLink
              ? "Gerar link"
              : canal === "whatsapp"
              ? "Abrir WhatsApp"
              : canal === "email"
              ? "Abrir E-mail"
              : "Enviar nos 2 canais"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
