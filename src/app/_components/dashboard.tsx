"use client";

import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { ExternalLink } from "lucide-react";

import { ColetaItem } from "@/lib/sheets";
import { estaNoPeriodo } from "@/lib/date-utils";
import {
  calcularKpis,
  formatPrecoBR,
} from "@/lib/format-utils";

import { KpiCard } from "@/app/_components/kpi-card";
import { DateRangeFilter } from "@/app/_components/date-range-filter";
import { ColetaTable } from "@/app/_components/coleta-table";
import { RefreshButton } from "@/app/_components/refresh-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { QueimaPrecoChart } from "./queima-preco-chart";
import { VendedoresKAccountChart } from "./vendedores-k-account-chart";
import Header from "./header";

type DashboardProps = {
  itensIniciais: ColetaItem[];
};

export function Dashboard({
  itensIniciais,
}: DashboardProps) {
  // hoje = data real do sistema (início do dia)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [periodo, setPeriodo] = useState<
    DateRange | undefined
  >({
    from: hoje,
    to: hoje,
  });

  // filtra os itens pelo período selecionado
  const itensFiltrados = useMemo(() => {
    return itensIniciais.filter((item) =>
      estaNoPeriodo(
        item.dataBusca,
        periodo?.from,
        periodo?.to,
      ),
    );
  }, [itensIniciais, periodo]);

  // calcula os KPIs a partir dos itens já filtrados
  const kpis = useMemo(
    () => calcularKpis(itensFiltrados),
    [itensFiltrados],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <Header
          title="Monitoramento de Preços"
          subtitle="Inteligência de preço · E-Commerce"
        />

        {/* KPIs */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            titulo="Anúncios monitorados"
            valor={kpis.totalAnuncios}
            detalhe="no período selecionado"
          />
          <KpiCard
            titulo="Menor preço encontrado"
            valor={
              kpis.menorPrecoItem
                ? formatPrecoBR(kpis.menorPreco)
                : "—"
            }
            detalhe={
              kpis.menorPrecoItem && (
                <span className="flex items-center gap-1.5">
                  <span className="truncate">
                    {kpis.menorPrecoItem.sku} ·{" "}
                    {kpis.menorPrecoItem.termoBusca}
                  </span>
                  {kpis.menorPrecoItem.url && (
                    <a
                      href={kpis.menorPrecoItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Abrir anúncio no marketplace"
                      className="shrink-0 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </span>
              )
            }
          />
          <KpiCard
            titulo="Abaixo do mínimo aceitável"
            valor={kpis.abaixoDoMinimo}
            detalhe={`${kpis.pctAbaixoDoMinimo}% dos anúncios monitorados`}
            destaque={
              kpis.abaixoDoMinimo > 0 ? "alerta" : "neutro"
            }
          />
        </div>

        {/* Filtro */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <DateRangeFilter
            periodo={periodo}
            onPeriodoChange={setPeriodo}
          />
          <RefreshButton />
        </div>

        {/* Tabela */}
        <div className="mb-25">
          <h2 className="mb-3 text-lg font-semibold">
            Ranking · Menor Preço por Item
          </h2>
          <ColetaTable itens={itensFiltrados} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Maior Queima de Preço</CardTitle>
            </CardHeader>
            <CardContent>
              <QueimaPrecoChart itens={itensFiltrados} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                Vendedores por K-Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VendedoresKAccountChart
                itens={itensFiltrados}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
