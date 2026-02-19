import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  onSearch: (ramo: string, cidade: string) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, isLoading }: SearchBarProps) {
  const [ramo, setRamo] = useState("");
  const [cidade, setCidade] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ramo.trim() && cidade.trim()) {
      onSearch(ramo.trim(), cidade.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-[3]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Ramo de atividade (ex: Academias, Pizzarias...)"
          value={ramo}
          onChange={(e) => setRamo(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="relative flex-[2]">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cidade / Região (ex: Curitiba - PR)"
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          className="pl-10"
        />
      </div>
      <Button type="submit" disabled={isLoading || !ramo.trim() || !cidade.trim()} className="min-w-[160px]">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Buscando...
          </span>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Capturar Leads
          </>
        )}
      </Button>
    </form>
  );
}
