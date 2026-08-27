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
    "https://www.googleapis.com/auth/spreadsheets.readonly",
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
