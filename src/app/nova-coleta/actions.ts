"use server";

import { revalidatePath } from "next/cache";

import {
  extrairDeTextoColado,
  montarRascunho,
} from "@/lib/coleta-rascunho";
import {
  CAMPOS_OBRIGATORIOS,
  ROTULOS,
  type RascunhoColeta,
} from "@/lib/coleta-tipos";
import {
  ESTADO_INICIAL,
  type EstadoColeta,
} from "./estado";
import { parseDataBR } from "@/lib/date-utils";
import { parsePrecoEntrada } from "@/lib/format-utils";
import { appendColeta } from "@/lib/sheets";

function campoTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function lerRascunho(
  formData: FormData,
): RascunhoColeta {
  return {
    marketplace: campoTexto(formData, "marketplace"),
    sku: campoTexto(formData, "sku"),
    versao: campoTexto(formData, "versao"),
    termoBusca: campoTexto(formData, "termoBusca"),
    marca: campoTexto(formData, "marca"),
    loja: campoTexto(formData, "loja"),
    nomeAnuncio: campoTexto(formData, "nomeAnuncio"),
    precoPraticado: campoTexto(formData, "precoPraticado"),
    dataBusca: campoTexto(formData, "dataBusca"),
    url: campoTexto(formData, "url"),
    observacoes: campoTexto(formData, "observacoes"),
  };
}

export async function processarColeta(
  anterior: EstadoColeta,
  formData: FormData,
): Promise<EstadoColeta> {
  const acao = campoTexto(formData, "acao");

  if (acao === "cancelar") {
    return {
      ...ESTADO_INICIAL,
      entrada: anterior.entrada,
      gravadas: anterior.gravadas,
    };
  }

  if (acao === "preencher") {
    const url = campoTexto(formData, "url");
    const sku = campoTexto(formData, "sku");
    const versao = campoTexto(formData, "versao");

    if (!url || !sku || !versao) {
      return {
        ...anterior,
        etapa: "entrada",
        entrada: { url, sku, versao },
        erro: "informe URL, SKU e versão",
      };
    }

    try {
      const { rascunho, pendentes, avisos, origens, pedirColagem } =
        await montarRascunho({ url, sku, versao });

      return {
        ...anterior,
        etapa: "revisao",
        entrada: { url, sku, versao },
        rascunho,
        pendentes,
        avisos,
        origens,
        pedirColagem,
        erro: null,
      };
    } catch (erro) {
      console.error("Erro ao montar rascunho:", erro);
      return {
        ...anterior,
        etapa: "entrada",
        entrada: { url, sku, versao },
        erro: "falha ao consultar a planilha ou o marketplace",
      };
    }
  }

  if (acao === "extrair-colagem") {
    const rascunho = lerRascunho(formData);
    const texto = campoTexto(formData, "paginaColada");

    try {
      const resultado = await extrairDeTextoColado(
        rascunho,
        texto,
      );

      return {
        ...anterior,
        etapa: "revisao",
        rascunho: resultado.rascunho,
        pendentes: resultado.pendentes,
        avisos: resultado.avisos,
        // a colagem só sabe das origens que ela mesma preencheu; o que veio do
        // histórico na busca anterior continua valendo
        origens: { ...anterior.origens, ...resultado.origens },
        pedirColagem: resultado.pedirColagem,
        erro: null,
      };
    } catch (erro) {
      console.error("Erro ao extrair do texto colado:", erro);
      return {
        ...anterior,
        etapa: "revisao",
        rascunho,
        erro: "falha ao ler o texto colado",
      };
    }
  }

  if (acao === "gravar") {
    const rascunho = lerRascunho(formData);

    const faltando = CAMPOS_OBRIGATORIOS.filter(
      (campo) => rascunho[campo] === "",
    );

    if (faltando.length > 0) {
      return {
        ...anterior,
        etapa: "revisao",
        rascunho,
        erro: `preencha: ${faltando
          .map((campo) => ROTULOS[campo].toLocaleLowerCase("pt-BR"))
          .join(", ")}`,
      };
    }

    const preco = parsePrecoEntrada(
      rascunho.precoPraticado,
    );
    if (preco === null) {
      return {
        ...anterior,
        etapa: "revisao",
        rascunho,
        erro: "preço praticado inválido (use 104,50)",
      };
    }

    if (!parseDataBR(rascunho.dataBusca)) {
      return {
        ...anterior,
        etapa: "revisao",
        rascunho,
        erro: "data da busca inválida (use 17/09/2026)",
      };
    }

    try {
      const linha = await appendColeta({
        ...rascunho,
        precoPraticado: preco,
      });

      // o dashboard e os detalhes leem a planilha a cada request
      revalidatePath("/");
      revalidatePath("/details");

      return {
        ...ESTADO_INICIAL,
        gravadas: [
          {
            linha,
            sku: rascunho.sku,
            loja: rascunho.loja,
            nomeAnuncio: rascunho.nomeAnuncio,
            precoPraticado: rascunho.precoPraticado,
            url: rascunho.url,
          },
          ...anterior.gravadas,
        ],
      };
    } catch (erro) {
      console.error("Erro ao gravar coleta:", erro);
      return {
        ...anterior,
        etapa: "revisao",
        rascunho,
        erro:
          erro instanceof Error
            ? `falha ao gravar na planilha: ${erro.message}`
            : "falha ao gravar na planilha",
      };
    }
  }

  return anterior;
}
