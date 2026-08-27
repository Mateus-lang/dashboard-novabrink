"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColetaItem } from "@/lib/sheets";

type ColetaTableProps = {
  itens: ColetaItem[];
};

export function ColetaTable({ itens }: ColetaTableProps) {
  if (itens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhum resultado para o período selecionado.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Marketplace</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Loja / Vendedor</TableHead>
            <TableHead className="text-right">
              Preço
            </TableHead>
            <TableHead className="text-right">
              Rank
            </TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.marketplace}</TableCell>
              <TableCell>{item.sku}</TableCell>
              <TableCell className="max-w-xs truncate">
                {item.nomeAnuncio}
              </TableCell>
              <TableCell>{item.loja}</TableCell>
              <TableCell className="text-right">
                {item.precoPraticado}
              </TableCell>
              <TableCell className="text-right">
                {item.rankMenorPreco}
              </TableCell>
              <TableCell>{item.dataBusca}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
