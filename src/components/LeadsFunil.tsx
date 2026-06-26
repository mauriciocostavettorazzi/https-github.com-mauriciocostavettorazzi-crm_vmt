import React, { useState } from 'react';
import { generateId } from '../utils';
import { toast } from '../toast';
import { PlusCircle, X, ChevronRight, ChevronLeft, Trash2, Phone, Mail, MapPin, DollarSign, ArrowRight } from 'lucide-react';
import type { Lead } from '../types';

const STAGES: { id: Lead['stage']; label: string; color: string; bg: string; border: string }[] = [
  { id: 'novo',      label: 'Novo Lead',          color: 'text-sky-400',    bg: 'bg-sky-900/20',    border: 'border-sky-700' },
  { id: 'contato',   label: 'Em Contato',          color: 'text-amber-400',  bg: 'bg-amber-900/20',  border: 'border-amber-700' },
  { id: 'proposta',  label: 'Proposta Enviada',    color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-700' },
  { id: 'aprovacao', label: 'Aguard. Aprovação',   color: 'text-orange-400', bg: 'bg-orange-900/20', border: 'border-orange-700' },
  { id: 'fechado',   label: 'Fechado ✓',           color: 'text-emerald-400',bg: 'bg-emerald-900/20',border: 'border-emerald-700' },
  { id: 'perdido',   label: 'Perdido ✗',           color: 'text-red-400',    bg: 'bg-red-900/20',    border: 'border-red-700' },
];

const STAGE_ORDER: Lead['stage'][] = ['novo', 'contato', 'proposta', 'aprovacao', 'fechado'];

const EMPTY_FORM = (): Omit<Lead, 'id' | 'criadoEm' | 'atualizadoEm'> => ({
  nome: '', telefone: '', email: '', interesse: '',
  destino: '', orcamento: undefined, stage: 'novo',
  observacoes: '', origem: 'WhatsApp',
});

const formatCurrency = (v?: number) =>
  v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

export function LeadsFunil({ data, updateData, onConvertLead }: {
  data: any;
  updateData: (patch: any) => void;
  onConvertLead: (lead: Lead) => void;
}) {
  const leads: Lead[] = data.leads || [];
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM());

  const openNew = () => { setFormData(EMPTY_FORM()); setEditingLead(null); setShowForm(true); };
  const openEdit = (l: Lead) => { setFormData({ ...l }); setEditingLead(l); setShowForm(true); };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    if (editingLead) {
      updateData({ leads: leads.map(l => l.id === editingLead.id ? { ...l, ...formData, atualizadoEm: now } : l) });
      toast('Lead atualizado!', 'success');
    } else {
      const novo: Lead = { ...formData, id: generateId(), criadoEm: now, atualizadoEm: now };
      updateData({ leads: [novo, ...leads] });
      toast('Lead adicionado!', 'success');
    }
    setShowForm(false);
  };

  const moveStage = (lead: Lead, dir: 1 | -1) => {
    const idx = STAGE_ORDER.indexOf(lead.stage as any);
    const next = STAGE_ORDER[idx + dir];
    if (!next) return;
    updateData({ leads: leads.map(l => l.id === lead.id ? { ...l, stage: next, atualizadoEm: new Date().toISOString() } : l) });
  };

  const markLost = (lead: Lead) => {
    if (!window.confirm(`Marcar "${lead.nome}" como perdido?`)) return;
    updateData({ leads: leads.map(l => l.id === lead.id ? { ...l, stage: 'perdido', atualizadoEm: new Date().toISOString() } : l) });
    toast('Lead marcado como perdido.', 'info');
  };

  const deleteLead = (id: string) => {
    const lead = leads.find(l => l.id === id);
    if (!window.confirm(`Excluir o lead "${lead?.nome}"?`)) return;
    updateData({ leads: leads.filter(l => l.id !== id) });
    toast('Lead excluído.', 'info');
  };

  const inputCls = "w-full border border-border-hover rounded-lg px-3 py-2 text-sm text-primary bg-surface focus:outline-none focus:border-[#1D9E75]";
  const labelCls = "block text-xs font-bold text-muted uppercase tracking-wider mb-1";

  // Stats
  const total = leads.length;
  const ativos = leads.filter(l => !['fechado', 'perdido'].includes(l.stage)).length;
  const fechados = leads.filter(l => l.stage === 'fechado').length;
  const taxaConversao = total > 0 ? ((fechados / total) * 100).toFixed(0) : '0';
  const orcamentoTotal = leads.filter(l => l.stage === 'fechado' && l.orcamento).reduce((s, l) => s + (l.orcamento || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Leads', value: total, color: 'border-l-sky-500' },
          { label: 'Leads Ativos', value: ativos, color: 'border-l-amber-500' },
          { label: 'Taxa de Conversão', value: `${taxaConversao}%`, color: 'border-l-emerald-500' },
          { label: 'Receita Fechada', value: formatCurrency(orcamentoTotal), color: 'border-l-purple-500' },
        ].map(s => (
          <div key={s.label} className={`bg-surface rounded-xl border border-border border-l-4 ${s.color} p-4`}>
            <p className="text-[10px] font-bold text-placeholder uppercase tracking-widest">{s.label}</p>
            <p className="text-2xl font-black text-primary mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-primary uppercase tracking-wider">Pipeline de Leads</h3>
        <button onClick={openNew} className="bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-bold text-sm uppercase flex items-center gap-2 hover:brightness-110">
          <PlusCircle size={16} /> Novo Lead
        </button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage.id);
          const stageIdx = STAGE_ORDER.indexOf(stage.id as any);
          return (
            <div key={stage.id} className={`rounded-xl border ${stage.border} ${stage.bg} p-3 flex flex-col gap-2 min-h-[200px]`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-black uppercase tracking-widest ${stage.color}`}>{stage.label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${stage.bg} ${stage.color} border ${stage.border}`}>{stageLeads.length}</span>
              </div>
              {stageLeads.map(lead => (
                <div key={lead.id} className="bg-surface border border-border rounded-lg p-3 text-xs space-y-1.5 cursor-pointer hover:border-[#1D9E75] transition-colors group"
                  onClick={() => openEdit(lead)}>
                  <p className="font-black text-primary text-sm leading-tight">{lead.nome}</p>
                  {lead.interesse && <p className="text-placeholder italic truncate">{lead.interesse}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lead.destino && (
                      <span className="flex items-center gap-0.5 bg-surface-alt text-muted px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                        <MapPin size={8} /> {lead.destino}
                      </span>
                    )}
                    {lead.orcamento && (
                      <span className="flex items-center gap-0.5 bg-emerald-900/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-bold">
                        <DollarSign size={8} /> {formatCurrency(lead.orcamento)}
                      </span>
                    )}
                    {lead.origem && (
                      <span className="bg-surface-alt text-placeholder px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">{lead.origem}</span>
                    )}
                  </div>
                  <p className="text-[9px] text-placeholder">{new Date(lead.criadoEm).toLocaleDateString('pt-BR')}</p>

                  {/* Actions — visible on hover */}
                  <div className="flex gap-1 pt-1 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {stageIdx > 0 && (
                      <button onClick={() => moveStage(lead, -1)} title="Voltar etapa"
                        className="flex-1 flex items-center justify-center gap-0.5 bg-surface-alt text-muted hover:text-primary py-0.5 rounded text-[9px] font-bold">
                        <ChevronLeft size={10} />
                      </button>
                    )}
                    {stageIdx < STAGE_ORDER.length - 1 && (
                      <button onClick={() => moveStage(lead, 1)} title="Avançar etapa"
                        className="flex-1 flex items-center justify-center gap-0.5 bg-[#1D9E75]/20 text-emerald-400 hover:bg-[#1D9E75]/40 py-0.5 rounded text-[9px] font-bold">
                        <ChevronRight size={10} />
                      </button>
                    )}
                    {lead.stage !== 'fechado' && lead.stage !== 'perdido' && (
                      <button onClick={() => markLost(lead)} title="Marcar como perdido"
                        className="flex-1 flex items-center justify-center bg-red-900/20 text-red-400 hover:bg-red-900/40 py-0.5 rounded text-[9px] font-bold">
                        ✗
                      </button>
                    )}
                    {(lead.stage === 'aprovacao' || lead.stage === 'fechado') && (
                      <button onClick={() => onConvertLead(lead)} title="Converter em Venda"
                        className="flex-1 flex items-center justify-center gap-0.5 bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 py-0.5 rounded text-[9px] font-bold">
                        <ArrowRight size={10} /> Venda
                      </button>
                    )}
                    <button onClick={() => deleteLead(lead.id)} title="Excluir"
                      className="flex items-center justify-center bg-red-900/10 text-red-400 hover:bg-red-900/30 px-1.5 py-0.5 rounded text-[9px]">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
              {stageLeads.length === 0 && (
                <p className="text-[10px] text-placeholder text-center italic mt-4">Nenhum lead</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg border border-border flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface-alt rounded-t-2xl sticky top-0">
              <h3 className="text-lg font-black text-primary uppercase tracking-wider flex items-center gap-2">
                <PlusCircle size={18} className="text-[#1D9E75]" />
                {editingLead ? 'Editar Lead' : 'Novo Lead'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-surface-hover rounded-full"><X size={18} className="text-muted" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 overflow-y-auto grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Nome *</label>
                <input required type="text" className={inputCls} value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Telefone / WhatsApp</label>
                <input type="text" className={inputCls} value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>E-mail</label>
                <input type="email" className={inputCls} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Interesse / O que procura *</label>
                <input required type="text" placeholder="Ex: Viagem para Paris em julho, casal" className={inputCls} value={formData.interesse} onChange={e => setFormData({ ...formData, interesse: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Destino</label>
                <input type="text" className={inputCls} value={formData.destino} onChange={e => setFormData({ ...formData, destino: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Orçamento Estimado (R$)</label>
                <input type="number" min="0" className={inputCls} value={formData.orcamento ?? ''} onChange={e => setFormData({ ...formData, orcamento: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div>
                <label className={labelCls}>Origem do Lead</label>
                <select className={inputCls} value={formData.origem} onChange={e => setFormData({ ...formData, origem: e.target.value as any })}>
                  <option>WhatsApp</option>
                  <option>Instagram</option>
                  <option>Indicação</option>
                  <option>Site</option>
                  <option>Outro</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Etapa do Funil</label>
                <select className={inputCls} value={formData.stage} onChange={e => setFormData({ ...formData, stage: e.target.value as any })}>
                  {STAGES.filter(s => s.id !== 'perdido').map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Observações</label>
                <textarea rows={3} className={inputCls} value={formData.observacoes} onChange={e => setFormData({ ...formData, observacoes: e.target.value })} />
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-2 border-t border-border mt-1">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold text-sm hover:bg-surface-hover">Cancelar</button>
                <button type="submit" className="bg-[#1D9E75] text-white px-6 py-2 rounded-lg font-bold uppercase tracking-wider text-sm hover:brightness-110">
                  {editingLead ? 'Atualizar' : 'Adicionar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
