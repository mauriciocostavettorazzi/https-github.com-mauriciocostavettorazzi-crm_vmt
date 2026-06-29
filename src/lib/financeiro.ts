// ─────────────────────────────────────────────────────────────────────────────
// Base financeira unificada — fonte única de regras de saldo, atraso e baixa.
// Usada por ContasReceber, ContasPagar, Comissões, Dashboard e o módulo Financeiro.
// Suporta campos legados (valorRecebido / status Pago) para não quebrar dados antigos.
// ─────────────────────────────────────────────────────────────────────────────
import { calculateStatusAtrasado } from '../utils';

export type Pagamento = { data: string; valor: number };

export type TipoConta = 'receber' | 'pagar' | 'comissao';

// Status de quitação por tipo de conta
const STATUS_QUITADO: Record<TipoConta, string> = {
  receber: 'Recebido',
  pagar: 'Pago',
  comissao: 'Recebida',
};

// ── Leitura ────────────────────────────────────────────────────────────────

/** Lista de pagamentos da conta, normalizando campos legados. */
export function pagamentosDe(c: any): Pagamento[] {
  if (Array.isArray(c?.pagamentos) && c.pagamentos.length > 0) return c.pagamentos;
  // legado A Receber / Comissão: valorRecebido único
  if (c?.valorRecebido != null && c.valorRecebido > 0)
    return [{ data: c.dataRecebida || c.dataRecebimento || c.dataPagamento || '', valor: c.valorRecebido }];
  // legado quitação total (status Pago/Recebido sem histórico) —
  // usa vencimento como última data de fallback p/ não sumir do fluxo de caixa
  if ((c?.status === 'Pago' || c?.status === 'Recebido' || c?.status === 'Recebida') && c?.valor)
    return [{ data: c.dataPagamento || c.dataRecebimento || c.dataRecebida || c.vencimento || '', valor: c.valor }];
  return [];
}

/** Total efetivamente pago/recebido na conta. */
export function totalPago(c: any): number {
  return pagamentosDe(c).reduce((s, p) => s + (p.valor || 0), 0);
}

/** Saldo ainda em aberto (nunca negativo). */
export function saldoRestante(c: any): number {
  return Math.max(0, (c?.valor || 0) - totalPago(c));
}

/** A conta está totalmente quitada? */
export function quitada(c: any): boolean {
  return saldoRestante(c) <= 0.009;
}

/** Conta vencida com saldo em aberto (ignora canceladas e quitadas). */
export function isAtrasado(c: any): boolean {
  if (!c || c.status === 'Cancelado' || c.status === 'Cancelada') return false;
  if (quitada(c)) return false;
  return calculateStatusAtrasado(c.vencimento, 'Pendente') === 'Atrasado';
}

/** Número de dias em atraso (0 se em dia ou quitada). */
export function diasEmAtraso(c: any): number {
  if (!isAtrasado(c) || !c.vencimento) return 0;
  const venc = new Date(c.vencimento + 'T12:00:00').getTime();
  return Math.max(0, Math.floor((Date.now() - venc) / 86400000));
}

/** Houve algum pagamento parcial (mas ainda há saldo)? */
export function isParcial(c: any): boolean {
  return totalPago(c) > 0.009 && !quitada(c);
}

// ── Escrita ────────────────────────────────────────────────────────────────

/**
 * Registra um novo pagamento numa conta e devolve a conta atualizada.
 * Migra automaticamente campos legados para pagamentos[] e limpa resíduos.
 */
export function registrarPagamento(c: any, pagamento: Pagamento, tipo: TipoConta = 'receber'): any {
  const pagamentos = [...pagamentosDe(c), pagamento];
  const total = pagamentos.reduce((s, p) => s + p.valor, 0);
  const quitado = Math.max(0, c.valor - total) <= 0.009;
  return {
    ...c,
    pagamentos,
    // limpa campos legados após migração
    valorRecebido: undefined,
    parcelaRef: undefined,
    status: quitado ? STATUS_QUITADO[tipo] : 'Parcial',
    dataPagamento: tipo === 'pagar' && quitado ? pagamento.data : c.dataPagamento,
    dataRecebimento: tipo !== 'pagar' && quitado ? pagamento.data : undefined,
  };
}

/**
 * Substitui toda a lista de pagamentos (usado ao editar/excluir abatimentos) e
 * recalcula o status. Devolve a conta atualizada.
 */
export function definirPagamentos(c: any, pagamentos: Pagamento[], tipo: TipoConta = 'receber'): any {
  const total = pagamentos.reduce((s, p) => s + p.valor, 0);
  const quitado = pagamentos.length > 0 && Math.max(0, c.valor - total) <= 0.009;
  const status = pagamentos.length === 0 ? 'Pendente' : quitado ? STATUS_QUITADO[tipo] : 'Parcial';
  return {
    ...c,
    pagamentos,
    valorRecebido: undefined,
    parcelaRef: undefined,
    status,
    dataPagamento: tipo === 'pagar' && quitado ? pagamentos[pagamentos.length - 1].data : undefined,
    dataRecebimento: tipo !== 'pagar' && quitado ? pagamentos[pagamentos.length - 1].data : undefined,
  };
}
