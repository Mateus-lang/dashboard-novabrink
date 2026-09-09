"use client";

import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { ColetaItem } from "@/lib/sheets";
import { estaNoPeriodo } from "@/lib/date-utils";

import { DateRangeFilter } from "@/app/_components/date-range-filter";
import { RefreshButton } from "@/app/_components/refresh-button";
import { QueimaVendedorChart } from "@/app/_components/queima-vendedor-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Header from "./header";

type DetailsViewProps = {
  itensIniciais: ColetaItem[];
};

export function DetailsView({
  itensIniciais,
}: DetailsViewProps) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <Header
          title="Detalhes"
          subtitle="Inteligência de preço · E-Commerce"
        />

        {/* Filtro */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <DateRangeFilter
            periodo={periodo}
            onPeriodoChange={setPeriodo}
          />
          <RefreshButton />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Vendedores queimando preço
            </CardTitle>
            <CardDescription>
              Anúncios únicos com preço 10% ou mais abaixo
              do preço sugerido
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QueimaVendedorChart itens={itensFiltrados} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
