import React, { useState } from 'react';
import { formatCurrency, generateId, parseMonetaryValue, formatMonetaryInput, calculateStatusAtrasado } from '../utils';
import { PlusCircle, Search, CheckCircle, Trash2, History, Pencil } from 'lucide-react';
import { toast } from '../toast';
import { VendaOverviewModal } from './VendaOverviewModal';
import { totalPago, saldoRestante, isAtrasado as contaAtrasada, pagamentosDe, registrarPagamento, definirPagamentos } from '../lib/financeiro';

export function ContasPagar({ data, updateData }: any) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [view, setView] = useState<'pendentes' | 'pagos'>('pendentes');
  const [searchTerm, setSearchTerm] = useState('');
  const [isParcelado, setIsParcelado] = useState(false);
  const [selectedOverviewVenda, setSelectedOverviewVenda] = useState<any>(null);
  const [numeroParcelas, setNumeroParcelas] = useState(2);
  const [valoresIguais, setValoresIguais] = useState(true);
  const [parcelas, setParcelas] = useState<{valor: string, vencimento: string}[]>([]);
  // Conta recorrente (mesmo valor por N meses)
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [numeroMeses, setNumeroMeses] = useState(6);

  const [formData, setFormData] = useState({
    fornecedor: '',
    categoria: 'Passagem',
    valor: '',
    vencimento: new Date().toISOString().substring(0, 10),
    status: 'Pendente'
  });

  const [dateToPay, setDateToPay] = useState(new Date().toISOString().substring(0, 10));
  const [valorPagoInput, setValorPagoInput] = useState('');

  const [contaToPay, setContaToPay] = useState<any>(null);
  const [contaToDelete, setContaToDelete] = useState<any>(null);
  // Gerenciar pagamentos
  const [managingConta, setManagingConta] = useState<any>(null);
  const [editingPgtoIdx, setEditingPgtoIdx] = useState<number | null>(null);
  const [editPgtoData, setEditPgtoData] = useState('');
  const [editPgtoValor, setEditPgtoValor] = useState('');

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
    const criadoEm = new Date().toISOString();

    if (isRecorrente) {
       // Mesmo valor repetido por N meses (ex: contador, coworking)
       const valor = parseMonetaryValue(formData.valor);
       const base = new Date(formData.vencimento + 'T00:00:00');
       const novasContas = Array.from({ length: numeroMeses }, (_, i) => {
         const d = new Date(base);
         d.setMonth(d.getMonth() + i);
         return {
           id: generateId(),
           fornecedor: formData.fornecedor,
           categoria: formData.categoria,
           valor,
           vencimento: d.toISOString().substring(0, 10),
           status: 'Pendente',
           criadoEm,
           observacao: `Recorrente ${i + 1}/${numeroMeses}`,
           recorrente: true,
         };
       });
       updateData({ contasPagar: [...novasContas, ...data.contasPagar] });
    } else if (isParcelado) {
       const novasContas = parcelas.map((p, index) => ({
         fornecedor: formData.fornecedor,
         categoria: formData.categoria,
         valor: parseMonetaryValue(p.valor),
         vencimento: p.vencimento,
         status: 'Pendente',
         id: generateId(),
         criadoEm,
         observacao: `Parcela ${index + 1}/${numeroParcelas}`
       }));
       updateData({ contasPagar: [...novasContas, ...data.contasPagar] });
    } else {
       const novaConta = {
         ...formData,
         id: generateId(),
         valor: parseMonetaryValue(formData.valor),
         criadoEm,
       };
       updateData({ contasPagar: [novaConta, ...data.contasPagar] });
    }

    setIsRecorrente(false);
    setIsParcelado(false);
    setIsFormOpen(false);
  };

  const openBaixar = (c: any) => {
    setContaToPay(c);
    setDateToPay(new Date().toISOString().substring(0, 10));
    setValorPagoInput(formatMonetaryInput(saldoRestante(c)));
  };

  const confirmPay = () => {
    if (!contaToPay) return;
    const valorPago = parseMonetaryValue(valorPagoInput);
    if (valorPago <= 0) return;

    const atualizada = registrarPagamento(contaToPay, { data: dateToPay, valor: valorPago }, 'pagar');
    const ehParcial = atualizada.status === 'Parcial';

    let updatedVendas = data.vendas;
    if (!ehParcial && contaToPay.vendaId) {
      updatedVendas = data.vendas.map((v: any) =>
        v.id === contaToPay.vendaId ? { ...v, statusP: true } : v
      );
    }

    updateData({
      contasPagar: data.contasPagar.map((c: any) => (c.id === contaToPay.id ? atualizada : c)),
      vendas: updatedVendas,
    });
    toast(ehParcial
      ? `Pagamento de ${formatCurrency(valorPago)} registrado. Saldo restante: ${formatCurrency(saldoRestante(atualizada))}`
      : 'Título baixado como pago!');
    setContaToPay(null);
  };

  // Gerenciar pagamentos
  const openManage = (c: any) => {
    setManagingConta({ ...c, pagamentos: pagamentosDe(c) });
    setEditingPgtoIdx(null);
  };
  const saveManage = (novosPagamentos: any[]) => {
    const atualizada = definirPagamentos(managingConta, novosPagamentos, 'pagar');
    updateData({ contasPagar: data.contasPagar.map((c: any) => (c.id === managingConta.id ? atualizada : c)) });
    setManagingConta(atualizada);
  };
  const deletePgto = (idx: number) => {
    saveManage((managingConta.pagamentos || []).filter((_: any, i: number) => i !== idx));
    if (editingPgtoIdx === idx) setEditingPgtoIdx(null);
    toast('Pagamento removido.', 'info');
  };
  const saveEditPgto = (idx: number) => {
    const valor = parseMonetaryValue(editPgtoValor);
    if (valor <= 0 || !editPgtoData) return;
    saveManage((managingConta.pagamentos || []).map((p: any, i: number) => (i === idx ? { data: editPgtoData, valor } : p)));
    setEditingPgtoIdx(null);
    toast('Pagamento atualizado.');
  };

  const aPagar = data.contasPagar.filter((c:any) => !contaAtrasada(c) && ['Em dia', 'Pgto do dia', 'Parcial'].includes(calculateStatusAtrasado(c.vencimento, c.status)) && c.status !== 'Pago');
  const emAtraso = data.contasPagar.filter((c:any) => contaAtrasada(c));
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

  const totalAPagar = aPagar.reduce((acc:any, c:any) => acc + saldoRestante(c), 0);
  const totalEmAtraso = emAtraso.reduce((acc:any, c:any) => acc + saldoRestante(c), 0);
  const totalPagoMes = pagosMes.reduce((acc:any, c:any) => acc + totalPago(c), 0);

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
                {(data.pessoas || []).filter((p: any) => p.tipo?.includes('Fornecedor')).map((p: any) => (
                  <option key={p.id} value={p.nome}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="w-full border border-border-hover rounded-md p-2" 
                value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                <option>Passagem</option><option>Hotel</option><option>GDS/SABRE</option>
                <option>IATA</option><option>Aluguel</option><option>Folha</option>
                <option>Consumo</option><option>Contador</option><option>Coworking</option>
                <option>Imposto</option><option>Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor {isParcelado ? 'Total ' : isRecorrente ? 'Mensal ' : ''}(R$)</label>
              <input required type="text" className="w-full border border-border-hover rounded-md p-2" 
                value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} onBlur={e => setFormData({...formData, valor: formatMonetaryInput(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{isParcelado ? 'Vencimento 1ª Parcela' : isRecorrente ? 'Vencimento 1º Mês' : 'Vencimento'}</label>
              <input required type="date" className="w-full border border-border-hover rounded-md p-2" 
                value={formData.vencimento} onChange={e => setFormData({...formData, vencimento: e.target.value})} />
            </div>
            
            <div className="lg:col-span-4 mt-2 flex flex-col sm:flex-row gap-x-8 gap-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-primary cursor-pointer w-max">
                <input type="checkbox" className="rounded border-border-hover text-white focus:ring-[#1F2220]"
                  checked={isParcelado} onChange={(e) => { setIsParcelado(e.target.checked); if (e.target.checked) setIsRecorrente(false); }} />
                <span>Esta conta será parcelada</span>
              </label>
              <label className="flex items-center space-x-2 text-sm font-medium text-primary cursor-pointer w-max">
                <input type="checkbox" className="rounded border-border-hover text-white focus:ring-[#1F2220]"
                  checked={isRecorrente} onChange={(e) => { setIsRecorrente(e.target.checked); if (e.target.checked) setIsParcelado(false); }} />
                <span>🔁 Conta recorrente (mensal)</span>
              </label>
            </div>

            {isRecorrente && (
              <div className="lg:col-span-4 bg-surface-alt p-4 rounded-lg border border-border mt-2">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-muted mb-1">Repetir por quantos meses?</label>
                    <input type="number" min="1" max="36" className="w-full border border-border-hover rounded-md p-2"
                      value={numeroMeses} onChange={e => setNumeroMeses(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="flex-1 pb-1 text-sm text-muted">
                    Serão lançadas <strong className="text-primary">{numeroMeses}</strong> contas de{' '}
                    <strong className="text-primary">{formData.valor ? `R$ ${formData.valor}` : 'R$ —'}</strong>,
                    uma a cada mês a partir de <strong className="text-primary">{formData.vencimento ? new Date(formData.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</strong>.
                    <span className="block text-[11px] mt-1 text-placeholder">Ideal para contador, coworking e outras despesas fixas mensais.</span>
                  </div>
                </div>
              </div>
            )}

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
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.status === 'Parcial' ? (
                      <>
                        <p className="font-black text-amber-400">{formatCurrency(saldoRestante(c))}</p>
                        <p className="text-[10px] text-muted">de {formatCurrency(c.valor)} · ↓ {formatCurrency(totalPago(c))} pago</p>
                      </>
                    ) : (
                      <p className="font-black text-primary">{formatCurrency(c.valor)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">{new Date(c.vencimento).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    {c.status === 'Parcial' ? (
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider leading-none bg-blue-900/30 text-blue-400 w-fit">Parcial</span>
                        {contaAtrasada(c) && <span className="px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider leading-none bg-red-900/30 text-red-500 w-fit">Atrasado</span>}
                      </div>
                    ) : (
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-black tracking-wider leading-none
                        ${['Em dia', 'Pgto do dia'].includes(calculateStatusAtrasado(c.vencimento, c.status)) ? 'bg-amber-900/30 text-amber-500' :
                          calculateStatusAtrasado(c.vencimento, c.status) === 'Pago' ? 'bg-emerald-900/30 text-emerald-500' :
                          calculateStatusAtrasado(c.vencimento, c.status) === 'Cancelado' ? 'bg-surface-alt text-muted' : 'bg-red-900/30 text-red-500'}`}>
                        {calculateStatusAtrasado(c.vencimento, c.status)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      {c.status !== 'Pago' && c.status !== 'Cancelado' && (
                        <button onClick={(e) => { e.stopPropagation(); openBaixar(c); }} className="bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded" title="Registrar pagamento">
                          <CheckCircle size={14} /> Baixar
                        </button>
                      )}
                      {(c.status === 'Parcial' || c.status === 'Pago') && (
                        <button onClick={(e) => { e.stopPropagation(); openManage(c); }} className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded" title="Ver / editar pagamentos">
                          <History size={14} /> Pgtos
                        </button>
                      )}
                      {c.status === 'Pago' && !(c.pagamentos?.length) && <span className="text-[10px] uppercase font-black text-secondary tracking-widest text-center min-w-[70px]">Pago <br/><span className="text-placeholder font-mono tracking-tighter">{c.dataPagamento?.split('-').reverse().join('/')}</span></span>}
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

      {contaToPay && (() => {
        const valorInput = parseMonetaryValue(valorPagoInput);
        const saldoAtual = saldoRestante(contaToPay);
        const saldoApos = Math.max(0, saldoAtual - valorInput);
        const ehParcial = valorInput > 0 && saldoApos > 0.009;
        return (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] border border-border">
            <div className="p-4 border-b border-border bg-surface-alt flex justify-between items-center rounded-t-2xl">
               <h3 className="text-sm font-black text-primary uppercase tracking-wider">Baixar Título</h3>
               <button onClick={() => setContaToPay(null)} className="text-placeholder hover:text-primary">&times;</button>
            </div>
            <div className="p-6 space-y-4">
               <div className="bg-surface-alt rounded-xl p-3 border border-border">
                 <p className="text-[10px] font-bold text-placeholder uppercase tracking-wider mb-0.5">Fornecedor</p>
                 <p className="text-sm font-bold text-primary">{contaToPay.fornecedor}</p>
                 <p className="text-xs text-muted mt-1">Valor original: <strong className="text-primary">{formatCurrency(contaToPay.valor)}</strong></p>
                 {totalPago(contaToPay) > 0 && (
                   <p className="text-xs text-emerald-400 mt-0.5">Já pago: <strong>{formatCurrency(totalPago(contaToPay))}</strong> · Saldo: <strong>{formatCurrency(saldoAtual)}</strong></p>
                 )}
               </div>
               <div>
                 <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Valor Pago</label>
                 <input type="text" inputMode="numeric"
                   className="w-full border border-border-hover rounded-lg bg-surface-alt text-primary p-2 font-mono text-sm focus:outline-none focus:border-[#1D9E75]"
                   value={valorPagoInput}
                   onChange={e => setValorPagoInput(formatMonetaryInput(e.target.value))}
                   placeholder="R$ 0,00" />
                 {valorInput > 0 && (
                   <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between ${ehParcial ? 'bg-amber-900/20 text-amber-400 border border-amber-800' : 'bg-emerald-900/20 text-emerald-400 border border-emerald-800'}`}>
                     {ehParcial ? (<><span>Pagamento parcial</span><span>Saldo após: {formatCurrency(saldoApos)}</span></>) : (<span>Quitação total do título</span>)}
                   </div>
                 )}
               </div>
               <div>
                 <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Data do Pagamento</label>
                 <input type="date" value={dateToPay} onChange={(e) => setDateToPay(e.target.value)}
                   className="w-full border border-border-hover rounded-lg bg-surface-alt text-primary p-2 focus:outline-none focus:border-[#1D9E75]" />
               </div>
               <div className="flex justify-end gap-3">
                 <button onClick={() => setContaToPay(null)} className="px-4 py-2 border border-border rounded-md text-muted font-bold hover:bg-surface-alt text-sm">Cancelar</button>
                 <button onClick={confirmPay} disabled={valorInput <= 0} className="px-4 py-2 bg-[#1D9E75] text-white rounded-md font-bold hover:bg-emerald-700 uppercase tracking-widest text-xs disabled:opacity-40">Confirmar</button>
               </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal gerenciar pagamentos */}
      {managingConta && (() => {
        const pagamentos: any[] = managingConta.pagamentos || [];
        const totalPagoM = pagamentos.reduce((s: number, p: any) => s + p.valor, 0);
        const saldoM = Math.max(0, managingConta.valor - totalPagoM);
        return (
          <div className="fixed inset-0 bg-slate-900/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md border border-border overflow-hidden">
              <div className="p-4 border-b border-border bg-surface-alt flex justify-between items-center">
                <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2"><History size={16} className="text-blue-400" /> Histórico de Pagamentos</h3>
                <button onClick={() => { setManagingConta(null); setEditingPgtoIdx(null); }} className="text-placeholder hover:text-primary text-xl leading-none">&times;</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-surface-alt rounded-xl p-3 border border-border text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted">Fornecedor</span><span className="font-bold text-primary">{managingConta.fornecedor}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Valor original</span><span className="font-bold text-primary">{formatCurrency(managingConta.valor)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Total pago</span><span className="font-bold text-emerald-400">{formatCurrency(totalPagoM)}</span></div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="text-muted font-bold">Saldo em aberto</span><span className={`font-black ${saldoM > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{formatCurrency(saldoM)}</span></div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pagamentos.length === 0 && <p className="text-xs text-muted text-center py-4">Nenhum pagamento registrado.</p>}
                  {pagamentos.map((p: any, i: number) => (
                    <div key={i} className="bg-surface-alt border border-border rounded-lg overflow-hidden">
                      {editingPgtoIdx === i ? (
                        <div className="p-3 space-y-2">
                          <div className="flex gap-2">
                            <input type="date" value={editPgtoData} onChange={e => setEditPgtoData(e.target.value)} className="flex-1 border border-border-hover rounded bg-surface text-primary p-1.5 text-xs focus:outline-none focus:border-[#1D9E75]" />
                            <input type="text" inputMode="numeric" value={editPgtoValor} onChange={e => setEditPgtoValor(formatMonetaryInput(e.target.value))} className="flex-1 border border-border-hover rounded bg-surface text-primary p-1.5 text-xs font-mono focus:outline-none focus:border-[#1D9E75]" />
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
                            <p className="text-[10px] text-muted">{p.data ? new Date(p.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</p>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => { setEditingPgtoIdx(i); setEditPgtoData(p.data); setEditPgtoValor(formatMonetaryInput(p.valor)); }} className="p-1.5 bg-surface hover:bg-surface-hover rounded text-blue-400" title="Editar"><Pencil size={13} /></button>
                            <button onClick={() => deletePgto(i)} className="p-1.5 bg-surface hover:bg-red-900/40 rounded text-red-400" title="Remover pagamento"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-1">
                  <button onClick={() => { setManagingConta(null); setEditingPgtoIdx(null); }} className="px-4 py-2 border border-border rounded-lg text-muted font-bold hover:bg-surface-alt text-sm">Fechar</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
