import React, { useState } from 'react';
import { useCRMStore } from '../store';
import { formatCurrency, generateId, parseMonetaryValue, formatMonetaryInput, calculateStatusAtrasado } from '../utils';
import { PlusCircle, Search, CheckCircle } from 'lucide-react';
import { VendaOverviewModal } from './VendaOverviewModal';

export function ContasPagar({ data, updateData }: any) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [view, setView] = useState<'pendentes' | 'pagos'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [isParcelado, setIsParcelado] = useState(false);
  const [selectedOverviewVenda, setSelectedOverviewVenda] = useState<any>(null);
  const [numeroParcelas, setNumeroParcelas] = useState(2);
  const [valoresIguais, setValoresIguais] = useState(true);
  const [parcelas, setParcelas] = useState<{valor: string, vencimento: string}[]>([]);

  const [formData, setFormData] = useState({
    fornecedor: '',
    categoria: 'Passagem',
    valor: '',
    vencimento: new Date().toISOString().substring(0, 10),
    status: 'Pendente'
  });

  const [dateToPay, setDateToPay] = useState(new Date().toISOString().substring(0, 10));

  // Update parcelas whenever dependencies change and it's set to "valores iguais"
  React.useEffect(() => {
    if (isParcelado && valoresIguais) {
      const parsedValor = parseMonetaryValue(formData.valor) || 0;
      const valorPorParcela = (parsedValor / numeroParcelas);
      
      const newParcelas = [];
      const baseDate = new Date(formData.vencimento + 'T00:00:00');
      
      for (let i = 0; i < numeroParcelas; i++) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + i);
        newParcelas.push({
          valor: formatMonetaryInput(valorPorParcela),
          vencimento: d.toISOString().substring(0, 10)
        });
      }
      setParcelas(newParcelas);
    } else if (isParcelado && !valoresIguais && parcelas.length !== numeroParcelas) {
      // Adjust array length if numeroParcelas changes, but keep existing values where possible
      const newParcelas = [...parcelas];
      const baseDate = new Date(formData.vencimento + 'T00:00:00');
      
      while (newParcelas.length < numeroParcelas) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() + newParcelas.length);
        newParcelas.push({ valor: '', vencimento: d.toISOString().substring(0, 10) });
      }
      if (newParcelas.length > numeroParcelas) {
        newParcelas.splice(numeroParcelas);
      }
      setParcelas(newParcelas);
    }
  }, [isParcelado, valoresIguais, numeroParcelas, formData.valor, formData.vencimento]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isParcelado) {
       const novasContas = parcelas.map((p, index) => ({
         fornecedor: formData.fornecedor,
         categoria: formData.categoria,
         valor: parseMonetaryValue(p.valor),
         vencimento: p.vencimento,
         status: 'Pendente',
         id: generateId(),
         observacao: `Parcela ${index + 1}/${numeroParcelas}`
       }));
       updateData({ contasPagar: [...novasContas, ...data.contasPagar] });
    } else {
       const novaConta = {
         ...formData,
         id: generateId(),
         valor: parseMonetaryValue(formData.valor),
       };
       updateData({ contasPagar: [novaConta, ...data.contasPagar] });
    }
    
    setIsFormOpen(false);
    alert('Conta salva com sucesso!');
  };

  const handlePay = (id: string) => {
    const dataPag = prompt('Confirme a data de pagamento (AAAA-MM-DD):', dateToPay);
    if (!dataPag) return;

    const conta = data.contasPagar.find((c: any) => c.id === id);
    if (!conta) return;
    
    let updatedVendas = data.vendas;
    if (conta.vendaId) {
      updatedVendas = data.vendas.map((v: any) =>
        v.id === conta.vendaId ? { ...v, statusP: true } : v
      );
    }

    updateData({
      contasPagar: data.contasPagar.map((c: any) => 
        c.id === id ? { ...c, status: 'Pago', dataPagamento: dataPag } : c
      ),
      vendas: updatedVendas
    });
  };

  const aPagar = data.contasPagar.filter((c:any) => calculateStatusAtrasado(c.vencimento, c.status) === 'Pendente');
  const emAtraso = data.contasPagar.filter((c:any) => calculateStatusAtrasado(c.vencimento, c.status) === 'Atrasado');
  const pagosMes = data.contasPagar.filter((c:any) => c.status === 'Pago'); // Simplified for month

  const contasFiltradas = data.contasPagar.filter((c: any) => {
    const calculatedStatus = calculateStatusAtrasado(c.vencimento, c.status);
    const isStatusMatch = view === 'pendentes' ? calculatedStatus !== 'Pago' && calculatedStatus !== 'Cancelado' : calculatedStatus === 'Pago';
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return isStatusMatch && (
        c.fornecedor.toLowerCase().includes(search) || 
        c.categoria.toLowerCase().includes(search)
      );
    }
    return isStatusMatch;
  });

  const totalAPagar = aPagar.reduce((acc:any, c:any) => acc + c.valor, 0);
  const totalEmAtraso = emAtraso.reduce((acc:any, c:any) => acc + c.valor, 0);
  const totalPagoMes = pagosMes.reduce((acc:any, c:any) => acc + c.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between mb-6">
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
          <button 
             onClick={() => setView('pendentes')}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'pendentes' ? 'bg-white text-[#0A2463] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Títulos Pendentes
           </button>
           <button 
             onClick={() => setView('pagos')}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'pagos' ? 'bg-white text-[#0A2463] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Títulos Pagos
           </button>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-[#D4A017] text-[#0A2463] px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:brightness-110 uppercase flex items-center gap-2"
        >
          <PlusCircle size={18} /> Nova Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 border-b-4 border-b-[#0A2463]">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total a Pagar (Pendente)</p>
          <div className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(totalAPagar)}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 border-b-4 border-b-[#C0392B]">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total em Atraso</p>
          <div className="text-3xl font-black text-red-600 mt-1">{formatCurrency(totalEmAtraso)}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 border-b-4 border-b-green-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Pago</p>
          <div className="text-3xl font-black text-slate-900 mt-1">{formatCurrency(totalPagoMes)}</div>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-[#0A2463] mb-6">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
              <select required className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})}>
                <option value="">Selecione...</option>
                {data.fornecedores?.map((f: any) => (
                  <option key={f.id} value={f.nome}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                <option>Passagem</option><option>Hotel</option><option>GDS/SABRE</option>
                <option>IATA</option><option>Aluguel</option><option>Folha</option>
                <option>Imposto</option><option>Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor {isParcelado ? 'Total ' : ''}(R$)</label>
              <input required type="text" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} onBlur={e => setFormData({...formData, valor: formatMonetaryInput(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isParcelado ? 'Vencimento 1ª Parcela' : 'Vencimento'}</label>
              <input required type="date" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.vencimento} onChange={e => setFormData({...formData, vencimento: e.target.value})} />
            </div>
            
            <div className="lg:col-span-4 mt-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 cursor-pointer w-max">
                <input type="checkbox" className="rounded border-gray-300 text-[#0A2463] focus:ring-[#0A2463]" 
                  checked={isParcelado} onChange={(e) => setIsParcelado(e.target.checked)} />
                <span>Esta conta será parcelada</span>
              </label>
            </div>

            {isParcelado && (
              <div className="lg:col-span-4 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Parcelas</label>
                    <input type="number" min="2" max="100" className="w-full border border-gray-300 rounded-md p-2" 
                      value={numeroParcelas} onChange={e => setNumeroParcelas(parseInt(e.target.value) || 2)} />
                  </div>
                  <div className="w-full md:w-2/3 pb-2">
                     <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 cursor-pointer">
                        <input type="checkbox" className="rounded border-gray-300 text-[#0A2463] focus:ring-[#0A2463]" 
                          checked={valoresIguais} onChange={(e) => setValoresIguais(e.target.checked)} />
                        <span>Dividir valores igualmente (mesmo valor para todas as parcelas)</span>
                     </label>
                  </div>
                </div>

                {!valoresIguais && (
                  <div className="space-y-3 mt-4">
                    <p className="text-xs font-bold text-slate-500 uppercase">Valores Manuais das Parcelas</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {parcelas.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center bg-white p-2 rounded border border-slate-200">
                          <span className="font-bold text-slate-400 text-sm w-8">{i + 1}ª</span>
                          <input type="date" required className="w-full border border-gray-300 rounded text-sm p-1"
                             value={p.vencimento} onChange={(e) => {
                               const newP = [...parcelas];
                               newP[i].vencimento = e.target.value;
                               setParcelas(newP);
                             }}
                          />
                          <input type="text" required className="w-full border border-gray-300 rounded text-sm p-1" placeholder="R$ Valor"
                             value={p.valor} onChange={(e) => {
                               const newP = [...parcelas];
                               newP[i].valor = e.target.value;
                               setParcelas(newP);
                             }}
                             onBlur={(e) => {
                               const newP = [...parcelas];
                               newP[i].valor = formatMonetaryInput(e.target.value);
                               setParcelas(newP);
                             }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="lg:col-span-4 flex justify-end mt-4">
              <button type="submit" className="bg-[#0A2463] text-white px-6 py-2 rounded-md font-bold uppercase tracking-wider text-sm hover:bg-blue-900">Salvar Conta</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <h4 className="font-black text-[#0A2463] uppercase tracking-wider">{view === 'pendentes' ? 'Títulos a Pagar' : 'Títulos Pagos'}</h4>
            <div className="relative w-full md:w-64">
              <input 
                type="text" 
                placeholder="Buscar fornecedor, categoria..." 
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
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Referência</th>
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
                  <td className="px-4 py-3 text-slate-800">
                    <span className="font-bold uppercase inline-block">{c.fornecedor}</span>
                    {c.observacao && <span className="block text-[10px] text-slate-400 font-medium uppercase mt-0.5">{c.observacao}</span>}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-slate-700 uppercase">{venda?.cliente || '-'}</span>
                       <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{c.categoria} {venda?.numeroPedido ? `• ${venda.numeroPedido}` : ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[10px] uppercase font-black text-slate-900 bg-slate-100 rounded tracking-widest">{localizadores || '-'}</td>
                  <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap">{formatCurrency(c.valor)}</td>
                  <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">{new Date(c.vencimento).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider leading-none
                      ${calculateStatusAtrasado(c.vencimento, c.status) === 'Pago' ? 'bg-green-100 text-green-700' : 
                        calculateStatusAtrasado(c.vencimento, c.status) === 'Pendente' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {calculateStatusAtrasado(c.vencimento, c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    {c.status !== 'Pago' && (
                      <button onClick={() => handlePay(c.id)} className="bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded tooltip w-full" title="Marcar como pago">
                        <CheckCircle size={14} /> Baixar
                      </button>
                    )}
                    {c.status === 'Pago' && <span className="text-[10px] uppercase font-black text-slate-300 tracking-widest block text-center min-w-[70px]">Pago <br/><span className="text-slate-400 font-mono tracking-tighter">{c.dataPagamento?.split('-').reverse().join('/')}</span></span>}
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
