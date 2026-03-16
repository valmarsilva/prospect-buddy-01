import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Search, Database, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SearchBar } from "@/components/SearchBar";
import { MetricCards } from "@/components/MetricCards";
import { LeadsTable } from "@/components/LeadsTable";
import { OutreachHistory } from "@/components/OutreachHistory";
import {
  searchLeads, getSavedLeads, updateLeadStatus, exportToCSV,
  type Lead,
} from "@/lib/leads-api";

const Index = () => {
  const queryClient = useQueryClient();
  const [currentLeads, setCurrentLeads] = useState<Lead[]>([]);
  const [filterRamo, setFilterRamo] = useState("");
  const [filterCidade, setFilterCidade] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: ({ ramo, cidade }: { ramo: string; cidade: string }) =>
      searchLeads(ramo, cidade),
    onSuccess: (data) => {
      setCurrentLeads(data.leads);
      queryClient.invalidateQueries({ queryKey: ["saved-leads"] });
      toast({
        title: "Busca concluída!",
        description: `${data.total} empresas encontradas.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro na busca",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Saved leads query
  const savedLeadsQuery = useQuery({
    queryKey: ["saved-leads", filterRamo, filterCidade, filterStatus],
    queryFn: () =>
      getSavedLeads({
        ramo: filterRamo || undefined,
        cidade: filterCidade || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
      }),
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateLeadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-leads"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const metrics = {
    total: currentLeads.length,
    comWhatsApp: currentLeads.filter((l) => l.whatsapp_link).length,
    mediaAvaliacao:
      currentLeads.length > 0
        ? currentLeads.reduce((sum, l) => sum + (l.avaliacao || 0), 0) / currentLeads.length
        : 0,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            P
          </div>
          <div>
            <h1 className="text-xl font-bold">Agente Prospector B2B</h1>
            <p className="text-sm text-muted-foreground">Capture leads de empresas direto do Google Maps</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 px-4 py-6">
        <Tabs defaultValue="search">
          <TabsList className="mb-4">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Buscar Leads
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Database className="h-4 w-4" />
              Leads Salvos
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico de Envios
            </TabsTrigger>
          </TabsList>

          {/* TAB: Buscar */}
          <TabsContent value="search" className="space-y-6">
            <SearchBar
              onSearch={(ramo, cidade) => searchMutation.mutate({ ramo, cidade })}
              isLoading={searchMutation.isPending}
            />

            {currentLeads.length > 0 && (
              <>
                <MetricCards {...metrics} />

                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Resultados da Busca</h2>
                  <Button variant="outline" size="sm" onClick={() => exportToCSV(currentLeads)}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>

                <LeadsTable leads={currentLeads} />
              </>
            )}
          </TabsContent>

          {/* TAB: Salvos */}
          <TabsContent value="saved" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Filtrar por ramo..."
                value={filterRamo}
                onChange={(e) => setFilterRamo(e.target.value)}
                className="sm:max-w-[200px]"
              />
              <Input
                placeholder="Filtrar por cidade..."
                value={filterCidade}
                onChange={(e) => setFilterCidade(e.target.value)}
                className="sm:max-w-[200px]"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="sm:max-w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="contatado">Contatado</SelectItem>
                  <SelectItem value="interessado">Interessado</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                </SelectContent>
              </Select>
              {savedLeadsQuery.data && savedLeadsQuery.data.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => exportToCSV(savedLeadsQuery.data as Lead[])}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              )}
            </div>

            <LeadsTable
              leads={(savedLeadsQuery.data as Lead[]) || []}
              showStatusControl
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
