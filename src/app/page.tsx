import { getColeta } from "@/lib/sheets";
import { Dashboard } from "./_components/dashboard";


export const dynamic = "force-dynamic";


export default async function Home() {
  const itens = await getColeta();

  return <Dashboard itensIniciais={itens} />;
}
