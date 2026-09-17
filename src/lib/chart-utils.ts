import { ColetaItem } from "./sheets";
import {
  calcularSaudePreco,
  parsePercentualBR,
  parsePrecoBR,
} from "./format-utils";
import {
  chaveAnuncio,
  chaveOferta,
  normalizarNome,
} from "./anuncio-utils";


export type QueimaItem = {
  nome: string;
  desconto: number;
};

export function agruparQueimaPorSku(
  itens: ColetaItem[],
  limite = 10,
): QueimaItem[] {
  const porSku = new Map<string, QueimaItem>();

  for (const item of itens) {
    const desconto = parsePercentualBR(
      item.descontoVsMaior,
    );
    if (!Number.isFinite(desconto)) continue;

    const atual = porSku.get(item.sku);
    if (!atual || desconto > atual.desconto) {
      porSku.set(item.sku, {
        nome: `${item.sku} · ${item.termoBusca}`,
        desconto,
      });
    }
  }

  return [...porSku.values()]
    .sort((a, b) => b.desconto - a.desconto)
    .slice(0, limite);
}
export type KAccountItem = {
  nome: string;
  total: number;
};

export function contarVendedoresPorKAccount(
  itens: ColetaItem[],
): KAccountItem[] {
  const porGestor = new Map<string, Set<string>>();

  for (const item of itens) {
    const gestor = item.kAccount?.trim() || "Sem gestor";
    const loja = normalizarNome(item.loja ?? "");
    if (!loja) continue;

    if (!porGestor.has(gestor)) {
      porGestor.set(gestor, new Set());
    }
    porGestor.get(gestor)!.add(loja);
  }

  return [...porGestor.entries()]
    .map(([nome, lojas]) => ({ nome, total: lojas.size }))
    .sort((a, b) => b.total - a.total);
}

export type VendedorQueimaItem = {
  nome: string; // a loja
  total: number; // anúncios únicos queimando preço
};

// um anúncio "queima preço" quando está 10% ou mais abaixo do preço sugerido
const QUEIMA_MINIMA_PCT = 10;

export function contarQueimaPorVendedor(
  itens: ColetaItem[],
  limite = 15,
): VendedorQueimaItem[] {
  const porLoja = new Map<string, Set<string>>();

  for (const item of itens) {
    const loja = normalizarNome(item.loja ?? "");
    if (!loja) continue;

    const praticado = parsePrecoBR(item.precoPraticado);
    // célula vazia vira 0 e seria lida como queima de 100%
    if (praticado <= 0) continue;

    const saude = calcularSaudePreco(
      praticado,
      parsePrecoBR(item.minAceitavel),
      parsePrecoBR(item.precoSugerido),
    );
    if (!saude || saude.larguraPct < QUEIMA_MINIMA_PCT)
      continue;

    if (!porLoja.has(loja)) {
      porLoja.set(loja, new Set());
    }
    // a planilha é coletada todo dia: o mesmo anúncio reaparece a cada coleta
    porLoja.get(loja)!.add(chaveAnuncio(item));
  }

  return [...porLoja.entries()]
    .map(([nome, anuncios]) => ({
      nome,
      total: anuncios.size,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limite);
}

// Paleta das fatias das roscas. Vive aqui, e não em cada gráfico, pra que os
// dois donuts do app pintem suas séries com as mesmas cores na mesma ordem.
export const CORES_SERIE = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#a855f7",
];

export type VersaoItem = {
  nome: string; // a versão do item (PDV, E-COM, …)
  total: number; // anúncios únicos do período nessa versão
};

// A planilha traz "PDV" e "pdv" entre coletas; sem normalizar, a mesma versão
// viraria duas barras. Célula vazia cai num rótulo próprio em vez de sumir.
export function rotuloVersao(item: ColetaItem): string {
  return normalizarNome(item.versao ?? "") || "Sem versão";
}

// Anúncios distintos numa lista, ignorando a versão. A planilha é coletada todo
// dia, então contar linhas contaria o mesmo anúncio uma vez por coleta.
export function contarAnunciosUnicos(
  itens: ColetaItem[],
): number {
  return new Set(itens.map(chaveOferta)).size;
}

// Quantos anúncios únicos cada versão tem no período. Sem limite: são poucas
// versões, e cortar a cauda esconderia justamente a comparação que o gráfico existe
// pra mostrar.
//
// A soma das versões pode passar do total de anúncios distintos: o mesmo anúncio
// de uma loja pode ter sido casado com SKUs de versões diferentes em dias
// diferentes de coleta. Ele conta nas duas versões de propósito — atribuí-lo a
// uma só seria escolha arbitrária —, por isso quem mostra o total usa
// contarAnunciosUnicos em vez de somar as barras.
export function contarAnunciosPorVersao(
  itens: ColetaItem[],
): VersaoItem[] {
  const porVersao = new Map<string, Set<string>>();

  for (const item of itens) {
    const versao = rotuloVersao(item);

    if (!porVersao.has(versao)) {
      porVersao.set(versao, new Set());
    }
    porVersao.get(versao)!.add(chaveOferta(item));
  }

  return [...porVersao.entries()]
    .map(([nome, anuncios]) => ({
      nome,
      total: anuncios.size,
    }))
    .sort((a, b) => b.total - a.total);
}
