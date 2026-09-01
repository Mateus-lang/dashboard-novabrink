import { ColetaItem } from "./sheets";

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
