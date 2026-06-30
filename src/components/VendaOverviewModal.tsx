import React from 'react';
import { Venda } from '../types';
import { X, Plane, DollarSign, Calendar, MapPin, User, Hash, Users, Percent, CheckCircle } from 'lucide-react';
import { formatCurrency, isCheckinLiberado, getCheckinUrl, maskPhone } from '../utils';
import { saldoRestante, pagamentosDe, registrarPagamento } from '../lib/financeiro';
import { toast } from '../toast';

interface VendaOverviewModalProps {
  venda: Venda;
  data: any;
  onClose: () => void;
  updateData?: (d: any) => void;
}

export function VendaOverviewModal({ venda, data, onClose, updateData }: VendaOverviewModalProps) {
  const voos = data.voos.filter((v: any) => v.vendaId === venda.id);
  const clienteData = (data.pessoas || []).find((p: any) => p.nome === venda.cliente);
  const contasPagar = data.contasPagar.filter((c: any) => c.vendaId === venda.id);
  const contasReceber = data.contasReceber.filter((c: any) => c.vendaId === venda.id);
  const comissaoVenda = (data.comissoes || []).find((c: any) => c.vendaId === venda.id);
  const hoje = new Date().toISOString().substring(0, 10);
  const recebidoComissao = (c: any) => pagamentosDe(c).reduce((s: number, p: any) => s + (p.valor || 0), 0);

  // ── Baixas unificadas (atalho a partir do overview) ──
  const baixarReceber = (conta: any) => {
    if (!updateData) return;
    const atualizada = registrarPagamento(conta, { data: hoje, valor: saldoRestante(conta) }, 'receber');
    const vendas = atualizada.status === 'Recebido' && conta.vendaId
      ? data.vendas.map((v: any) => v.id === conta.vendaId ? { ...v, statusR: true } : v) : data.vendas;
    updateData({ contasReceber: data.contasReceber.map((c: any) => c.id === conta.id ? atualizada : c), vendas });
    toast('Recebimento do cliente registrado!');
  };
  const baixarPagar = (conta: any) => {
    if (!updateData) return;
    const atualizada = registrarPagamento(conta, { data: hoje, valor: saldoRestante(conta) }, 'pagar');
    const vendas = atualizada.status === 'Pago' && conta.vendaId
      ? data.vendas.map((v: any) => v.id === conta.vendaId ? { ...v, statusP: true } : v) : data.vendas;
    updateData({ contasPagar: data.contasPagar.map((c: any) => c.id === conta.id ? atualizada : c), vendas });
    toast('Pagamento ao fornecedor registrado!');
  };
  const receberComissao = (com: any) => {
    if (!updateData) return;
    const saldo = Math.max(0, (com.valorEsperado || 0) - recebidoComissao(com));
    const pagamentos = [...pagamentosDe(com), { data: hoje, valor: saldo }];
    updateData({ comissoes: data.comissoes.map((c: any) => c.id === com.id ? { ...c, pagamentos, valorRecebido: undefined, status: 'Recebida', dataRecebida: hoje } : c) });
    toast('Comissão recebida!');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border flex flex-col">
        <div className="p-6 border-b border-border flex justify-between items-center bg-surface-alt sticky top-0 z-10 rounded-t-2xl">
          <div>
             <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                 <Hash size={20} className="text-blue-500" />
                 Overview da Venda
             </h3>
             <p className="text-xs font-mono text-muted mt-1">Ref: {venda.numeroPedido || venda.id.substring(0,8)} | Tipo: {venda.tipo}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
            <X size={20} className="text-muted" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Section: Cliente */}
           <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col gap-3">
              <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest flex items-center gap-1"><User size={14}/> Cliente</h4>
              <div className="flex flex-col">
                  <span className="text-sm font-bold text-primary uppercase">{venda.cliente}</span>
                  {clienteData && <span className="text-xs text-muted mt-1 break-all">{clienteData.email} <br/> {clienteData.telefone ? maskPhone(clienteData.telefone) : ''}</span>}
              </div>
           </div>

           {/* Section: Financeiro Resumo */}
           <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col gap-3">
              <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest flex items-center gap-1"><DollarSign size={14}/> Resumo Financeiro</h4>
              <div className="grid grid-cols-2 gap-4 mt-2">
                 <div>
                    <p className="text-[10px] text-muted uppercase font-medium">Valor Bruto</p>
                    <p className="text-lg font-black text-primary">{formatCurrency(venda.valorBruto)}</p>
                 </div>
                 <div>
                    <p className="text-[10px] text-muted uppercase font-medium">Lucro Estimado</p>
                    <div className="flex items-baseline gap-2">
                       <p className="text-lg font-black text-green-600">{formatCurrency(venda.comissao || 0)}</p>
                       {venda.valorBruto > 0 && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">{((venda.comissao || 0) / venda.valorBruto * 100).toFixed(1)}%</span>}
                    </div>
                 </div>
              </div>
           </div>

           {/* Section: Trechos/Voos */}
           <div className="md:col-span-2">
              <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest flex items-center gap-1 mb-3"><Plane size={14}/> Trechos e Passageiros</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {voos.map((voo: any) => (
                      <div key={voo.id} className="bg-surface-alt p-4 rounded-xl border border-border">
                          <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-black uppercase tracking-widest text-white bg-blue-900/50 px-2 py-1 rounded">{voo.origem?.toUpperCase()} → {voo.destino?.toUpperCase()}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{voo.ciaAerea} | {voo.localizador || 'S/ Loc'}</span>
                          </div>
                          <div className="text-xs font-medium text-muted mt-2 space-y-1">
                             <p><span className="text-placeholder font-bold uppercase text-[9px] tracking-wider w-12 inline-block">Partida:</span> {new Date(voo.dataPartida).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                             <p><span className="text-placeholder font-bold uppercase text-[9px] tracking-wider w-12 inline-block">Chegada:</span> {new Date(voo.dataChegada).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                             <p className="pt-2"><span className="text-placeholder font-bold uppercase text-[9px] tracking-wider inline-block">Passageiros:</span></p>
                             <p className="text-primary font-mono text-[11px] bg-surface p-2 border border-border rounded whitespace-pre-wrap">{voo.passageiros}</p>
                          </div>
                          
                          {isCheckinLiberado(voo.dataPartida) && getCheckinUrl(voo.ciaAerea, voo.localizador) !== '#' && (
                              <div className="mt-3">
                                  <a href={getCheckinUrl(voo.ciaAerea, voo.localizador)} target="_blank" rel="noreferrer"
                                     className="inline-block px-3 py-1.5 bg-green-100 text-green-700 font-bold uppercase tracking-wider text-[10px] rounded hover:bg-green-200 transition-colors">
                                     Fazer Check-in Cliente
                                  </a>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
           </div>

           {/* Section: Passageiros da Viagem */}
           {venda.passageiros && venda.passageiros.length > 0 && (
             <div className="md:col-span-2">
               <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest flex items-center gap-1 mb-3"><Users size={14}/> Passageiros da Viagem</h4>
               <div className="flex flex-wrap gap-2">
                 {venda.passageiros.map((p: any) => {
                   const pessoa = (data.pessoas || []).find((ps: any) => ps.id === p.pessoaId);
                   const pp = pessoa?.passaportes?.[0] || null;
                   const passaporte = pp?.numero || pessoa?.passaporte || null;
                   const validade = pp?.validade || pessoa?.passaporteValidade || null;
                   return (
                     <div key={p.pessoaId} className="bg-surface-alt border border-border rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-[180px]">
                       <span className="text-xs font-black text-primary uppercase">{p.nome}</span>
                       {passaporte && <span className="text-[10px] font-mono text-muted">Passaporte: <span className="text-primary">{passaporte}</span></span>}
                       {validade && <span className="text-[10px] text-muted">Val: <span className={new Date(validade) < new Date() ? 'text-red-400 font-bold' : 'text-emerald-400'}>{new Date(validade).toLocaleDateString('pt-BR')}</span></span>}
                     </div>
                   );
                 })}
               </div>
             </div>
           )}

           {/* Section: Contas a Receber (Cliente) */}
           <div>
              <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest flex items-center gap-1 mb-3">Títulos a Receber (Cliente)</h4>
              <div className="space-y-2">
                 {contasReceber.length > 0 ? contasReceber.map((cr: any) => (
                    <div key={cr.id} className={`bg-surface rounded-lg border shadow-sm text-sm overflow-hidden ${cr.status === 'Parcial' ? 'border-blue-800' : 'border-border'}`}>
                        {/* linha principal */}
                        <div className="flex justify-between items-center p-3">
                            <div className="flex flex-col">
                                <span className="font-bold text-primary text-xs">Venc: {new Date(cr.vencimento).toLocaleDateString('pt-BR')}</span>
                                {cr.parcelaRef && <span className="text-[10px] text-amber-400 font-bold uppercase">Saldo restante</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-black text-primary">{formatCurrency(cr.valor)}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wider leading-none
                                    ${cr.status === 'Recebido' ? 'bg-emerald-900/40 text-emerald-400' :
                                      cr.status === 'Parcial'  ? 'bg-blue-900/40 text-blue-400' :
                                      cr.status === 'Atrasado' ? 'bg-red-900/40 text-red-400' :
                                                                  'bg-amber-900/30 text-amber-400'}`}>
                                    {cr.status}
                                </span>
                                {updateData && cr.status !== 'Recebido' && cr.status !== 'Cancelado' && (
                                    <button onClick={() => baixarReceber(cr)} title="Registrar recebimento do cliente"
                                        className="flex items-center gap-1 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                                        <CheckCircle size={12} /> Receber
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* histórico de abatimentos */}
                        {cr.status === 'Parcial' && (cr.pagamentos || []).length > 0 && (() => {
                            const pago = (cr.pagamentos || []).reduce((s: number, p: any) => s + p.valor, 0);
                            const saldo = Math.max(0, cr.valor - pago);
                            return (
                              <div className="px-3 pb-3 pt-0 border-t border-blue-900/40 space-y-1">
                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-2 mb-1">Histórico de abatimentos</p>
                                {(cr.pagamentos || []).map((p: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center bg-blue-900/10 rounded px-2 py-1.5">
                                    <span className="text-[10px] text-muted">{new Date(p.data).toLocaleDateString('pt-BR')}</span>
                                    <span className="text-xs font-black text-emerald-400">+ {formatCurrency(p.valor)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between items-center px-2 pt-1">
                                    <span className="text-[10px] text-muted">Saldo em aberto</span>
                                    <span className="text-xs font-black text-amber-400">{formatCurrency(saldo)}</span>
                                </div>
                              </div>
                            );
                        })()}
                        {cr.status === 'Recebido' && cr.dataRecebimento && (
                            <div className="px-3 pb-2 pt-0 border-t border-emerald-900/30">
                                <p className="text-[10px] text-emerald-400 font-bold mt-1.5">Recebido em {new Date(cr.dataRecebimento).toLocaleDateString('pt-BR')}</p>
                            </div>
                        )}
                    </div>
                 )) : <p className="text-xs text-placeholder">Nenhum título a receber atrelado.</p>}
              </div>
           </div>

           {/* Section: Contas a Pagar (Fornecedor) */}
           <div>
              <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest flex items-center gap-1 mb-3">Títulos a Pagar (Fornecedor)</h4>
              <div className="space-y-2">
                 {contasPagar.length > 0 ? contasPagar.map((cp: any) => (
                    <div key={cp.id} className="flex justify-between items-center bg-surface p-3 rounded-lg border border-border shadow-sm text-sm">
                        <div className="flex flex-col">
                            <span className="font-bold text-primary text-xs uppercase">{cp.fornecedor}</span>
                            <span className="text-[10px] text-muted uppercase">Venc: {new Date(cp.vencimento).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-black text-primary">{formatCurrency(cp.valor)}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wider leading-none
                                ${cp.status === 'Pago' ? 'bg-emerald-900/40 text-emerald-400' :
                                  cp.status === 'Parcial' ? 'bg-blue-900/40 text-blue-400' : 'bg-amber-900/30 text-amber-400'}`}>
                                {cp.status}
                            </span>
                            {updateData && cp.status !== 'Pago' && cp.status !== 'Cancelado' && (
                                <button onClick={() => baixarPagar(cp)} title="Registrar pagamento ao fornecedor"
                                    className="flex items-center gap-1 bg-red-900/30 text-red-400 hover:bg-red-900/50 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                                    <CheckCircle size={12} /> Pagar
                                </button>
                            )}
                        </div>
                    </div>
                 )) : <p className="text-xs text-placeholder">Nenhum título a pagar atrelado.</p>}
              </div>
           </div>

           {/* Section: Comissão (margem da venda) */}
           {comissaoVenda && (
             <div className="md:col-span-2">
                <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest flex items-center gap-1 mb-3"><Percent size={14}/> Comissão / Margem da Venda</h4>
                <div className="bg-surface rounded-lg border border-border shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
                   <div className="flex flex-col">
                      <span className="text-[10px] text-muted uppercase">Margem esperada</span>
                      <span className="font-black text-emerald-400 text-lg">{formatCurrency(comissaoVenda.valorEsperado || 0)}</span>
                      {recebidoComissao(comissaoVenda) > 0 && (
                        <span className="text-[10px] text-muted mt-0.5">Recebido: {formatCurrency(recebidoComissao(comissaoVenda))} · Saldo: {formatCurrency(Math.max(0, (comissaoVenda.valorEsperado||0) - recebidoComissao(comissaoVenda)))}</span>
                      )}
                   </div>
                   <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider leading-none
                          ${comissaoVenda.status === 'Recebida' ? 'bg-emerald-900/40 text-emerald-400' :
                            comissaoVenda.status === 'Parcial' ? 'bg-blue-900/40 text-blue-400' : 'bg-amber-900/30 text-amber-400'}`}>
                          {comissaoVenda.status}
                      </span>
                      {updateData && comissaoVenda.status !== 'Recebida' && comissaoVenda.status !== 'Cancelada' && (
                        <button onClick={() => receberComissao(comissaoVenda)} title="Marcar comissão como recebida"
                            className="flex items-center gap-1 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded">
                            <CheckCircle size={13} /> Receber comissão
                        </button>
                      )}
                   </div>
                </div>
             </div>
           )}

        </div>
      </div>
    </div>
  );
}
