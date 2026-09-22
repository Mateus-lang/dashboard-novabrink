const API = "https://api.mercadolibre.com";

export type AnuncioML = {
  nomeAnuncio: string;
  loja: string;
  precoPraticado: number;
  marca: string;
};

// A busca nunca lança: quando falha, a tela de revisão precisa do motivo pra
// mostrar ao operador e abrir os campos pra digitação manual.
export type ResultadoBuscaML =
  | { ok: true; anuncio: AnuncioML }
  | { ok: false; motivo: string };

// O token de app vale ~6h e vale pra qualquer chamada: guardar em módulo evita
// um POST de OAuth a cada anúncio consultado.
let tokenEmCache: {
  valor: string;
  expiraEm: number;
} | null = null;

async function obterTokenApp(): Promise<string> {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "ML_CLIENT_ID / ML_CLIENT_SECRET não configurados no .env.local",
    );
  }

  if (tokenEmCache && tokenEmCache.expiraEm > Date.now()) {
    return tokenEmCache.valor;
  }

  const resposta = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  if (!resposta.ok) {
    throw new Error(
      `Mercado Livre recusou as credenciais do app (HTTP ${resposta.status})`,
    );
  }

  const dados = (await resposta.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenEmCache = {
    valor: dados.access_token,
    // margem de 1 min pra não usar um token que expira no meio da chamada
    expiraEm: Date.now() + (dados.expires_in - 60) * 1000,
  };

  return dados.access_token;
}

// As urls coletadas vêm carregadas de rastreio do Google Ads, e o mesmo produto
// aparece em três formatos diferentes. A ordem abaixo importa: numa página de
// catálogo (/p/MLB…) o item do vendedor está no pdp_filters, e é ele que
// interessa — o /p/ sozinho é o produto, não a oferta.
export function extrairItemId(url: string): string | null {
  let endereco: URL;
  try {
    endereco = new URL(url.trim());
  } catch {
    return null;
  }

  const pdpFilters = endereco.searchParams.get("pdp_filters");
  const noFiltro = pdpFilters?.match(/item_id[:=](ML[A-Z]\d+)/i);
  if (noFiltro) return noFiltro[1].toUpperCase();

  const itemIdDireto =
    endereco.searchParams.get("item_id");
  if (itemIdDireto && /^ML[A-Z]\d+$/i.test(itemIdDireto)) {
    return itemIdDireto.toUpperCase();
  }

  // produto.mercadolivre.com.br/MLB-1234567890-nome-do-anuncio
  const noCaminho = endereco.pathname.match(
    /\/(ML[A-Z])-?(\d+)/i,
  );
  if (noCaminho && !endereco.pathname.includes("/p/")) {
    return `${noCaminho[1]}${noCaminho[2]}`.toUpperCase();
  }

  return null;
}

// Id da página de catálogo (/p/MLB…). É por ele que a API ainda entrega dados
// de anúncio de terceiro — ver o comentário em buscarAnuncioML.
export function extrairProdutoId(
  url: string,
): string | null {
  try {
    const { pathname } = new URL(url.trim());
    const encontrado = pathname.match(
      /\/p\/(ML[A-Z]\d+)/i,
    );
    return encontrado
      ? encontrado[1].toUpperCase()
      : null;
  } catch {
    return null;
  }
}

// /up/MLBU… é o catálogo do próprio vendedor, que agrupa variações e não expõe
// o id do anúncio na url. São 7% das coletas de ML da planilha, e a API pública
// não oferece o caminho inverso — daí virarem preenchimento manual com recado
// específico, em vez de "não identifiquei essa URL".
export function extrairUserProductId(
  url: string,
): string | null {
  try {
    const { pathname } = new URL(url.trim());
    const encontrado = pathname.match(
      /\/up\/(ML[A-Z]U\d+)/i,
    );
    return encontrado
      ? encontrado[1].toUpperCase()
      : null;
  } catch {
    return null;
  }
}

