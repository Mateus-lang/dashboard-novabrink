"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  parsePercentualBR,
  parsePrecoBR,
} from "@/lib/format-utils";
import { ColetaItem } from "@/lib/sheets";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { PriceHealthBar } from "./price-health-bar";

type Ordenacao = "Menor Preço" | "Maior Desconto %";
const ITENS_POR_PAGINA = 10;

type ColetaTableProps = {
  itens: ColetaItem[];
};

export function ColetaTable({ itens }: ColetaTableProps) {
  const [ordenacao, setOrdenacao] =
    useState<Ordenacao>("Menor Preço");
  const [pagina, setPagina] = useState(1);
  const itensUnicos = useMemo(() => {
    const porSku = new Map<string, ColetaItem>();

    for (const item of itens) {
      const atual = porSku.get(item.sku);
      if (
        !atual ||
        parsePrecoBR(item.precoPraticado) <
          parsePrecoBR(atual.precoPraticado)
      ) {
        porSku.set(item.sku, item);
      }
    }

    return [...porSku.values()];
  }, [itens]);
  // ordena a lista inteira conforme a escolha
  const itensOrdenados = useMemo(() => {
    const copia = [...itensUnicos];
    copia.sort((a, b) => {
      if (ordenacao === "Menor Preço") {
        // menor preço praticado primeiro (crescente)
        return (
          parsePrecoBR(a.precoPraticado) -
          parsePrecoBR(b.precoPraticado)
        );
      }
      // maior desconto primeiro (decrescente)
      return (
        parsePercentualBR(b.descontoVsMaior) -
        parsePercentualBR(a.descontoVsMaior)
      );
    });
    return copia;
  }, [itensUnicos, ordenacao]);

  const totalPaginas = Math.ceil(
    itensOrdenados.length / ITENS_POR_PAGINA,
  );

  // fatia só os itens da página atual
  const itensDaPagina = useMemo(() => {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    return itensOrdenados.slice(
      inicio,
      inicio + ITENS_POR_PAGINA,
    );
  }, [itensOrdenados, pagina]);

  // se a lista encolheu (mudou o filtro) e a página atual não existe mais,
  // volta pra primeira — evita mostrar página vazia
  if (pagina > totalPaginas && totalPaginas > 0) {
    setPagina(1);
  }

  if (itens.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum resultado para o período selecionado.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor de ordenação */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {itensOrdenados.length}{" "}
          {itensOrdenados.length === 1
            ? "resultado"
            : "resultados"}
        </span>
        <Select
          value={ordenacao}
          onValueChange={(v) => {
            setOrdenacao(v as Ordenacao);
            setPagina(1);
          }}
        >
          <SelectTrigger className="w-55">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Menor Preço">
              Menor preço primeiro
            </SelectItem>
            <SelectItem value="Maior Desconto %">
              Maior desconto primeiro
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Versão</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead>Loja / Vendedor</TableHead>
              <TableHead className="text-center">
                Link
              </TableHead>
              <TableHead className="text-right">
                Preço Sugerido
              </TableHead>
              <TableHead className="text-right">
                Mín. Aceitável
              </TableHead>
              <TableHead className="text-right">
                Preço Praticado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itensDaPagina.map((item, index) => {
              const praticado = parsePrecoBR(
                item.precoPraticado,
              );
              const minimo = parsePrecoBR(
                item.minAceitavel,
              );
              const sugerido = parsePrecoBR(
                item.precoSugerido,
              );
              const abaixoDoMinimo =
                minimo > 0 && praticado < minimo;

              return (
                <TableRow
                  key={`${item.sku}-${item.loja}-${index}`}
                >
                  <TableCell className="font-medium tabular-nums">
                    {item.sku}
                  </TableCell>
                  <TableCell className="max-w-55 truncate">
                    {item.termoBusca}
                  </TableCell>
                  <TableCell>{item.versao}</TableCell>
                  <TableCell>{item.marketplace}</TableCell>
                  <TableCell className="max-w-40 truncate">
                    {item.loja}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        —
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {item.precoSugerido}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {item.minAceitavel}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className={cn(
                          abaixoDoMinimo &&
                            "text-destructive",
                        )}
                      >
                        {item.precoPraticado}
                      </span>
                      <PriceHealthBar
                        precoPraticado={praticado}
                        minimoAceitavel={minimo}
                        precoSugerido={sugerido}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setPagina((p) => Math.max(1, p - 1))
              }
              disabled={pagina === 1}
              className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() =>
                setPagina((p) =>
                  Math.min(totalPaginas, p + 1),
                )
              }
              disabled={pagina === totalPaginas}
              className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
