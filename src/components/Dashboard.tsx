import React, { useState, useMemo } from 'react';
import { formatCurrency, isCheckinLiberado, getCheckinUrl, calculateStatusAtrasado } from '../utils';
import { Plane, TrendingUp, DollarSign, AlertTriangle, Gift, FileWarning, CheckSquare, Users, FileText, ArrowDownCircle, ArrowUpCircle, Wallet, ExternalLink } from 'lucide-react';
import { isWithinInterval, addDays, subDays } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

// ── cores de marca ──────────────────────────────────────────────────────────
const C = {
  magenta: '#FF2D74',
  cyan:    '#25C2F2',
  orange:  '#FF9F2E',
  teal:    '#1FBE93',
  amber:   '#FBBF24',
  red:     '#FF5A6E',
};
const PIE_COLORS = [C.magenta, C.cyan, C.orange, C.teal, C.amber, C.red, '#8B5CF6'];

// ── Card KPI ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subColor, icon: Icon, iconBg }: any) {
  return (
    <div
      className="rounded-[18px] p-5 flex flex-col gap-3"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          <Icon size={18} style={{ color: '#fff' }} />
        </div>
        {sub && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${subColor}22`, color: subColor, border: `1px solid ${subColor}44` }}
          >
            {sub}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="font-display font-bold text-[27px] leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Segmented control ────────────────────────────────────────────────────────
function Segmented({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div
      className="flex rounded-xl p-1 gap-1"
      style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)' }}
    >
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: value === o.value ? C.magenta : 'transparent',
            color: value === o.value ? '#fff' : 'var(--text-muted)',
            boxShadow: value === o.value ? `0 4px 12px ${C.magenta}44` : 'none',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export function Dashboard({ data }: any) {
  const [periodo, setPeriodo] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const filterByDate = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    if (periodo === 'tudo') return true;
    if (periodo === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (periodo === 'ano') return d.getFullYear() === now.getFullYear();
    if (periodo === 'personalizado') {
      const s = dataInicio ? new Date(dataInicio + 'T00:00:00') : new Date(0);
      const e = dataFim   ? new Date(dataFim   + 'T23:59:59') : new Date(8640000000000000);
      return d >= s && d <= e;
    }
    return true;
  };

  // ── Métricas ──────────────────────────────────────────────────────────────
  const vendasFiltradas = data.vendas.filter((v: any) => v.status !== 'Cancelado' && filterByDate(v.criadoEm));
  const valorVendas  = vendasFiltradas.reduce((a: number, v: any) => a + (v.valorBruto || 0), 0);
  const lucroBruto   = vendasFiltradas.reduce((a: number, v: any) => a + (Number(v.comissao) || 0), 0);

  const receberPendente = data.contasReceber.filter((c: any) => {
    const s = calculateStatusAtrasado(c.vencimento, c.status);
    return ['Em dia', 'Pgto do dia', 'Atrasado'].includes(s) && filterByDate(c.vencimento);
  });
  const valorReceber = receberPendente.reduce((a: number, v: any) => a + v.valor, 0);

  const pagarPendente = data.contasPagar.filter((c: any) => {
    const s = calculateStatusAtrasado(c.vencimento, c.status);
    return ['Em dia', 'Pgto do dia', 'Atrasado'].includes(s) && filterByDate(c.vencimento);
  });
  const valorPagar = pagarPendente.reduce((a: number, v: any) => a + v.valor, 0);

  const saldo = valorReceber - valorPagar;
  const ticketMedio = vendasFiltradas.length > 0 ? valorVendas / vendasFiltradas.length : 0;
  const totalLeads = (data.leads || []).length;
  const leadsConvertidos = (data.leads || []).filter((l: any) => l.stage === 'fechado').length;
  const taxaConversao = totalLeads > 0 ? Math.round((leadsConvertidos / totalLeads) * 100) : 0;

  const now = new Date();
  const next7Days = addDays(now, 7);

  // Próximos voos
  const proximosVoos = data.voos
    .filter((v: any) => v.status === 'Emitido' && new Date(v.dataPartida) > subDays(now, 1))
    .sort((a: any, b: any) => new Date(a.dataPartida).getTime() - new Date(b.dataPartida).getTime())
    .slice(0, 10);

  // Alertas
  const alertas = useMemo(() => {
    const items: { tipo: 'error' | 'warn' | 'info'; label: string; sub: string }[] = [];
    const hoje = new Date();
    (data.pessoas || []).forEach((p: any) => {
      if (p.passaporteValidade) {
        const d = new Date(p.passaporteValidade + 'T12:00:00');
        const diff = Math.ceil((d.getTime() - hoje.getTime()) / 86400000);
        if (diff < 0) items.push({ tipo: 'error', label: `Passaporte VENCIDO — ${p.nome}`, sub: `Venceu em ${d.toLocaleDateString('pt-BR')}` });
        else if (diff <= 180) items.push({ tipo: 'warn', label: `Passaporte vence em ${diff}d — ${p.nome}`, sub: `Válido até ${d.toLocaleDateString('pt-BR')}` });
      }
      if (p.vistoValidade) {
        const d = new Date(p.vistoValidade + 'T12:00:00');
        const diff = Math.ceil((d.getTime() - hoje.getTime()) / 86400000);
        if (diff < 0) items.push({ tipo: 'error', label: `Visto VENCIDO — ${p.nome}`, sub: `Venceu em ${d.toLocaleDateString('pt-BR')}` });
        else if (diff <= 60) items.push({ tipo: 'warn', label: `Visto vence em ${diff}d — ${p.nome}`, sub: `Válido até ${d.toLocaleDateString('pt-BR')}` });
      }
      if (p.dataNascimento) {
        const d = new Date(p.dataNascimento + 'T12:00:00');
        const thisYear = new Date(hoje.getFullYear(), d.getMonth(), d.getDate());
        const diff = Math.ceil((thisYear.getTime() - hoje.getTime()) / 86400000);
        if (diff === 0) items.push({ tipo: 'info', label: `Aniversário hoje — ${p.nome}`, sub: 'Não esqueça de parabenizar!' });
        else if (diff > 0 && diff <= 3) items.push({ tipo: 'info', label: `Aniversário em ${diff}d — ${p.nome}`, sub: d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) });
      }
    });
    let tarefasVencidas = 0;
    (data.vendas || []).forEach((v: any) => {
      (v.tarefas || []).filter((t: any) => !t.feita && t.prazo && new Date(t.prazo) < hoje).forEach(() => tarefasVencidas++);
    });
    if (tarefasVencidas > 0) items.push({ tipo: 'error', label: `${tarefasVencidas} tarefa(s) vencida(s)`, sub: 'Verifique o checklist nas vendas.' });
    const atrasadosP = (data.contasPagar  || []).filter((c: any) => c.status === 'Atrasado').length;
    const atrasadosR = (data.contasReceber || []).filter((c: any) => calculateStatusAtrasado(c.vencimento, c.status) === 'Atrasado').length;
    if (atrasadosP > 0) items.push({ tipo: 'error', label: `${atrasadosP} conta(s) a pagar em atraso`, sub: 'Verifique A Pagar.' });
    if (atrasadosR > 0) items.push({ tipo: 'error', label: `${atrasadosR} conta(s) a receber em atraso`, sub: 'Verifique A Receber.' });
    return items;
  }, [data]);

  // Top destinos — usa venda.destinos[] como fonte primária
  const topDestinos = useMemo(() => {
    const map: Record<string, number> = {};
    (data.vendas || []).forEach((v: any) => {
      if (v.status === 'Cancelado') return;
      (v.destinos || []).forEach((d: string) => {
        if (d) map[d] = (map[d] || 0) + 1;
      });
    });
    // fallback legado: voos com IATA destino, se nenhuma venda tem destinos[]
    if (Object.keys(map).length === 0) {
      (data.voos || []).filter((v: any) => v.status !== 'Cancelado').forEach((v: any) => {
        if (v.destino) map[v.destino] = (map[v.destino] || 0) + 1;
      });
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [data]);
  const maxDestino = topDestinos[0]?.[1] || 1;

  // Gráfico mensal
  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const y = d.getFullYear(), m = d.getMonth();
      const mes = data.vendas.filter((v: any) => v.status !== 'Cancelado' && new Date(v.criadoEm).getMonth() === m && new Date(v.criadoEm).getFullYear() === y);
      return {
        name: d.toLocaleDateString('pt-BR', { month: 'short' }),
        Vendas: mes.reduce((a: number, v: any) => a + (v.valorBruto || 0), 0),
        Lucro:  mes.reduce((a: number, v: any) => a + (Number(v.comissao) || 0), 0),
      };
    });
  }, [data.vendas]);

  // Donut por tipo
  const vendasPorTipo = useMemo(() => {
    const m: Record<string, number> = {};
    vendasFiltradas.forEach((v: any) => { m[v.tipo] = (m[v.tipo] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [vendasFiltradas]);

  // Contas próximas
  const contasProximas = useMemo(() => {
    const raw = [
      ...data.contasPagar.filter((c: any) => ['Em dia', 'Pgto do dia', 'Atrasado'].includes(calculateStatusAtrasado(c.vencimento, c.status))).map((c: any) => ({ ...c, tipo: 'Pagar' })),
      ...data.contasReceber.filter((c: any) => ['Em dia', 'Pgto do dia', 'Atrasado'].includes(calculateStatusAtrasado(c.vencimento, c.status))).map((c: any) => ({ ...c, tipo: 'Receber' })),
    ];
    return raw.filter((c: any) => isWithinInterval(new Date(c.vencimento), { start: subDays(now, 30), end: next7Days }))
      .sort((a: any, b: any) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
  }, [data]);

  const PERIODO_OPT = [
    { label: 'Mês', value: 'mes' },
    { label: 'Ano', value: 'ano' },
    { label: 'Tudo', value: 'tudo' },
    { label: 'Personalizado', value: 'personalizado' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Saudação + período ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-[25px] text-[color:var(--text-primary)]" style={{ letterSpacing: '-0.02em' }}>
            Bom dia, Volta ao Mundo 👋
          </h2>
          <p className="text-sm text-[color:var(--text-muted)] mt-0.5">Aqui está o resumo da sua agência.</p>
        </div>
        <div className="flex items-center gap-3">
          <Segmented options={PERIODO_OPT} value={periodo} onChange={setPeriodo} />
          {periodo === 'personalizado' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)' }}>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-transparent outline-none text-xs font-mono text-[color:var(--text-muted)]" />
              <span className="text-[color:var(--text-faint)]">–</span>
              <input type="date" value={dataFim}   onChange={e => setDataFim(e.target.value)}   className="bg-transparent outline-none text-xs font-mono text-[color:var(--text-muted)]" />
            </div>
          )}
        </div>
      </div>

      {/* ── Alertas ── */}
      {alertas.length > 0 && (
        <div className="rounded-[18px] overflow-hidden" style={{ border: '1px solid rgba(255,90,110,.25)', background: 'rgba(255,90,110,.06)' }}>
          <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,90,110,.2)' }}>
            <AlertTriangle size={15} style={{ color: C.red }} />
            <span className="text-xs font-bold" style={{ color: C.red }}>Alertas ({alertas.length})</span>
          </div>
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as any}>
            {alertas.map((a, i) => {
              const dot = a.tipo === 'error' ? C.red : a.tipo === 'warn' ? C.amber : C.cyan;
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: dot }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{a.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4 KPIs primários ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Vendido"  value={formatCurrency(valorVendas)} sub={`${vendasFiltradas.length} vendas`} subColor={C.cyan}    icon={TrendingUp}      iconBg={`${C.cyan}33`} />
        <KpiCard label="Lucro Estimado" value={formatCurrency(lucroBruto)}  sub={`${valorVendas > 0 ? ((lucroBruto/valorVendas)*100).toFixed(1) : 0}% margem`} subColor={C.teal} icon={DollarSign} iconBg={`${C.teal}33`} />
        <KpiCard label="A Receber"      value={formatCurrency(valorReceber)} sub={`${receberPendente.length} títulos`} subColor={C.amber}  icon={ArrowDownCircle} iconBg={`${C.amber}33`} />
        <KpiCard label="A Pagar"        value={formatCurrency(valorPagar)}   sub={`${pagarPendente.length} títulos`}  subColor={C.red}    icon={ArrowUpCircle}   iconBg={`${C.red}33`} />
      </div>

      {/* ── Grid principal 2 colunas ── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1.85fr 1fr' }}>

        {/* ESQUERDA */}
        <div className="space-y-5 min-w-0">

          {/* Gráfico faturamento */}
          <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <p className="font-display font-bold text-[15px] text-[color:var(--text-primary)] mb-4">Faturamento & Lucro — últimos 6 meses</p>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.cyan}    stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.cyan}    stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.magenta} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.magenta} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-placeholder)', fontFamily: 'Manrope' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-placeholder)', fontFamily: 'Manrope' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={55} />
                  <RechartsTooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'Manrope' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontFamily: 'Manrope', color: 'var(--text-muted)', paddingTop: 12 }} />
                  <Area type="monotone" dataKey="Vendas" stroke={C.cyan}    strokeWidth={2.5} fill="url(#gVendas)" />
                  <Area type="monotone" dataKey="Lucro"  stroke={C.magenta} strokeWidth={2.5} fill="url(#gLucro)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Próximos embarques */}
          <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <Plane size={16} style={{ color: C.cyan }} />
              <p className="font-display font-bold text-[15px] text-[color:var(--text-primary)]">Próximos Embarques</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface-alt)' }}>
                    {['Passageiro / Voo', 'Trecho', 'Data · Hora', 'Check-in'].map(h => (
                      <th key={h} className="px-4 py-3 text-[11px] font-bold" style={{ color: 'var(--text-placeholder)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proximosVoos.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum voo programado.</td></tr>
                  )}
                  {proximosVoos.map((voo: any) => {
                    const is24h = new Date(voo.dataPartida).getTime() - now.getTime() < 86400000;
                    const isLiberado = isCheckinLiberado(voo.dataPartida);
                    const checkinUrl = getCheckinUrl(voo.ciaAerea, voo.localizador);
                    return (
                      <tr
                        key={voo.id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          background: is24h ? 'rgba(255,45,116,.05)' : 'transparent',
                        }}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>{voo.passageiros}</p>
                          <p className="font-mono-brand text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                            {voo.ciaAerea} {voo.numeroVoo} · {voo.localizador || 'S/ LOC'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-brand text-[11px] font-medium px-2 py-0.5 rounded-lg" style={{ background: '#1B264E', color: '#cfd8f5' }}>{voo.origem}</span>
                            <span style={{ color: 'var(--text-faint)' }}>→</span>
                            <span className="font-mono-brand text-[11px] font-medium px-2 py-0.5 rounded-lg" style={{ background: '#1B264E', color: '#cfd8f5' }}>{voo.destino}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold" style={{ color: is24h ? C.red : 'var(--text-primary)' }}>
                            {new Date(voo.dataPartida).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {is24h && <p className="text-[10px] font-bold mt-0.5" style={{ color: C.red }}>Menos de 24h!</p>}
                        </td>
                        <td className="px-4 py-3">
                          {isLiberado && checkinUrl !== '#' ? (
                            <a href={checkinUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white"
                              style={{ background: C.teal, boxShadow: `0 4px 12px ${C.teal}44` }}>
                              Check-in <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-faint)' }}>Pendente</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* DIREITA */}
        <div className="space-y-5 min-w-0">

          {/* Saldo líquido */}
          <div
            className="rounded-[18px] p-5"
            style={{
              background: 'linear-gradient(150deg, #13204A 0%, #0E1838 100%)',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={16} style={{ color: C.teal }} />
              <p className="font-display font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>Saldo Líquido</p>
            </div>
            <p className="font-display font-bold leading-none mb-4" style={{ fontSize: 30, color: saldo >= 0 ? C.teal : C.red, letterSpacing: '-0.02em' }}>
              {formatCurrency(saldo)}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.05)' }}>
                <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Ticket Médio</p>
                <p className="font-display font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>{formatCurrency(ticketMedio)}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,.05)' }}>
                <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-faint)' }}>Conversão</p>
                <p className="font-display font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>{taxaConversao}%</p>
                <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{leadsConvertidos}/{totalLeads} leads</p>
              </div>
            </div>
          </div>

          {/* Donut distribuição */}
          <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <p className="font-display font-bold text-[15px] text-[color:var(--text-primary)] mb-3">Distribuição de Vendas</p>
            {vendasPorTipo.length > 0 ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={vendasPorTipo} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {vendasPorTipo.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'Manrope' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontFamily: 'Manrope', color: 'var(--text-muted)', paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Nenhuma venda no período.</p>
            )}
          </div>

          {/* Alertas compactos */}
          {alertas.length > 0 && (
            <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <p className="font-display font-bold text-[14px] px-4 py-3" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>Alertas</p>
              <div className="max-h-52 overflow-y-auto divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {alertas.slice(0, 8).map((a, i) => {
                  const dot = a.tipo === 'error' ? C.red : a.tipo === 'warn' ? C.amber : C.cyan;
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: dot }} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{a.label}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{a.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Destinos */}
          <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <p className="font-display font-bold text-[15px] text-[color:var(--text-primary)] mb-4">Top Destinos</p>
            {topDestinos.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sem dados.</p>
            ) : (
              <div className="space-y-3">
                {topDestinos.map(([dest, cnt], i) => (
                  <div key={dest}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}><span style={{ color: 'var(--text-faint)', marginRight: 6 }}>{i + 1}.</span>{dest}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{cnt}x</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface-alt)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(cnt / maxDestino) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Alerta financeiro ── */}
      {contasProximas.length > 0 && (
        <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <p className="font-display font-bold text-[15px] px-5 py-4" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
            Títulos Pendentes (próximos 7 dias)
          </p>
          <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {contasProximas.map((c: any) => {
              const atrasado = calculateStatusAtrasado(c.vencimento, c.status) === 'Atrasado';
              const cor = atrasado ? C.red : c.tipo === 'Receber' ? C.cyan : C.amber;
              return (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.cliente || c.fornecedor}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.tipo === 'Pagar' ? 'A Pagar' : 'A Receber'} · {new Date(c.vencimento).toLocaleDateString('pt-BR')}{atrasado ? ' · ATRASADO' : ''}</p>
                    </div>
                  </div>
                  <p className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{formatCurrency(c.valor)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
