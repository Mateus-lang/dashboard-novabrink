import { cn } from "@/lib/utils";
import { calcularSaudePreco, StatusPreco } from "@/lib/format-utils";

interface PriceHealthBarProps {
  precoPraticado: number;
  minimoAceitavel: number;
  precoSugerido: number;
}

export function PriceHealthBar({
  precoPraticado,
  minimoAceitavel,
  precoSugerido,
}: PriceHealthBarProps) {
  const saude = calcularSaudePreco(
    precoPraticado,
    minimoAceitavel,
    precoSugerido,
  );

  if (!saude) return null;

  const cores: Record<StatusPreco, string> = {
    abaixo: "bg-red-500",
    atencao: "bg-amber-500",
    saudavel: "bg-emerald-500",
  };

  return (
    <div
      className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"
      title={`${saude.larguraPct.toFixed(0)}% · ${saude.status}`}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all",
          cores[saude.status],
        )}
        style={{ width: `${saude.larguraPct}%` }}
      />
    </div>
  );
}
