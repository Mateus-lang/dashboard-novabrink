import { ColetaItem } from "./sheets";

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
  menorPrecoMedio: number;
  abaixoDoMinimo: number;
};

export function calcularKpis(
  itens: ColetaItem[],
): KpisResumo {
  const totalAnuncios = itens.length;

  // média dos preços praticados
  const somaPrecos = itens.reduce(
    (soma, item) =>
      soma + parsePrecoBR(item.precoPraticado),
    0,
  );
  const menorPrecoMedio =
    totalAnuncios > 0 ? somaPrecos / totalAnuncios : 0;

  // quantos itens têm preço praticado abaixo do mínimo aceitável
  const abaixoDoMinimo = itens.filter((item) => {
    const praticado = parsePrecoBR(item.precoPraticado);
    const minimo = parsePrecoBR(item.minAceitavel);
    return minimo > 0 && praticado < minimo;
  }).length;

  return { totalAnuncios, menorPrecoMedio, abaixoDoMinimo };
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