async function buscarJson<T>(
  caminho: string,
  token: string,
): Promise<T | null> {
  const resposta = await fetch(`${API}${caminho}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!resposta.ok) return null;

  return (await resposta.json()) as T;
}

type ProdutoML = {
  name?: string;
  attributes?: {
    id?: string;
    value_name?: string | null;
  }[];
};

type OfertaML = {
  item_id?: string;
  seller_id?: number;
  price?: number;
};

// A API só devolve as ofertas de um produto de catálogo em páginas de 100.
async function buscarOfertas(
  produtoId: string,
  token: string,
): Promise<OfertaML[]> {
  const ofertas: OfertaML[] = [];

  for (let offset = 0; offset < 500; offset += 100) {
    const pagina = await buscarJson<{
      paging?: { total?: number };
      results?: OfertaML[];
    }>(
      `/products/${produtoId}/items?limit=100&offset=${offset}`,
      token,
    );

    if (!pagina?.results?.length) break;

    ofertas.push(...pagina.results);

    if (ofertas.length >= (pagina.paging?.total ?? 0)) {
      break;
    }
  }

  return ofertas;
}

export async function buscarAnuncioML(
  url: string,
): Promise<ResultadoBuscaML> {
  let token: string;
  try {
    token = await obterTokenApp();
  } catch (erro) {
    return {
      ok: false,
      motivo:
        erro instanceof Error
          ? erro.message
          : "falha ao autenticar no Mercado Livre",
    };
  }

  try {
    const produtoId = extrairProdutoId(url);

    // GET /items/{id} de vendedor terceiro responde 403 (access_denied) desde a
    // mudança de política do ML, e /sites/MLB/search também. O que sobrou pra
    // monitorar concorrente é a página de catálogo: /products/{id} dá nome e
    // marca, /products/{id}/items dá preço e vendedor de cada oferta.
    if (!produtoId) {
      if (extrairUserProductId(url)) {
        return {
          ok: false,
          motivo:
            "URL de catálogo do vendedor (/up/…): abra o anúncio no Mercado Livre e cole a URL da publicação (/p/…), ou preencha os campos abaixo na mão",
        };
      }
      return {
        ok: false,
        motivo:
          "a API do Mercado Livre só libera anúncio de terceiro pela página de catálogo (/p/…); esta URL não tem uma — preencha os campos abaixo na mão",
      };
    }

    const produto = await buscarJson<ProdutoML>(
      `/products/${produtoId}`,
      token,
    );

    if (!produto) {
      return {
        ok: false,
        motivo: `o Mercado Livre não devolveu o produto ${produtoId}`,
      };
    }

    const ofertas = await buscarOfertas(produtoId, token);
    const itemId = extrairItemId(url);

    // sem item_id na url não dá pra saber de qual vendedor é a coleta: o
    // catálogo tem dezenas de ofertas e escolher uma no chute erraria a loja
    const oferta = itemId
      ? ofertas.find((o) => o.item_id === itemId)
      : null;

    if (itemId && !oferta) {
      return {
        ok: false,
        motivo: `a oferta ${itemId} não está mais ativa neste catálogo — confira o preço e a loja na página`,
      };
    }

    if (!oferta) {
      return {
        ok: false,
        motivo:
          "a URL não identifica a oferta de um vendedor específico (falta o item_id): preencha loja e preço na mão",
      };
    }

    let loja = "";
    if (oferta.seller_id) {
      const vendedor = await buscarJson<{
        nickname?: string;
      }>(`/users/${oferta.seller_id}`, token);
      loja = vendedor?.nickname ?? "";
    }

    const marca =
      produto.attributes?.find((a) => a.id === "BRAND")
        ?.value_name ?? "";

    return {
      ok: true,
      anuncio: {
        // é o nome do produto no catálogo, não o título que o vendedor deu ao
        // anúncio — esse a API não entrega mais. Serve de padrão e é editável.
        nomeAnuncio: produto.name ?? "",
        loja,
        precoPraticado: oferta.price ?? 0,
        marca,
      },
    };
  } catch (erro) {
    return {
      ok: false,
      motivo:
        erro instanceof Error
          ? erro.message
          : "falha ao consultar o Mercado Livre",
    };
  }
}
