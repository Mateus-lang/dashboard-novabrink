import { ColetaItem } from "./sheets";
import {
  calcularSaudePreco,
  parsePercentualBR,
  parsePrecoBR,
} from "./format-utils";
import {
  chaveAnuncio,
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
