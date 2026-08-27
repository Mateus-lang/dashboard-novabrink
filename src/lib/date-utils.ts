export function parseDataBR(dataBR: string): Date | null {
  if (!dataBR) return null;

  const partes = dataBR.split("/");
  if (partes.length !== 3) return null;

  const [dia, mes, ano] = partes.map(Number);

  // mês em JS é 0-indexado: janeiro = 0, agosto = 7
  const data = new Date(ano, mes - 1, dia);

  // valida se a data faz sentido (ex: 32/13/2026 seria inválida)
  if (isNaN(data.getTime())) return null;

  return data;
}

export function estaNoPeriodo(
  dataBR: string,
  inicio: Date | undefined,
  fim: Date | undefined,
): boolean {
  const data = parseDataBR(dataBR);
  if (!data) return false;

  // se não há filtro definido, tudo passa
  if (!inicio && !fim) return true;

  // normaliza para ignorar horas (comparar só o dia)
  const d = data.getTime();

  if (inicio && d < zerarHora(inicio).getTime())
    return false;
  if (fim && d > fimDoDia(fim).getTime()) return false;

  return true;
}

function zerarHora(data: Date): Date {
  const nova = new Date(data);
  nova.setHours(0, 0, 0, 0);
  return nova;
}

function fimDoDia(data: Date): Date {
  const nova = new Date(data);
  nova.setHours(23, 59, 59, 999);
  return nova;
}