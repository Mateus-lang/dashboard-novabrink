import { NextResponse } from "next/server";
import { getColeta } from "@/lib/sheets";

export async function GET() {
  try {
    const data = await getColeta();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Erro ao buscar planilha:", error);
    return NextResponse.json(
      { error: "Falha ao buscar dados da planilha" },
      { status: 500 },
    );
  }
}
