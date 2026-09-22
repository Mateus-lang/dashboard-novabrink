import type {
  CampoRascunho,
  Origem,
  RascunhoColeta,
} from "@/lib/coleta-tipos";

export type ColetaGravada = {
  linha: number;
  sku: string;
  loja: string;
  nomeAnuncio: string;
  precoPraticado: string;
  url: string;
};

// O estado inteiro vai e volta na mesma ação: assim a lista de gravações da
// sessão viaja dentro do próprio estado do formulário, sem efeito colateral no
// cliente pra sincronizar. Fica fora do módulo "use server", que só pode
// exportar funções assíncronas.
export type EstadoColeta = {
  etapa: "entrada" | "revisao";
  // o que foi digitado na etapa 1, devolvido pra não sumir quando a etapa
  // recarrega (o React reseta campos não controlados depois de uma action)
  entrada: { url: string; sku: string; versao: string };
  rascunho: RascunhoColeta | null;
  pendentes: CampoRascunho[];
  avisos: string[];
  // de onde veio cada valor preenchido, pra revisão saber no que prestar atenção
  origens: Partial<Record<CampoRascunho, Origem>>;
  // a loja bloqueou a leitura pelo servidor: a revisão oferece colar a página
  pedirColagem: boolean;
  erro: string | null;
  gravadas: ColetaGravada[];
};

export const ESTADO_INICIAL: EstadoColeta = {
  etapa: "entrada",
  entrada: { url: "", sku: "", versao: "" },
  rascunho: null,
  pendentes: [],
  avisos: [],
  origens: {},
  pedirColagem: false,
  erro: null,
  gravadas: [],
};
