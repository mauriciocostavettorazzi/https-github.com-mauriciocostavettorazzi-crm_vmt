import React, { useState, useMemo } from 'react';
import { generateId } from '../utils';
import { toast } from '../toast';
import {
  MessageCircle, Send, CheckCircle, XCircle, Clock, Edit, Plus,
  Plane, Gift, User, Trash2, RefreshCw, X, Eye, ExternalLink,
} from 'lucide-react';
import type { MensagemWpp, TemplateWpp } from '../types';

// ─── templates padrão ──────────────────────────────────────────────────────
const DEFAULT_TEMPLATES: TemplateWpp[] = [
  {
    id: 'tpl-pre',
    nome: 'Pré-Viagem (48h)',
    tipo: 'pre-viagem',
    texto:
      'Olá {{nome}}! 🌍✈️\n\nSua viagem está chegando! Seguem os detalhes do seu embarque:\n\n🛫 Voo: {{voo}}\n📍 Trecho: {{trecho}}\n📅 Data: {{data}}\n🔑 Localizador: {{localizador}}\n\nLembre-se de chegar ao aeroporto com pelo menos 2h de antecedência.\n\nQualquer dúvida estamos à disposição! Boa viagem! 🙌\n\n— Volta ao Mundo Travel',
  },
  {
    id: 'tpl-pos',
    nome: 'Pós-Viagem (feedback)',
    tipo: 'pos-viagem',
    texto:
      'Olá {{nome}}! 😊\n\nEsperamos que sua viagem para {{destino}} tenha sido incrível! ✨\n\nGostaríamos muito de ouvir como foi a experiência. Seu feedback é muito importante para continuarmos melhorando nosso serviço.\n\nConta pra gente: como foi tudo? 🙏\n\n— Volta ao Mundo Travel',
  },
  {
    id: 'tpl-aniv',
    nome: 'Aniversário',
    tipo: 'aniversario',
    texto:
      'Olá {{nome}}! 🎂🎉\n\nHoje é um dia muito especial e a equipe Volta ao Mundo Travel quer te desejar um feliz aniversário!\n\nQue este novo ciclo seja repleto de novas aventuras e destinos incríveis. ✈️🌎\n\nFeliz aniversário! 🥳',
  },
];

// ─── helpers ───────────────────────────────────────────────────────────────
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

function buildWaLink(phone: string, text: string): string {
  return `https://wa.me/${formatPhone(phone)}?text=${encodeURIComponent(text)}`;
}

function applyTemplate(tpl: string, vars: Record<string, string>): string {
  let out = tpl;
  Object.entries(vars).forEach(([k, v]) => {
    out = out.replaceAll(`{{${k}}}`, v || '');
  });
  return out;
}

function diffHours(dateStr: string): number {
  return (new Date(dateStr + 'T12:00:00').getTime() - Date.now()) / 3_600_000;
}

