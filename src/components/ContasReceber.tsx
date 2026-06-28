import React, { useState } from 'react';
import { formatCurrency, calculateStatusAtrasado, parseMonetaryValue, formatMonetaryInput } from '../utils';
import { CheckCircle, Search, Trash2, CreditCard } from 'lucide-react';
import { toast } from '../toast';
import { generateId } from '../utils';
import { VendaOverviewModal } from './VendaOverviewModal';

export function ContasReceber({ data, updateData }: any) {
  const [view, setView] = useState<'pendentes' | 'recebidos'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOverviewVenda, setSelectedOverviewVenda] = useState<any>(null);
  const [contaToReceive, setContaToReceive] = useState<any>(null);
  const [dateToReceive, setDateToReceive] = useState(new Date().toISOString().substring(0, 10));
  const [valorRecebidoInput, setValorRecebidoInput] = useState('');
  const [contaToDelete, setContaToDelete] = useState<any>(null);

  const confirmDelete = () => {
    if (!contaToDelete) return;
    updateData({ contasReceber: data.contasReceber.filter((c: any) => c.id !== contaToDelete.id) });
    toast('Conta excluída.', 'info');
    setContaToDelete(null);
  };

  const openBaixar = (c: any) => {
    setContaToReceive(c);
    setDateToReceive(new Date().toISOString().substring(0, 10));
    setValorRecebidoInput(formatMonetaryInput(c.valor));
  };

  const confirmReceive = () => {
    if (!contaToReceive) return;
    const valorRecebido = parseMonetaryValue(valorRecebidoInput);
    const saldo = contaToReceive.valor - valorRecebido;
    const isParcial = valorRecebido > 0 && saldo > 0.009;

    let contasReceber = data.contasReceber.map((c: any) =>
      c.id === contaToReceive.id
        ? { ...c, status: isParcial ? 'Parcial' : 'Recebido', dataRecebimento: dateToReceive, valorRecebido }
        : c
    );

    // Se parcial: cria nova conta com o saldo restante
    if (isParcial) {
      contasReceber = [
        ...contasReceber,
        {
          id: generateId(),
          vendaId: contaToReceive.vendaId,
          cliente: contaToReceive.cliente,
          valor: Math.round(saldo * 100) / 100,
          vencimento: contaToReceive.vencimento,
          status: 'Pendente',
          parcelaRef: contaToReceive.id,
        },
      ];
    }

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

  const totalAReceber = aReceber.reduce((acc:any, c:any) => acc + c.valor, 0);
  const totalEmAtraso = emAtraso.reduce((acc:any, c:any) => acc + c.valor, 0);
  const totalRecebidoMes = recebidosMes.reduce((acc:any, c:any) => acc + c.valor, 0);

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
                    <p className="font-black text-primary">{formatCurrency(c.valor)}</p>
                    {c.status === 'Parcial' && c.valorRecebido != null && (
                      <p className="text-[10px] text-emerald-400 font-bold">↓ {formatCurrency(c.valorRecebido)} recebido</p>
                    )}
                    {c.parcelaRef && (
                      <p className="text-[10px] text-amber-400 font-bold">Saldo restante</p>
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
                          title="Baixar / Abater valor">
                          <CheckCircle size={14} /> Baixar
                        </button>
                      )}
                      {c.status === 'Recebido' && <span className="text-[10px] uppercase font-black text-secondary tracking-widest text-center min-w-[70px]">Recebido <br/><span className="text-placeholder font-mono tracking-tighter">{c.dataRecebimento?.split('-').reverse().join('/')}</span></span>}
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
        const valorRecebido = parseMonetaryValue(valorRecebidoInput);
        const saldo = Math.max(0, contaToReceive.valor - valorRecebido);
        const isParcial = valorRecebido > 0 && saldo > 0.009;
        const isFull = valorRecebido >= contaToReceive.valor - 0.009;
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
                  <p className="text-xs text-muted mt-1">Valor total do título: <strong className="text-primary">{formatCurrency(contaToReceive.valor)}</strong></p>
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
                  {valorRecebido > 0 && (
                    <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between ${isParcial ? 'bg-amber-900/20 text-amber-400 border border-amber-800' : 'bg-emerald-900/20 text-emerald-400 border border-emerald-800'}`}>
                      {isParcial ? (
                        <>
                          <span>Pagamento parcial</span>
                          <span>Saldo restante: {formatCurrency(saldo)}</span>
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
