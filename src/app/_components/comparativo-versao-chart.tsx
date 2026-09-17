"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  CORES_SERIE,
  contarAnunciosPorVersao,
} from "@/lib/chart-utils";
import { ColetaItem } from "@/lib/sheets";
import { useMemo } from "react";

// Comparativo entre todas as versões: de propósito não recebe o filtro de versão
// do gráfico ao lado — uma rosca de uma fatia só não compara nada.
export function ComparativoVersaoChart({
  itens,
}: {
  itens: ColetaItem[];
}) {
  const dados = useMemo(
    () => contarAnunciosPorVersao(itens),
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
                fill={CORES_SERIE[index % CORES_SERIE.length]}
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
                `${total} ${total === 1 ? "anúncio" : "anúncios"}`,
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
