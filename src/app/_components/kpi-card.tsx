import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type KpiCardProps = {
  titulo: string;
  valor: string | number;
  detalhe?: ReactNode;
  destaque?: "neutro" | "alerta";
};

export function KpiCard({
  titulo,
  valor,
  detalhe,
  destaque = "neutro",
}: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-3xl font-bold tabular-nums",
            destaque === "alerta" && "text-destructive",
          )}
        >
          {valor}
        </div>
        {detalhe && (
          <div className="mt-1 text-xs text-muted-foreground">
            {detalhe}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
