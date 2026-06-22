import React, { useState } from 'react';
import { useCRMStore } from '../store';
import { formatCurrency, calculateStatusAtrasado } from '../utils';
import { CheckCircle, Search } from 'lucide-react';
import { VendaOverviewModal } from './VendaOverviewModal';

export function ContasReceber({ data, updateData }: any) {
  const [view, setView] = useState<'pendentes' | 'recebidos'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOverviewVenda, setSelectedOverviewVenda] = useState<any>(null);

  const handleReceive = (id: string) => {
    const conta = data.contasReceber.find((c: any) => c.id === id);
    if (!conta) return;
    
    let updatedVendas = data.vendas;
    if (conta.vendaId) {
      updatedVendas = data.vendas.map((v: any) =>
        v.id === conta.vendaId ? { ...v, statusR: true } : v
      );
    }
    
    updateData({
      contasReceber: data.contasReceber.map((c: any) => 
        c.id === id ? { ...c, status: 'Recebido' } : c
      ),
      vendas: updatedVendas
    });
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

  const aReceber = data.contasReceber.filter((c:any) => calculateStatusAtrasado(c.vencimento, c.status) === 'Pendente');
  const emAtraso = data.contasReceber.filter((c:any) => calculateStatusAtrasado(c.vencimento, c.status) === 'Atrasado');
  const recebidosMes = data.contasReceber.filter((c:any) => c.status === 'Recebido');

  const totalAReceber = aReceber.reduce((acc:any, c:any) => acc + c.valor, 0);
  const totalEmAtraso = emAtraso.reduce((acc:any, c:any) => acc + c.valor, 0);
  const totalRecebidoMes = recebidosMes.reduce((acc:any, c:any) => acc + c.valor, 0);

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 border-b-4 border-b-blue-400">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total a Receber (Pendente)</p>
          <div className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(totalAReceber)}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 border-b-4 border-b-[#C0392B]">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total em Atraso</p>
          <div className="text-3xl font-black text-red-600 mt-1">{formatCurrency(totalEmAtraso)}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 border-b-4 border-b-green-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Recebido</p>
          <div className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(totalRecebidoMes)}</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
          <button 
             onClick={() => setView('pendentes')}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'pendentes' ? 'bg-white text-[#0A2463] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Títulos Pendentes
           </button>
           <button 
             onClick={() => setView('recebidos')}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'recebidos' ? 'bg-white text-[#0A2463] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Títulos Recebidos
           </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <h4 className="font-black text-[#0A2463] uppercase tracking-wider">{view === 'pendentes' ? 'Títulos a Receber' : 'Títulos Recebidos'}</h4>
            <div className="relative w-full md:w-64">
              <input 
                type="text" 
                placeholder="Buscar cliente, pedido..." 
                className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-1.5 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
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
            <tbody className="text-sm border-t border-slate-200">
              {contasFiltradas.map((c: any) => {
                const venda = data.vendas.find((v:any) => v.id === c.vendaId);
                const voos = venda ? data.voos.filter((voo:any) => voo.vendaId === venda.id) : [];
                const localizadores = voos.map((v:any) => v.localizador).filter(Boolean).join(', ');
                return (
                <tr key={c.id} onClick={() => venda && setSelectedOverviewVenda(venda)} className={`border-b border-slate-200 hover:bg-slate-50 ${venda ? 'cursor-pointer' : ''}`}>
                  <td className="px-4 py-3 font-bold uppercase text-slate-800">{c.cliente}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{venda?.numeroPedido || 'N/A'}</td>
                  <td className="px-4 py-3 text-[10px] uppercase font-black text-slate-900 bg-slate-100 rounded tracking-widest">{localizadores || '-'}</td>
                  <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap">{formatCurrency(c.valor)}</td>
                  <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">{new Date(c.vencimento).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider leading-none
                      ${calculateStatusAtrasado(c.vencimento, c.status) === 'Recebido' ? 'bg-green-100 text-green-700' : 
                        calculateStatusAtrasado(c.vencimento, c.status) === 'Pendente' ? 'bg-yellow-100 text-yellow-700' : 
                        calculateStatusAtrasado(c.vencimento, c.status) === 'Cancelado' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-700'}`}>
                      {calculateStatusAtrasado(c.vencimento, c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    {(calculateStatusAtrasado(c.vencimento, c.status) === 'Pendente' || calculateStatusAtrasado(c.vencimento, c.status) === 'Atrasado') && (
                      <button onClick={() => handleReceive(c.id)} className="bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded tooltip w-full" title="Marcar como recebido">
                        <CheckCircle size={14} /> Baixar
                      </button>
                    )}
                    {calculateStatusAtrasado(c.vencimento, c.status) === 'Recebido' && <span className="text-[10px] uppercase font-black text-slate-300 tracking-widest block text-center min-w-[70px]">Recebido</span>}
                  </td>
                </tr>
              )})}
              {contasFiltradas.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-slate-500 font-medium">Nenhuma conta encontrada.</td></tr>
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
    </div>
  );
}
