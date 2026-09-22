"use client";

import { useActionState } from "react";
import { AlertTriangle, Check, ExternalLink, Search } from "lucide-react";

import { processarColeta } from "@/app/nova-coleta/actions";
import { ESTADO_INICIAL, type EstadoColeta } from "@/app/nova-coleta/estado";
import { ROTULOS, VERSOES, type CampoRascunho } from "@/lib/coleta-tipos";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// A ordem é a das colunas da planilha, pra quem confere a revisão de olho na
// Raw_Coleta não precisar procurar campo. Os rótulos vêm de ROTULOS, os mesmos
// que a ação usa nas mensagens de erro.
const CAMPOS_REVISAO: CampoRascunho[] = [
  "marketplace",
  "sku",
  "versao",
  "termoBusca",
  "marca",
  "loja",
  "nomeAnuncio",
  "precoPraticado",
  "dataBusca",
  "url",
  "observacoes",
];

const AJUDA: Partial<Record<CampoRascunho, string>> = {
  termoBusca:
    "agrupa o ranking de menor preço — use o mesmo termo das outras coletas do SKU",
  precoPraticado: "só o número, como 104,50",
};

const CAMPOS_NUMERICOS: CampoRascunho[] = [
  "sku",
  "precoPraticado",
  "dataBusca",
];

export function NovaColetaForm() {
  const [estado, acao, pendente] = useActionState(
    processarColeta,
    ESTADO_INICIAL,
  );

  return (
    <div className="space-y-6">
      <form action={acao}>
        {estado.etapa === "entrada" ? (
          <EtapaEntrada estado={estado} pendente={pendente} />
        ) : (
          <EtapaRevisao estado={estado} pendente={pendente} />
        )}
      </form>

      {estado.gravadas.length > 0 && <GravadasNaSessao estado={estado} />}
    </div>
  );
}

type EtapaProps = {
  estado: EstadoColeta;
  pendente: boolean;
};

function EtapaEntrada({ estado, pendente }: EtapaProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova coleta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">URL do anúncio</Label>
          <Input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://www.mercadolivre.com.br/..."
            defaultValue={estado.entrada.url}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="w-40 space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              name="sku"
              required
              inputMode="numeric"
              className="tabular-nums"
              defaultValue={estado.entrada.sku}
            />
          </div>

          <div className="w-40 space-y-2">
            <Label htmlFor="versao">Versão</Label>
            {/* o Select renderiza o próprio value no trigger, então o rótulo
                vai no value — mesmo padrão da tabela de coleta */}
            <Select
              name="versao"
              defaultValue={estado.entrada.versao || VERSOES[0]}
            >
              <SelectTrigger id="versao" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERSOES.map((versao) => (
                  <SelectItem key={versao} value={versao}>
                    {versao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {estado.erro && <Erro mensagem={estado.erro} />}

        <Button
          type="submit"
          name="acao"
          value="preencher"
          size="lg"
          disabled={pendente}
        >
          <Search className="h-4 w-4" />
          {pendente ? "Buscando…" : "Buscar dados"}
        </Button>
      </CardContent>
    </Card>
  );
}

function EtapaRevisao({ estado, pendente }: EtapaProps) {
  const rascunho = estado.rascunho;
  if (!rascunho) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revisar antes de gravar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {estado.avisos.map((aviso) => (
          <Aviso key={aviso} mensagem={aviso} />
        ))}

        <div className="grid gap-4 sm:grid-cols-2">
          {CAMPOS_REVISAO.map((campo) => {
            const faltando = estado.pendentes.includes(campo);
            const ajuda = AJUDA[campo];

            return (
              <div key={campo} className="space-y-2">
                <Label htmlFor={campo}>
                  {ROTULOS[campo]}
                  {faltando && (
                    <span className="text-xs font-normal text-destructive">
                      preencher
                    </span>
                  )}
                </Label>
                <Input
                  id={campo}
                  name={campo}
                  defaultValue={rascunho[campo]}
                  aria-invalid={faltando || undefined}
                  className={cn(
                    CAMPOS_NUMERICOS.includes(campo) && "tabular-nums",
                  )}
                />
                {ajuda && (
                  <p className="text-xs text-muted-foreground">{ajuda}</p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Preço sugerido, mínimo aceitável, K-Account, rank e desconto são
          calculados pela própria planilha — aparecem assim que a linha for
          gravada.
        </p>

        {estado.erro && <Erro mensagem={estado.erro} />}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            name="acao"
            value="gravar"
            size="lg"
            disabled={pendente}
          >
            <Check className="h-4 w-4" />
            {pendente ? "Gravando…" : "Gravar na planilha"}
          </Button>
          <Button
            type="submit"
            name="acao"
            value="cancelar"
            variant="ghost"
            size="lg"
            disabled={pendente}
            formNoValidate
          >
            Descartar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GravadasNaSessao({ estado }: { estado: EstadoColeta }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gravadas nesta sessão ({estado.gravadas.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {estado.gravadas.map((gravada) => (
          <div key={gravada.linha} className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground tabular-nums">
              linha {gravada.linha}
            </span>
            <span className="font-medium tabular-nums">{gravada.sku}</span>
            <span className="max-w-40 truncate text-muted-foreground">
              {gravada.loja}
            </span>
            <span className="max-w-55 truncate">{gravada.nomeAnuncio}</span>
            <span className="font-semibold tabular-nums">
              R$ {gravada.precoPraticado}
            </span>
            <a
              href={gravada.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Erro({ mensagem }: { mensagem: string }) {
  return <p className="text-sm text-destructive">{mensagem}</p>;
}

function Aviso({ mensagem }: { mensagem: string }) {
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      {mensagem}
    </p>
  );
}
