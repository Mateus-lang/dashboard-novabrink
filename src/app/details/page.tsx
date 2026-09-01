import { getColeta } from "@/lib/sheets";
import { DetailsView } from "@/app/_components/details-view";

export const dynamic = "force-dynamic";

export default async function DetailsPage() {
  const itens = await getColeta();

  return <DetailsView itensIniciais={itens} />;
}
