import React, { useState } from 'react';
import { generateId, generateCalendarLink, isCheckinLiberado, getCheckinUrl } from '../utils';
import { PlusCircle, Calendar, Edit, ShieldAlert, Search } from 'lucide-react';
import { addDays, subDays } from 'date-fns';

export function Voos({ data, updateData }: any) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [view, setView] = useState<'ativos' | 'passados'>('ativos');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortCol, setSortCol] = useState('dataPartida');
  const [sortAsc, setSortAsc] = useState(true);
  
  const [formData, setFormData] = useState({
    vendaId: '',
    ciaAerea: '',
    numeroVoo: '',
    origem: '',
    destino: '',
    dataPartida: '',
    dataChegada: '',
    localizador: '',
    passageiros: '',
    tipoVoo: 'Nacional',
    formaEmissao: 'Milhas',
    fornecedor: ''
  });

  const vendasPassagem = data.vendas.filter((v: any) => v.tipo === 'Passagem Aérea' && v.status !== 'Cancelado');
  const fornecedoresViagem = data.fornecedores?.filter((f: any) => f.isFornecedorViagem) || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const checkinDate = subDays(new Date(formData.dataPartida), formData.tipoVoo === 'Nacional' ? 2 : 1);
    
    const novoVoo = {
      ...formData,
      id: generateId(),
      checkInDisponivel: checkinDate.toISOString().substring(0, 16),
      status: 'Emitido'
    };
    
    updateData({ voos: [novoVoo, ...data.voos] });
    setIsFormOpen(false);
    alert('Voo cadastrado com sucesso!');
  };

  const handleStatus = (id: string, newStatus: string) => {
    updateData({
      voos: data.voos.map((v: any) => v.id === id ? { ...v, status: newStatus } : v)
    });
  };

  const handleAgendar = (voo: any) => {
    const url = generateCalendarLink(voo, false);
    window.open(url, '_blank');
    
    const updatedVoos = data.voos.map((v: any) => 
      v.id === voo.id ? { ...v, agendado: true } : v
    );
    updateData({ voos: updatedVoos });
  };

  const voosList = data.voos.filter((v: any) => {
    const isPast = new Date(v.dataPartida).getTime() < new Date().getTime() || v.status === 'Voado';
    const isStatusMatch = view === 'passados' ? isPast : !isPast;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return isStatusMatch && (
        v.passageiros.toLowerCase().includes(search) || 
        v.localizador.toLowerCase().includes(search) ||
        v.ciaAerea.toLowerCase().includes(search)
      );
    }
    return isStatusMatch;
  });

  let sortedVoosList = [...voosList].sort((a: any, b: any) => {
    let valA = a[sortCol] || '9999-12-31';
    let valB = b[sortCol] || '9999-12-31';
    
    // For sorting specific types, make sure strings case-insensitive
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between mb-6">
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
          <button 
             onClick={() => setView('ativos')}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'ativos' ? 'bg-white text-[#0A2463] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Próximos Voos
           </button>
           <button 
             onClick={() => setView('passados')}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'passados' ? 'bg-white text-[#0A2463] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Voos Passados
           </button>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-[#D4A017] text-[#0A2463] px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:brightness-110 uppercase flex items-center gap-2"
        >
          <PlusCircle size={18} /> Novo Voo
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-[#0A2463] mb-6">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Venda Vinculada</label>
              <select required className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.vendaId} onChange={e => setFormData({...formData, vendaId: e.target.value})}>
                <option value="">Selecione uma venda...</option>
                {vendasPassagem.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.cliente} - {v.numeroPedido}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passageiro(s)</label>
              <input required type="text" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.passageiros} onChange={e => setFormData({...formData, passageiros: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localizador (PNR)</label>
              <input required type="text" className="w-full border border-gray-300 rounded-md p-2 uppercase font-mono" maxLength={6}
                value={formData.localizador} onChange={e => setFormData({...formData, localizador: e.target.value.toUpperCase()})} />
            </div>

            <div className={`${formData.ciaAerea === 'Outras' ? 'lg:col-span-2' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cia Aérea</label>
              <select required className="w-full border border-gray-300 rounded-md p-2" 
                 value={formData.ciaAerea === 'Azul' || formData.ciaAerea === 'GOL' || formData.ciaAerea === 'LATAM' || formData.ciaAerea === '' ? formData.ciaAerea : 'Outras'} 
                 onChange={e => setFormData({...formData, ciaAerea: e.target.value === 'Outras' ? 'Outra Cia' : e.target.value})}>
                 <option value="">Selecione...</option>
                 <option value="Azul">Azul</option>
                 <option value="GOL">GOL</option>
                 <option value="LATAM">LATAM</option>
                 <option value="Outras">Outras</option>
              </select>
            </div>
            {formData.ciaAerea !== 'Azul' && formData.ciaAerea !== 'GOL' && formData.ciaAerea !== 'LATAM' && formData.ciaAerea !== '' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Cia Aérea</label>
                <input required type="text" className="w-full border border-gray-300 rounded-md p-2" 
                  value={formData.ciaAerea === 'Outra Cia' ? '' : formData.ciaAerea} onChange={e => setFormData({...formData, ciaAerea: e.target.value})} placeholder="Ex: TAP, Copa..."/>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número Voo (Ex: G3 1234)</label>
              <input required type="text" className="w-full border border-gray-300 rounded-md p-2 uppercase" 
                value={formData.numeroVoo} onChange={e => setFormData({...formData, numeroVoo: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origem (IATA)</label>
              <input required type="text" className="w-full border border-gray-300 rounded-md p-2 uppercase font-mono" maxLength={3}
                value={formData.origem} onChange={e => setFormData({...formData, origem: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destino (IATA)</label>
              <input required type="text" className="w-full border border-gray-300 rounded-md p-2 uppercase font-mono" maxLength={3}
                value={formData.destino} onChange={e => setFormData({...formData, destino: e.target.value.toUpperCase()})} />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora de Partida</label>
              <input required type="datetime-local" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.dataPartida} onChange={e => setFormData({...formData, dataPartida: e.target.value})} />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Data e Hora de Chegada</label>
              <input required type="datetime-local" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.dataChegada} onChange={e => setFormData({...formData, dataChegada: e.target.value})} />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Voo (Regra Check-in)</label>
              <select className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.tipoVoo} onChange={e => setFormData({...formData, tipoVoo: e.target.value})}>
                <option value="Nacional">Nacional (48h antes)</option>
                <option value="Internacional">Internacional (24h antes)</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Emissão</label>
              <select className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.formaEmissao} onChange={e => setFormData({...formData, formaEmissao: e.target.value})}>
                <option value="Milhas">Milhas</option>
                <option value="Tarifa Pagante">Tarifa Pagante</option>
                <option value="Consolidadora">Consolidadora</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor (Viagem)</label>
              <select className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})}>
                <option value="">Selecione...</option>
                {fornecedoresViagem.map((f: any) => (
                  <option key={f.id} value={f.nome}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-4 flex justify-end mt-4">
              <button type="submit" className="bg-[#0A2463] text-white px-6 py-2 rounded-md font-bold uppercase tracking-wider text-sm hover:bg-blue-900">Salvar Voo</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <h4 className="font-black text-[#0A2463] uppercase tracking-wider">Passageiros e Embarques</h4>
            <div className="relative w-full md:w-64">
              <input 
                type="text" 
                placeholder="Buscar voo, PNR, Cia..." 
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
                <th className="px-4 py-3 cursor-pointer hover:text-slate-600 truncate" onClick={() => toggleSort('dataPartida')}>Data Partida {sortCol === 'dataPartida' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-600 truncate" onClick={() => toggleSort('numeroVoo')}>Voo {sortCol === 'numeroVoo' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-600 truncate" onClick={() => toggleSort('formaEmissao')}>Emissão & Forn. {sortCol === 'formaEmissao' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-600 truncate" onClick={() => toggleSort('origem')}>Trecho {(sortCol === 'origem' || sortCol === 'destino') && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-600 truncate" onClick={() => toggleSort('passageiros')}>PNR / Passag. {sortCol === 'passageiros' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-slate-600 truncate" onClick={() => toggleSort('status')}>Status {sortCol === 'status' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 text-center min-w-[120px]">Expt. Agenda</th>
              </tr>
            </thead>
            <tbody className="text-sm border-t border-slate-200">
              {sortedVoosList.map((v: any) => (
                <tr key={v.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-bold text-slate-700">
                    {new Date(v.dataPartida).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-slate-800">
                    <span className="font-black uppercase">{v.ciaAerea}</span> <br/>
                    <span className="text-xs text-slate-500 font-mono tracking-widest">{v.numeroVoo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600 block w-max mb-1">{v.formaEmissao || 'N/A'}</span>
                    <span className="text-xs font-medium text-slate-500 uppercase">{v.fornecedor || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2 font-bold uppercase">
                      <span className="bg-slate-200 px-1 rounded text-[11px] uppercase tracking-wider">{v.origem?.toUpperCase()}</span>
                      <span className="text-slate-300">→</span>
                      <span className="bg-slate-200 px-1 rounded text-[11px] uppercase tracking-wider">{v.destino?.toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-black text-slate-900 bg-slate-100 px-1 rounded uppercase tracking-widest">{v.localizador}</span><br/>
                    <span className="text-xs text-slate-500 uppercase font-bold">{v.passageiros}</span>
                  </td>
                  <td className="px-4 py-3">
                     <select 
                       className={`text-[10px] font-black uppercase tracking-wider leading-none rounded px-2 py-1 outline-none appearance-none cursor-pointer border
                         ${v.status === 'Emitido' ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                           v.status === 'Voado' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                           v.status === 'Cancelado' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}`}
                       value={v.status}
                       onChange={(e) => handleStatus(v.id, e.target.value)}
                     >
                       <option>Emitido</option>
                       <option>Reemitido</option>
                       <option>Cancelado</option>
                       <option>Voado</option>
                     </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col gap-2 items-center justify-center">
                      <button 
                         onClick={() => handleAgendar(v)}
                         className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors whitespace-nowrap ${v.agendado ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`} title={v.agendado ? "Adicionado à Agenda" : "Adicionar à Agenda"}>
                        <Calendar size={12} /> {v.agendado ? 'Agenda' : 'Agenda'}
                      </button>
                      
                      {(() => {
                         const isLiberado = isCheckinLiberado(v.dataPartida);
                         const checkinUrl = getCheckinUrl(v.ciaAerea, v.localizador);
                         
                         if (view === 'ativos') {
                           if (isLiberado && checkinUrl !== '#') {
                             return (
                               <a href={checkinUrl} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 font-bold uppercase tracking-wider hover:bg-green-200 px-2 py-1 rounded transition-colors whitespace-nowrap" title="Ir para o Check-in no site">
                                 <ShieldAlert size={12} /> Check-in
                               </a>
                             );
                           } else {
                             return (
                               <button disabled
                                  className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 cursor-not-allowed font-bold uppercase tracking-wider px-2 py-1 rounded whitespace-nowrap" title="Check-in não liberado">
                                 <ShieldAlert size={12} /> Check-in
                               </button>
                             );
                           }
                         }
                         return null;
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
              {data.voos.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-gray-500 font-medium">Nenhum voo cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
