"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RefreshButton() {
  const router = useRouter();
  // router.refresh() não devolve Promise; a transition é o que nos diz
  // quando o servidor terminou de responder
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="lg"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw
        className={cn("h-4 w-4", isPending && "animate-spin")}
      />
      {isPending ? "Atualizando…" : "Atualizar"}
    </Button>
  );
}
