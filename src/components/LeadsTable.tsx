import { ExternalLink, Phone, Globe, Star } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Lead } from "@/lib/leads-api";

interface LeadsTableProps {
  leads: Lead[];
  onStatusChange?: (id: string, status: string) => void;
  showStatusControl?: boolean;
}

const statusColors: Record<string, string> = {
  novo: "bg-secondary text-secondary-foreground",
  contatado: "bg-primary/15 text-primary",
  interessado: "bg-accent/15 text-accent",
  descartado: "bg-destructive/15 text-destructive",
};

export function LeadsTable({ leads, onStatusChange, showStatusControl }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">Nenhum lead encontrado</p>
        <p className="text-sm text-muted-foreground">Faça uma busca para capturar empresas.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden md:table-cell">Ramo</TableHead>
            <TableHead className="hidden lg:table-cell">Endereço</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead className="hidden sm:table-cell">Avaliação</TableHead>
            <TableHead className="hidden xl:table-cell">Website</TableHead>
            {showStatusControl && <TableHead>Status</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead, i) => (
            <TableRow key={lead.id || i}>
              <TableCell className="font-medium">{lead.nome}</TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="secondary" className="font-normal">{lead.ramo || "—"}</Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                {lead.endereco || "—"}
              </TableCell>
              <TableCell>
                {lead.telefone ? (
                  <span className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3" />
                    {lead.telefone}
                    {lead.is_celular && (
                      <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 text-accent border-accent">
                        Celular
                      </Badge>
                    )}
                  </span>
                ) : "—"}
              </TableCell>
              <TableCell>
                {lead.whatsapp_link ? (
                  <Button asChild size="sm" variant="ghost" className="text-accent hover:text-accent">
                    <a href={lead.whatsapp_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Abrir
                    </a>
                  </Button>
                ) : "—"}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {lead.avaliacao > 0 ? (
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    {lead.avaliacao}
                    <span className="text-muted-foreground">({lead.total_avaliacoes})</span>
                  </span>
                ) : "—"}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {lead.website ? (
                  <Button asChild size="sm" variant="ghost">
                    <a href={lead.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="mr-1 h-3 w-3" />
                      Visitar
                    </a>
                  </Button>
                ) : "—"}
              </TableCell>
              {showStatusControl && lead.id && (
                <TableCell>
                  <Select
                    value={lead.status || "novo"}
                    onValueChange={(val) => onStatusChange?.(lead.id!, val)}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="contatado">Contatado</SelectItem>
                      <SelectItem value="interessado">Interessado</SelectItem>
                      <SelectItem value="descartado">Descartado</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
