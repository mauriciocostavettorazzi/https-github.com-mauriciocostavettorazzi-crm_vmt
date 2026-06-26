import React, { useState } from 'react';
import { formatCurrency, generateId } from '../utils';
import { toast } from '../toast';
import { PlusCircle, X, CheckCircle, DollarSign, Clock, XCircle, Trash2, Edit } from 'lucide-react';
import type { Comissao } from '../types';

const STATUS_STYLE: Record<Comissao['status'], { color: string; bg: string; Icon: any }> = {
  Pendente:  { color: 'text-amber-400',   bg: 'bg-amber-900/30 border-amber-700',   Icon: Clock },
  Recebida:  { color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-700',Icon: CheckCircle },
  Parcial:   { color: 'text-sky-400',     bg: 'bg-sky-900/30 border-sky-700',        Icon: DollarSign },
  Cancelada: { color: 'text-muted',       bg: 'bg-surface-alt border-border',        Icon: XCircle },
};

const inputCls = "w-full border border-border-hover rounded-lg px-3 py-2 text-sm text-primary bg-surface-alt focus:outline-none focus:border-[#1D9E75]";
const labelCls = "block text-xs font-bold text-muted uppercase tracking-wider mb-1";

const emptyForm = (): Omit<Comissao, 'id' | 'criadoEm'> => ({
  fornecedor: '', descricao: '', valorEsperado: 0, valorRecebido: undefined,
  dataEsperada: '', dataRecebida: '', status: 'Pendente', observacoes: '', vendaId: undefined,
});

export function Comissoes({ data, updateData }: any) {
  const comissoes: Comissao[] = data.comissoes || [];
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [filterStatus, setFilterStatus] = useState('todos');
  const [comToDelete, setComToDelete] = useState<Comissao | null>(null);
  const [baixarId, setBaixarId] = useState<string | null>(null);
  const [baixarValor, setBaixarValor] = useState('');
  const [baixarData, setBaixarData] = useState(new Date().toISOString().substring(0, 10));

  const fd = (p: any) => setFormData(f => ({ ...f, ...p }));

  const openNew = () => { setFormData(emptyForm()); setEditingId(null); setShowForm(true); };
  const openEdit = (c: Comissao) => { setFormData({ ...emptyForm(), ...c }); setEditingId(c.id); setShowForm(true); };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fornecedor.trim()) { toast('Fornecedor é obrigatório.', 'error'); return; }
    const now = new Date().toISOString();
    if (editingId) {
      updateData({ comissoes: comissoes.map(c => c.id === editingId ? { ...c, ...formData } : c) });
      toast('Comissão atualizada!');
    } else {
      updateData({ comissoes: [{ ...formData, id: generateId(), criadoEm: now }, ...comissoes] });
      toast('Comissão registrada!');
    }
    setShowForm(false);
  };

  const handleBaixar = () => {
    const c = comissoes.find(x => x.id === baixarId);
    if (!c) return;
    const valor = Number(baixarValor.replace(',', '.'));
    const status: Comissao['status'] = valor >= c.valorEsperado ? 'Recebida' : 'Parcial';
    updateData({ comissoes: comissoes.map(x => x.id === baixarId ? { ...x, valorRecebido: valor, dataRecebida: baixarData, status } : x) });
    toast(status === 'Recebida' ? 'Comissão baixada como Recebida!' : 'Comissão baixada como Parcial.', 'info');
    setBaixarId(null);
  };

  const confirmDelete = () => {
    if (!comToDelete) return;
    updateData({ comissoes: comissoes.filter(c => c.id !== comToDelete.id) });
    toast('Comissão excluída.', 'info');
    setComToDelete(null);
  };

  // Auto-generate commissions from vendas (only the ones not yet registered)
  const syncFromVendas = () => {
    const existingVendaIds = new Set(comissoes.map(c => c.vendaId).filter(Boolean));
    const novas = (data.vendas || [])
      .filter((v: any) => v.status !== 'Cancelado' && v.comissao > 0 && !existingVendaIds.has(v.id))
      .map((v: any): Comissao => ({
        id: generateId(), vendaId: v.id,
        fornecedor: v.fornecedorCusto || 'Diversas',
        descricao: `Comissão — ${v.cliente} (Ped. ${v.numeroPedido || v.id.slice(0, 6)})`,
        valorEsperado: Number(v.comissao) || 0, valorRecebido: undefined,
        dataEsperada: '', dataRecebida: '',
        status: 'Pendente', observacoes: '',
        criadoEm: new Date().toISOString(),
      }));
    if (novas.length === 0) { toast('Nenhuma venda nova para sincronizar.', 'info'); return; }
    updateData({ comissoes: [...novas, ...comissoes] });
    toast(`${novas.length} comissão(ões) importadas das vendas!`);
  };

  const filtered = filterStatus === 'todos' ? comissoes : comissoes.filter(c => c.status === filterStatus);

  const totalEsperado = comissoes.filter(c => c.status !== 'Cancelada').reduce((s, c) => s + c.valorEsperado, 0);
  const totalRecebido = comissoes.filter(c => c.valorRecebido).reduce((s, c) => s + (c.valorRecebido || 0), 0);
  const pendente = comissoes.filter(c => c.status === 'Pendente').reduce((s, c) => s + c.valorEsperado, 0);
  const parcial = comissoes.filter(c => c.status === 'Parcial').reduce((s, c) => s + (c.valorEsperado - (c.valorRecebido || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-2">
          {(['todos', 'Pendente', 'Parcial', 'Recebida', 'Cancelada'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${filterStatus === s ? 'bg-[#1D9E75] text-white' : 'bg-surface-alt text-muted border border-border'}`}>
              {s === 'todos' ? 'Todos' : s} ({s === 'todos' ? comissoes.length : comissoes.filter(c => c.status === s).length})
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={syncFromVendas} className="border border-[#1D9E75] text-[#1D9E75] px-4 py-2 rounded-lg font-bold text-sm uppercase hover:bg-[#1D9E75]/10">
            Importar de Vendas
          </button>
          <button onClick={openNew} className="bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-bold text-sm uppercase flex items-center gap-2 hover:brightness-110">
            <PlusCircle size={16} /> Nova
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Esperado', value: formatCurrency(totalEsperado), color: 'border-sky-500', text: 'text-sky-400' },
          { label: 'Total Recebido', value: formatCurrency(totalRecebido), color: 'border-emerald-500', text: 'text-emerald-400' },
          { label: 'Pendente', value: formatCurrency(pendente), color: 'border-amber-500', text: 'text-amber-400' },
          { label: 'Diferença (Parcial)', value: formatCurrency(parcial), color: 'border-red-500', text: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className={`bg-surface border border-border ${s.color} border-b-4 rounded-xl p-4`}>
            <p className="text-[10px] font-bold text-placeholder uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-black mt-1 ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-alt text-[10px] uppercase font-bold text-placeholder">
            <tr>
              <th className="px-4 py-3">Fornecedor / Descrição</th>
              <th className="px-4 py-3">Venda</th>
              <th className="px-4 py-3">Esperado</th>
              <th className="px-4 py-3">Recebido</th>
              <th className="px-4 py-3">Datas</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm border-t border-border divide-y divide-border">
            {filtered.map(c => {
              const venda = c.vendaId ? (data.vendas || []).find((v: any) => v.id === c.vendaId) : null;
              const st = STATUS_STYLE[c.status];
              const Icon = st.Icon;
              return (
                <tr key={c.id} className="hover:bg-surface-alt transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-primary text-sm">{c.fornecedor}</p>
                    {c.descricao && <p className="text-xs text-muted truncate max-w-[220px]">{c.descricao}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted">{venda ? `${venda.cliente} — ${venda.numeroPedido || venda.id.slice(0,6)}` : '—'}</td>
                  <td className="px-4 py-3 font-black text-primary">{formatCurrency(c.valorEsperado)}</td>
                  <td className="px-4 py-3">
                    {c.valorRecebido != null ? (
                      <span className={`font-bold ${c.valorRecebido >= c.valorEsperado ? 'text-emerald-400' : 'text-amber-400'}`}>{formatCurrency(c.valorRecebido)}</span>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {c.dataEsperada && <p>Esperado: {new Date(c.dataEsperada + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                    {c.dataRecebida && <p>Recebido: {new Date(c.dataRecebida + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full border w-fit ${st.bg} ${st.color}`}>
                      <Icon size={10} /> {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {c.status === 'Pendente' || c.status === 'Parcial' ? (
                        <button onClick={() => { setBaixarId(c.id); setBaixarValor(String(c.valorEsperado)); setBaixarData(new Date().toISOString().substring(0,10)); }}
                          className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-emerald-900/50">Baixar</button>
                      ) : null}
                      <button onClick={() => openEdit(c)} className="bg-blue-900/30 text-blue-400 p-1.5 rounded hover:bg-blue-900/50"><Edit size={13} /></button>
                      <button onClick={() => setComToDelete(c)} className="bg-red-900/30 text-red-400 p-1.5 rounded hover:bg-red-900/50"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted">Nenhuma comissão encontrada. Use "Importar de Vendas" para sincronizar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg border border-border flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border bg-surface-alt rounded-t-2xl flex justify-between items-center">
              <h3 className="font-black text-primary uppercase tracking-wider">{editingId ? 'Editar' : 'Nova'} Comissão</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-muted" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
              <div><label className={labelCls}>Fornecedor *</label>
                <input required list="forn-list" className={inputCls} value={formData.fornecedor} onChange={e => fd({ fornecedor: e.target.value })} />
                <datalist id="forn-list">{(data.pessoas||[]).filter((p:any)=>p.tipo?.includes('Fornecedor')).map((p:any)=><option key={p.id} value={p.nome}/>)}</datalist>
              </div>
              <div><label className={labelCls}>Descrição</label><input className={inputCls} value={formData.descricao||''} onChange={e=>fd({descricao:e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Valor Esperado (R$)</label><input required type="number" min="0" step="0.01" className={inputCls} value={formData.valorEsperado||''} onChange={e=>fd({valorEsperado:Number(e.target.value)})}/></div>
                <div><label className={labelCls}>Valor Recebido (R$)</label><input type="number" min="0" step="0.01" className={inputCls} value={formData.valorRecebido||''} onChange={e=>fd({valorRecebido:e.target.value?Number(e.target.value):undefined})}/></div>
                <div><label className={labelCls}>Data Esperada</label><input type="date" className={inputCls} value={formData.dataEsperada||''} onChange={e=>fd({dataEsperada:e.target.value})}/></div>
                <div><label className={labelCls}>Data Recebida</label><input type="date" className={inputCls} value={formData.dataRecebida||''} onChange={e=>fd({dataRecebida:e.target.value})}/></div>
              </div>
              <div><label className={labelCls}>Status</label>
                <select className={inputCls} value={formData.status} onChange={e=>fd({status:e.target.value as any})}>
                  <option>Pendente</option><option>Parcial</option><option>Recebida</option><option>Cancelada</option>
                </select>
              </div>
              <div><label className={labelCls}>Observações</label><textarea rows={2} className={inputCls} value={formData.observacoes||''} onChange={e=>fd({observacoes:e.target.value})}/></div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold">Cancelar</button>
                <button type="submit" className="bg-[#1D9E75] text-white px-6 py-2 rounded-lg font-bold uppercase text-sm">{editingId?'Atualizar':'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Baixar modal */}
      {baixarId && (
        <div className="fixed inset-0 bg-slate-900/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 border border-border max-w-sm w-full space-y-4">
            <h3 className="font-black text-primary uppercase tracking-wider">Baixar Comissão</h3>
            <div><label className={labelCls}>Valor Recebido (R$)</label><input type="number" min="0" step="0.01" className={inputCls} value={baixarValor} onChange={e=>setBaixarValor(e.target.value)}/></div>
            <div><label className={labelCls}>Data do Recebimento</label><input type="date" className={inputCls} value={baixarData} onChange={e=>setBaixarData(e.target.value)}/></div>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setBaixarId(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold">Cancelar</button>
              <button onClick={handleBaixar} className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg font-bold">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {comToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 border border-border max-w-sm w-full text-center">
            <Trash2 size={36} className="text-red-500 mx-auto mb-3"/>
            <p className="text-primary font-bold mb-4">Excluir comissão de <strong>{comToDelete.fornecedor}</strong>?</p>
            <div className="flex justify-center gap-3">
              <button onClick={()=>setComToDelete(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
