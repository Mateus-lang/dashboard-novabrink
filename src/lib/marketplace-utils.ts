// Identificador estável do marketplace, usado no código pra decidir qual busca
// automática roda. O nome que vai pra planilha é outra coisa — ver NOMES.
export type MarketplaceSlug =
  | "mercado-livre"
  | "shopee"
  | "amazon"
  | "ri-happy"
  | "magalu"
  | "le-biscuit"
  | "americanas"
  | "aliexpress"
  | "shein"
  | "joytoys";

// A planilha já tem 15 grafias pra 10 marketplaces ("shopee"/"Shopee",
// "mercado Livre"/"Mercado Livre", "Ali Expresss" com três esses). Os gráficos
// agrupam por normalizarNome(), então grafia nova não quebra nada — mas repetir
// a que já domina cada coluna mantém a planilha legível pra quem a abre na mão.
const NOMES: Record<MarketplaceSlug, string> = {
  "mercado-livre": "Mercado Livre",
  shopee: "Shopee",
  amazon: "Amazon",
  "ri-happy": "Ri Happy",
  magalu: "Magalu",
  "le-biscuit": "Le Biscuit",
  americanas: "Lojas Americanas",
  aliexpress: "Ali Expresss", // sic: é assim que está nas 7 linhas existentes
  shein: "Shein",
  joytoys: "JoyToys",
};

// Casa por sufixo de hostname pra cobrir os subdomínios que aparecem nas
// coletas (www., produto.mercadolivre, pt.aliexpress, br.shein).
const DOMINIOS: [string, MarketplaceSlug][] = [
  ["mercadolivre.com.br", "mercado-livre"],
  ["mercadolivre.com", "mercado-livre"],
  ["mercadolibre.com", "mercado-livre"],
  ["shopee.com.br", "shopee"],
  ["amazon.com.br", "amazon"],
  ["rihappy.com.br", "ri-happy"],
  ["magazineluiza.com.br", "magalu"],
  ["magalu.com", "magalu"],
  ["lebiscuit.com.br", "le-biscuit"],
  ["americanas.com.br", "americanas"],
  ["aliexpress.com", "aliexpress"],
  ["shein.com", "shein"],
  ["shein.com.br", "shein"],
  ["joytoys.com.br", "joytoys"],
];

export type Marketplace = {
  slug: MarketplaceSlug;
  nome: string;
};

export function detectarMarketplace(
  url: string,
): Marketplace | null {
  let hostname: string;
  try {
    hostname = new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }

  for (const [dominio, slug] of DOMINIOS) {
    if (
      hostname === dominio ||
      hostname.endsWith(`.${dominio}`)
    ) {
      return { slug, nome: NOMES[slug] };
    }
  }

  return null;
}
