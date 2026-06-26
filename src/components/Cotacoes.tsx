import React, { useState } from 'react';
import { generateId } from '../utils';
import { toast } from '../toast';
import { formatCurrency } from '../utils';
import { PlusCircle, X, Edit, Trash2, Send, CheckCircle, XCircle, Clock, FileText, ArrowRight } from 'lucide-react';
import type { Cotacao } from '../types';

const STAGES: { id: Cotacao['status']; label: string; color: string; bg: string }[] = [
  { id: 'Em cotação',  label: 'Em Cotação',  color: 'text-sky-400',    bg: 'bg-sky-900/30 border-sky-700' },
  { id: 'Enviada',     label: 'Enviada',      color: 'text-amber-400',  bg: 'bg-amber-900/30 border-amber-700' },
  { id: 'Aprovada',    label: 'Aprovada',     color: 'text-emerald-400',bg: 'bg-emerald-900/30 border-emerald-700' },
  { id: 'Recusada',    label: 'Recusada',     color: 'text-red-400',    bg: 'bg-red-900/30 border-red-700' },
  { id: 'Expirada',    label: 'Expirada',     color: 'text-muted',      bg: 'bg-surface-alt border-border' },
];

const STAGE_ICON: Record<string, any> = {
  'Em cotação': Clock, Enviada: Send, Aprovada: CheckCircle, Recusada: XCircle, Expirada: XCircle,
};

const TIPOS = ['Passagem Aérea','Hotel','Pacote','Locação de Veículo','Serviço Corporativo','Seguro'] as const;

const emptyForm = (): Omit<Cotacao,'id'|'criadoEm'|'atualizadoEm'> => ({
  cliente: '', destino: '', tipo: 'Pacote', periodoIda: '', periodoVolta: '',
  adultos: 1, criancas: 0, valorEstimado: undefined, status: 'Em cotação',
  prazoValidade: '', observacoes: '',
});

const inputCls = "w-full border border-border-hover rounded-lg px-3 py-2 text-sm text-primary bg-surface-alt focus:outline-none focus:border-[#1D9E75]";
const labelCls = "block text-xs font-bold text-muted uppercase tracking-wider mb-1";

