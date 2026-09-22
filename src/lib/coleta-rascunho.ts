import {
  chaveOferta,
  normalizarNome,
} from "./anuncio-utils";
import { parseDataBR } from "./date-utils";
import { parsePrecoBR } from "./format-utils";
import {
  CAMPOS_OBRIGATORIOS,
  type CampoRascunho,
  type Origem,
  type RascunhoColeta,
} from "./coleta-tipos";
import { extrairAnuncio } from "./extracao-ia";
import { detectarMarketplace } from "./marketplace-utils";
import { buscarAnuncioML } from "./mercadolivre";
import {
  buscarPagina,
  lerProdutoJsonLd,
  limparHtml,
  MINIMO_UTIL,
} from "./pagina-utils";
import {
  getColeta,
  getGestores,
  type ColetaItem,
} from "./sheets";

export type ResultadoRascunho = {
  rascunho: RascunhoColeta;
  // campos que a busca automática não conseguiu preencher e precisam de digitação
  pendentes: CampoRascunho[];
  avisos: string[];
  origens: Partial<Record<CampoRascunho, Origem>>;
  // a loja bloqueou a leitura pelo servidor: só o operador, no navegador dele,
  // consegue a página — daí o campo de colagem
  pedirColagem: boolean;
};

// O servidor pode rodar em UTC (Vercel), e depois das 21h isso já é o dia
// seguinte. A coleta é uma operação brasileira: a data tem que ser a de São Paulo.
export function dataDeHojeBR(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

// Termo de busca e marca precisam bater com o que já está na planilha: a
// ARRAYFORMULA do rank faz COUNTIFS sobre o termo, então um termo novo isola a
// linha num grupo só dela e o rank sai sempre 1.
function historicoDoSku(
  itens: ColetaItem[],
  sku: string,
  versao: string,
): ColetaItem | null {
  const doSku = itens.filter(
    (item) =>
      item.sku.trim() === sku.trim() &&
      item.versao.trim() === versao.trim(),
  );

  if (doSku.length === 0) return null;

  // a linha mais recente é a que reflete a grafia em uso hoje
  return doSku.sort((a, b) => {
    const dataA = parseDataBR(a.dataBusca)?.getTime() ?? 0;
    const dataB = parseDataBR(b.dataBusca)?.getTime() ?? 0;
    return dataB - dataA;
  })[0];
}

// A API devolve o apelido do vendedor em caixa alta ("GLRTECNOLOGY"), enquanto
// a planilha guarda a grafia de exibição ("GLRTecnology"). A fórmula do
// K-Account compara em UPPER, então as duas funcionam — mas repetir a grafia já
// usada evita a coluna virar um mosaico de maiúsculas.
function grafiaConhecidaDaLoja(
  itens: ColetaItem[],
  loja: string,
): string {
  if (!loja) return "";

  const alvo = normalizarNome(loja);
  for (let i = itens.length - 1; i >= 0; i--) {
    if (normalizarNome(itens[i].loja) === alvo) {
      return itens[i].loja;
    }
  }

  return loja;
}

// O título que o vendedor deu ao anúncio a API não entrega mais (403 em
// /items de terceiro). Se esta mesma oferta já foi coletada antes, o nome que
// está na planilha é mais fiel que o nome do produto no catálogo.
function nomeJaColetado(
  itens: ColetaItem[],
  oferta: RascunhoColeta,
): string | null {
  const chave = chaveOferta(oferta);

  for (let i = itens.length - 1; i >= 0; i--) {
    if (
      itens[i].nomeAnuncio &&
      chaveOferta(itens[i]) === chave
    ) {
      return itens[i].nomeAnuncio;
    }
  }

  return null;
}

// Forma comum das três fontes (API do ML, ld+json e IA), pra o rascunho ser
// preenchido pelo mesmo caminho venha de onde vier.
export type DadosDoAnuncio = {
  nomeAnuncio: string;
  loja: string;
  precoPraticado: number;
  marca: string;
};

// Aplica um anúncio encontrado — por qualquer das fontes — sobre o rascunho,
// registrando de onde veio cada valor.
function aplicarAnuncio({
  rascunho,
  itens,
  origens,
  nomeMarketplace,
  dados,
  origem,
}: {
  rascunho: RascunhoColeta;
  itens: ColetaItem[];
  origens: Partial<Record<CampoRascunho, Origem>>;
  nomeMarketplace: string;
  dados: DadosDoAnuncio;
  origem: Origem;
}): void {
  // lojas 1P (Ri Happy, Americanas, Le Biscuit) não nomeiam vendedor: quem
  // vende é o próprio site, e é assim que a planilha registra
  const loja = dados.loja || nomeMarketplace;

  if (loja) {
    rascunho.loja = grafiaConhecidaDaLoja(itens, loja);
    origens.loja = origem;
  }

  if (dados.precoPraticado > 0) {
    rascunho.precoPraticado = String(
      dados.precoPraticado,
    ).replace(".", ",");
    origens.precoPraticado = origem;
  }

  // depende da loja já estar preenchida: a chave da oferta é loja + página
  const nome =
    nomeJaColetado(itens, rascunho) ?? dados.nomeAnuncio;
  if (nome) {
    rascunho.nomeAnuncio = nome;
    origens.nomeAnuncio =
      nome === dados.nomeAnuncio ? origem : "historico";
  }

  // marca do anúncio só entra se o histórico não tiver dado uma
  if (!rascunho.marca && dados.marca) {
    rascunho.marca = dados.marca;
    origens.marca = origem;
  }
}

// Conferências que dependem do rascunho já montado, independentes da fonte.
async function revisarRascunho(
  rascunho: RascunhoColeta,
  itens: ColetaItem[],
  anterior: ColetaItem | null,
  avisos: string[],
): Promise<void> {
  if (!rascunho.loja) return;

  // mesma oferta, mesmo dia: quase sempre é a coleta sendo lançada duas vezes
  const chaveNova = chaveOferta(rascunho);
  const jaColetadoHoje = itens.some(
    (item) =>
      item.dataBusca === rascunho.dataBusca &&
      chaveOferta(item) === chaveNova,
  );

  if (jaColetadoHoje) {
    avisos.push(
      "esta oferta já foi coletada hoje — gravar de novo cria uma linha duplicada",
    );
  }

  // Preço fora de qualquer faixa plausível é o sintoma de leitura errada: o
  // parcelado lido como à vista, o preço de outro produto da página, ou texto
  // plantado na página pra enganar a extração.
  const novo = parsePrecoBR(rascunho.precoPraticado);
  const velho = parsePrecoBR(anterior?.precoPraticado ?? "");
  if (
    velho > 0 &&
    novo > 0 &&
    (novo > velho * 1.6 || novo < velho * 0.4)
  ) {
    avisos.push(
      `preço destoa da última coleta deste SKU (${anterior?.precoPraticado} → R$ ${rascunho.precoPraticado}): confirme na página antes de gravar`,
    );
  }

  // O K-Account é um VLOOKUP na aba Gestores. Loja nova grava com gestor vazio
  // sem reclamar nenhuma — melhor avisar antes.
  try {
    const gestores = await getGestores();
    const alvo = normalizarNome(rascunho.loja);
    const temGestor = gestores.some(
      (g) => normalizarNome(g.loja) === alvo,
    );

    if (!temGestor) {
      avisos.push(
        `"${rascunho.loja}" não está na aba Gestores: o K-Account vai ficar vazio até cadastrarem a loja`,
      );
    }
  } catch {
    // aviso é acessório: falha ao ler Gestores não pode travar a coleta
  }
}

export type EntradaColeta = {
  url: string;
  sku: string;
  versao: string;
};

export async function montarRascunho({
  url,
  sku,
  versao,
}: EntradaColeta): Promise<ResultadoRascunho> {
  const avisos: string[] = [];
  const marketplace = detectarMarketplace(url);

  const rascunho: RascunhoColeta = {
    marketplace: marketplace?.nome ?? "",
    sku: sku.trim(),
    versao: versao.trim(),
    termoBusca: "",
    marca: "",
    loja: "",
    nomeAnuncio: "",
    precoPraticado: "",
    dataBusca: dataDeHojeBR(),
    url: url.trim(),
    observacoes: "",
  };

  if (!marketplace) {
    avisos.push(
      "não reconheci o marketplace pelo endereço: confira o campo abaixo",
    );
  }

  const itens = await getColeta();
  const anterior = historicoDoSku(
    itens,
    rascunho.sku,
    rascunho.versao,
  );

  if (anterior) {
    rascunho.termoBusca = anterior.termoBusca;
    rascunho.marca = anterior.marca;
  } else {
    avisos.push(
      `SKU ${rascunho.sku} (${rascunho.versao}) ainda não aparece na planilha: preencha termo de busca e marca — o termo é o que agrupa o ranking de menor preço`,
    );
  }

  const origens: Partial<Record<CampoRascunho, Origem>> = {};

  if (anterior) {
    origens.termoBusca = "historico";
    origens.marca = "historico";
  }

  const aplicar = (dados: DadosDoAnuncio, origem: Origem) =>
    aplicarAnuncio({
      rascunho,
      itens,
      origens,
      nomeMarketplace: marketplace?.nome ?? "",
      dados,
      origem,
    });

  let pedirColagem = false;

  if (marketplace?.slug === "mercado-livre") {
    // a API oficial é exata e gratuita: não faz sentido pagar modelo pra isso
    const resultado = await buscarAnuncioML(url);

    if (resultado.ok) {
      aplicar(resultado.anuncio, "api");
    } else {
      avisos.push(`Mercado Livre: ${resultado.motivo}`);
      pedirColagem = true;
    }
  } else if (marketplace) {
    const pagina = await buscarPagina(url);

    if (!pagina.ok) {
      avisos.push(`${marketplace.nome}: ${pagina.motivo}`);
      pedirColagem = true;
    } else {
      // ld+json primeiro: é o dado que a própria loja publica em formato
      // estruturado, exato e sem custo nenhum
      const doJsonLd = lerProdutoJsonLd(pagina.html);

      if (doJsonLd) {
        aplicar(doJsonLd, "json-ld");
      } else {
        const texto = limparHtml(pagina.html);

        if (texto.length < MINIMO_UTIL) {
          avisos.push(
            `${marketplace.nome}: a página chegou quase vazia ao servidor`,
          );
          pedirColagem = true;
        } else {
          const extraido = await extrairAnuncio({
            conteudo: texto,
            marketplace: marketplace.nome,
            url,
          });

          if (extraido.ok) {
            aplicar(extraido.anuncio, "ia");
            if (extraido.anuncio.confianca === "baixa") {
              avisos.push(
                "a IA marcou a leitura como incerta: confira os campos com atenção",
              );
            }
          } else {
            avisos.push(`${marketplace.nome}: ${extraido.motivo}`);
            pedirColagem = true;
          }
        }
      }
    }
  } else {
    pedirColagem = true;
  }

  await revisarRascunho(rascunho, itens, anterior, avisos);

  const pendentes = CAMPOS_OBRIGATORIOS.filter(
    (campo) => rascunho[campo] === "",
  );

  return {
    rascunho,
    pendentes,
    avisos,
    origens,
    pedirColagem,
  };
}

// Cmd+A numa página do Shopee copia entre 10 e 40 mil caracteres. Muito além
// disso não é uma página de anúncio — é o operador tendo colado outra coisa.
const MAXIMO_COLADO = 300_000;

// Caminho para as lojas que bloqueiam o servidor (metade das coletas): quem
// baixa a página é o navegador logado do operador, e o modelo lê o que ele
// colou. Nenhum anti-bot alcança isso, porque não há robô nenhum na frente.
export async function extrairDeTextoColado(
  rascunho: RascunhoColeta,
  texto: string,
): Promise<ResultadoRascunho> {
  const avisos: string[] = [];
  const origens: Partial<Record<CampoRascunho, Origem>> = {};
  const conteudo = texto.trim();

  const pendentesDe = (r: RascunhoColeta) =>
    CAMPOS_OBRIGATORIOS.filter((campo) => r[campo] === "");

  if (conteudo.length < 200) {
    return {
      rascunho,
      pendentes: pendentesDe(rascunho),
      avisos: ["o texto colado é curto demais para ter os dados do anúncio"],
      origens,
      pedirColagem: true,
    };
  }

  if (conteudo.length > MAXIMO_COLADO) {
    return {
      rascunho,
      pendentes: pendentesDe(rascunho),
      avisos: [
        "o texto colado é grande demais: cole só a página do anúncio",
      ],
      origens,
      pedirColagem: true,
    };
  }

  const extraido = await extrairAnuncio({
    conteudo,
    marketplace: rascunho.marketplace,
    url: rascunho.url,
  });

  if (!extraido.ok) {
    return {
      rascunho,
      pendentes: pendentesDe(rascunho),
      avisos: [extraido.motivo],
      origens,
      pedirColagem: true,
    };
  }

  const itens = await getColeta();
  aplicarAnuncio({
    rascunho,
    itens,
    origens,
    nomeMarketplace: rascunho.marketplace,
    dados: extraido.anuncio,
    origem: "ia",
  });

  if (extraido.anuncio.confianca === "baixa") {
    avisos.push(
      "a IA marcou a leitura como incerta: confira os campos com atenção",
    );
  }

  const anterior = historicoDoSku(
    itens,
    rascunho.sku,
    rascunho.versao,
  );
  await revisarRascunho(rascunho, itens, anterior, avisos);

  return {
    rascunho,
    pendentes: pendentesDe(rascunho),
    avisos,
    origens,
    pedirColagem: false,
  };
}
