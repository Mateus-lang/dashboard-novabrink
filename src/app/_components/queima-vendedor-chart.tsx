"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { contarQueimaPorVendedor } from "@/lib/chart-utils";
import { ColetaItem } from "@/lib/sheets";
import { useMemo } from "react";

export function QueimaVendedorChart({
  itens,
}: {
  itens: ColetaItem[];
}) {
  const dados = useMemo(
    () => contarQueimaPorVendedor(itens, 15),
    [itens],
  );

  if (dados.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem dados no período.
      </p>
    );
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dados}
          layout="vertical"
          margin={{ left: 8, right: 24 }}
        >
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="nome"
            width={200}
            tick={{ fontSize: 12 }}
            tickFormatter={(v: string) =>
              v.length > 28 ? `${v.slice(0, 28)}…` : v
            }
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value) => {
              const total = Number(value);
              return [
                `${total} ${total === 1 ? "anúncio" : "anúncios"}`,
                "Queimando preço",
              ];
            }}
          />
          <Bar
            dataKey="total"
            fill="var(--destructive)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