export function Cotacoes({ data, updateData }: any) {
  const cotacoes: Cotacao[] = data.cotacoes || [];
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm());
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [cotToDelete, setCotToDelete] = useState<Cotacao | null>(null);

  const fd = (p: any) => setFormData(f => ({ ...f, ...p }));

  const openNew = () => { setFormData(emptyForm()); setEditingId(null); setShowForm(true); };
  const openEdit = (c: Cotacao) => { setFormData({ ...emptyForm(), ...c, valorEstimado: c.valorEstimado }); setEditingId(c.id); setShowForm(true); };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cliente.trim()) { toast('Cliente é obrigatório.', 'error'); return; }
    const now = new Date().toISOString();
    if (editingId) {
      updateData({ cotacoes: cotacoes.map(c => c.id === editingId ? { ...c, ...formData, atualizadoEm: now } : c) });
      toast('Cotação atualizada!');
    } else {
      updateData({ cotacoes: [{ ...formData, id: generateId(), criadoEm: now, atualizadoEm: now }, ...cotacoes] });
      toast('Cotação criada!');
    }
    setShowForm(false);
  };

  const changeStatus = (id: string, status: Cotacao['status']) => {
    updateData({ cotacoes: cotacoes.map(c => c.id === id ? { ...c, status, atualizadoEm: new Date().toISOString() } : c) });
  };

  const convertToVenda = (c: Cotacao) => {
    toast('Cotação aprovada! Acesse Vendas para registrar.', 'info');
    changeStatus(c.id, 'Aprovada');
  };

  const confirmDelete = () => {
    if (!cotToDelete) return;
    updateData({ cotacoes: cotacoes.filter(c => c.id !== cotToDelete.id) });
    toast('Cotação excluída.', 'info');
    setCotToDelete(null);
  };

  const filtered = filterStatus === 'todos' ? cotacoes : cotacoes.filter(c => c.status === filterStatus);

  // Stats
  const total = cotacoes.length;
  const aprovadas = cotacoes.filter(c => c.status === 'Aprovada').length;
  const taxaConv = total > 0 ? Math.round((aprovadas / total) * 100) : 0;
  const valorPipeline = cotacoes.filter(c => !['Recusada','Expirada'].includes(c.status)).reduce((s, c) => s + (c.valorEstimado || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterStatus('todos')} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${filterStatus === 'todos' ? 'bg-[#1D9E75] text-white' : 'bg-surface-alt text-muted border border-border'}`}>Todos ({total})</button>
          {STAGES.map(s => (
            <button key={s.id} onClick={() => setFilterStatus(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${filterStatus === s.id ? 'bg-[#1D9E75] text-white' : 'bg-surface-alt text-muted border border-border'}`}>
              {s.label} ({cotacoes.filter(c => c.status === s.id).length})
            </button>
          ))}
        </div>
        <button onClick={openNew} className="bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-bold text-sm uppercase flex items-center gap-2 hover:brightness-110 shrink-0">
          <PlusCircle size={16} /> Nova Cotação
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total, color: 'border-sky-500', text: 'text-primary' },
          { label: 'Aprovadas', value: aprovadas, color: 'border-emerald-500', text: 'text-emerald-400' },
          { label: 'Taxa Conversão', value: `${taxaConv}%`, color: 'border-amber-500', text: 'text-amber-400' },
          { label: 'Pipeline (R$)', value: formatCurrency(valorPipeline), color: 'border-purple-500', text: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className={`bg-surface border border-border ${s.color} border-b-4 rounded-xl p-4`}>
            <p className="text-[10px] font-bold text-placeholder uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {STAGES.map(stage => {
          const cards = filtered.filter(c => c.status === stage.id);
          const Icon = STAGE_ICON[stage.id];
          return (
            <div key={stage.id} className="space-y-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${stage.bg}`}>
                <Icon size={14} className={stage.color} />
                <span className={`text-xs font-black uppercase tracking-wider ${stage.color}`}>{stage.label}</span>
                <span className={`ml-auto text-xs font-bold ${stage.color}`}>{cotacoes.filter(c => c.status === stage.id).length}</span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {cards.map(c => (
                  <div key={c.id} className="bg-surface border border-border rounded-xl p-3 space-y-2 hover:border-[#1D9E75] transition-colors cursor-pointer" onClick={() => openEdit(c)}>
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-bold text-primary leading-tight">{c.cliente}</p>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(c)} className="text-blue-400 hover:text-blue-300"><Edit size={12} /></button>
                        <button onClick={() => setCotToDelete(c)} className="text-red-400 hover:text-red-300"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <p className="text-xs text-muted flex items-center gap-1"><FileText size={10} />{c.destino}</p>
                    {c.valorEstimado ? <p className="text-xs font-bold text-[#1D9E75]">{formatCurrency(c.valorEstimado)}</p> : null}
                    <p className="text-[10px] text-placeholder">{c.periodoIda ? new Date(c.periodoIda + 'T12:00:00').toLocaleDateString('pt-BR') : ''}{c.periodoVolta ? ` → ${new Date(c.periodoVolta + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}</p>
                    {/* Quick-action buttons */}
                    <div className="flex gap-1 flex-wrap pt-1 border-t border-border" onClick={e => e.stopPropagation()}>
                      {stage.id === 'Em cotação' && <button onClick={() => changeStatus(c.id, 'Enviada')} className="text-[9px] font-bold text-amber-400 bg-amber-900/20 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Send size={9}/> Enviar</button>}
                      {stage.id === 'Enviada' && <><button onClick={() => convertToVenda(c)} className="text-[9px] font-bold text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded flex items-center gap-0.5"><CheckCircle size={9}/> Aprovada</button>
                        <button onClick={() => changeStatus(c.id, 'Recusada')} className="text-[9px] font-bold text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded"><XCircle size={9}/> Recusada</button></>}
                      {stage.id === 'Aprovada' && <button onClick={() => toast('Abra Vendas e registre esta venda!', 'info')} className="text-[9px] font-bold text-sky-400 bg-sky-900/20 px-1.5 py-0.5 rounded flex items-center gap-0.5"><ArrowRight size={9}/> Converter em Venda</button>}
                    </div>
                  </div>
                ))}
                {cards.length === 0 && <p className="text-xs text-placeholder text-center py-4">—</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-border">
            <div className="p-5 border-b border-border bg-surface-alt rounded-t-2xl flex items-center justify-between">
              <h3 className="font-black text-primary uppercase tracking-wider">{editingId ? 'Editar Cotação' : 'Nova Cotação'}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-muted hover:text-primary" /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Cliente *</label>
                  <input required list="pessoas-list" className={inputCls} value={formData.cliente} onChange={e => fd({ cliente: e.target.value })} placeholder="Nome do cliente" />
                  <datalist id="pessoas-list">
                    {(data.pessoas || []).map((p: any) => <option key={p.id} value={p.nome} />)}
                  </datalist>
                </div>
                <div><label className={labelCls}>Destino</label><input required className={inputCls} value={formData.destino} onChange={e => fd({ destino: e.target.value })} placeholder="Ex: Paris, Lisboa..." /></div>
                <div><label className={labelCls}>Tipo</label>
                  <select className={inputCls} value={formData.tipo} onChange={e => fd({ tipo: e.target.value as any })}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Período — Ida</label><input type="date" required className={inputCls} value={formData.periodoIda} onChange={e => fd({ periodoIda: e.target.value })} /></div>
                <div><label className={labelCls}>Período — Volta</label><input type="date" className={inputCls} value={formData.periodoVolta || ''} onChange={e => fd({ periodoVolta: e.target.value })} /></div>
                <div><label className={labelCls}>Adultos</label><input type="number" min="1" className={inputCls} value={formData.adultos} onChange={e => fd({ adultos: Number(e.target.value) })} /></div>
                <div><label className={labelCls}>Crianças</label><input type="number" min="0" className={inputCls} value={formData.criancas || 0} onChange={e => fd({ criancas: Number(e.target.value) })} /></div>
                <div><label className={labelCls}>Valor Estimado (R$)</label><input type="number" min="0" step="0.01" className={inputCls} value={formData.valorEstimado || ''} onChange={e => fd({ valorEstimado: e.target.value ? Number(e.target.value) : undefined })} /></div>
                <div><label className={labelCls}>Prazo de Validade</label><input type="date" className={inputCls} value={formData.prazoValidade || ''} onChange={e => fd({ prazoValidade: e.target.value })} /></div>
                <div><label className={labelCls}>Status</label>
                  <select className={inputCls} value={formData.status} onChange={e => fd({ status: e.target.value as any })}>
                    {STAGES.map(s => <option key={s.id}>{s.id}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><label className={labelCls}>Observações</label>
                  <textarea rows={3} className={inputCls} value={formData.observacoes || ''} onChange={e => fd({ observacoes: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-border">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold">Cancelar</button>
                <button type="submit" className="bg-[#1D9E75] text-white px-6 py-2 rounded-lg font-bold uppercase text-sm">{editingId ? 'Atualizar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {cotToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 border border-border max-w-sm w-full text-center">
            <Trash2 size={36} className="text-red-500 mx-auto mb-3" />
            <p className="text-primary font-bold mb-1">Excluir cotação de <strong>{cotToDelete.cliente}</strong>?</p>
            <p className="text-sm text-muted mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setCotToDelete(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
