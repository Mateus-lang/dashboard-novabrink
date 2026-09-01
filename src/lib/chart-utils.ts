import { ColetaItem } from "./sheets";
import {
  calcularSaudePreco,
  parsePercentualBR,
  parsePrecoBR,
} from "./format-utils";

// A planilha traz o mesmo nome com grafias diferentes entre coletas
// ("Lojas Q2" / "lojas Q2", "Amazon" / "amazon"). Map e Set comparam string por
// igualdade exata, então sem normalizar o mesmo nome vira duas entradas.
export function normalizarNome(nome: string): string {
  return nome
    .trim()
    .replace(/\s+/g, " ") // espaço interno repetido
    .toLocaleUpperCase("pt-BR");
}

// A url da planilha carrega rastreio que muda a cada coleta (?mcid=, ?gads_t_sig=,
// ?pdp_filters=, /ref=asc_df_...). Usar a url crua como chave faz o mesmo anúncio
// ser contado uma vez por dia de coleta.
export function chaveAnuncio(item: ColetaItem): string {
  const url = item.url?.trim();
  // sem url, o par marketplace+sku é o que sobra pra identificar
  if (!url) {
    return `${normalizarNome(item.marketplace ?? "")}|${item.sku}`;
  }

  try {
    const { origin, pathname } = new URL(url);
    return (origin + pathname)
      .replace(/\/ref=[^/]*$/, "") // rastreio da Amazon, que vem no caminho
      .replace(/\/$/, "") // barra final
      .toLowerCase();
  } catch {
    // url malformada: melhor contar pelo valor cru do que descartar a linha
    return url;
  }
}

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
