import { ColetaItem } from "./sheets";
import {
  chaveAnuncio,
  normalizarNome,
} from "./anuncio-utils";
import { parsePrecoBR } from "./format-utils";

// Quantas ofertas concorrentes o ranking mostra por SKU
const VENDEDORES_POR_SKU = 2;

export type GrupoSku = {
  sku: string;
  // da mais barata para a mais cara, no máximo VENDEDORES_POR_SKU linhas
  itens: ColetaItem[];
};

// Preço 0 é linha sem valor coletado, não oferta de graça: manda pro fim da
// ordenação pra não ocupar as vagas de "mais barato" (mesma precaução do
// calcularKpis, que só conta praticado > 0).
export function precoOrdenavel(
  item: ColetaItem,
): number {
  const preco = parsePrecoBR(item.precoPraticado);
  return preco > 0 ? preco : Infinity;
}

// A planilha é recoletada todo dia, então num período de vários dias a mesma
// oferta aparece uma vez por coleta. Sem colapsar, "os 2 mais baratos" viram a
// mesma loja em dois dias diferentes.
function colapsarColetasDiarias(
  itens: ColetaItem[],
): ColetaItem[] {
  const porOferta = new Map<string, ColetaItem>();

  for (const item of itens) {
    // um anúncio é a oferta DE UM VENDEDOR: a chave da página sozinha
    // fundiria lojas concorrentes disputando o mesmo produto
    const chave = `${normalizarNome(item.loja ?? "")}|${chaveAnuncio(item)}`;
    const atual = porOferta.get(chave);

    if (
      !atual ||
      precoOrdenavel(item) < precoOrdenavel(atual)
    ) {
      porOferta.set(chave, item);
    }
  }

  return [...porOferta.values()];
}

// Ranking do dashboard: por SKU, as duas ofertas mais baratas de lojas
// diferentes. A mesma loja pode ter mais de um anúncio do mesmo SKU, por isso
// não basta colapsar por anúncio.
export function agruparDoisMaisBaratosPorSku(
  itens: ColetaItem[],
): GrupoSku[] {
  const porSku = new Map<string, ColetaItem[]>();

  for (const item of colapsarColetasDiarias(itens)) {
    const grupo = porSku.get(item.sku);
    if (grupo) {
      grupo.push(item);
    } else {
      porSku.set(item.sku, [item]);
    }
  }

  return [...porSku.entries()].map(([sku, ofertas]) => {
    const ordenadas = [...ofertas].sort(
      (a, b) => precoOrdenavel(a) - precoOrdenavel(b),
    );

    const lojasVistas = new Set<string>();
    const escolhidas: ColetaItem[] = [];

    for (const oferta of ordenadas) {
      if (escolhidas.length === VENDEDORES_POR_SKU) break;

      const loja = normalizarNome(oferta.loja ?? "");
      if (lojasVistas.has(loja)) continue;

      lojasVistas.add(loja);
      escolhidas.push(oferta);
    }

    return { sku, itens: escolhidas };
  });
}
