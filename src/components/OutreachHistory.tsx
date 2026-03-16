import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, MessageCircle, Mail, Send, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface OutreachLog {
  id: string;
  lead_id: string;
  canal: string;
  mensagem: string;
  arquivo_nome: string | null;
  arquivo_url: string | null;
  email_destino: string | null;
  enviado_whatsapp: boolean | null;
  enviado_email: boolean | null;
  status: string;
  created_at: string;
  leads?: { nome: string; ramo: string | null; cidade: string | null } | null;
}

const canalIcon = (canal: string) => {
  if (canal === "whatsapp") return <MessageCircle className="h-4 w-4 text-accent" />;
  if (canal === "email") return <Mail className="h-4 w-4 text-primary" />;
  return <Send className="h-4 w-4 text-secondary-foreground" />;
};

const canalLabel = (canal: string) => {
  if (canal === "whatsapp") return "WhatsApp";
  if (canal === "email") return "E-mail";
  return "Ambos";
};

export function OutreachHistory() {
  const [filterLead, setFilterLead] = useState("");
  const [filterCanal, setFilterCanal] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["outreach-logs", filterLead, filterCanal, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("outreach_logs")
        .select("*, leads(nome, ramo, cidade)")
        .order("created_at", { ascending: false });

      if (filterCanal !== "all") {
        query = query.eq("canal", filterCanal);
      }
      if (dateFrom) {
        query = query.gte("created_at", dateFrom.toISOString());
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data as unknown as OutreachLog[]) || [];

      if (filterLead.trim()) {
        const term = filterLead.toLowerCase();
        results = results.filter((log) =>
          log.leads?.nome?.toLowerCase().includes(term)
        );
      }

      return results;
    },
  });

  const clearFilters = () => {
    setFilterLead("");
    setFilterCanal("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = filterLead || filterCanal !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Input
          placeholder="Buscar por lead..."
          value={filterLead}
          onChange={(e) => setFilterLead(e.target.value)}
          className="max-w-[200px]"
        />

        <Select value={filterCanal} onValueChange={setFilterCanal}>
          <SelectTrigger className="max-w-[160px]">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="ambos">Ambos</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "max-w-[160px] justify-start text-left font-normal",
                !dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "max-w-[160px] justify-start text-left font-normal",
                !dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}

        <div className="ml-auto">
          <Badge variant="secondary" className="text-xs">
            {logs.length} registro{logs.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="max-w-[300px]">Mensagem</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Carregando histórico...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum envio encontrado.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{log.leads?.nome || "—"}</p>
                      {log.leads?.cidade && (
                        <p className="text-xs text-muted-foreground">{log.leads.cidade}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {canalIcon(log.canal)}
                      <span className="text-sm">{canalLabel(log.canal)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="truncate text-sm text-muted-foreground" title={log.mensagem}>
                      {log.mensagem}
                    </p>
                  </TableCell>
                  <TableCell>
                    {log.arquivo_nome ? (
                      <a
                        href={log.arquivo_url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        {log.arquivo_nome}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={log.status === "enviado" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
