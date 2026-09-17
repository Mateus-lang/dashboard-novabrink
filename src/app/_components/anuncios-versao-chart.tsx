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
import {
  CORES_SERIE,
  contarAnunciosPorVersao,
  contarAnunciosUnicos,
  rotuloVersao,
} from "@/lib/chart-utils";
import { ColetaItem } from "@/lib/sheets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";

// o Select renderiza o próprio value no trigger, então o rótulo vai no value
const TODAS = "Todas as versões";

export function AnunciosVersaoChart({
  itens,
}: {
  itens: ColetaItem[];
}) {
  const [versao, setVersao] = useState(TODAS);

  const dados = useMemo(
    () => contarAnunciosPorVersao(itens),
    [itens],
  );

  // `versao` é o que o usuário pediu; `versaoAtual` é o que dá pra mostrar agora.
  // Se o filtro de data encolheu o período e a versão escolhida sumiu, o clamp
  // cai em TODAS sem precisar de setState durante a renderização.
  const versaoAtual = dados.some((d) => d.nome === versao)
    ? versao
    : TODAS;

  const dadosVisiveis =
    versaoAtual === TODAS
      ? dados
      : dados.filter((d) => d.nome === versaoAtual);

  // O total vem de uma contagem própria, não da soma das barras: um anúncio que
  // apareceu em duas versões conta nas duas barras, e somá-las o contaria duas
  // vezes. Assim o número aqui bate com o KPI "Anúncios monitorados".
  const totalUnicos = useMemo(() => {
    const visiveis =
      versaoAtual === TODAS
        ? itens
        : itens.filter(
            (item) => rotuloVersao(item) === versaoAtual,
          );
    return contarAnunciosUnicos(visiveis);
  }, [itens, versaoAtual]);

  const somaDasBarras = dadosVisiveis.reduce(
    (soma, d) => soma + d.total,
    0,
  );
  const emDuasVersoes = somaDasBarras - totalUnicos;

  if (dados.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem dados no período.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {totalUnicos}{" "}
          {totalUnicos === 1
            ? "anúncio único"
            : "anúncios únicos"}
          {emDuasVersoes > 0 && (
            // sem isto as barras somariam mais que o total e pareceria erro
            <> · {emDuasVersoes} em mais de uma versão</>
          )}
        </span>
        <Select
          value={versaoAtual}
          onValueChange={(v) => {
            if (!v) return;
            setVersao(v);
          }}
        >
          <SelectTrigger className="w-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>{TODAS}</SelectItem>
            {dados.map((d) => (
              <SelectItem key={d.nome} value={d.nome}>
                {d.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dadosVisiveis}
            layout="vertical"
            margin={{ left: 8, right: 24 }}
            barCategoryGap="25%"
            maxBarSize={72}
          >
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="nome"
              width={120}
              tick={{ fontSize: 12 }}
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
                const quantidade = Number(value);
                return [
                  `${quantidade} ${quantidade === 1 ? "anúncio" : "anúncios"}`,
                  "Anúncios únicos",
                ];
              }}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {dadosVisiveis.map((d) => (
                // a cor vem da posição da versão na lista completa, não na
                // filtrada: assim PDV é a mesma cor aqui e na rosca ao lado,
                // e continua a mesma depois de filtrar
                <Cell
                  key={d.nome}
                  fill={
                    CORES_SERIE[
                      dados.findIndex(
                        (item) => item.nome === d.nome,
                      ) % CORES_SERIE.length
                    ]
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
