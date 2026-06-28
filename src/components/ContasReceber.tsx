import React, { useState } from 'react';
import { formatCurrency, calculateStatusAtrasado, parseMonetaryValue, formatMonetaryInput } from '../utils';
import { CheckCircle, Search, Trash2, CreditCard, History, Pencil } from 'lucide-react';
import { toast } from '../toast';
import { VendaOverviewModal } from './VendaOverviewModal';

// Suporte a campo legado valorRecebido (antes de pagamentos[])
const totalPago = (c: any): number => {
  if ((c.pagamentos || []).length > 0)
    return (c.pagamentos as any[]).reduce((s, p) => s + p.valor, 0);
  return c.valorRecebido || 0;
};
const saldoRestante = (c: any): number =>
  Math.max(0, c.valor - totalPago(c));

export function ContasReceber({ data, updateData }: any) {
  const [view, setView] = useState<'pendentes' | 'recebidos'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOverviewVenda, setSelectedOverviewVenda] = useState<any>(null);
  const [contaToReceive, setContaToReceive] = useState<any>(null);
  const [dateToReceive, setDateToReceive] = useState(new Date().toISOString().substring(0, 10));
  const [valorRecebidoInput, setValorRecebidoInput] = useState('');
  const [contaToDelete, setContaToDelete] = useState<any>(null);
  // Gerenciar pagamentos
  const [managingConta, setManagingConta] = useState<any>(null);
  const [editingPgtoIdx, setEditingPgtoIdx] = useState<number | null>(null);
  const [editPgtoData, setEditPgtoData] = useState('');
  const [editPgtoValor, setEditPgtoValor] = useState('');

  const confirmDelete = () => {
    if (!contaToDelete) return;
    updateData({ contasReceber: data.contasReceber.filter((c: any) => c.id !== contaToDelete.id) });
    toast('Conta excluída.', 'info');
    setContaToDelete(null);
  };

  const openBaixar = (c: any) => {
    setContaToReceive(c);
    setDateToReceive(new Date().toISOString().substring(0, 10));
    // sugerir o saldo real restante (considera pagamentos anteriores)
    setValorRecebidoInput(formatMonetaryInput(saldoRestante(c)));
  };

  const confirmReceive = () => {
    if (!contaToReceive) return;
    const valorRecebido = parseMonetaryValue(valorRecebidoInput);
    if (valorRecebido <= 0) return;

    // Migra campo legado valorRecebido → pagamentos[]
    const pagamentosExistentes: any[] = contaToReceive.pagamentos?.length
      ? contaToReceive.pagamentos
      : contaToReceive.valorRecebido
        ? [{ data: contaToReceive.dataRecebimento || dateToReceive, valor: contaToReceive.valorRecebido }]
        : [];

    const novoPagamento = { data: dateToReceive, valor: valorRecebido };
    const pagamentosAtualizados = [...pagamentosExistentes, novoPagamento];
    const totalPagoAtual = pagamentosAtualizados.reduce((s: number, p: any) => s + p.valor, 0);
    const saldo = Math.max(0, contaToReceive.valor - totalPagoAtual);
    const isParcial = saldo > 0.009;

    // Remove linhas duplicadas antigas (parcelaRef) ligadas a este título
    const contasReceber = data.contasReceber
      .filter((c: any) => c.parcelaRef !== contaToReceive.id)
      .map((c: any) =>
        c.id === contaToReceive.id
          ? {
              ...c,
              pagamentos: pagamentosAtualizados,
              valorRecebido: undefined,  // limpa campo legado
              parcelaRef: undefined,
              status: isParcial ? 'Parcial' : 'Recebido',
              dataRecebimento: isParcial ? undefined : dateToReceive,
            }
          : c
      );

    let updatedVendas = data.vendas;
    if (!isParcial && contaToReceive.vendaId) {
      updatedVendas = data.vendas.map((v: any) =>
        v.id === contaToReceive.vendaId ? { ...v, statusR: true } : v
      );
    }

    updateData({ contasReceber, vendas: updatedVendas });
    toast(isParcial
      ? `Abatimento de ${formatCurrency(valorRecebido)} registrado. Saldo restante: ${formatCurrency(saldo)}`
      : 'Título baixado como recebido!');
    setContaToReceive(null);
  };

  // Abre modal de gerenciamento de pagamentos
  const openManage = (c: any) => {
    // Migra campo legado se necessário
    const conta = { ...c };
    if (!conta.pagamentos?.length && conta.valorRecebido) {
      conta.pagamentos = [{ data: conta.dataRecebimento || new Date().toISOString().substring(0,10), valor: conta.valorRecebido }];
    }
    setManagingConta(conta);
    setEditingPgtoIdx(null);
  };

  const saveManage = (novosPagamentos: any[]) => {
    const total = novosPagamentos.reduce((s: number, p: any) => s + p.valor, 0);
    const saldo = Math.max(0, managingConta.valor - total);
    const novoStatus = novosPagamentos.length === 0 ? 'Pendente' : saldo <= 0.009 ? 'Recebido' : 'Parcial';
    const contasReceber = data.contasReceber
      .filter((c: any) => c.parcelaRef !== managingConta.id) // remove duplicatas legadas
      .map((c: any) =>
        c.id === managingConta.id
          ? {
              ...c,
              pagamentos: novosPagamentos,
              valorRecebido: undefined,
              parcelaRef: undefined,
              status: novoStatus,
              dataRecebimento: novoStatus === 'Recebido' ? novosPagamentos[novosPagamentos.length - 1]?.data : undefined,
            }
          : c
      );
    updateData({ contasReceber });
    setManagingConta((prev: any) => ({ ...prev, pagamentos: novosPagamentos, status: novoStatus }));
  };

  const deletePgto = (idx: number) => {
    const novos = (managingConta.pagamentos || []).filter((_: any, i: number) => i !== idx);
    saveManage(novos);
    if (editingPgtoIdx === idx) setEditingPgtoIdx(null);
    toast('Pagamento removido.', 'info');
  };

  const saveEditPgto = (idx: number) => {
    const valor = parseMonetaryValue(editPgtoValor);
    if (valor <= 0 || !editPgtoData) return;
    const novos = (managingConta.pagamentos || []).map((p: any, i: number) =>
      i === idx ? { data: editPgtoData, valor } : p
    );
    saveManage(novos);
    setEditingPgtoIdx(null);
    toast('Pagamento atualizado.');
  };

  const contasFiltradas = data.contasReceber.filter((c: any) => {
    const calculatedStatus = calculateStatusAtrasado(c.vencimento, c.status);
    const isStatusMatch = view === 'pendentes' ? calculatedStatus !== 'Recebido' && calculatedStatus !== 'Cancelado' : calculatedStatus === 'Recebido';
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const venda = data.vendas.find((v:any) => v.id === c.vendaId);
      return isStatusMatch && (
        c.cliente.toLowerCase().includes(search) || 
        (venda?.numeroPedido && venda.numeroPedido.toLowerCase().includes(search))
      );
    }
    return isStatusMatch;
  });

  const aReceber = data.contasReceber.filter((c:any) => ['Em dia', 'Pgto do dia'].includes(calculateStatusAtrasado(c.vencimento, c.status)));
  const emAtraso = data.contasReceber.filter((c:any) => calculateStatusAtrasado(c.vencimento, c.status) === 'Atrasado');
  const recebidosMes = data.contasReceber.filter((c:any) => c.status === 'Recebido');

  const totalAReceber = aReceber.reduce((acc:any, c:any) => acc + saldoRestante(c), 0);
  const totalEmAtraso = emAtraso.reduce((acc:any, c:any) => acc + saldoRestante(c), 0);
  const totalRecebidoMes = recebidosMes.reduce((acc:any, c:any) => acc + totalPago(c), 0);

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface p-5 rounded-2xl shadow-md border border-border border-b-4 border-b-blue-400">
          <p className="text-xs font-bold text-placeholder uppercase tracking-widest">Total a Receber (Pendente)</p>
          <div className="text-3xl font-black text-primary mt-1">{formatCurrency(totalAReceber)}</div>
        </div>
        <div className="bg-surface p-5 rounded-2xl shadow-md border border-border border-b-4 border-b-[#C0392B]">
          <p className="text-xs font-bold text-placeholder uppercase tracking-widest">Total em Atraso</p>
          <div className="text-3xl font-black text-red-400 mt-1">{formatCurrency(totalEmAtraso)}</div>
        </div>
        <div className="bg-surface p-5 rounded-2xl shadow-md border border-border border-b-4 border-b-green-500">
          <p className="text-xs font-bold text-placeholder uppercase tracking-widest">Total Recebido</p>
          <div className="text-3xl font-black text-primary mt-1">{formatCurrency(totalRecebidoMes)}</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2 bg-surface-alt p-1 rounded-lg">
          <button 
             onClick={() => setView('pendentes')}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'pendentes' ? 'bg-surface text-white shadow-sm' : 'text-muted hover:text-primary'}`}
           >
             Títulos Pendentes
           </button>
           <button 
             onClick={() => setView('recebidos')}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'recebidos' ? 'bg-surface text-white shadow-sm' : 'text-muted hover:text-primary'}`}
           >
             Títulos Recebidos
           </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-md border border-border overflow-hidden flex flex-col">
        <div className="p-4 bg-surface-alt border-b border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <h4 className="font-black text-white uppercase tracking-wider">{view === 'pendentes' ? 'Títulos a Receber' : 'Títulos Recebidos'}</h4>
            <div className="relative w-full md:w-64">
              <input 
                type="text" 
                placeholder="Buscar cliente, pedido..." 
                className="w-full border border-border-hover rounded-md pl-8 pr-3 py-1.5 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-alt text-[10px] uppercase font-bold text-placeholder">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Venda Ref.</th>
                <th className="px-4 py-3">Localizador</th>
                <th className="px-4 py-3 whitespace-nowrap">Valor</th>
                <th className="px-4 py-3 whitespace-nowrap">Vencimento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm border-t border-border">
              {contasFiltradas.map((c: any) => {
                const venda = data.vendas.find((v:any) => v.id === c.vendaId);
                const voos = venda ? data.voos.filter((voo:any) => voo.vendaId === venda.id) : [];
                const localizadores = voos.map((v:any) => v.localizador).filter(Boolean).join(', ');
                return (
                <tr key={c.id} onClick={() => venda && setSelectedOverviewVenda(venda)} className={`border-b border-border hover:bg-surface-alt ${venda ? 'cursor-pointer' : ''}`}>
                  <td className="px-4 py-3 font-bold uppercase text-primary">{c.cliente}</td>
                  <td className="px-4 py-3 text-xs font-mono text-muted whitespace-nowrap">{venda?.numeroPedido || 'N/A'}</td>
                  <td className="px-4 py-3 text-[10px] uppercase font-black text-primary bg-surface-alt rounded tracking-widest">{localizadores || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.status === 'Parcial' ? (
                      <>
                        <p className="font-black text-amber-400">{formatCurrency(saldoRestante(c))}</p>
                        <p className="text-[10px] text-muted">de {formatCurrency(c.valor)} · ↓ {formatCurrency(totalPago(c))} recebido</p>
                      </>
                    ) : (
                      <p className="font-black text-primary">{formatCurrency(c.valor)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">{new Date(c.vencimento).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    {c.status === 'Parcial' ? (
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider leading-none bg-blue-900/30 text-blue-400 w-fit">
                          Parcial
                        </span>
                        {calculateStatusAtrasado(c.vencimento, 'Pendente') === 'Atrasado' && (
                          <span className="px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider leading-none bg-red-900/30 text-red-500 w-fit">
                            Atrasado
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider leading-none
                        ${['Em dia', 'Pgto do dia'].includes(calculateStatusAtrasado(c.vencimento, c.status)) ? 'bg-amber-900/30 text-amber-500' :
                          calculateStatusAtrasado(c.vencimento, c.status) === 'Recebido' ? 'bg-emerald-900/30 text-emerald-500' :
                          calculateStatusAtrasado(c.vencimento, c.status) === 'Cancelado' ? 'bg-surface-alt text-muted' : 'bg-red-900/30 text-red-500'}`}>
                        {calculateStatusAtrasado(c.vencimento, c.status)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      {c.status !== 'Recebido' && c.status !== 'Cancelado' && (
                        <button onClick={() => openBaixar(c)}
                          className="bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                          title="Registrar pagamento">
                          <CheckCircle size={14} /> Baixar
                        </button>
                      )}
                      {(c.status === 'Parcial' || c.status === 'Recebido' || c.valorRecebido) && (
                        <button onClick={() => openManage(c)}
                          className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                          title="Ver / editar pagamentos">
                          <History size={14} /> Pgtos
                        </button>
                      )}
                      {c.status === 'Recebido' && !c.valorRecebido && !(c.pagamentos?.length) && <span className="text-[10px] uppercase font-black text-secondary tracking-widest text-center min-w-[70px]">Recebido <br/><span className="text-placeholder font-mono tracking-tighter">{c.dataRecebimento?.split('-').reverse().join('/')}</span></span>}
                      <button onClick={(e) => { e.stopPropagation(); setContaToDelete(c); }} className="bg-red-900/30 text-red-400 hover:bg-red-900/50 p-1.5 rounded tooltip" title="Excluir conta">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              {contasFiltradas.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-muted font-medium">Nenhuma conta encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal gerenciar pagamentos */}
      {managingConta && (() => {
        const pagamentos: any[] = managingConta.pagamentos || [];
        const totalPagoM = pagamentos.reduce((s: number, p: any) => s + p.valor, 0);
        const saldoM = Math.max(0, managingConta.valor - totalPagoM);
        return (
          <div className="fixed inset-0 bg-slate-900/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md border border-border overflow-hidden">
              <div className="p-4 border-b border-border bg-surface-alt flex justify-between items-center">
                <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
                  <History size={16} className="text-blue-400" /> Histórico de Pagamentos
                </h3>
                <button onClick={() => { setManagingConta(null); setEditingPgtoIdx(null); }} className="text-placeholder hover:text-primary text-xl leading-none">&times;</button>
              </div>
              <div className="p-5 space-y-4">
                {/* Resumo */}
                <div className="bg-surface-alt rounded-xl p-3 border border-border text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted">Cliente</span><span className="font-bold text-primary">{managingConta.cliente}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Valor original</span><span className="font-bold text-primary">{formatCurrency(managingConta.valor)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Total recebido</span><span className="font-bold text-emerald-400">{formatCurrency(totalPagoM)}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="text-muted font-bold">Saldo em aberto</span><span className={`font-black ${saldoM > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{formatCurrency(saldoM)}</span></div>
                </div>

                {/* Lista de pagamentos */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pagamentos.length === 0 && <p className="text-xs text-muted text-center py-4">Nenhum pagamento registrado.</p>}
                  {pagamentos.map((p: any, i: number) => (
                    <div key={i} className="bg-surface-alt border border-border rounded-lg overflow-hidden">
                      {editingPgtoIdx === i ? (
                        <div className="p-3 space-y-2">
                          <div className="flex gap-2">
                            <input type="date" value={editPgtoData} onChange={e => setEditPgtoData(e.target.value)}
                              className="flex-1 border border-border-hover rounded bg-surface text-primary p-1.5 text-xs focus:outline-none focus:border-[#1D9E75]" />
                            <input type="text" inputMode="numeric" value={editPgtoValor}
                              onChange={e => setEditPgtoValor(formatMonetaryInput(e.target.value))}
                              className="flex-1 border border-border-hover rounded bg-surface text-primary p-1.5 text-xs font-mono focus:outline-none focus:border-[#1D9E75]" />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingPgtoIdx(null)} className="text-[10px] px-3 py-1 border border-border rounded text-muted hover:bg-surface">Cancelar</button>
                            <button onClick={() => saveEditPgto(i)} className="text-[10px] px-3 py-1 bg-[#1D9E75] text-white rounded font-bold hover:brightness-110">Salvar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-3 py-2.5">
                          <div>
                            <p className="text-xs font-bold text-primary">{formatCurrency(p.valor)}</p>
                            <p className="text-[10px] text-muted">{new Date(p.data).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => { setEditingPgtoIdx(i); setEditPgtoData(p.data); setEditPgtoValor(formatMonetaryInput(p.valor)); }}
                              className="p-1.5 bg-surface hover:bg-surface-hover rounded text-blue-400" title="Editar">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => deletePgto(i)}
                              className="p-1.5 bg-surface hover:bg-red-900/40 rounded text-red-400" title="Remover pagamento">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button onClick={() => { setManagingConta(null); setEditingPgtoIdx(null); }}
                    className="px-4 py-2 border border-border rounded-lg text-muted font-bold hover:bg-surface-alt text-sm">
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {selectedOverviewVenda && (
        <VendaOverviewModal
           venda={selectedOverviewVenda} 
           data={data} 
           onClose={() => setSelectedOverviewVenda(null)} 
        />
      )}

      {contaToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 border border-border text-center">
            <Trash2 size={40} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-primary mb-2">Excluir Conta a Receber</h3>
            <p className="text-sm text-muted mb-1">Cliente: <strong className="text-primary">{contaToDelete.cliente}</strong></p>
            <p className="text-sm text-muted mb-6">Valor: <strong className="text-primary">{formatCurrency(contaToDelete.valor)}</strong></p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setContaToDelete(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold hover:bg-surface-alt">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {contaToReceive && (() => {
        const valorInput = parseMonetaryValue(valorRecebidoInput);
        const saldoAtual = saldoRestante(contaToReceive);
        const saldoApos = Math.max(0, saldoAtual - valorInput);
        const isParcial = valorInput > 0 && saldoApos > 0.009;
        return (
          <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-border">
              <div className="p-4 border-b border-border bg-surface-alt flex justify-between items-center rounded-t-2xl">
                <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={16} className="text-emerald-400" /> Baixar Título
                </h3>
                <button onClick={() => setContaToReceive(null)} className="text-placeholder hover:text-primary text-xl leading-none">&times;</button>
              </div>
              <div className="p-6 space-y-4">
                {/* Info do título */}
                <div className="bg-surface-alt rounded-xl p-3 border border-border">
                  <p className="text-[10px] font-bold text-placeholder uppercase tracking-wider mb-0.5">Cliente</p>
                  <p className="text-sm font-bold text-primary">{contaToReceive.cliente}</p>
                  <p className="text-xs text-muted mt-1">Valor original: <strong className="text-primary">{formatCurrency(contaToReceive.valor)}</strong></p>
                  {totalPago(contaToReceive) > 0 && (
                    <p className="text-xs text-emerald-400 mt-0.5">Já recebido: <strong>{formatCurrency(totalPago(contaToReceive))}</strong> · Saldo: <strong>{formatCurrency(saldoAtual)}</strong></p>
                  )}
                </div>

                {/* Valor recebido */}
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">
                    Valor Recebido
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full border border-border-hover rounded-lg bg-surface-alt text-primary p-2 font-mono text-sm focus:outline-none focus:border-[#1D9E75]"
                    value={valorRecebidoInput}
                    onChange={e => setValorRecebidoInput(formatMonetaryInput(e.target.value))}
                    placeholder="R$ 0,00"
                  />
                  {/* Preview saldo */}
                  {valorInput > 0 && (
                    <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between ${isParcial ? 'bg-amber-900/20 text-amber-400 border border-amber-800' : 'bg-emerald-900/20 text-emerald-400 border border-emerald-800'}`}>
                      {isParcial ? (
                        <>
                          <span>Pagamento parcial</span>
                          <span>Saldo após: {formatCurrency(saldoApos)}</span>
                        </>
                      ) : (
                        <span>Quitação total do título</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Data */}
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Data do Recebimento</label>
                  <input
                    type="date"
                    value={dateToReceive}
                    onChange={e => setDateToReceive(e.target.value)}
                    className="w-full border border-border-hover rounded-lg bg-surface-alt text-primary p-2 focus:outline-none focus:border-[#1D9E75]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setContaToReceive(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold hover:bg-surface-alt text-sm">Cancelar</button>
                  <button
                    onClick={confirmReceive}
                    disabled={valorRecebido <= 0}
                    className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:brightness-110 disabled:opacity-40">
                    {isParcial ? 'Registrar Abatimento' : 'Confirmar Recebimento'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
