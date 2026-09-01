"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { agruparQueimaPorSku } from "@/lib/chart-utils";
import { ColetaItem } from "@/lib/sheets";
import { useMemo } from "react";

export function QueimaPrecoChart({
  itens,
}: {
  itens: ColetaItem[];
}) {
  const dados = useMemo(
    () => agruparQueimaPorSku(itens, 10),
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
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dados}
          layout="vertical"
          margin={{ left: 8, right: 24 }}
        >
          <XAxis
            type="number"
            tickFormatter={(v) => `${v}%`}
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
            formatter={(value) => [
              `${Number(value)}%`,
              "Desconto",
            ]}
          />
          <Bar dataKey="desconto" radius={[0, 4, 4, 0]}>
            {dados.map((item) => (
              <Cell
                key={item.nome}
                fill="var(--destructive)"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