const STATUS_STYLE: Record<MensagemWpp['status'], { color: string; bg: string; label: string }> = {
  pendente: { color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-700', label: 'Pendente' },
  enviada:  { color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-700', label: 'Enviada' },
  ignorada: { color: 'text-muted', bg: 'bg-surface-alt border-border', label: 'Ignorada' },
};

const TIPO_ICON: Record<MensagemWpp['tipo'], any> = {
  'pre-viagem': Plane,
  'pos-viagem': MessageCircle,
  aniversario:  Gift,
  manual:       User,
};

const TIPO_LABEL: Record<MensagemWpp['tipo'], string> = {
  'pre-viagem': 'Pré-Viagem',
  'pos-viagem': 'Pós-Viagem',
  aniversario:  'Aniversário',
  manual:       'Manual',
};

const inputCls = 'w-full border border-border-hover rounded-lg px-3 py-2 text-sm text-primary bg-surface-alt focus:outline-none focus:border-[#1D9E75]';
const labelCls = 'block text-xs font-bold text-muted uppercase tracking-wider mb-1';

// ─── Component ─────────────────────────────────────────────────────────────
export function Comunicacoes({ data, updateData }: any) {
  const mensagens: MensagemWpp[] = data.mensagensWpp || [];
  const templates: TemplateWpp[] = data.templatesWpp?.length
    ? data.templatesWpp
    : DEFAULT_TEMPLATES;

  const [tab, setTab] = useState<'pendentes' | 'historico' | 'templates'>('pendentes');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [showNew, setShowNew] = useState(false);
  const [editingTpl, setEditingTpl] = useState<TemplateWpp | null>(null);
  const [previewMsg, setPreviewMsg] = useState<MensagemWpp | null>(null);
  const [editMsg, setEditMsg] = useState<MensagemWpp | null>(null);

  // ── Detecção automática ──────────────────────────────────────────────────
  const autoDetect = () => {
    const now = Date.now();
    const enviadas = new Set(mensagens.filter(m => m.status !== 'ignorada').map(m => m.vooId).filter(Boolean));
    const novas: MensagemWpp[] = [];

    const tplPre = templates.find(t => t.tipo === 'pre-viagem') ?? DEFAULT_TEMPLATES[0];
    const tplPos = templates.find(t => t.tipo === 'pos-viagem') ?? DEFAULT_TEMPLATES[1];
    const tplAniv = templates.find(t => t.tipo === 'aniversario') ?? DEFAULT_TEMPLATES[2];

    // Pré-viagem: voos entre 0h e 72h a partir de agora
    (data.voos || []).forEach((voo: any) => {
      if (voo.status === 'Cancelado') return;
      const hours = diffHours(voo.dataPartida);
      if (hours < 0 || hours > 72) return;
      const key = `pre-${voo.id}`;
      if (enviadas.has(key)) return;

      const venda = (data.vendas || []).find((v: any) => v.id === voo.vendaId);
      if (!venda) return;
      const pessoa = (data.pessoas || []).find(
        (p: any) => p.nome === venda.cliente ||
          (venda.passageiros || []).some((pa: any) => pa.pessoaId === p.id)
      );
      const telefone = pessoa?.telefone || '';
      const dataFormatada = new Date(voo.dataPartida + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      const mensagem = applyTemplate(tplPre.texto, {
        nome: venda.cliente,
        voo: `${voo.ciaAerea} ${voo.numeroVoo}`.trim(),
        trecho: `${voo.origem} → ${voo.destino}`,
        data: dataFormatada,
        localizador: voo.localizador || '—',
        destino: voo.destino,
      });

      novas.push({
        id: generateId(), tipo: 'pre-viagem',
        pessoaNome: venda.cliente, telefone,
        mensagem, vendaId: venda.id, vooId: key,
        status: 'pendente', criadoEm: new Date().toISOString(),
      });
    });

    // Pós-viagem: voos que partiram entre 1 e 7 dias atrás
    (data.voos || []).forEach((voo: any) => {
      if (voo.status === 'Cancelado') return;
      const hours = diffHours(voo.dataPartida);
      if (hours > 0 || hours < -168) return; // > 0 = futuro; < -168h = > 7 dias
      const key = `pos-${voo.id}`;
      if (mensagens.some(m => m.vooId === key)) return;

      const venda = (data.vendas || []).find((v: any) => v.id === voo.vendaId);
      if (!venda) return;
      const pessoa = (data.pessoas || []).find(
        (p: any) => p.nome === venda.cliente ||
          (venda.passageiros || []).some((pa: any) => pa.pessoaId === p.id)
      );
      const telefone = pessoa?.telefone || '';
      const mensagem = applyTemplate(tplPos.texto, {
        nome: venda.cliente,
        destino: voo.destino,
        voo: `${voo.ciaAerea} ${voo.numeroVoo}`.trim(),
      });

      novas.push({
        id: generateId(), tipo: 'pos-viagem',
        pessoaNome: venda.cliente, telefone,
        mensagem, vendaId: venda.id, vooId: key,
        status: 'pendente', criadoEm: new Date().toISOString(),
      });
    });

    // Aniversários de hoje
    const hoje = new Date();
    const todayMD = `${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const anivIds = new Set(mensagens.filter(m => m.tipo === 'aniversario' && m.criadoEm?.startsWith(hoje.toISOString().slice(0, 10))).map(m => m.pessoaNome));

    (data.pessoas || []).forEach((p: any) => {
      if (!p.dataNascimento || anivIds.has(p.nome)) return;
      const d = new Date(p.dataNascimento + 'T12:00:00');
      const pMD = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (pMD !== todayMD) return;
      const mensagem = applyTemplate(tplAniv.texto, { nome: p.nome });
      novas.push({
        id: generateId(), tipo: 'aniversario',
        pessoaNome: p.nome, telefone: p.telefone || '',
        mensagem, status: 'pendente', criadoEm: new Date().toISOString(),
      });
    });

    if (novas.length === 0) { toast('Nenhuma mensagem nova detectada.', 'info'); return; }
    updateData({ mensagensWpp: [...novas, ...mensagens] });
    toast(`${novas.length} mensagem(ns) gerada(s)!`);
  };

  const markStatus = (id: string, status: MensagemWpp['status']) => {
    updateData({
      mensagensWpp: mensagens.map(m =>
        m.id === id ? { ...m, status, enviadaEm: status === 'enviada' ? new Date().toISOString() : m.enviadaEm } : m
      ),
    });
    if (status === 'enviada') toast('Marcada como enviada!');
    if (status === 'ignorada') toast('Mensagem ignorada.', 'info');
  };

  const deleteMensagem = (id: string) => {
    updateData({ mensagensWpp: mensagens.filter(m => m.id !== id) });
    toast('Mensagem removida.', 'info');
  };

  const saveMsgEdit = () => {
    if (!editMsg) return;
    updateData({ mensagensWpp: mensagens.map(m => m.id === editMsg.id ? editMsg : m) });
    setEditMsg(null);
    toast('Mensagem atualizada!');
  };

  // ── Template CRUD ─────────────────────────────────────────────────────────
  const saveTpl = (tpl: TemplateWpp) => {
    const existing = templates.find(t => t.id === tpl.id);
    const updated = existing
      ? templates.map(t => t.id === tpl.id ? tpl : t)
      : [...templates, tpl];
    updateData({ templatesWpp: updated });
    setEditingTpl(null);
    toast('Template salvo!');
  };

  const deleteTpl = (id: string) => {
    updateData({ templatesWpp: templates.filter(t => t.id !== id) });
    toast('Template excluído.', 'info');
  };

  // ── Nova mensagem manual ──────────────────────────────────────────────────
  const [newForm, setNewForm] = useState({ pessoaNome: '', telefone: '', mensagem: '', tipo: 'manual' as MensagemWpp['tipo'] });

  const saveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.telefone) { toast('Telefone obrigatório.', 'error'); return; }
    updateData({
      mensagensWpp: [{
        id: generateId(), ...newForm, status: 'pendente', criadoEm: new Date().toISOString(),
      }, ...mensagens],
    });
    setShowNew(false);
    setNewForm({ pessoaNome: '', telefone: '', mensagem: '', tipo: 'manual' });
    toast('Mensagem criada!');
  };

  // ── Derived lists ──────────────────────────────────────────────────────────
  const pendentes = mensagens.filter(m => m.status === 'pendente');
  const historico = mensagens.filter(m => m.status !== 'pendente');

  const filtrarTipo = (list: MensagemWpp[]) =>
    filterTipo === 'todos' ? list : list.filter(m => m.tipo === filterTipo);

  const stats = {
    pendentes: pendentes.length,
    enviadas: mensagens.filter(m => m.status === 'enviada').length,
    ignoradas: mensagens.filter(m => m.status === 'ignorada').length,
    semTelefone: pendentes.filter(m => !m.telefone).length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {(['pendentes', 'historico', 'templates'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${tab === t ? 'bg-[#1D9E75] text-white' : 'bg-surface-alt text-muted border border-border hover:text-primary'}`}>
              {t === 'pendentes' ? `Pendentes${stats.pendentes ? ` (${stats.pendentes})` : ''}` : t === 'historico' ? 'Histórico' : 'Templates'}
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={autoDetect}
            className="flex items-center gap-2 border border-[#1D9E75] text-[#1D9E75] px-4 py-2 rounded-lg font-bold text-sm uppercase hover:bg-[#1D9E75]/10 transition-colors">
            <RefreshCw size={15} /> Detectar Automático
          </button>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-bold text-sm uppercase hover:brightness-110">
            <Plus size={15} /> Nova Manual
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pendentes', value: stats.pendentes, color: 'border-amber-500', text: 'text-amber-400' },
          { label: 'Enviadas', value: stats.enviadas, color: 'border-emerald-500', text: 'text-emerald-400' },
          { label: 'Ignoradas', value: stats.ignoradas, color: 'border-border', text: 'text-muted' },
          { label: 'Sem Telefone', value: stats.semTelefone, color: 'border-red-500', text: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className={`bg-surface border border-border ${s.color} border-b-4 rounded-xl p-4`}>
            <p className="text-[10px] font-bold text-placeholder uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.text}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── TAB: Pendentes ── */}
      {tab === 'pendentes' && (
        <div className="space-y-4">
          {/* Tipo filter */}
          <div className="flex gap-2 flex-wrap">
            {['todos', 'pre-viagem', 'pos-viagem', 'aniversario', 'manual'].map(t => (
              <button key={t} onClick={() => setFilterTipo(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${filterTipo === t ? 'bg-[#1D9E75] text-white' : 'bg-surface-alt text-muted border border-border'}`}>
                {t === 'todos' ? 'Todos' : TIPO_LABEL[t as MensagemWpp['tipo']]}
              </button>
            ))}
          </div>

          {filtrarTipo(pendentes).length === 0 && (
            <div className="bg-surface border border-border rounded-2xl p-10 text-center space-y-3">
              <MessageCircle size={40} className="text-muted mx-auto" />
              <p className="text-muted font-bold">Nenhuma mensagem pendente.</p>
              <p className="text-sm text-placeholder">Clique em <strong>Detectar Automático</strong> para verificar viagens em 48h, pós-viagem e aniversários.</p>
            </div>
          )}

          <div className="space-y-3">
            {filtrarTipo(pendentes).map(m => {
              const Icon = TIPO_ICON[m.tipo];
              const hasPhone = !!m.telefone;
              return (
                <div key={m.id} className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-[#1D9E75]/50 transition-colors">
                  <div className="flex items-center justify-between gap-3 px-5 py-3 bg-surface-alt border-b border-border">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-[#1D9E75]" />
                      <span className="text-xs font-black uppercase tracking-wider text-muted">{TIPO_LABEL[m.tipo]}</span>
                      {!hasPhone && (
                        <span className="text-[9px] font-black bg-red-900/30 text-red-400 border border-red-700 px-1.5 py-0.5 rounded-full uppercase">Sem telefone</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setEditMsg({ ...m })} title="Editar" className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded"><Edit size={13} /></button>
                      <button onClick={() => setPreviewMsg(m)} title="Pré-visualizar" className="p-1.5 text-muted hover:bg-surface-hover rounded"><Eye size={13} /></button>
                      <button onClick={() => deleteMensagem(m.id)} title="Remover" className="p-1.5 text-red-400 hover:bg-red-900/30 rounded"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <p className="font-black text-primary">{m.pessoaNome}</p>
                        <p className="text-xs text-muted font-mono">{m.telefone || '—'}</p>
                        <p className="text-xs text-placeholder line-clamp-2 mt-1">{m.mensagem}</p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {hasPhone ? (
                          <a href={buildWaLink(m.telefone, m.mensagem)} target="_blank" rel="noreferrer"
                            onClick={() => setTimeout(() => markStatus(m.id, 'enviada'), 1500)}
                            className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg font-bold text-xs uppercase hover:brightness-110 transition-all whitespace-nowrap">
                            <MessageCircle size={14} /> Enviar WhatsApp
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span className="text-xs text-muted italic">Adicione o telefone no cadastro</span>
                        )}
                        <div className="flex gap-1.5">
                          <button onClick={() => markStatus(m.id, 'enviada')}
                            className="flex-1 flex items-center justify-center gap-1 bg-emerald-900/30 text-emerald-400 border border-emerald-700 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-900/50">
                            <CheckCircle size={11} /> Marcar enviada
                          </button>
                          <button onClick={() => markStatus(m.id, 'ignorada')}
                            className="flex-1 flex items-center justify-center gap-1 bg-surface-alt text-muted border border-border px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:text-primary">
                            <XCircle size={11} /> Ignorar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: Histórico ── */}
      {tab === 'historico' && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-alt text-[10px] uppercase font-bold text-placeholder">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Enviada em</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {historico.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted">Nenhuma mensagem no histórico.</td></tr>
              )}
              {historico.map(m => {
                const Icon = TIPO_ICON[m.tipo];
                const st = STATUS_STYLE[m.status];
                return (
                  <tr key={m.id} className="hover:bg-surface-alt transition-colors">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-muted">
                        <Icon size={13} className="text-[#1D9E75]" />{TIPO_LABEL[m.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">{m.pessoaNome}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{m.telefone || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {m.enviadaEm ? new Date(m.enviadaEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${st.bg} ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button onClick={() => setPreviewMsg(m)} className="p-1.5 text-muted hover:text-primary hover:bg-surface-hover rounded"><Eye size={13} /></button>
                        {m.telefone && (
                          <a href={buildWaLink(m.telefone, m.mensagem)} target="_blank" rel="noreferrer"
                            className="p-1.5 text-[#25D366] hover:bg-[#25D366]/10 rounded"><ExternalLink size={13} /></a>
                        )}
                        <button onClick={() => deleteMensagem(m.id)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB: Templates ── */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setEditingTpl({ id: generateId(), nome: '', tipo: 'manual', texto: '' })}
              className="flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-bold text-sm uppercase">
              <Plus size={15} /> Novo Template
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(tpl => {
              const Icon = TIPO_ICON[tpl.tipo];
              return (
                <div key={tpl.id} className="bg-surface border border-border rounded-xl p-4 space-y-3 hover:border-[#1D9E75]/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-[#1D9E75]" />
                      <p className="font-black text-primary text-sm">{tpl.nome}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingTpl({ ...tpl })} className="p-1 text-blue-400 hover:bg-blue-900/20 rounded"><Edit size={13} /></button>
                      <button onClick={() => deleteTpl(tpl.id)} className="p-1 text-red-400 hover:bg-red-900/20 rounded"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    tpl.tipo === 'pre-viagem' ? 'bg-sky-900/30 text-sky-400 border-sky-700' :
                    tpl.tipo === 'pos-viagem' ? 'bg-purple-900/30 text-purple-400 border-purple-700' :
                    tpl.tipo === 'aniversario' ? 'bg-pink-900/30 text-pink-400 border-pink-700' :
                    'bg-surface-alt text-muted border-border'}`}>{TIPO_LABEL[tpl.tipo]}</span>
                  <p className="text-xs text-muted line-clamp-3 whitespace-pre-line">{tpl.texto}</p>
                  <p className="text-[10px] text-placeholder">
                    Variáveis: {'{'}{'{'}}nome{'}'}{'}'}, {'{'}{'{'}}voo{'}'}{'}'}, {'{'}{'{'}}trecho{'}'}{'}'}, {'{'}{'{'}}data{'}'}{'}'}, {'{'}{'{'}}localizador{'}'}{'}'}, {'{'}{'{'}}destino{'}'}{'}'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal: Preview ── */}
      {previewMsg && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-alt rounded-t-2xl">
              <p className="font-black text-primary text-sm uppercase tracking-wider">Pré-visualização</p>
              <button onClick={() => setPreviewMsg(null)}><X size={18} className="text-muted" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2 text-sm">
                <span className="text-muted font-bold">Para:</span>
                <span className="text-primary font-bold">{previewMsg.pessoaNome}</span>
                <span className="font-mono text-muted">{previewMsg.telefone}</span>
              </div>
              {/* WhatsApp mockup */}
              <div className="bg-[#0a1628] rounded-2xl p-4 max-h-72 overflow-y-auto">
                <div className="bg-[#005C4B] text-white text-sm rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] ml-auto whitespace-pre-line leading-relaxed shadow-lg">
                  {previewMsg.mensagem}
                </div>
              </div>
              {previewMsg.telefone ? (
                <a href={buildWaLink(previewMsg.telefone, previewMsg.mensagem)} target="_blank" rel="noreferrer"
                  onClick={() => { setTimeout(() => markStatus(previewMsg.id, 'enviada'), 1500); setPreviewMsg(null); }}
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-2.5 rounded-xl font-bold uppercase hover:brightness-110">
                  <MessageCircle size={16} /> Abrir no WhatsApp <ExternalLink size={13} />
                </a>
              ) : (
                <p className="text-center text-sm text-red-400">Sem telefone cadastrado para este cliente.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar mensagem ── */}
      {editMsg && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-alt rounded-t-2xl">
              <p className="font-black text-primary text-sm uppercase tracking-wider">Editar Mensagem</p>
              <button onClick={() => setEditMsg(null)}><X size={18} className="text-muted" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className={labelCls}>Nome do Cliente</label>
                <input className={inputCls} value={editMsg.pessoaNome} onChange={e => setEditMsg({ ...editMsg, pessoaNome: e.target.value })} /></div>
              <div><label className={labelCls}>Telefone (com DDD)</label>
                <input className={inputCls} value={editMsg.telefone} onChange={e => setEditMsg({ ...editMsg, telefone: e.target.value })} placeholder="11999999999" /></div>
              <div><label className={labelCls}>Mensagem</label>
                <textarea rows={7} className={inputCls} value={editMsg.mensagem} onChange={e => setEditMsg({ ...editMsg, mensagem: e.target.value })} /></div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditMsg(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold">Cancelar</button>
                <button onClick={saveMsgEdit} className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg font-bold uppercase">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar template ── */}
      {editingTpl && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-xl">
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-alt rounded-t-2xl">
              <p className="font-black text-primary text-sm uppercase tracking-wider">{editingTpl.nome ? 'Editar Template' : 'Novo Template'}</p>
              <button onClick={() => setEditingTpl(null)}><X size={18} className="text-muted" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className={labelCls}>Nome do Template</label>
                <input className={inputCls} value={editingTpl.nome} onChange={e => setEditingTpl({ ...editingTpl, nome: e.target.value })} /></div>
              <div><label className={labelCls}>Tipo</label>
                <select className={inputCls} value={editingTpl.tipo} onChange={e => setEditingTpl({ ...editingTpl, tipo: e.target.value as any })}>
                  <option value="pre-viagem">Pré-Viagem</option>
                  <option value="pos-viagem">Pós-Viagem</option>
                  <option value="aniversario">Aniversário</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Texto</label>
                <p className="text-[10px] text-placeholder mb-1">Use: {'{{nome}}'}, {'{{voo}}'}, {'{{trecho}}'}, {'{{data}}'}, {'{{localizador}}'}, {'{{destino}}'}</p>
                <textarea rows={8} className={inputCls} value={editingTpl.texto} onChange={e => setEditingTpl({ ...editingTpl, texto: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditingTpl(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold">Cancelar</button>
                <button onClick={() => saveTpl(editingTpl)} className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg font-bold uppercase">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nova manual ── */}
      {showNew && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface-alt rounded-t-2xl">
              <p className="font-black text-primary text-sm uppercase tracking-wider">Nova Mensagem Manual</p>
              <button onClick={() => setShowNew(false)}><X size={18} className="text-muted" /></button>
            </div>
            <form onSubmit={saveNew} className="p-5 space-y-4">
              <div><label className={labelCls}>Cliente</label>
                <input list="pessoas-wpp" className={inputCls} value={newForm.pessoaNome}
                  onChange={e => {
                    const pessoa = (data.pessoas || []).find((p: any) => p.nome === e.target.value);
                    setNewForm({ ...newForm, pessoaNome: e.target.value, telefone: pessoa?.telefone || newForm.telefone });
                  }} placeholder="Nome do cliente" />
                <datalist id="pessoas-wpp">{(data.pessoas || []).map((p: any) => <option key={p.id} value={p.nome} />)}</datalist>
              </div>
              <div><label className={labelCls}>Telefone *</label>
                <input required className={inputCls} value={newForm.telefone} onChange={e => setNewForm({ ...newForm, telefone: e.target.value })} placeholder="11999999999" /></div>
              <div><label className={labelCls}>Template rápido</label>
                <select className={inputCls} onChange={e => {
                  const tpl = templates.find(t => t.id === e.target.value);
                  if (tpl) setNewForm(f => ({ ...f, mensagem: applyTemplate(tpl.texto, { nome: newForm.pessoaNome }) }));
                }}>
                  <option value="">Selecione um template...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Mensagem</label>
                <textarea required rows={6} className={inputCls} value={newForm.mensagem} onChange={e => setNewForm({ ...newForm, mensagem: e.target.value })} /></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg font-bold uppercase">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
