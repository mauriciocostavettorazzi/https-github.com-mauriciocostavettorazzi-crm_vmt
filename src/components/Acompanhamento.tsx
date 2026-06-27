import React, { useState, useMemo } from 'react';
import { generateId, isCheckinLiberado, getCheckinUrl, generateCalendarLink, formatCurrency } from '../utils';
import { subDays, addDays } from 'date-fns';
import {
  Plane, BedDouble, Ship, Shield, Car, Package2,
  PlusCircle, Search, Calendar, ExternalLink, Edit, Trash2,
  X, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import { toast } from '../toast';

// ── Cores de marca ───────────────────────────────────────────────────────────
const C = { magenta: '#FF2D74', cyan: '#25C2F2', orange: '#FF9F2E', teal: '#1FBE93', amber: '#FBBF24', red: '#FF5A6E' };

// ── Helpers de estilo ────────────────────────────────────────────────────────
const cardStyle = { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 18 };
const labelCls = 'block text-[11px] font-bold mb-1' as const;
const inputCls = 'w-full rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] bg-[color:var(--bg-surface-alt)] border border-[color:var(--border-color)] focus:outline-none' as const;

// ── Status badge ─────────────────────────────────────────────────────────────
const STATUS: Record<string, { bg: string; color: string }> = {
  Emitido:    { bg: `${C.cyan}22`,    color: C.cyan },
  Reemitido:  { bg: `${C.amber}22`,   color: C.amber },
  Confirmado: { bg: `${C.teal}22`,    color: C.teal },
  Cancelado:  { bg: `${C.red}22`,     color: C.red },
  Voado:      { bg: 'rgba(255,255,255,.07)', color: 'var(--text-faint)' },
  Ativo:      { bg: `${C.teal}22`,    color: C.teal },
  Pendente:   { bg: `${C.amber}22`,   color: C.amber },
};
function StatusBadge({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const st = STATUS[value] || STATUS['Pendente'];
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-[10px] font-bold px-2 py-1 rounded-full border-0 outline-none cursor-pointer appearance-none"
      style={{ background: st.bg, color: st.color }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ── Chip IATA ────────────────────────────────────────────────────────────────
function IataChip({ code }: { code: string }) {
  return (
    <span className="font-mono-brand text-[11px] font-medium px-2 py-0.5 rounded-lg" style={{ background: '#1B264E', color: '#cfd8f5' }}>
      {code?.toUpperCase() || '—'}
    </span>
  );
}

// ── Countdown badge ───────────────────────────────────────────────────────────
function Countdown({ dateStr }: { dateStr: string }) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff < 0) return <span className="text-[10px]" style={{ color: C.red }}>Passado</span>;
  if (diff === 0) return <span className="text-[10px] font-bold" style={{ color: C.magenta }}>Hoje!</span>;
  if (diff <= 2) return <span className="text-[10px] font-bold" style={{ color: C.red }}>{diff}d</span>;
  if (diff <= 7) return <span className="text-[10px] font-bold" style={{ color: C.amber }}>{diff}d</span>;
  return <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{diff}d</span>;
}

// ── Seção colapsável ─────────────────────────────────────────────────────────
function Section({ icon: Icon, color, title, count, children, defaultOpen = true }: any) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={cardStyle} className="overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4"
        style={{ borderBottom: open ? '1px solid var(--border-color)' : 'none' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="font-display font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>{title}</span>
          {count > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
              {count}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} style={{ color: 'var(--text-faint)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-faint)' }} />}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(7,13,34,.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[20px]" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', boxShadow: '0 30px 80px rgba(0,0,0,.6)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <p className="font-display font-bold text-[16px]" style={{ color: 'var(--text-primary)' }}>{title}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[color:var(--bg-surface-hover)]"><X size={18} style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function Acompanhamento({ data, updateData }: any) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<null | 'voo' | 'pacote' | 'hospedagem' | 'cruzeiro' | 'seguro' | 'carro'>(null);
  const [editItem, setEditItem] = useState<any>(null);

  const now = new Date();

  // ── Voos: combina data.voos com voos embutidos nas vendas de pacote ─────────
  const todosVoos = useMemo(() => {
    const diretos = (data.voos || []);
    // Voos registrados dentro de vendas (tipo Pacote ou Passagem Aérea) via voosList
    const deVendas: any[] = [];
    (data.vendas || []).filter((v: any) => v.status !== 'Cancelado' && v.voosList?.length).forEach((v: any) => {
      (v.voosList || []).forEach((voo: any) => {
        if (!voo.dataPartida) return;
        // Evitar duplicar se já existe em data.voos com mesmo localizador
        const jaExiste = diretos.some((d: any) => d.localizador && d.localizador === voo.localizador);
        if (!jaExiste) {
          deVendas.push({
            ...voo,
            id: voo.id || `venda-${v.id}-${voo.id}`,
            vendaId: v.id,
            cliente: v.cliente,
            passageiros: voo.passageiros || v.cliente,
            status: 'Emitido',
            _origem: 'venda',
            _vendaCliente: v.cliente,
            _vendaTipo: v.tipo,
          });
        }
      });
    });
    return [...diretos, ...deVendas];
  }, [data.voos, data.vendas]);

  const proximosVoos = useMemo(() =>
    todosVoos
      .filter((v: any) => v.status !== 'Cancelado' && v.status !== 'Voado' && new Date(v.dataPartida) > subDays(now, 1))
      .sort((a: any, b: any) => new Date(a.dataPartida).getTime() - new Date(b.dataPartida).getTime()),
    [todosVoos]);

  const voosPassados = useMemo(() =>
    todosVoos
      .filter((v: any) => v.status === 'Voado' || (new Date(v.dataPartida) < now && v.status !== 'Cancelado'))
      .sort((a: any, b: any) => new Date(b.dataPartida).getTime() - new Date(a.dataPartida).getTime()),
    [todosVoos]);

  // ── Pacotes ──────────────────────────────────────────────────────────────────
  const pacotes = (data.pacotes || []);
  const hospedagens = useMemo(() => {
    // Hospedagens lançadas dentro de vendas + módulo próprio
    const deVendas: any[] = [];
    (data.vendas || []).filter((v: any) => v.status !== 'Cancelado').forEach((v: any) => {
      (v.hospedagens || []).forEach((h: any) => {
        deVendas.push({ ...h, _vendaCliente: v.cliente, _vendaId: v.id });
      });
    });
    return [...(data.hospedagensAvulsas || []), ...deVendas];
  }, [data.vendas, data.hospedagensAvulsas]);

  const cruzeiros   = data.cruzeiros   || [];
  const seguros     = useMemo(() => {
    // Seguros registrados nas vendas + módulo próprio
    const deVendas: any[] = [];
    (data.vendas || []).filter((v: any) => v.status !== 'Cancelado' && v.seguro?.seguradora).forEach((v: any) => {
      deVendas.push({ ...v.seguro, id: `seg-${v.id}`, cliente: v.cliente, _vendaId: v.id });
    });
    return [...(data.segurosAvulsos || []), ...deVendas];
  }, [data.vendas, data.segurosAvulsos]);

  const carros      = data.carrosLocados || [];

  // ── Formulários ───────────────────────────────────────────────────────────────
  const initVoo = () => ({ vendaId: '', ciaAerea: '', numeroVoo: '', origem: '', destino: '', dataPartida: '', dataChegada: '', localizador: '', passageiros: '', tipoVoo: 'Nacional', formaEmissao: 'Milhas', fornecedor: '', status: 'Emitido' });
  const initPacote = () => ({ cliente: '', destino: '', operadora: '', dataInicio: '', dataFim: '', valor: '', status: 'Confirmado', observacoes: '' });
  const initHosp = () => ({ nome: '', plataforma: 'Booking.com', voucher: '', checkIn: '', checkOut: '', quartos: 1, tipoQuarto: '', regimeAlimentar: 'Café da Manhã', cidade: '', observacoes: '', cliente: '' });
  const initCruz = () => ({ cliente: '', navio: '', armador: '', porto: '', dataEmbarque: '', dataDesembarque: '', cabine: '', valor: '', status: 'Confirmado', observacoes: '' });
  const initSeguro = () => ({ cliente: '', seguradora: '', apolice: '', cobertura: '', validade: '', valor: '', status: 'Ativo', observacoes: '' });
  const initCarro = () => ({ cliente: '', locadora: '', modelo: '', retirada: '', devolucao: '', localRetirada: '', valor: '', status: 'Confirmado', observacoes: '' });

  const [form, setForm] = useState<any>({});
  const openModal = (tipo: typeof modal, item?: any) => {
    const inits: any = { voo: initVoo, pacote: initPacote, hospedagem: initHosp, cruzeiro: initCruz, seguro: initSeguro, carro: initCarro };
    setForm(item ? { ...item } : inits[tipo!]());
    setEditItem(item || null);
    setModal(tipo);
  };

  const saveItem = (tipo: string) => {
    const keys: any = { voo: 'voos', pacote: 'pacotes', hospedagem: 'hospedagensAvulsas', cruzeiro: 'cruzeiros', seguro: 'segurosAvulsos', carro: 'carrosLocados' };
    const key = keys[tipo];
    const existing: any[] = data[key] || [];
    const item = { ...form, id: form.id || generateId() };
    const updated = editItem ? existing.map((x: any) => x.id === item.id ? item : x) : [item, ...existing];
    updateData({ [key]: updated });
    setModal(null);
    toast(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} salvo!`);
  };

  const deleteItem = (tipo: string, id: string) => {
    const keys: any = { voo: 'voos', pacote: 'pacotes', hospedagem: 'hospedagensAvulsas', cruzeiro: 'cruzeiros', seguro: 'segurosAvulsos', carro: 'carrosLocados' };
    const key = keys[tipo];
    updateData({ [key]: (data[key] || []).filter((x: any) => x.id !== id) });
    toast('Removido.', 'info');
  };

  const updateStatus = (tipo: string, id: string, status: string) => {
    const keys: any = { voo: 'voos', pacote: 'pacotes', hospedagem: 'hospedagensAvulsas', cruzeiro: 'cruzeiros', seguro: 'segurosAvulsos', carro: 'carrosLocados' };
    const key = keys[tipo];
    updateData({ [key]: (data[key] || []).map((x: any) => x.id === id ? { ...x, status } : x) });
  };

  const vendas = (data.vendas || []).filter((v: any) => v.status !== 'Cancelado');

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Próximos embarques — destaque total ── */}
      <div style={{ ...cardStyle, border: `1px solid ${C.cyan}33` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${C.cyan}22` }}>
              <Plane size={18} style={{ color: C.cyan }} />
            </div>
            <div>
              <p className="font-display font-bold text-[16px]" style={{ color: 'var(--text-primary)' }}>Próximos Embarques</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Voos diretos + voos de pacotes/vendas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-placeholder)' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar passageiro, PNR..."
                className="pl-9 pr-3 py-2 text-sm rounded-xl"
                style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: 220 }}
              />
            </div>
            <button
              onClick={() => openModal('voo')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: C.magenta, boxShadow: `0 4px 14px ${C.magenta}44` }}
            >
              <PlusCircle size={15} /> Novo Voo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-color)' }}>
                {['', 'Passageiro / Voo', 'Trecho', 'Partida', 'Check-in', 'Emissão', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-[11px] font-bold" style={{ color: 'var(--text-placeholder)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proximosVoos.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum voo próximo cadastrado.</td></tr>
              )}
              {proximosVoos
                .filter((v: any) => !search || [v.passageiros, v.localizador, v.ciaAerea, v.cliente, v._vendaCliente].some(f => f?.toLowerCase().includes(search.toLowerCase())))
                .map((voo: any) => {
                  const is24h = new Date(voo.dataPartida).getTime() - now.getTime() < 86400000;
                  const isLiberado = isCheckinLiberado(voo.dataPartida);
                  const checkinUrl = getCheckinUrl(voo.ciaAerea, voo.localizador);
                  const isPacote = !!voo._origem;
                  return (
                    <tr
                      key={voo.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: is24h ? `${C.magenta}08` : 'transparent',
                      }}
                    >
                      <td className="pl-4 pr-2 py-3">
                        {is24h && <span className="w-2 h-2 rounded-full block" style={{ background: C.red }} title="< 24h" />}
                        {isPacote && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${C.orange}22`, color: C.orange }}>PKG</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
                          {voo.passageiros || voo._vendaCliente}
                        </p>
                        <p className="font-mono-brand text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                          {voo.ciaAerea} {voo.numeroVoo}
                          {voo.localizador && <> · <span style={{ color: C.cyan }}>{voo.localizador}</span></>}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <IataChip code={voo.origem} />
                          <span style={{ color: 'var(--text-faint)' }}>→</span>
                          <IataChip code={voo.destino} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold" style={{ color: is24h ? C.red : 'var(--text-primary)' }}>
                          {new Date(voo.dataPartida).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <Countdown dateStr={voo.dataPartida} />
                      </td>
                      <td className="px-4 py-3">
                        {isLiberado && checkinUrl !== '#' ? (
                          <a href={checkinUrl} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white"
                            style={{ background: C.teal, boxShadow: `0 3px 10px ${C.teal}44` }}>
                            Check-in <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-[11px] px-2 py-1 rounded-lg" style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-faint)' }}>Pendente</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{voo.formaEmissao || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {voo._origem ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${C.cyan}22`, color: C.cyan }}>Emitido</span>
                        ) : (
                          <StatusBadge value={voo.status} onChange={s => updateStatus('voo', voo.id, s)} options={['Emitido', 'Reemitido', 'Voado', 'Cancelado']} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!voo._origem && (
                          <div className="flex gap-1.5">
                            <button onClick={() => openModal('voo', voo)} className="p-1.5 rounded-lg" style={{ color: C.cyan }} title="Editar"><Edit size={13} /></button>
                            <button onClick={() => { const url = generateCalendarLink(voo, false); window.open(url, '_blank'); }} className="p-1.5 rounded-lg" style={{ color: 'var(--text-faint)' }} title="Agenda"><Calendar size={13} /></button>
                            <button onClick={() => deleteItem('voo', voo.id)} className="p-1.5 rounded-lg" style={{ color: C.red }} title="Excluir"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Voos passados — colapsável */}
        {voosPassados.length > 0 && (
          <details style={{ borderTop: '1px solid var(--border-color)' }}>
            <summary className="px-5 py-3 text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-faint)' }}>
              {voosPassados.length} voo(s) passados / voados
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <tbody>
                  {voosPassados.slice(0, 10).map((voo: any) => (
                    <tr key={voo.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: 0.6 }}>
                      <td className="px-4 py-2 w-6" />
                      <td className="px-4 py-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{voo.passageiros || voo._vendaCliente}</p>
                        <p className="font-mono-brand text-[11px]" style={{ color: 'var(--text-faint)' }}>{voo.ciaAerea} {voo.numeroVoo} · {voo.localizador}</p>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5"><IataChip code={voo.origem} /><span style={{ color: 'var(--text-faint)' }}>→</span><IataChip code={voo.destino} /></div>
                      </td>
                      <td className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {new Date(voo.dataPartida).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td colSpan={4} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>

      {/* ── Pacotes ── */}
      <Section icon={Package2} color={C.orange} title="Pacotes" count={pacotes.filter((p: any) => p.status !== 'Cancelado').length}>
        <div className="p-4 flex justify-end" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={() => openModal('pacote')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.orange }}>
            <PlusCircle size={15} /> Novo Pacote
          </button>
        </div>
        {pacotes.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Nenhum pacote cadastrado.</p>
        ) : (
          <table className="w-full text-left">
            <thead><tr style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-color)' }}>
              {['Cliente', 'Destino / Operadora', 'Período', 'Valor', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-[11px] font-bold" style={{ color: 'var(--text-placeholder)' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {pacotes.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="px-4 py-3 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{p.cliente}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.destino}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.operadora}</p>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {p.dataInicio && new Date(p.dataInicio + 'T12:00').toLocaleDateString('pt-BR')}
                    {p.dataFim && <> → {new Date(p.dataFim + 'T12:00').toLocaleDateString('pt-BR')}</>}
                  </td>
                  <td className="px-4 py-3 font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{p.valor ? formatCurrency(Number(p.valor)) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge value={p.status} onChange={s => updateStatus('pacote', p.id, s)} options={['Confirmado', 'Pendente', 'Cancelado']} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => openModal('pacote', p)} className="p-1.5 rounded-lg" style={{ color: C.cyan }}><Edit size={13} /></button>
                      <button onClick={() => deleteItem('pacote', p.id)} className="p-1.5 rounded-lg" style={{ color: C.red }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* ── Hospedagens ── */}
      <Section icon={BedDouble} color={C.teal} title="Hospedagens" count={hospedagens.length} defaultOpen={false}>
        <div className="p-4 flex justify-end" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={() => openModal('hospedagem')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.teal }}>
            <PlusCircle size={15} /> Nova Hospedagem
          </button>
        </div>
        {hospedagens.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Nenhuma hospedagem. Hospedagens lançadas em Vendas aparecem aqui automaticamente.</p>
        ) : (
          <table className="w-full text-left">
            <thead><tr style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-color)' }}>
              {['Hotel / Plataforma', 'Cliente', 'Check-in → Check-out', 'Cidade', 'Voucher', ''].map(h => <th key={h} className="px-4 py-3 text-[11px] font-bold" style={{ color: 'var(--text-placeholder)' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {hospedagens.map((h: any) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{h.nome}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{h.plataforma} · {h.regimeAlimentar}</p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{h.cliente || h._vendaCliente || '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {h.checkIn && new Date(h.checkIn + 'T12:00').toLocaleDateString('pt-BR')}
                    {h.checkOut && <> → {new Date(h.checkOut + 'T12:00').toLocaleDateString('pt-BR')}</>}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{h.cidade || '—'}</td>
                  <td className="px-4 py-3 font-mono-brand text-[11px]" style={{ color: C.cyan }}>{h.voucher || '—'}</td>
                  <td className="px-4 py-3">
                    {!h._vendaId && (
                      <div className="flex gap-1.5">
                        <button onClick={() => openModal('hospedagem', h)} className="p-1.5 rounded-lg" style={{ color: C.cyan }}><Edit size={13} /></button>
                        <button onClick={() => deleteItem('hospedagem', h.id)} className="p-1.5 rounded-lg" style={{ color: C.red }}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* ── Cruzeiros ── */}
      <Section icon={Ship} color={C.cyan} title="Cruzeiros" count={cruzeiros.filter((c: any) => c.status !== 'Cancelado').length} defaultOpen={false}>
        <div className="p-4 flex justify-end" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={() => openModal('cruzeiro')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.cyan }}>
            <PlusCircle size={15} /> Novo Cruzeiro
          </button>
        </div>
        {cruzeiros.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Nenhum cruzeiro cadastrado.</p>
        ) : (
          <table className="w-full text-left">
            <thead><tr style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-color)' }}>
              {['Cliente', 'Navio / Armador', 'Porto / Embarque', 'Período', 'Cabine', 'Valor', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-[11px] font-bold" style={{ color: 'var(--text-placeholder)' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {cruzeiros.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="px-4 py-3 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{c.cliente}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.navio}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.armador}</p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{c.porto || '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {c.dataEmbarque && new Date(c.dataEmbarque + 'T12:00').toLocaleDateString('pt-BR')}
                    {c.dataDesembarque && <> → {new Date(c.dataDesembarque + 'T12:00').toLocaleDateString('pt-BR')}</>}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>{c.cabine || '—'}</td>
                  <td className="px-4 py-3 font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{c.valor ? formatCurrency(Number(c.valor)) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge value={c.status} onChange={s => updateStatus('cruzeiro', c.id, s)} options={['Confirmado', 'Pendente', 'Cancelado']} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => openModal('cruzeiro', c)} className="p-1.5 rounded-lg" style={{ color: C.cyan }}><Edit size={13} /></button>
                      <button onClick={() => deleteItem('cruzeiro', c.id)} className="p-1.5 rounded-lg" style={{ color: C.red }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* ── Seguros ── */}
      <Section icon={Shield} color={C.amber} title="Seguros de Viagem" count={seguros.filter((s: any) => s.status === 'Ativo').length} defaultOpen={false}>
        <div className="p-4 flex justify-end" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={() => openModal('seguro')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.amber, color: '#000' }}>
            <PlusCircle size={15} /> Novo Seguro
          </button>
        </div>
        {seguros.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Nenhum seguro cadastrado. Seguros registrados em Vendas aparecem aqui automaticamente.</p>
        ) : (
          <table className="w-full text-left">
            <thead><tr style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-color)' }}>
              {['Cliente', 'Seguradora', 'Apólice', 'Cobertura', 'Validade', 'Valor', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-[11px] font-bold" style={{ color: 'var(--text-placeholder)' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {seguros.map((s: any) => {
                const vencido = s.validade && new Date(s.validade + 'T12:00') < now;
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="px-4 py-3 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{s.cliente}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{s.seguradora}</td>
                    <td className="px-4 py-3 font-mono-brand text-[11px]" style={{ color: C.cyan }}>{s.apolice || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{s.cobertura || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: vencido ? C.red : 'var(--text-muted)' }}>
                      {s.validade ? new Date(s.validade + 'T12:00').toLocaleDateString('pt-BR') : '—'}
                      {vencido && <span className="ml-1 text-[9px] font-bold" style={{ color: C.red }}>VENCIDO</span>}
                    </td>
                    <td className="px-4 py-3 font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{s.valor ? formatCurrency(Number(s.valor)) : '—'}</td>
                    <td className="px-4 py-3">
                      {!s._vendaId ? (
                        <StatusBadge value={s.status || 'Ativo'} onChange={st => updateStatus('seguro', s.id, st)} options={['Ativo', 'Cancelado']} />
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${C.teal}22`, color: C.teal }}>Ativo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!s._vendaId && (
                        <div className="flex gap-1.5">
                          <button onClick={() => openModal('seguro', s)} className="p-1.5 rounded-lg" style={{ color: C.cyan }}><Edit size={13} /></button>
                          <button onClick={() => deleteItem('seguro', s.id)} className="p-1.5 rounded-lg" style={{ color: C.red }}><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* ── Aluguel de Carro ── */}
      <Section icon={Car} color={C.magenta} title="Aluguel de Carro" count={carros.filter((c: any) => c.status !== 'Cancelado').length} defaultOpen={false}>
        <div className="p-4 flex justify-end" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={() => openModal('carro')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.magenta, boxShadow: `0 4px 14px ${C.magenta}44` }}>
            <PlusCircle size={15} /> Novo Aluguel
          </button>
        </div>
        {carros.length === 0 ? (
          <p className="px-5 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>Nenhum aluguel cadastrado.</p>
        ) : (
          <table className="w-full text-left">
            <thead><tr style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-color)' }}>
              {['Cliente', 'Locadora / Modelo', 'Retirada', 'Devolução', 'Local', 'Valor', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-[11px] font-bold" style={{ color: 'var(--text-placeholder)' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {carros.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td className="px-4 py-3 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{c.cliente}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.locadora}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.modelo || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{c.retirada ? new Date(c.retirada + 'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{c.devolucao ? new Date(c.devolucao + 'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{c.localRetirada || '—'}</td>
                  <td className="px-4 py-3 font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{c.valor ? formatCurrency(Number(c.valor)) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge value={c.status} onChange={s => updateStatus('carro', c.id, s)} options={['Confirmado', 'Pendente', 'Cancelado']} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => openModal('carro', c)} className="p-1.5 rounded-lg" style={{ color: C.cyan }}><Edit size={13} /></button>
                      <button onClick={() => deleteItem('carro', c.id)} className="p-1.5 rounded-lg" style={{ color: C.red }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* ═══════════════════ MODAIS ═══════════════════ */}

      {/* Modal Voo */}
      {modal === 'voo' && (
        <Modal title={editItem ? 'Editar Voo' : 'Novo Voo'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Venda Vinculada</label>
              <select className={inputCls} value={form.vendaId} onChange={e => setForm({ ...form, vendaId: e.target.value })}>
                <option value="">Sem vínculo específico</option>
                {vendas.map((v: any) => <option key={v.id} value={v.id}>{v.cliente} — {v.numeroPedido || v.tipo}</option>)}
              </select>
            </div>
            {[
              { label: 'Passageiro(s)', key: 'passageiros', col: 2 },
              { label: 'Localizador (PNR)', key: 'localizador', upper: true },
              { label: 'Cia Aérea', key: 'ciaAerea' },
              { label: 'Nº Voo', key: 'numeroVoo', upper: true },
              { label: 'Origem (IATA)', key: 'origem', upper: true },
              { label: 'Destino (IATA)', key: 'destino', upper: true },
            ].map(({ label, key, col, upper }: any) => (
              <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>{label}</label>
                <input className={inputCls} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: upper ? e.target.value.toUpperCase() : e.target.value })} />
              </div>
            ))}
            <div>
              <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Data / Hora Partida</label>
              <input type="datetime-local" className={inputCls} value={form.dataPartida} onChange={e => setForm({ ...form, dataPartida: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Data / Hora Chegada</label>
              <input type="datetime-local" className={inputCls} value={form.dataChegada} onChange={e => setForm({ ...form, dataChegada: e.target.value })} />
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Tipo</label>
              <select className={inputCls} value={form.tipoVoo} onChange={e => setForm({ ...form, tipoVoo: e.target.value })}>
                <option value="Nacional">Nacional</option>
                <option value="Internacional">Internacional</option>
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Forma de Emissão</label>
              <select className={inputCls} value={form.formaEmissao} onChange={e => setForm({ ...form, formaEmissao: e.target.value })}>
                <option>Milhas</option><option>Tarifa Pagante</option><option>Consolidadora</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Cancelar</button>
            <button onClick={() => saveItem('voo')} className="px-6 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.magenta, boxShadow: `0 4px 14px ${C.magenta}44` }}>Salvar</button>
          </div>
        </Modal>
      )}

      {/* Modal Pacote */}
      {modal === 'pacote' && (
        <Modal title={editItem ? 'Editar Pacote' : 'Novo Pacote'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Cliente', key: 'cliente', col: 2 },
              { label: 'Destino', key: 'destino' },
              { label: 'Operadora', key: 'operadora' },
              { label: 'Data Início', key: 'dataInicio', type: 'date' },
              { label: 'Data Fim', key: 'dataFim', type: 'date' },
              { label: 'Valor (R$)', key: 'valor', type: 'number' },
            ].map(({ label, key, col, type }: any) => (
              <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>{label}</label>
                <input type={type || 'text'} className={inputCls} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="col-span-2">
              <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Observações</label>
              <textarea rows={3} className={inputCls} value={form.observacoes || ''} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Cancelar</button>
            <button onClick={() => saveItem('pacote')} className="px-6 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.orange }}>Salvar</button>
          </div>
        </Modal>
      )}

      {/* Modal Hospedagem */}
      {modal === 'hospedagem' && (
        <Modal title={editItem ? 'Editar Hospedagem' : 'Nova Hospedagem'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Nome do Hotel', key: 'nome', col: 2 },
              { label: 'Cliente', key: 'cliente', col: 2 },
              { label: 'Check-in', key: 'checkIn', type: 'date' },
              { label: 'Check-out', key: 'checkOut', type: 'date' },
              { label: 'Cidade', key: 'cidade' },
              { label: 'Voucher', key: 'voucher' },
              { label: 'Quartos', key: 'quartos', type: 'number' },
              { label: 'Tipo de Quarto', key: 'tipoQuarto' },
            ].map(({ label, key, col, type }: any) => (
              <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>{label}</label>
                <input type={type || 'text'} className={inputCls} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Plataforma</label>
              <select className={inputCls} value={form.plataforma} onChange={e => setForm({ ...form, plataforma: e.target.value })}>
                {['Booking.com','Airbnb','Expedia','Direto','Outro'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Regime Alimentar</label>
              <select className={inputCls} value={form.regimeAlimentar} onChange={e => setForm({ ...form, regimeAlimentar: e.target.value })}>
                {['Sem Refeição','Café da Manhã','Meia Pensão','All-Inclusive'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Cancelar</button>
            <button onClick={() => saveItem('hospedagem')} className="px-6 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.teal }}>Salvar</button>
          </div>
        </Modal>
      )}

      {/* Modal Cruzeiro */}
      {modal === 'cruzeiro' && (
        <Modal title={editItem ? 'Editar Cruzeiro' : 'Novo Cruzeiro'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Cliente', key: 'cliente', col: 2 },
              { label: 'Navio', key: 'navio' },
              { label: 'Armador', key: 'armador' },
              { label: 'Porto de Embarque', key: 'porto' },
              { label: 'Cabine', key: 'cabine' },
              { label: 'Data Embarque', key: 'dataEmbarque', type: 'date' },
              { label: 'Data Desembarque', key: 'dataDesembarque', type: 'date' },
              { label: 'Valor (R$)', key: 'valor', type: 'number' },
            ].map(({ label, key, col, type }: any) => (
              <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>{label}</label>
                <input type={type || 'text'} className={inputCls} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="col-span-2">
              <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Observações</label>
              <textarea rows={3} className={inputCls} value={form.observacoes || ''} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Cancelar</button>
            <button onClick={() => saveItem('cruzeiro')} className="px-6 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.cyan }}>Salvar</button>
          </div>
        </Modal>
      )}

      {/* Modal Seguro */}
      {modal === 'seguro' && (
        <Modal title={editItem ? 'Editar Seguro' : 'Novo Seguro'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Cliente', key: 'cliente', col: 2 },
              { label: 'Seguradora', key: 'seguradora' },
              { label: 'Nº Apólice', key: 'apolice' },
              { label: 'Cobertura', key: 'cobertura', col: 2 },
              { label: 'Validade', key: 'validade', type: 'date' },
              { label: 'Valor (R$)', key: 'valor', type: 'number' },
            ].map(({ label, key, col, type }: any) => (
              <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>{label}</label>
                <input type={type || 'text'} className={inputCls} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Cancelar</button>
            <button onClick={() => saveItem('seguro')} className="px-6 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.amber, color: '#000' }}>Salvar</button>
          </div>
        </Modal>
      )}

      {/* Modal Carro */}
      {modal === 'carro' && (
        <Modal title={editItem ? 'Editar Aluguel' : 'Novo Aluguel de Carro'} onClose={() => setModal(null)}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Cliente', key: 'cliente', col: 2 },
              { label: 'Locadora', key: 'locadora' },
              { label: 'Modelo / Categoria', key: 'modelo' },
              { label: 'Data Retirada', key: 'retirada', type: 'date' },
              { label: 'Data Devolução', key: 'devolucao', type: 'date' },
              { label: 'Local de Retirada', key: 'localRetirada', col: 2 },
              { label: 'Valor (R$)', key: 'valor', type: 'number' },
            ].map(({ label, key, col, type }: any) => (
              <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>{label}</label>
                <input type={type || 'text'} className={inputCls} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="col-span-2">
              <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Observações</label>
              <textarea rows={2} className={inputCls} value={form.observacoes || ''} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Cancelar</button>
            <button onClick={() => saveItem('carro')} className="px-6 py-2 rounded-xl text-sm font-bold text-white" style={{ background: C.magenta, boxShadow: `0 4px 14px ${C.magenta}44` }}>Salvar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
