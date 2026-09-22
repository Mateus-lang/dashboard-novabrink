// Tipos e rótulos da coleta, isolados num módulo sem dependência de servidor:
// o formulário é client component, e importar qualquer coisa que arraste o
// googleapis junto quebra o build do bundle do navegador.

// Só os campos que o app grava. Faltam Preço Sugerido e Min. Aceitável, que são
// fórmulas por linha, e K-Account / Rank / Desconto, que são ARRAYFORMULA — a
// planilha preenche os dois grupos sozinha.
export type RascunhoColeta = {
  marketplace: string;
  sku: string;
  versao: string;
  termoBusca: string;
  marca: string;
  loja: string;
  nomeAnuncio: string;
  precoPraticado: string;
  dataBusca: string;
  url: string;
  observacoes: string;
};

export type CampoRascunho = keyof RascunhoColeta;

export const VERSOES = [
  "E-COM",
  "PDV",
  "Única",
] as const;

export const ROTULOS: Record<CampoRascunho, string> = {
  marketplace: "Marketplace",
  sku: "SKU",
  versao: "Versão",
  termoBusca: "Termo de busca",
  marca: "Marca",
  loja: "Loja / Vendedor",
  nomeAnuncio: "Nome do anúncio",
  precoPraticado: "Preço praticado",
  dataBusca: "Data da busca",
  url: "URL do anúncio",
  observacoes: "Observações",
};

// observações é o único campo que a planilha aceita vazio (nenhuma das 771
// linhas existentes tem valor nele)
export const CAMPOS_OBRIGATORIOS = (
  Object.keys(ROTULOS) as CampoRascunho[]
).filter((campo) => campo !== "observacoes");

// De onde veio cada valor preenchido. É o que dá sentido à revisão: conferir
// com atenção o que a IA deduziu e passar batido no que a API garantiu.
export type Origem =
  | "api"
  | "json-ld"
  | "ia"
  | "historico";

export const ROTULOS_ORIGEM: Record<Origem, string> = {
  api: "API do Mercado Livre",
  "json-ld": "dados da página",
  ia: "IA",
  historico: "coleta anterior",
};
