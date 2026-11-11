"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parsePercentualBR, parsePrecoBR } from "@/lib/format-utils";
import {
  agruparDoisMaisBaratosPorSku,
  precoOrdenavel,
} from "@/lib/table-utils";
import { ColetaItem } from "@/lib/sheets";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ExternalLink, Search } from "lucide-react";
import { ExcluirLinhaButton } from "./excluir-linha-button";
import { PriceHealthBar } from "./price-health-bar";

type Ordenacao = "Menor Preço" | "Maior Desconto %";

// "ranking": 2 ofertas mais baratas por SKU (dashboard).
// "completo": toda linha da planilha no período, sem agrupar (detalhes).
type Modo = "ranking" | "completo";

const SKUS_POR_PAGINA = 5;
const TAMANHOS_DE_PAGINA = [10, 25, 50, 100];
const TAMANHO_PADRAO_COMPLETO = 50;

// o Select renderiza o próprio value no trigger, então o rótulo vai no value
function rotuloTamanho(tamanho: number): string {
  return `${tamanho} por página`;
}

type ColetaTableProps = {
  itens: ColetaItem[];
  modo?: Modo;
};

export function ColetaTable({
  itens,
  modo = "ranking",
}: ColetaTableProps) {
  const [ordenacao, setOrdenacao] =
    useState<Ordenacao>("Menor Preço");
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(
    TAMANHO_PADRAO_COMPLETO,
  );
  const [filtroSku, setFiltroSku] = useState("");

  const termoSku = filtroSku.trim().toLocaleLowerCase("pt-BR");

  // filtra antes de agrupar, pra o ranking mostrar as ofertas mais baratas
  // só dos SKUs que casam com o termo
  const itensFiltrados = useMemo(() => {
    if (!termoSku) return itens;
    return itens.filter((item) =>
      item.sku.toLocaleLowerCase("pt-BR").includes(termoSku),
    );
  }, [itens, termoSku]);

  // no ranking a página conta SKUs (até 2 linhas cada), não linhas
  const itensPorPagina =
    modo === "ranking" ? SKUS_POR_PAGINA : tamanhoPagina;

  const comparar = useMemo(() => {
    return (a: ColetaItem, b: ColetaItem) => {
      if (ordenacao === "Menor Preço") {
        // menor preço praticado primeiro (crescente)
        return precoOrdenavel(a) - precoOrdenavel(b);
      }
      // maior desconto primeiro (decrescente)
      return (
        parsePercentualBR(b.descontoVsMaior) -
        parsePercentualBR(a.descontoVsMaior)
      );
    };
  }, [ordenacao]);

  // No ranking as unidades de ordenação/paginação são os grupos de SKU, pra que
  // as duas ofertas do mesmo item nunca se separem nem caiam em páginas
  // diferentes. No modo completo cada linha da planilha é sua própria unidade.
  const unidades = useMemo(() => {
    if (modo === "ranking") {
      const grupos = agruparDoisMaisBaratosPorSku(itensFiltrados);
      // o grupo vale o que vale sua oferta mais barata (primeira da lista)
      return [...grupos]
        .sort((a, b) => comparar(a.itens[0], b.itens[0]))
        .map((grupo) =>
          grupo.itens.map((item, indice) => ({
            item,
            abreGrupo: indice === 0,
          })),
        );
    }

    return [...itensFiltrados]
      .sort(comparar)
      .map((item) => [{ item, abreGrupo: false }]);
  }, [itensFiltrados, modo, comparar]);

  const totalLinhas = useMemo(
    () =>
      unidades.reduce(
        (soma, unidade) => soma + unidade.length,
        0,
      ),
    [unidades],
  );

  // pelo menos 1 pagina, mesmo com a lista vazia
  const totalPaginas = Math.max(
    1,
    Math.ceil(unidades.length / itensPorPagina),
  );

  // `pagina` e o que o usuario pediu; `paginaAtual` e o que da pra mostrar agora.
  // Se o filtro encolheu a lista, o clamp segura na ultima pagina valida
  // sem precisar de setState durante a renderizacao.
  const paginaAtual = Math.min(pagina, totalPaginas);

  // fatia só as unidades da página atual e achata em linhas
  const linhasDaPagina = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return unidades
      .slice(inicio, inicio + itensPorPagina)
      .flat();
  }, [unidades, paginaAtual, itensPorPagina]);

  if (itens.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum resultado para o período selecionado.
      </p>
    );
  }

  const mostraData = modo === "completo";
  // Data (opcional) + 10 colunas fixas + a coluna de excluir
  const totalColunas = (mostraData ? 1 : 0) + 11;
  const resumo =
    modo === "ranking"
      ? `${unidades.length} ${unidades.length === 1 ? "SKU" : "SKUs"} · ${totalLinhas} ${totalLinhas === 1 ? "oferta" : "ofertas"}`
      : `${totalLinhas} ${totalLinhas === 1 ? "resultado" : "resultados"}`;

  return (
    <div className="space-y-4">
      {/* Filtro por SKU e seletor de ordenação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Filtrar por SKU"
              aria-label="Filtrar por SKU"
              value={filtroSku}
              onChange={(e) => {
                setFiltroSku(e.target.value);
                setPagina(1);
              }}
              className="w-52 pl-8"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {resumo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {modo === "completo" && (
            <Select
              value={rotuloTamanho(tamanhoPagina)}
              onValueChange={(v) => {
                if (!v) return;
                setTamanhoPagina(parseInt(v, 10));
                setPagina(1);
              }}
            >
              <SelectTrigger className="w-45">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAMANHOS_DE_PAGINA.map((tamanho) => (
                  <SelectItem
                    key={tamanho}
                    value={rotuloTamanho(tamanho)}
                  >
                    {rotuloTamanho(tamanho)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
      </div>
      {/* Tabela */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {mostraData && <TableHead>Data</TableHead>}
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
              <TableHead className="w-10">
                <span className="sr-only">Excluir</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhasDaPagina.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={totalColunas}
                  className="py-8 text-center text-muted-foreground"
                >
                  Nenhum SKU corresponde a “{filtroSku.trim()}”.
                </TableCell>
              </TableRow>
            )}
            {linhasDaPagina.map(
              ({ item, abreGrupo }, index) => {
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
                    key={item.linha}
                    className={cn(
                      // separa visualmente cada par de ofertas do mesmo SKU
                      abreGrupo &&
                        index > 0 &&
                        "border-t-2 border-t-muted-foreground/25",
                    )}
                  >
                    {mostraData && (
                      <TableCell className="tabular-nums text-muted-foreground">
                        {item.dataBusca}
                      </TableCell>
                    )}
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
                    <TableCell className="text-right">
                      <ExcluirLinhaButton item={item} />
                    </TableCell>
                  </TableRow>
                );
              },
            )}
          </TableBody>
        </Table>
      </div>
      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {paginaAtual} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setPagina(Math.max(1, paginaAtual - 1))
              }
              disabled={paginaAtual === 1}
              className="inline-flex h-9 items-center rounded-md border border-input px-3 text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() =>
                setPagina(
                  Math.min(totalPaginas, paginaAtual + 1),
                )
              }
              disabled={paginaAtual === totalPaginas}
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
