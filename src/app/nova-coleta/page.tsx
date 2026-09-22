import { NovaColetaForm } from "@/app/_components/nova-coleta-form";
import Header from "@/app/_components/header";

export const dynamic = "force-dynamic";

export default function NovaColeta() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <Header
          title="Nova coleta"
          subtitle="Inteligência de preço · E-Commerce"
          links={[{ label: "<- Voltar", href: "/" }]}
        />

        {/* Formulário */}
        <NovaColetaForm />
      </div>
    </div>
  );
}
