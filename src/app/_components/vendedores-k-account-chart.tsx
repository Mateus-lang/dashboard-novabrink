"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { contarVendedoresPorKAccount } from "@/lib/chart-utils";
import { ColetaItem } from "@/lib/sheets";
import { useMemo } from "react";

const CORES = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#a855f7",
];

export function VendedoresKAccountChart({
  itens,
}: {
  itens: ColetaItem[];
}) {
  const dados = useMemo(
    () => contarVendedoresPorKAccount(itens),
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
        <PieChart>
          <Pie
            data={dados}
            dataKey="total"
            nameKey="nome"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            labelLine={false}
            label={({
              cx,
              cy,
              midAngle,
              innerRadius,
              outerRadius,
              percent,
            }) => {
              if (!percent || percent < 0.05) return null;

              const RADIAN = Math.PI / 180;
              const raio =
                Number(innerRadius) +
                (Number(outerRadius) -
                  Number(innerRadius)) *
                  0.5;
              const x =
                Number(cx) +
                raio * Math.cos(-Number(midAngle) * RADIAN);
              const y =
                Number(cy) +
                raio * Math.sin(-Number(midAngle) * RADIAN);

              return (
                <text
                  x={x}
                  y={y}
                  fill="#fff"
                  fontSize={12}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {`${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
          >
            {dados.map((item, index) => (
              <Cell
                key={item.nome}
                fill={CORES[index % CORES.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value, name) => {
              const total = Number(value);
              return [
                `${total} ${total === 1 ? "vendedor" : "vendedores"}`,
                name,
              ];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
