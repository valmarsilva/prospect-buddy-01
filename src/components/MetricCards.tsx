import { Building2, MessageCircle, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardsProps {
  total: number;
  comWhatsApp: number;
  mediaAvaliacao: number;
}

export function MetricCards({ total, comWhatsApp, mediaAvaliacao }: MetricCardsProps) {
  const cards = [
    {
      label: "Empresas Encontradas",
      value: total,
      icon: Building2,
      color: "text-primary",
    },
    {
      label: "Com WhatsApp",
      value: comWhatsApp,
      icon: MessageCircle,
      color: "text-accent",
    },
    {
      label: "Média de Avaliações",
      value: mediaAvaliacao.toFixed(1),
      icon: Star,
      color: "text-yellow-500",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`rounded-lg bg-secondary p-3 ${c.color}`}>
              <c.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
