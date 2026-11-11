"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColetaItem } from "@/lib/sheets";
import { excluirColeta } from "./excluir-coleta-action";

type ExcluirLinhaButtonProps = {
  item: ColetaItem;
};

export function ExcluirLinhaButton({
  item,
}: ExcluirLinhaButtonProps) {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // a senha só vive enquanto o popover está aberto: é pedida a cada exclusão
  function mudarAberto(proximo: boolean) {
    if (isPending) return;
    setAberto(proximo);
    if (!proximo) {
      setSenha("");
      setErro(null);
    }
  }

  function excluir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!senha) {
      setErro("informe a senha");
      return;
    }

    startTransition(async () => {
      const resultado = await excluirColeta({
        linha: item.linha,
        sku: item.sku,
        url: item.url,
        dataBusca: item.dataBusca,
        senha,
      });

      if (resultado.ok) {
        setAberto(false);
        setSenha("");
        setErro(null);
      } else {
        setErro(resultado.erro);
      }
    });
  }

  return (
    <Popover open={aberto} onOpenChange={mudarAberto}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Excluir linha"
            className="text-muted-foreground hover:text-destructive"
          />
        }
      >
        <Trash2 />
      </PopoverTrigger>
      <PopoverContent align="end">
        <PopoverHeader>
          <PopoverTitle>Excluir esta linha?</PopoverTitle>
          <PopoverDescription>
            {[item.sku, item.loja, item.dataBusca]
              .filter(Boolean)
              .join(" · ")}
          </PopoverDescription>
        </PopoverHeader>
        <form onSubmit={excluir} className="flex flex-col gap-3">
          <Input
            type="password"
            placeholder="Senha"
            autoComplete="off"
            autoFocus
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={isPending}
            aria-invalid={erro !== null}
          />
          {erro && (
            <p className="text-sm text-destructive">{erro}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => mudarAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={isPending}
            >
              {isPending ? "Excluindo…" : "Excluir"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
