import {
  chaveOferta,
  normalizarNome,
} from "./anuncio-utils";
import { parseDataBR } from "./date-utils";
import {
  CAMPOS_OBRIGATORIOS,
  type CampoRascunho,
  type RascunhoColeta,
} from "./coleta-tipos";
import { detectarMarketplace } from "./marketplace-utils";
import { buscarAnuncioML } from "./mercadolivre";
import { getColeta, type ColetaItem } from "./sheets";

export type ResultadoRascunho = {
  rascunho: RascunhoColeta;
  // campos que a busca automática não conseguiu preencher e precisam de digitação
  pendentes: CampoRascunho[];
  avisos: string[];
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

  if (marketplace?.slug === "mercado-livre") {
    const resultado = await buscarAnuncioML(url);

    if (resultado.ok) {
      rascunho.loja = grafiaConhecidaDaLoja(
        itens,
        resultado.anuncio.loja,
      );
      rascunho.precoPraticado = String(
        resultado.anuncio.precoPraticado,
      ).replace(".", ",");
      // depende da loja já estar preenchida: a chave da oferta é loja + página
      rascunho.nomeAnuncio =
        nomeJaColetado(itens, rascunho) ??
        resultado.anuncio.nomeAnuncio;
      // marca do anúncio só entra se o histórico não tiver dado uma
      if (!rascunho.marca) {
        rascunho.marca = resultado.anuncio.marca;
      }
    } else {
      avisos.push(`Mercado Livre: ${resultado.motivo}`);
    }
  } else if (marketplace) {
    avisos.push(
      `${marketplace.nome} ainda não tem busca automática: preencha nome do anúncio, loja e preço na mão`,
    );
  }

  // mesma oferta, mesmo dia: quase sempre é a coleta sendo lançada duas vezes
  const chaveNova = chaveOferta(rascunho);
  const jaColetadoHoje = itens.some(
    (item) =>
      item.dataBusca === rascunho.dataBusca &&
      chaveOferta(item) === chaveNova,
  );

  if (jaColetadoHoje && rascunho.loja) {
    avisos.push(
      "esta oferta já foi coletada hoje — gravar de novo cria uma linha duplicada",
    );
  }

  const pendentes = CAMPOS_OBRIGATORIOS.filter(
    (campo) => rascunho[campo] === "",
  );

  return { rascunho, pendentes, avisos };
}
