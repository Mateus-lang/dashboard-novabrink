import { ColetaItem } from "./sheets";
import {
  chaveAnuncio,
  normalizarNome,
} from "./anuncio-utils";

// Converte "R$ 1.234,56" (formato brasileiro) em 1234.56 (número)
export function parsePrecoBR(preco: string): number {
  if (!preco) return 0;

  const limpo = preco
    .replace("R$", "") // tira o símbolo
    .replace(/\s/g, "") // tira espaços
    .replace(/\./g, "") // tira separador de milhar (ponto)
    .replace(",", "."); // vírgula decimal vira ponto

  const numero = parseFloat(limpo);
  return isNaN(numero) ? 0 : numero;
}

// Converte 1234.56 de volta em "R$ 1.234,56" para exibição
export function formatPrecoBR(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export type KpisResumo = {
  totalAnuncios: number;
  menorPreco: number;
  // null quando o período não tem nenhum preço válido
  menorPrecoItem: ColetaItem | null;
  abaixoDoMinimo: number;
  pctAbaixoDoMinimo: number;
};

export function calcularKpis(
  itens: ColetaItem[],
): KpisResumo {
  // a planilha é coletada todo dia: contar linhas contaria o mesmo
  // anúncio uma vez por coleta
  const anuncios = new Set<string>();
  const anunciosAbaixo = new Set<string>();

  // menor preço praticado do período + o anúncio que o praticou
  let menorPreco = 0;
  let menorPrecoItem: ColetaItem | null = null;

  for (const item of itens) {
    // um anúncio é a oferta DE UM VENDEDOR. No Mercado Livre e na Amazon
    // várias lojas disputam a mesma página de produto, então a chave da
    // página sozinha fundiria ofertas concorrentes numa só.
    const chave = `${normalizarNome(item.loja ?? "")}|${chaveAnuncio(item)}`;
    anuncios.add(chave);

    const praticado = parsePrecoBR(item.precoPraticado);
    const minimo = parsePrecoBR(item.minAceitavel);

    // o praticado > 0 importa: célula vazia vira 0, e 0 < minimo
    // seria lido como "furou o piso"
    if (minimo > 0 && praticado > 0 && praticado < minimo) {
      anunciosAbaixo.add(chave);
    }

    // parsePrecoBR devolve 0 pra célula vazia/inválida —
    // num mínimo, o 0 ganharia sempre
    if (praticado <= 0) continue;

    if (!menorPrecoItem || praticado < menorPreco) {
      menorPreco = praticado;
      menorPrecoItem = item;
    }
  }

  const totalAnuncios = anuncios.size;
  const abaixoDoMinimo = anunciosAbaixo.size;

  return {
    totalAnuncios,
    menorPreco,
    menorPrecoItem,
    abaixoDoMinimo,
    pctAbaixoDoMinimo:
      totalAnuncios > 0
        ? Math.round((abaixoDoMinimo / totalAnuncios) * 100)
        : 0,
  };
}

// Converte "40,57%" em 40.57 (número)
export function parsePercentualBR(pct: string): number {
  if (!pct) return 0;
  const limpo = pct
    .replace("%", "")
    .replace(/\s/g, "")
    .replace(",", ".");
  const numero = parseFloat(limpo);
  return isNaN(numero) ? 0 : numero;
}

export type StatusPreco = "abaixo" | "atencao" | "saudavel";

export function calcularSaudePreco(
  praticado: number,
  minimo: number,
  sugerido: number,
): { larguraPct: number; status: StatusPreco } | null {
  if (
    !Number.isFinite(praticado) ||
    !Number.isFinite(sugerido)
  )
    return null;
  if (sugerido <= 0) return null;

  // quanto o preço praticado está abaixo do sugerido, em fração (0 = preço cheio)
  const queima = (sugerido - praticado) / sugerido;

  const larguraPct = Math.max(0, Math.min(1, queima)) * 100;

  const status: StatusPreco =
    Number.isFinite(minimo) &&
    minimo > 0 &&
    praticado < minimo
      ? "abaixo"
      : queima > 0.15
        ? "atencao"
        : "saudavel";

  return { larguraPct, status };
}
