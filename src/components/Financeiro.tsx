import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../utils';
import { pagamentosDe, saldoRestante } from '../lib/financeiro';
import {
  TrendingUp, TrendingDown, Wallet, ArrowDownCircle, ArrowUpCircle,
  Receipt, Percent, Scale, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const C = { magenta: '#FF2D74', cyan: '#25C2F2', orange: '#FF9F2E', teal: '#1FBE93', amber: '#FBBF24', red: '#FF5A6E' };

// ── Card de KPI compacto ──────────────────────────────────────────────────────
function Kpi({ label, value, icon: Icon, color, sub }: any) {
  return (
    <div className="rounded-[18px] p-5 flex flex-col gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="font-display font-bold text-[24px] leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{sub}</p>}
      </div>
    </div>
  );
}

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function Financeiro({ data }: any) {
  const [aba, setAba] = useState<'fluxo' | 'dre' | 'consolidado'>('fluxo');
  const [periodo, setPeriodo] = useState('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const filterByDate = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr.length <= 10 ? dateStr + 'T12:00:00' : dateStr);
    const now = new Date();
    if (periodo === 'tudo') return true;
    if (periodo === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (periodo === 'ano') return d.getFullYear() === now.getFullYear();
    if (periodo === 'personalizado') {
      const s = dataInicio ? new Date(dataInicio + 'T00:00:00') : new Date(0);
      const e = dataFim ? new Date(dataFim + 'T23:59:59') : new Date(8640000000000000);
      return d >= s && d <= e;
    }
    return true;
  };

  // ── Movimentos de caixa realizados (entradas e saídas efetivas) ──────────────
  const movimentosTodos = useMemo(() => {
    const movs: { data: string; tipo: 'entrada' | 'saida'; valor: number; descricao: string; origem: string }[] = [];
    // Entradas — títulos a receber baixados (cada pagamento)
    (data.contasReceber || []).forEach((c: any) => {
      pagamentosDe(c).forEach((p: any) => {
        if (p.data && p.valor) movs.push({ data: p.data, tipo: 'entrada', valor: p.valor, descricao: c.cliente, origem: 'A Receber' });
      });
    });
    // Entradas — comissões recebidas
    (data.comissoes || []).forEach((c: any) => {
      if (c.valorRecebido && c.dataRecebida) movs.push({ data: c.dataRecebida, tipo: 'entrada', valor: c.valorRecebido, descricao: c.fornecedor, origem: 'Comissão' });
    });
    // Saídas — títulos a pagar baixados (cada pagamento)
    (data.contasPagar || []).forEach((c: any) => {
      pagamentosDe(c).forEach((p: any) => {
        if (p.data && p.valor) movs.push({ data: p.data, tipo: 'saida', valor: p.valor, descricao: c.fornecedor, origem: 'A Pagar' });
      });
    });
    return movs.sort((a, b) => a.data.localeCompare(b.data));
  }, [data]);

  const movimentos = useMemo(() => movimentosTodos.filter(m => filterByDate(m.data)), [movimentosTodos, periodo, dataInicio, dataFim]);

  const totalEntradas = movimentos.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0);
  const totalSaidas = movimentos.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0);
  const saldoPeriodo = totalEntradas - totalSaidas;

  // Extrato com saldo acumulado (mais recente primeiro para exibição)
  const extrato = useMemo(() => {
    let acc = 0;
    const asc = movimentos.map(m => {
      acc += m.tipo === 'entrada' ? m.valor : -m.valor;
      return { ...m, saldoAcumulado: acc };
    });
    return asc.reverse();
  }, [movimentos]);

  // Gráfico: entradas x saídas por mês (12 meses do ano corrente, ou agrupado)
  const graficoMensal = useMemo(() => {
    const ano = new Date().getFullYear();
    const base = MESES_CURTOS.map((m, i) => ({ mes: m, Entradas: 0, Saidas: 0, _i: i }));
    movimentosTodos.forEach(mov => {
      const d = new Date(mov.data + 'T12:00:00');
      if (d.getFullYear() !== ano) return;
      const idx = d.getMonth();
      if (mov.tipo === 'entrada') base[idx].Entradas += mov.valor;
      else base[idx].Saidas += mov.valor;
    });
    return base;
  }, [movimentosTodos]);

  // ── DRE simplificado (competência das vendas no período) ─────────────────────
  const dre = useMemo(() => {
    const vendasP = (data.vendas || []).filter((v: any) => v.status !== 'Cancelado' && filterByDate(v.criadoEm));
    const receitaBruta = vendasP.reduce((s: number, v: any) => s + (v.valorBruto || 0), 0);
    const lucroBruto = vendasP.reduce((s: number, v: any) => s + (Number(v.comissao) || 0), 0);
    const custoProdutos = receitaBruta - lucroBruto; // custo de fornecedores embutido nas vendas
    // Despesas operacionais: contas a pagar NÃO vinculadas a uma venda (folha, imposto, aluguel, etc.)
    const despesasOp = (data.contasPagar || [])
      .filter((c: any) => !c.vendaId && c.status !== 'Cancelado' && filterByDate(c.vencimento))
      .reduce((s: number, c: any) => s + (c.valor || 0), 0);
    const resultadoLiquido = lucroBruto - despesasOp;
    const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
    const margemLiquida = receitaBruta > 0 ? (resultadoLiquido / receitaBruta) * 100 : 0;
    return { vendasCount: vendasP.length, receitaBruta, custoProdutos, lucroBruto, despesasOp, resultadoLiquido, margemBruta, margemLiquida };
  }, [data, periodo, dataInicio, dataFim]);

  // ── Consolidado (posições em aberto, independente de período) ─────────────────
  const consolidado = useMemo(() => {
    const aReceber = (data.contasReceber || [])
      .filter((c: any) => c.status !== 'Recebido' && c.status !== 'Cancelado')
      .reduce((s: number, c: any) => s + saldoRestante(c), 0);
    const aPagar = (data.contasPagar || [])
      .filter((c: any) => c.status !== 'Pago' && c.status !== 'Cancelado')
      .reduce((s: number, c: any) => s + saldoRestante(c), 0);
    const comissoesAReceber = (data.comissoes || [])
      .filter((c: any) => c.status === 'Pendente' || c.status === 'Parcial')
      .reduce((s: number, c: any) => s + Math.max(0, (c.valorEsperado || 0) - (c.valorRecebido || 0)), 0);
    const posicaoLiquida = aReceber + comissoesAReceber - aPagar;
    return { aReceber, aPagar, comissoesAReceber, posicaoLiquida };
  }, [data]);

  const periodoLabel = periodo === 'mes' ? 'este mês' : periodo === 'ano' ? 'este ano' : periodo === 'tudo' ? 'todo o período' : 'período selecionado';

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho: abas + filtro de período ── */}
      <div className="flex flex-col lg:flex-row gap-3 justify-between lg:items-center">
        <div className="flex rounded-xl p-1 gap-1 w-fit" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)' }}>
          {([['fluxo', 'Fluxo de Caixa'], ['dre', 'DRE'], ['consolidado', 'Consolidado']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: aba === id ? C.magenta : 'transparent', color: aba === id ? '#fff' : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)' }}>
            {([['mes', 'Mês'], ['ano', 'Ano'], ['tudo', 'Tudo'], ['personalizado', 'Personalizado']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setPeriodo(id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: periodo === id ? C.magenta : 'transparent', color: periodo === id ? '#fff' : 'var(--text-muted)' }}>
                {label}
              </button>
            ))}
          </div>
          {periodo === 'personalizado' && (
            <div className="flex items-center gap-2">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="text-xs rounded-lg px-2 py-1.5" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              <span style={{ color: 'var(--text-faint)' }}>→</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="text-xs rounded-lg px-2 py-1.5" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ FLUXO DE CAIXA ═══════════ */}
      {aba === 'fluxo' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Kpi label={`Entradas (${periodoLabel})`} value={formatCurrency(totalEntradas)} icon={ArrowDownCircle} color={C.teal} sub={`${movimentos.filter(m => m.tipo === 'entrada').length} recebimento(s)`} />
            <Kpi label={`Saídas (${periodoLabel})`} value={formatCurrency(totalSaidas)} icon={ArrowUpCircle} color={C.red} sub={`${movimentos.filter(m => m.tipo === 'saida').length} pagamento(s)`} />
            <Kpi label="Saldo do Período" value={formatCurrency(saldoPeriodo)} icon={Wallet} color={saldoPeriodo >= 0 ? C.cyan : C.red} sub="Entradas − Saídas" />
          </div>

          {/* Gráfico mensal */}
          <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <p className="font-display font-bold text-[15px] mb-4" style={{ color: 'var(--text-primary)' }}>Entradas × Saídas — {new Date().getFullYear()}</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={graficoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                <XAxis dataKey="mes" tick={{ fill: 'var(--text-faint)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 12 }}
                  formatter={(v: any) => formatCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Entradas" fill={C.teal} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saidas" name="Saídas" fill={C.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Extrato */}
          <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <p className="font-display font-bold text-[15px] px-5 py-4" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>Extrato de Caixa</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-color)' }}>
                  {['Data', 'Descrição', 'Origem', 'Entrada', 'Saída', 'Saldo'].map(h => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold" style={{ color: 'var(--text-placeholder)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {extrato.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma movimentação realizada no período. Baixe títulos em A Receber / A Pagar para alimentar o caixa.</td></tr>
                  )}
                  {extrato.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 text-sm font-semibold uppercase" style={{ color: 'var(--text-primary)' }}>{m.descricao || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: m.tipo === 'entrada' ? `${C.teal}22` : `${C.red}22`, color: m.tipo === 'entrada' ? C.teal : C.red }}>{m.origem}</span>
                      </td>
                      <td className="px-4 py-3 font-black text-sm" style={{ color: C.teal }}>{m.tipo === 'entrada' ? formatCurrency(m.valor) : ''}</td>
                      <td className="px-4 py-3 font-black text-sm" style={{ color: C.red }}>{m.tipo === 'saida' ? formatCurrency(m.valor) : ''}</td>
                      <td className="px-4 py-3 font-bold text-sm" style={{ color: m.saldoAcumulado >= 0 ? 'var(--text-primary)' : C.red }}>{formatCurrency(m.saldoAcumulado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════ DRE ═══════════ */}
      {aba === 'dre' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Receita Bruta" value={formatCurrency(dre.receitaBruta)} icon={Receipt} color={C.cyan} sub={`${dre.vendasCount} venda(s)`} />
            <Kpi label="Lucro Bruto" value={formatCurrency(dre.lucroBruto)} icon={TrendingUp} color={C.teal} sub={`Margem ${dre.margemBruta.toFixed(1)}%`} />
            <Kpi label="Despesas Operac." value={formatCurrency(dre.despesasOp)} icon={TrendingDown} color={C.orange} sub="Contas não vinculadas a vendas" />
            <Kpi label="Resultado Líquido" value={formatCurrency(dre.resultadoLiquido)} icon={Scale} color={dre.resultadoLiquido >= 0 ? C.magenta : C.red} sub={`Margem ${dre.margemLiquida.toFixed(1)}%`} />
          </div>

          {/* Demonstrativo em cascata */}
          <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <p className="font-display font-bold text-[15px] px-5 py-4" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
              Demonstrativo de Resultado — {periodoLabel}
            </p>
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {[
                { label: 'Receita Bruta de Vendas', valor: dre.receitaBruta, color: 'var(--text-primary)', bold: true },
                { label: '(−) Custo de Fornecedores', valor: -dre.custoProdutos, color: C.red },
                { label: '(=) Lucro Bruto', valor: dre.lucroBruto, color: C.teal, bold: true, alt: true },
                { label: '(−) Despesas Operacionais', valor: -dre.despesasOp, color: C.red },
                { label: '(=) Resultado Líquido', valor: dre.resultadoLiquido, color: dre.resultadoLiquido >= 0 ? C.teal : C.red, bold: true, alt: true, big: true },
              ].map((linha, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5" style={{ background: linha.alt ? 'var(--bg-surface-alt)' : 'transparent' }}>
                  <span className={`${linha.bold ? 'font-black' : 'font-medium'} ${linha.big ? 'text-base' : 'text-sm'}`} style={{ color: linha.bold ? 'var(--text-primary)' : 'var(--text-muted)' }}>{linha.label}</span>
                  <span className={`font-display ${linha.bold ? 'font-black' : 'font-bold'} ${linha.big ? 'text-xl' : 'text-sm'}`} style={{ color: linha.color }}>{formatCurrency(linha.valor)}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11px] px-1" style={{ color: 'var(--text-faint)' }}>
            * Receita e lucro por competência (data da venda). Custo de fornecedores = receita − lucro estimado das vendas.
            Despesas operacionais = contas a pagar não vinculadas a uma venda específica, no período.
          </p>
        </>
      )}

      {/* ═══════════ CONSOLIDADO ═══════════ */}
      {aba === 'consolidado' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="A Receber (aberto)" value={formatCurrency(consolidado.aReceber)} icon={ArrowDownCircle} color={C.teal} />
            <Kpi label="Comissões a Receber" value={formatCurrency(consolidado.comissoesAReceber)} icon={Percent} color={C.cyan} />
            <Kpi label="A Pagar (aberto)" value={formatCurrency(consolidado.aPagar)} icon={ArrowUpCircle} color={C.red} />
            <Kpi label="Posição Líquida" value={formatCurrency(consolidado.posicaoLiquida)} icon={Scale} color={consolidado.posicaoLiquida >= 0 ? C.magenta : C.red} sub="A receber + comissões − a pagar" />
          </div>

          <div className="rounded-[18px] p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} style={{ color: C.magenta }} />
              <p className="font-display font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>Posição Financeira Total</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-surface-alt)' }}>
                <span className="text-sm font-semibold" style={{ color: C.teal }}>Total a entrar (clientes + comissões)</span>
                <span className="font-display font-bold" style={{ color: C.teal }}>{formatCurrency(consolidado.aReceber + consolidado.comissoesAReceber)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-surface-alt)' }}>
                <span className="text-sm font-semibold" style={{ color: C.red }}>Total a sair (fornecedores)</span>
                <span className="font-display font-bold" style={{ color: C.red }}>{formatCurrency(consolidado.aPagar)}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: consolidado.posicaoLiquida >= 0 ? `${C.teal}18` : `${C.red}18`, border: `1px solid ${consolidado.posicaoLiquida >= 0 ? C.teal : C.red}44` }}>
                <span className="font-black uppercase tracking-wider text-sm" style={{ color: 'var(--text-primary)' }}>Posição Líquida</span>
                <span className="font-display font-black text-2xl" style={{ color: consolidado.posicaoLiquida >= 0 ? C.teal : C.red }}>{formatCurrency(consolidado.posicaoLiquida)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
