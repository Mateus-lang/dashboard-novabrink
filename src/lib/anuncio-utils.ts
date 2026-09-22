import { ColetaItem } from "./sheets";

// Chaveiam por estrutura, não pela linha inteira da planilha: assim um rascunho
// de coleta ainda não gravado (que não tem as colunas calculadas) passa pelas
// mesmas funções que os itens vindos do Raw_Coleta.
type AnuncioIdentificavel = Pick<
  ColetaItem,
  "url" | "marketplace" | "sku"
>;

type OfertaIdentificavel = AnuncioIdentificavel &
  Pick<ColetaItem, "loja">;

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
export function chaveAnuncio(
  item: AnuncioIdentificavel,
): string {
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

// Um anúncio é a oferta DE UM VENDEDOR: no Mercado Livre e na Amazon várias
// lojas disputam a mesma página de produto, então a chave da página sozinha
// fundiria ofertas concorrentes numa só.
export function chaveOferta(
  item: OfertaIdentificavel,
): string {
  return `${normalizarNome(item.loja ?? "")}|${chaveAnuncio(item)}`;
}
