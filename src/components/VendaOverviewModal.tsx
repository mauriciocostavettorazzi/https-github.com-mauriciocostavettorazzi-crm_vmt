import React from 'react';
import { Venda } from '../types';
import { X, Plane, DollarSign, Calendar, MapPin, User, Hash } from 'lucide-react';
import { formatCurrency, isCheckinLiberado, getCheckinUrl, maskPhone } from '../utils';

interface VendaOverviewModalProps {
  venda: Venda;
  data: any;
  onClose: () => void;
}

export function VendaOverviewModal({ venda, data, onClose }: VendaOverviewModalProps) {
  const voos = data.voos.filter((v: any) => v.vendaId === venda.id);
  const clienteData = data.clientes.find((c: any) => c.nome === venda.cliente);
  const contasPagar = data.contasPagar.filter((c: any) => c.vendaId === venda.id);
  const contasReceber = data.contasReceber.filter((c: any) => c.vendaId === venda.id);

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10 rounded-t-2xl">
          <div>
             <h3 className="text-xl font-black text-[#0A2463] uppercase tracking-wider flex items-center gap-2">
                 <Hash size={20} className="text-blue-500" />
                 Overview da Venda
             </h3>
             <p className="text-xs font-mono text-slate-500 mt-1">Ref: {venda.numeroPedido || venda.id.substring(0,8)} | Tipo: {venda.tipo}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Section: Cliente */}
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><User size={14}/> Cliente</h4>
              <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 uppercase">{venda.cliente}</span>
                  {clienteData && <span className="text-xs text-slate-500 mt-1 break-all">{clienteData.email} <br/> {clienteData.telefone ? maskPhone(clienteData.telefone) : ''}</span>}
              </div>
           </div>

           {/* Section: Financeiro Resumo */}
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><DollarSign size={14}/> Resumo Financeiro</h4>
              <div className="grid grid-cols-2 gap-4 mt-2">
                 <div>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Valor Bruto</p>
                    <p className="text-lg font-black text-slate-900">{formatCurrency(venda.valorBruto)}</p>
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-500 uppercase font-medium">Lucro Estimado</p>
                    <div className="flex items-baseline gap-2">
                       <p className="text-lg font-black text-green-600">{formatCurrency(venda.comissao || 0)}</p>
                       {venda.valorBruto > 0 && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">{((venda.comissao || 0) / venda.valorBruto * 100).toFixed(1)}%</span>}
                    </div>
                 </div>
              </div>
           </div>

           {/* Section: Trechos/Voos */}
           <div className="md:col-span-2">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1 mb-3"><Plane size={14}/> Trechos e Passageiros</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {voos.map((voo: any) => (
                      <div key={voo.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-black uppercase tracking-widest text-[#0A2463] bg-blue-100 px-2 py-1 rounded">{voo.origem?.toUpperCase()} → {voo.destino?.toUpperCase()}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{voo.ciaAerea} | {voo.localizador || 'S/ Loc'}</span>
                          </div>
                          <div className="text-xs font-medium text-slate-600 mt-2 space-y-1">
                             <p><span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider w-12 inline-block">Partida:</span> {new Date(voo.dataPartida).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                             <p><span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider w-12 inline-block">Chegada:</span> {new Date(voo.dataChegada).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                             <p className="pt-2"><span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider inline-block">Passageiros:</span></p>
                             <p className="text-slate-800 font-mono text-[11px] bg-white p-2 border border-slate-200 rounded whitespace-pre-wrap">{voo.passageiros}</p>
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

           {/* Section: Contas a Receber (Cliente) */}
           <div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1 mb-3">Títulos a Receber (Cliente)</h4>
              <div className="space-y-2">
                 {contasReceber.length > 0 ? contasReceber.map((cr: any) => (
                    <div key={cr.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-xs">Venc: {new Date(cr.vencimento).toLocaleDateString('pt-BR')}</span>
                            <span className="text-[10px] text-slate-500 uppercase">{cr.formaPagamento || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-black text-slate-900">{formatCurrency(cr.valor)}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wider leading-none
                                ${cr.status === 'Recebido' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {cr.status}
                            </span>
                        </div>
                    </div>
                 )) : <p className="text-xs text-slate-400">Nenhum título a receber atrelado.</p>}
              </div>
           </div>

           {/* Section: Contas a Pagar (Fornecedor) */}
           <div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1 mb-3">Títulos a Pagar (Fornecedor)</h4>
              <div className="space-y-2">
                 {contasPagar.length > 0 ? contasPagar.map((cp: any) => (
                    <div key={cp.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-xs uppercase">{cp.fornecedor}</span>
                            <span className="text-[10px] text-slate-500 uppercase">Venc: {new Date(cp.vencimento).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-black text-slate-900">{formatCurrency(cp.valor)}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wider leading-none
                                ${cp.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {cp.status}
                            </span>
                        </div>
                    </div>
                 )) : <p className="text-xs text-slate-400">Nenhum título a pagar atrelado.</p>}
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}
