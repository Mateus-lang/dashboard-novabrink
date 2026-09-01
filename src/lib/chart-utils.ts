import { ColetaItem } from "./sheets";
import { parsePercentualBR } from "./format-utils";

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
        nome: item.termoBusca,
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
    const loja = item.loja?.trim();
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
