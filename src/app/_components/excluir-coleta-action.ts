"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

import { excluirLinhaColeta, type LinhaEsperada } from "@/lib/sheets";

export type ResultadoExclusao =
  | { ok: true }
  | { ok: false; erro: string };

// compara os hashes, que têm sempre o mesmo tamanho: timingSafeEqual exige
// buffers iguais e assim o tamanho da senha também não vaza
function senhaConfere(recebida: string, esperada: string): boolean {
  const hash = (texto: string) =>
    createHash("sha256").update(texto).digest();
  return timingSafeEqual(hash(recebida), hash(esperada));
}

export async function excluirColeta(
  dados: LinhaEsperada & { linha: number; senha: string },
): Promise<ResultadoExclusao> {
  const senhaDaTabela = process.env.PASSWORD_TABLE;

  if (!senhaDaTabela) {
    return {
      ok: false,
      erro: "exclusão desabilitada: PASSWORD_TABLE não configurada",
    };
  }

  if (!senhaConfere(dados.senha, senhaDaTabela)) {
    return { ok: false, erro: "senha incorreta" };
  }

  try {
    await excluirLinhaColeta(dados.linha, {
      sku: dados.sku,
      url: dados.url,
      dataBusca: dados.dataBusca,
    });
  } catch (erro) {
    console.error("Erro ao excluir coleta:", erro);
    return {
      ok: false,
      erro:
        erro instanceof Error
          ? `falha ao excluir: ${erro.message}`
          : "falha ao excluir da planilha",
    };
  }

  // o dashboard e os detalhes leem a planilha a cada request
  revalidatePath("/");
  revalidatePath("/details");

  return { ok: true };
}
