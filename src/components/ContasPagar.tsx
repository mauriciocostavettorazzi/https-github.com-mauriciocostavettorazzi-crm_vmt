import React, { useState } from 'react';
import { formatCurrency, generateId, parseMonetaryValue, formatMonetaryInput, calculateStatusAtrasado } from '../utils';
import { PlusCircle, Search, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from '../toast';
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

  const [contaToPay, setContaToPay] = useState<any>(null);
  const [contaToDelete, setContaToDelete] = useState<any>(null);

  const confirmDelete = () => {
    if (!contaToDelete) return;
    updateData({ contasPagar: data.contasPagar.filter((c: any) => c.id !== contaToDelete.id) });
    toast('Conta excluída.', 'info');
    setContaToDelete(null);
  };

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
  };

  const confirmPay = () => {
    if (!contaToPay) return;
    
    let updatedVendas = data.vendas;
    if (contaToPay.vendaId) {
      updatedVendas = data.vendas.map((v: any) =>
        v.id === contaToPay.vendaId ? { ...v, statusP: true } : v
      );
    }

    updateData({
      contasPagar: data.contasPagar.map((c: any) => 
        c.id === contaToPay.id ? { ...c, status: 'Pago', dataPagamento: dateToPay } : c
      ),
      vendas: updatedVendas
    });
    setContaToPay(null);
  };

  const aPagar = data.contasPagar.filter((c:any) => ['Em dia', 'Pgto do dia'].includes(calculateStatusAtrasado(c.vencimento, c.status)));
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

  const now = new Date();
  const next7Days = new Date(now);
  next7Days.setDate(next7Days.getDate() + 7);

  const proximosAPagar = data.contasPagar.filter((c: any) => {
    const statusInfo = calculateStatusAtrasado(c.vencimento, c.status);
    if (!['Em dia', 'Pgto do dia'].includes(statusInfo)) return false;
    const vd = new Date(c.vencimento);
    return vd >= now && vd <= next7Days;
  }).sort((a: any, b: any) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface p-5 rounded-2xl shadow-md border border-border border-b-4 border-b-[#1F2220]">
          <p className="text-xs font-bold text-placeholder uppercase tracking-widest">Total a Pagar (Pendente)</p>
          <div className="text-3xl font-black text-primary mt-1">{formatCurrency(totalAPagar)}</div>
        </div>
        <div className="bg-surface p-5 rounded-2xl shadow-md border border-border border-b-4 border-b-[#C0392B]">
          <p className="text-xs font-bold text-placeholder uppercase tracking-widest">Total em Atraso</p>
          <div className="text-3xl font-black text-red-400 mt-1">{formatCurrency(totalEmAtraso)}</div>
        </div>
        <div className="bg-surface p-5 rounded-2xl shadow-md border border-border border-b-4 border-b-green-500">
          <p className="text-xs font-bold text-placeholder uppercase tracking-widest">Total Pago</p>
          <div className="text-3xl font-black text-primary mt-1">{formatCurrency(totalPagoMes)}</div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-border flex flex-col p-5 mb-8">
        <h4 className="font-black text-primary uppercase tracking-wider mb-4 border-b border-border pb-2">Próximos 7 Dias</h4>
        {proximosAPagar.length === 0 ? (
           <p className="text-sm text-muted font-medium">Nenhum título a pagar nos próximos 7 dias.</p>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
             {proximosAPagar.map((c: any) => (
                <div key={c.id} className="bg-surface-alt p-4 rounded-xl border border-border-hover border-l-4 border-l-amber-500 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black text-amber-500 bg-amber-900/30 px-2 py-0.5 rounded tracking-widest mb-2 inline-block">
                      {new Date(c.vencimento).toLocaleDateString('pt-BR')}
                    </span>
                    <h5 className="font-bold text-sm text-primary truncate" title={c.fornecedor}>{c.fornecedor}</h5>
                  </div>
                  <div className="mt-3 font-black text-primary pl-1">{formatCurrency(c.valor)}</div>
                </div>
             ))}
           </div>
        )}
      </div>

      <div className="flex justify-between mb-6">
        <div className="flex space-x-2 bg-surface-alt p-1 rounded-lg">
          <button 
             onClick={() => setView('pendentes')}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'pendentes' ? 'bg-surface text-white shadow-sm' : 'text-muted hover:text-primary'}`}
           >
             Títulos Pendentes
           </button>
           <button 
             onClick={() => setView('pagos')}
             className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'pagos' ? 'bg-surface text-white shadow-sm' : 'text-muted hover:text-primary'}`}
           >
             Títulos Pagos
           </button>
        </div>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:brightness-110 uppercase flex items-center gap-2"
        >
          <PlusCircle size={18} /> Nova Conta
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-surface p-6 rounded-2xl shadow-sm border-b-4 border-[#1D9E75] mb-6">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
              <select required className="w-full border border-border-hover rounded-md p-2" 
                value={formData.fornecedor} onChange={e => setFormData({...formData, fornecedor: e.target.value})}>
                <option value="">Selecione...</option>
                {data.fornecedores?.map((f: any) => (
                  <option key={f.id} value={f.nome}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="w-full border border-border-hover rounded-md p-2" 
                value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                <option>Passagem</option><option>Hotel</option><option>GDS/SABRE</option>
                <option>IATA</option><option>Aluguel</option><option>Folha</option>
                <option>Imposto</option><option>Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor {isParcelado ? 'Total ' : ''}(R$)</label>
              <input required type="text" className="w-full border border-border-hover rounded-md p-2" 
                value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} onBlur={e => setFormData({...formData, valor: formatMonetaryInput(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isParcelado ? 'Vencimento 1ª Parcela' : 'Vencimento'}</label>
              <input required type="date" className="w-full border border-border-hover rounded-md p-2" 
                value={formData.vencimento} onChange={e => setFormData({...formData, vencimento: e.target.value})} />
            </div>
            
            <div className="lg:col-span-4 mt-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-primary cursor-pointer w-max">
                <input type="checkbox" className="rounded border-border-hover text-white focus:ring-[#1F2220]" 
                  checked={isParcelado} onChange={(e) => setIsParcelado(e.target.checked)} />
                <span>Esta conta será parcelada</span>
              </label>
            </div>

            {isParcelado && (
              <div className="lg:col-span-4 bg-surface-alt p-4 rounded-lg border border-border mt-2 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Parcelas</label>
                    <input type="number" min="2" max="100" className="w-full border border-border-hover rounded-md p-2" 
                      value={numeroParcelas} onChange={e => setNumeroParcelas(parseInt(e.target.value) || 2)} />
                  </div>
                  <div className="w-full md:w-2/3 pb-2">
                     <label className="flex items-center space-x-2 text-sm font-medium text-primary cursor-pointer">
                        <input type="checkbox" className="rounded border-border-hover text-white focus:ring-[#1F2220]" 
                          checked={valoresIguais} onChange={(e) => setValoresIguais(e.target.checked)} />
                        <span>Dividir valores igualmente (mesmo valor para todas as parcelas)</span>
                     </label>
                  </div>
                </div>

                {!valoresIguais && (
                  <div className="space-y-3 mt-4">
                    <p className="text-xs font-bold text-muted uppercase">Valores Manuais das Parcelas</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {parcelas.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center bg-surface p-2 rounded border border-border">
                          <span className="font-bold text-placeholder text-sm w-8">{i + 1}ª</span>
                          <input type="date" required className="w-full border border-border-hover rounded text-sm p-1"
                             value={p.vencimento} onChange={(e) => {
                               const newP = [...parcelas];
                               newP[i].vencimento = e.target.value;
                               setParcelas(newP);
                             }}
                          />
                          <input type="text" required className="w-full border border-border-hover rounded text-sm p-1" placeholder="R$ Valor"
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
              <button type="submit" className="bg-[#1D9E75] text-white px-6 py-2 rounded-md font-bold uppercase tracking-wider text-sm hover:bg-emerald-700">Salvar Conta</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-md border border-border overflow-hidden flex flex-col">
        <div className="p-4 bg-surface-alt border-b border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <h4 className="font-black text-white uppercase tracking-wider">{view === 'pendentes' ? 'Títulos a Pagar' : 'Títulos Pagos'}</h4>
            <div className="relative w-full md:w-64">
              <input 
                type="text" 
                placeholder="Buscar fornecedor, categoria..." 
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
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Referência</th>
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
                  <td className="px-4 py-3 text-primary">
                    <span className="font-bold uppercase inline-block">{c.fornecedor}</span>
                    {c.observacao && <span className="block text-[10px] text-placeholder font-medium uppercase mt-0.5">{c.observacao}</span>}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-primary uppercase">{venda?.cliente || '-'}</span>
                       <span className="text-[10px] font-mono text-muted uppercase tracking-widest">{c.categoria} {venda?.numeroPedido ? `• ${venda.numeroPedido}` : ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[10px] uppercase font-black text-primary bg-surface-alt rounded tracking-widest">{localizadores || '-'}</td>
                  <td className="px-4 py-3 font-black text-primary whitespace-nowrap">{formatCurrency(c.valor)}</td>
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">{new Date(c.vencimento).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider leading-none
                      ${['Em dia', 'Pgto do dia'].includes(calculateStatusAtrasado(c.vencimento, c.status)) ? 'bg-amber-900/30 text-amber-500' : 
                        calculateStatusAtrasado(c.vencimento, c.status) === 'Pago' ? 'bg-emerald-900/30 text-emerald-500' : 
                        calculateStatusAtrasado(c.vencimento, c.status) === 'Cancelado' ? 'bg-surface-alt text-muted' : 'bg-red-900/30 text-red-500'}`}>
                      {calculateStatusAtrasado(c.vencimento, c.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      {c.status !== 'Pago' && (
                        <button onClick={(e) => { e.stopPropagation(); setContaToPay(c); }} className="bg-emerald-900/30 text-emerald-400 hover:bg-green-100 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded tooltip" title="Marcar como pago">
                          <CheckCircle size={14} /> Baixar
                        </button>
                      )}
                      {c.status === 'Pago' && <span className="text-[10px] uppercase font-black text-secondary tracking-widest text-center min-w-[70px]">Pago <br/><span className="text-placeholder font-mono tracking-tighter">{c.dataPagamento?.split('-').reverse().join('/')}</span></span>}
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
            <h3 className="text-lg font-bold text-primary mb-2">Excluir Conta a Pagar</h3>
            <p className="text-sm text-muted mb-1">Fornecedor: <strong className="text-primary">{contaToDelete.fornecedor}</strong></p>
            <p className="text-sm text-muted mb-6">Valor: <strong className="text-primary">{formatCurrency(contaToDelete.valor)}</strong></p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setContaToDelete(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold hover:bg-surface-alt">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {contaToPay && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border bg-surface-alt flex justify-between items-center rounded-t-2xl">
               <h3 className="text-sm font-black text-primary uppercase tracking-wider">Baixar Título</h3>
               <button onClick={() => setContaToPay(null)} className="text-placeholder hover:text-primary">&times;</button>
            </div>
            <div className="p-6">
               <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Data do Pagamento</label>
               <input 
                 type="date" 
                 value={dateToPay}
                 onChange={(e) => setDateToPay(e.target.value)}
                 className="w-full border border-border-hover rounded bg-surface text-primary p-2 mb-6"
               />
               <div className="flex justify-end gap-3">
                 <button onClick={() => setContaToPay(null)} className="px-4 py-2 border border-border rounded-md text-muted font-bold hover:bg-surface-alt">Cancelar</button>
                 <button onClick={confirmPay} className="px-4 py-2 bg-[#1D9E75] text-white rounded-md font-bold hover:bg-emerald-700 uppercase tracking-widest text-xs">Confirmar Baixa</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
