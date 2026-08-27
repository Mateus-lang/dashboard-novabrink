import { ThemeToggle } from "./_components/theme-toggle";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <h1 className="mt-8 text-3xl font-bold">
        Monitoramento de Preços
      </h1>
      <p className="mt-2 text-muted-foreground">
        Teste de tema — clique no botão acima e alterne
        entre claro e escuro.
      </p>
    </main>
  );
}
