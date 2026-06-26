import React, { useState } from 'react';
import { formatCurrency, calculateStatusAtrasado } from '../utils';
import { CheckCircle, Search } from 'lucide-react';
import { VendaOverviewModal } from './VendaOverviewModal';

export function ContasReceber({ data, updateData }: any) {
  const [view, setView] = useState<'pendentes' | 'recebidos'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOverviewVenda, setSelectedOverviewVenda] = useState<any>(null);
  const [contaToReceive, setContaToReceive] = useState<any>(null);
  const [dateToReceive, setDateToReceive] = useState(new Date().toISOString().substring(0, 10));

  const confirmReceive = () => {
    if (!contaToReceive) return;
    
    let updatedVendas = data.vendas;
    if (contaToReceive.vendaId) {
      updatedVendas = data.vendas.map((v: any) =>
        v.id === contaToReceive.vendaId ? { ...v, statusR: true } : v
      );
    }
    
    updateData({
      contasReceber: data.contasReceber.map((c: any) => 
        c.id === contaToReceive.id ? { ...c, status: 'Recebido', dataRecebimento: dateToReceive } : c
      ),
      vendas: updatedVendas
    });
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
                  <td className="px-4 py-3 font-black text-primary whitespace-nowrap">{formatCurrency(c.valor)}</td>
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">{new Date(c.vencimento).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider leading-none
                      ${['Em dia', 'Pgto do dia'].includes(calculateStatusAtrasado(c.vencimento, c.status)) ? 'bg-amber-900/30 text-amber-500' : 
                        calculateStatusAtrasado(c.vencimento, c.status) === 'Recebido' ? 'bg-emerald-900/30 text-emerald-500' : 
                        calculateStatusAtrasado(c.vencimento, c.status) === 'Cancelado' ? 'bg-surface-alt text-muted' : 'bg-red-900/30 text-red-500'}`}>
                      {calculateStatusAtrasado(c.vencimento, c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                     {c.status !== 'Recebido' && c.status !== 'Cancelado' && (
                      <button onClick={() => setContaToReceive(c)} className="bg-emerald-900/30 text-emerald-400 hover:bg-green-100 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded tooltip w-full" title="Marcar como recebido">
                        <CheckCircle size={14} /> Baixar
                      </button>
                    )}
                    {c.status === 'Recebido' && <span className="text-[10px] uppercase font-black text-secondary tracking-widest block text-center min-w-[70px]">Recebido <br/><span className="text-placeholder font-mono tracking-tighter">{c.dataRecebimento?.split('-').reverse().join('/')}</span></span>}
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

      {contaToReceive && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border bg-surface-alt flex justify-between items-center rounded-t-2xl">
               <h3 className="text-sm font-black text-primary uppercase tracking-wider">Baixar Título A Receber</h3>
               <button onClick={() => setContaToReceive(null)} className="text-placeholder hover:text-primary">&times;</button>
            </div>
            <div className="p-6">
               <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Data do Recebimento</label>
               <input 
                 type="date" 
                 value={dateToReceive}
                 onChange={(e) => setDateToReceive(e.target.value)}
                 className="w-full border border-border-hover rounded bg-surface text-primary p-2 mb-6"
               />
               <div className="flex justify-end gap-3">
                 <button onClick={() => setContaToReceive(null)} className="px-4 py-2 border border-border rounded-md text-muted font-bold hover:bg-surface-alt">Cancelar</button>
                 <button onClick={confirmReceive} className="px-4 py-2 bg-[#1D9E75] text-white rounded-md font-bold hover:bg-emerald-700 uppercase tracking-widest text-xs">Confirmar Recebimento</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
