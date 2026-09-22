import { google } from "googleapis";

export type ColetaItem = {
  marketplace: string;
  sku: string;
  versao: string;
  termoBusca: string;
  marca: string;
  loja: string;
  nomeAnuncio: string;
  precoSugerido: string;
  minAceitavel: string;
  precoPraticado: string;
  dataBusca: string;
  url: string;
  observacoes: string;
  kAccount: string;
  rankMenorPreco: string;
  descontoVsMaior: string;
  menorPrecoSku: string;
};

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n",
    ),
  },
  scopes: [
    // leitura e escrita: o formulário de nova coleta grava na Raw_Coleta
    "https://www.googleapis.com/auth/spreadsheets",
  ],
});

const sheets = google.sheets({ version: "v4", auth });

export async function getColeta() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Raw_Coleta",
  });

  const rows = response.data.values;

  if (!rows || rows.length === 0) {
    return [];
  }

  const dataRows = rows.slice(1);

  const items: ColetaItem[] = dataRows
    .map((row) => ({
      marketplace: row[0] ?? "",
      sku: row[1] ?? "",
      versao: row[2] ?? "",
      termoBusca: row[3] ?? "",
      marca: row[4] ?? "",
      loja: row[5] ?? "",
      nomeAnuncio: row[6] ?? "",
      precoSugerido: row[7] ?? "",
      minAceitavel: row[8] ?? "",
      precoPraticado: row[9] ?? "",
      dataBusca: row[10] ?? "",
      url: row[11] ?? "",
      observacoes: row[12] ?? "",
      kAccount: row[13] ?? "",
      rankMenorPreco: row[14] ?? "",
      descontoVsMaior: row[15] ?? "",
      // índice 16 é a coluna vazia — ignorada
      menorPrecoSku: row[17] ?? "",
    }))
    .filter(
      (item) => item.marketplace !== "" && item.sku !== "",
    );

  return items;
}

// O que o app escreve numa linha nova. Faltam de propósito Preço Sugerido (H) e
// Min. Aceitável (I), que são fórmulas copiadas da linha 2, e K-Account (N),
// Rank (O) e Desconto (P), que são ARRAYFORMULA ancoradas na linha 2 com
// intervalo aberto — escrever nessas colunas as substitui por valor fixo e
// quebra a coluna inteira com #REF!.
export type LinhaColeta = {
  marketplace: string;
  sku: string;
  versao: string;
  termoBusca: string;
  marca: string;
  loja: string;
  nomeAnuncio: string;
  precoPraticado: number;
  dataBusca: string;
  url: string;
  observacoes: string;
};

const ABA = "Raw_Coleta";

let idDaAbaEmCache: number | null = null;

async function obterIdDaAba(): Promise<number> {
  if (idDaAbaEmCache !== null) return idDaAbaEmCache;

  const planilha = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    fields: "sheets.properties(sheetId,title)",
  });

  const aba = planilha.data.sheets?.find(
    (s) => s.properties?.title === ABA,
  );

  if (aba?.properties?.sheetId == null) {
    throw new Error(`Aba ${ABA} não encontrada na planilha`);
  }

  idDaAbaEmCache = aba.properties.sheetId;
  return idDaAbaEmCache;
}

export async function appendColeta(
  linha: LinhaColeta,
): Promise<number> {
  // values.append não serve aqui: a coluna R (Menor Preço SKU) está preenchida
  // muito além dos dados, e o append enxergaria a tabela indo até lá embaixo.
  // A coluna A é a que delimita as linhas de verdade.
  const coluna = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${ABA}!A:A`,
  });

  const numeroDaLinha =
    (coluna.data.values?.length ?? 1) + 1;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      // USER_ENTERED faz o Sheets interpretar "17/09/2026" como data no locale
      // pt_BR da planilha, em vez de guardar o texto cru
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `${ABA}!A${numeroDaLinha}:G${numeroDaLinha}`,
          values: [
            [
              linha.marketplace,
              linha.sku,
              linha.versao,
              linha.termoBusca,
              linha.marca,
              linha.loja,
              linha.nomeAnuncio,
            ],
          ],
        },
        {
          range: `${ABA}!J${numeroDaLinha}:M${numeroDaLinha}`,
          values: [
            [
              // a coluna guarda número; o "R$" é formatação da célula
              linha.precoPraticado,
              linha.dataBusca,
              linha.url,
              linha.observacoes,
            ],
          ],
        },
      ],
    },
  });

  // H e I são fórmulas por linha. Copiar de H2:I2 com PASTE_FORMULA ajusta as
  // referências relativas sozinho e evita ter que montar a fórmula em texto —
  // que dependeria de como a API interpreta separador e decimal no locale pt_BR.
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [
        {
          copyPaste: {
            source: {
              sheetId: await obterIdDaAba(),
              startRowIndex: 1,
              endRowIndex: 2,
              startColumnIndex: 7,
              endColumnIndex: 9,
            },
            destination: {
              sheetId: await obterIdDaAba(),
              startRowIndex: numeroDaLinha - 1,
              endRowIndex: numeroDaLinha,
              startColumnIndex: 7,
              endColumnIndex: 9,
            },
            pasteType: "PASTE_FORMULA",
          },
        },
      ],
    },
  });

  return numeroDaLinha;
}
