import { getColeta } from "@/lib/sheets";
import { Dashboard } from "./_components/dashboard";

export default async function Home() {
  const itens = await getColeta();

  return <Dashboard itensIniciais={itens} />;
}
