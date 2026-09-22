// User-Agent e cabeçalhos de navegador de verdade: sem eles, boa parte das
// lojas devolve 403 direto. Não é disfarce — é o mínimo que os CDNs esperam
// de um cliente HTTP pra não tratar como script.
const CABECALHOS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "upgrade-insecure-requests": "1",
};

export type ResultadoPagina =
  | { ok: true; html: string }
  | { ok: false; motivo: string };

// Medido nas 11 lojas da planilha: Shopee e AliExpress devolvem 200 com uma
// casca de JS, Le Biscuit devolve desafio da Cloudflare, Magalu devolve 2kb
// vazios e o Mercado Livre manda a página de "tráfego suspeito". Todos passam
// por aqui pra virar pedido de colagem em vez de dado errado.
export function motivoDeBloqueio(
  html: string,
  status: number,
): string | null {
  if (status === 403 || status === 429) {
    return `a loja recusou a conexão do servidor (HTTP ${status})`;
  }

  if (/Just a moment|cf-browser-verification|challenge-platform/i.test(html)) {
    return "a loja está protegida por desafio da Cloudflare";
  }

  if (/suspicious_traffic|account-verification/i.test(html)) {
    return "o Mercado Livre bloqueou a leitura automática";
  }

  const titulo = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();

  if (html.length < 5000 && !titulo) {
    return "a loja devolveu uma página vazia para o servidor";
  }

  // Shopee e AliExpress montam a página inteira no navegador: o que chega aqui
  // não tem título nem cabeçalho, só o esqueleto.
  if (!titulo && !/<h1/i.test(html)) {
    return "a página é montada por JavaScript e chega vazia ao servidor";
  }

  return null;
}

export async function buscarPagina(
  url: string,
): Promise<ResultadoPagina> {
  try {
    const resposta = await fetch(url, {
      headers: CABECALHOS,
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const html = await resposta.text();
    const bloqueio = motivoDeBloqueio(html, resposta.status);

    if (bloqueio) return { ok: false, motivo: bloqueio };
    if (!resposta.ok) {
      return {
        ok: false,
        motivo: `a loja respondeu HTTP ${resposta.status}`,
      };
    }

    return { ok: true, html };
  } catch (erro) {
    if (erro instanceof Error && erro.name === "TimeoutError") {
      return { ok: false, motivo: "a loja demorou demais para responder" };
    }
    return {
      ok: false,
      motivo:
        erro instanceof Error
          ? `falha ao abrir a página: ${erro.message}`
          : "falha ao abrir a página",
    };
  }
}

// A página da Amazon tem 1,1 MB, quase tudo script e estilo. Mandar isso pro
// modelo estoura o contexto e a conta. Os blocos ld+json ficam, porque é onde
// o dado costuma estar limpo — eles são lidos antes, mas quando o preço não
// está lá o resto do bloco ainda ajuda o modelo.
export function limparHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi,
      " ",
    )
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

// Abaixo disso o que sobrou não descreve um anúncio — é o caso do AliExpress,
// que passa pelos filtros de bloqueio (tem <h1>) mas entrega 1kb de conteúdo.
// Mandar isso pro modelo é pagar por uma resposta vazia.
export const MINIMO_UTIL = 2000;

export type ProdutoJsonLd = {
  nomeAnuncio: string;
  loja: string;
  precoPraticado: number;
  marca: string;
};

type NoJsonLd = {
  "@type"?: string | string[];
  "@graph"?: unknown;
  name?: string;
  brand?: { name?: string } | string;
  offers?: unknown;
};

function ehProduto(no: NoJsonLd): boolean {
  const tipo = no["@type"];
  const lista = Array.isArray(tipo) ? tipo : [tipo];
  return lista.some((t) => typeof t === "string" && /product/i.test(t));
}

type OfertaJsonLd = {
  "@type"?: string;
  price?: number | string;
  lowPrice?: number | string;
  highPrice?: number | string;
  offers?: unknown;
  seller?: { name?: string };
};

// O Ri Happy publica AggregateOffer com lowPrice = preço no Pix e highPrice =
// preço em destaque na página. A planilha registra o do destaque (conferido em
// 4 coletas: 142,99 / 99,99 / 80,99), então é highPrice — pegar o primeiro
// offers[] traria sempre o desconto de Pix.
function escolherOferta(
  offers: unknown,
): { preco: number; vendedor: string } | null {
  if (!offers) return null;

  if (Array.isArray(offers)) {
    for (const item of offers) {
      const escolhida = escolherOferta(item);
      // a Americanas manda uma segunda oferta com price "0" junto da real
      if (escolhida) return escolhida;
    }
    return null;
  }

  const oferta = offers as OfertaJsonLd;

  if (/AggregateOffer/i.test(oferta["@type"] ?? "")) {
    const destaque = Number(
      oferta.highPrice ?? oferta.lowPrice ?? NaN,
    );
    if (Number.isFinite(destaque) && destaque > 0) {
      return {
        preco: destaque,
        vendedor:
          escolherOferta(oferta.offers)?.vendedor ?? "",
      };
    }
    return escolherOferta(oferta.offers);
  }

  const preco = Number(oferta.price ?? NaN);
  if (!Number.isFinite(preco) || preco <= 0) return null;

  return { preco, vendedor: oferta.seller?.name ?? "" };
}

function achatar(valor: unknown): NoJsonLd[] {
  if (Array.isArray(valor)) return valor.flatMap(achatar);
  if (valor && typeof valor === "object") {
    const no = valor as NoJsonLd;
    return [no, ...achatar(no["@graph"])];
  }
  return [];
}

// Ri Happy e Americanas já publicam preço e vendedor em ld+json — testado
// contra a planilha, bate exato. Ler daqui é de graça e não erra; o modelo só
// entra quando isso falha.
export function lerProdutoJsonLd(
  html: string,
): ProdutoJsonLd | null {
  const blocos = [
    ...html.matchAll(
      /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];

  for (const [, conteudo] of blocos) {
    let json: unknown;
    try {
      json = JSON.parse(conteudo.trim());
    } catch {
      continue; // bloco malformado não invalida os outros
    }

    for (const no of achatar(json)) {
      if (!ehProduto(no)) continue;

      const oferta = escolherOferta(no.offers);
      if (!oferta) continue;

      const preco = oferta.preco;

      const marca =
        typeof no.brand === "string"
          ? no.brand
          : (no.brand?.name ?? "");

      // A Americanas publica seller.name como "1" — é id interno, não nome de
      // loja. Vazio aqui faz quem chama cair no nome do marketplace, que é o
      // que a planilha usa quando a loja é a dona do site. Quando o vendedor é
      // real ("magazineluiza"), o nome passa.
      const vendedor = oferta.vendedor.trim();
      const nomeDeLoja = /[a-zA-ZÀ-ÿ]/.test(vendedor)
        ? vendedor
        : "";

      return {
        nomeAnuncio: no.name ?? "",
        loja: nomeDeLoja,
        precoPraticado: preco,
        marca,
      };
    }
  }

  return null;
}
