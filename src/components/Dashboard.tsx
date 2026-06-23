import React, { useState, useMemo } from 'react';
import { formatCurrency, isCheckinLiberado, getCheckinUrl, calculateStatusAtrasado } from '../utils';
import { Plane, TrendingUp, DollarSign, AlertCircle, Filter, CalendarDays, BarChart as BarChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { isWithinInterval, addDays, isPast } from 'date-fns';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

export function Dashboard({ data }: any) {
  const [periodo, setPeriodo] = useState('tudo'); // 'tudo', 'hoje', 'mes', 'ano', 'personalizado'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const filterByDate = (dateStr: string) => {
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    const now = new Date();
    
    if (periodo === 'tudo') return true;
    if (periodo === 'hoje') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (periodo === 'mes') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
    if (periodo === 'ano') {
      return itemDate.getFullYear() === now.getFullYear();
    }
    if (periodo === 'personalizado') {
      const start = dataInicio ? new Date(dataInicio + 'T00:00:00') : new Date(0);
      const end = dataFim ? new Date(dataFim + 'T23:59:59') : new Date(8640000000000000);
      return itemDate >= start && itemDate <= end;
    }
    return true;
  };

  // Metricas
  const vendasFiltradas = data.vendas.filter((v: any) => v.status !== 'Cancelado' && filterByDate(v.criadoEm));
  const valorVendas = vendasFiltradas.reduce((acc: number, v: any) => acc + (v.valorBruto || 0), 0);
  const lucroBruto = vendasFiltradas.reduce((acc: number, v: any) => acc + (Number(v.comissao) || 0), 0);
  
  const receberPendente = data.contasReceber.filter((c: any) => {
     const statusInfo = calculateStatusAtrasado(c.vencimento, c.status);
     return (['Em dia', 'Pgto do dia', 'Atrasado'].includes(statusInfo)) && filterByDate(c.vencimento);
  });
  const valorReceber = receberPendente.reduce((acc: number, v: any) => acc + v.valor, 0);

  const pagarPendente = data.contasPagar.filter((c: any) => {
     const statusInfo = calculateStatusAtrasado(c.vencimento, c.status);
     return (['Em dia', 'Pgto do dia', 'Atrasado'].includes(statusInfo)) && filterByDate(c.vencimento);
  });
  const valorPagar = pagarPendente.reduce((acc: number, v: any) => acc + v.valor, 0);

  const voosFiltrados = data.voos.filter((v: any) => filterByDate(v.dataPartida) && v.status === 'Emitido');

  const now = new Date();
  const next7Days = addDays(now, 7);
  
  const contasProximasRaw = data.contasPagar.filter((c: any) => {
       const statusInfo = calculateStatusAtrasado(c.vencimento, c.status);
       return ['Em dia', 'Pgto do dia', 'Atrasado'].includes(statusInfo);
    }).map((c: any) => ({ ...c, tipo: 'Pagar' })).concat(
    data.contasReceber.filter((c: any) => {
       const statusInfo = calculateStatusAtrasado(c.vencimento, c.status);
       return ['Em dia', 'Pgto do dia', 'Atrasado'].includes(statusInfo);
    }).map((c: any) => ({ ...c, tipo: 'Receber' }))
  );

  const contasProximas = contasProximasRaw.filter((c: any) => {
    const vd = new Date(c.vencimento);
    return isWithinInterval(vd, { start: subDays(now, 30), end: next7Days });
  }).sort((a: any, b: any) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());

  // Proximos voos globais idenpendente do filtro local
  const proximosVoos = data.voos
    .filter((v: any) => v.status === 'Emitido' && new Date(v.dataPartida) > subDays(now, 1))
    .sort((a: any, b: any) => new Date(a.dataPartida).getTime() - new Date(b.dataPartida).getTime())
    .slice(0, 10); // View top 10

  const getPeriodLabel = () => {
     if(periodo === 'tudo') return 'Período: Todo o Histórico';
     if(periodo === 'hoje') return 'Hoje';
     if(periodo === 'mes') return 'Este Mês';
     if(periodo === 'ano') return 'Este Ano';
     if(periodo === 'personalizado') return 'Personalizado';
     return '';
  };

  const proximosAPagar7Dias = data.contasPagar.filter((c: any) => {
    const statusInfo = calculateStatusAtrasado(c.vencimento, c.status);
    if (!['Em dia', 'Pgto do dia'].includes(statusInfo)) return false;
    const vd = new Date(c.vencimento);
    const start = new Date(now);
    start.setHours(0,0,0,0);
    const end = new Date(next7Days);
    end.setHours(23,59,59,999);
    return vd >= start && vd <= end;
  }).sort((a: any, b: any) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()).slice(0, 5);

  // ----- CHARTS DATA -----

  // Sales by type
  const vendasPorTipo = useMemo(() => {
    const counts: Record<string, number> = {};
    vendasFiltradas.forEach((v: any) => {
      counts[v.tipo] = (counts[v.tipo] || 0) + 1;
    });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] })).sort((a,b) => b.value - a.value);
  }, [vendasFiltradas]);
  const COLORS = ['#3B82F6', '#1D9E75', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // Monthly revenue for the last 6 months
  const monthlyData = useMemo(() => {
      const mData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const y = d.getFullYear();
        const m = d.getMonth();
        
        let vendasMes = data.vendas.filter((v:any) => v.status !== 'Cancelado' && new Date(v.criadoEm).getMonth() === m && new Date(v.criadoEm).getFullYear() === y);
        let valorV = vendasMes.reduce((acc:any, v:any) => acc + (v.valorBruto || 0), 0);
        let lucroV = vendasMes.reduce((acc:any, v:any) => acc + (Number(v.comissao) || 0), 0);

        mData.push({
           name: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
           Vendas: valorV,
           Lucro: lucroV
        });
      }
      return mData;
  }, [data.vendas]);

  // Contas by Category
  const despesasPorCategoria = useMemo(() => {
    const contasP = data.contasPagar.filter((c:any) => filterByDate(c.vencimento) && c.status !== 'Cancelado');
    const counts: Record<string, number> = {};
    contasP.forEach((c: any) => {
      counts[c.categoria] = (counts[c.categoria] || 0) + c.valor;
    });
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [data.contasPagar, filterByDate]);

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="bg-surface p-4 rounded-2xl shadow-sm border border-border flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="flex items-center gap-2 text-primary font-bold">
            <Filter size={18} className="text-primary"/> 
            <span className="uppercase tracking-widest">Painel Geral</span>
         </div>

         <div className="flex flex-wrap items-center gap-3">
            <select 
              value={periodo} 
              onChange={(e) => setPeriodo(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm font-medium text-primary outline-none focus:border-[#1D9E75] cursor-pointer bg-surface-alt"
            >
              <option value="tudo">Todo o Histórico</option>
              <option value="hoje">Hoje</option>
              <option value="mes">Este Mês (Faturamento)</option>
              <option value="ano">Este Ano (Faturamento)</option>
              <option value="personalizado">Período Personalizado</option>
            </select>
            {periodo === 'personalizado' && (
              <div className="flex items-center gap-2 bg-surface-alt p-1 border border-border rounded-lg">
                 <input 
                   type="date" 
                   value={dataInicio}
                   onChange={(e) => setDataInicio(e.target.value)}
                   className="bg-transparent px-2 py-1 text-sm outline-none font-mono text-muted"
                 />
                 <span className="text-placeholder font-bold">-</span>
                 <input 
                   type="date" 
                   value={dataFim}
                   onChange={(e) => setDataFim(e.target.value)}
                   className="bg-transparent px-2 py-1 text-sm outline-none font-mono text-muted"
                 />
              </div>
            )}
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-surface p-5 rounded-xl shadow-sm border border-border border-l-4 border-l-[#1D9E75] hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-placeholder uppercase tracking-widest mb-1">{getPeriodLabel()}</p>
          <h4 className="text-xs font-black uppercase text-muted mb-1">Total Vendido</h4>
          <h3 className="text-2xl font-black text-primary truncate">{formatCurrency(valorVendas)}</h3>
          <p className="text-[10px] bg-blue-900/30 text-blue-400 inline-block px-1.5 py-0.5 mt-2 rounded font-bold uppercase">{vendasFiltradas.length} Vendas</p>
        </div>

        <div className="bg-surface p-5 rounded-xl shadow-sm border border-border border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-placeholder uppercase tracking-widest mb-1">{getPeriodLabel()}</p>
          <h4 className="text-xs font-black uppercase text-muted mb-1">Lucro Estimado</h4>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-emerald-400 truncate">{formatCurrency(lucroBruto)}</h3>
          </div>
          <p className="text-[10px] bg-emerald-900/30 text-emerald-400 inline-block px-1.5 py-0.5 mt-2 rounded font-bold uppercase">
             Margem: {valorVendas > 0 ? ((lucroBruto / valorVendas) * 100).toFixed(1) : '0'}%
          </p>
        </div>
        
        <div className="bg-surface p-5 rounded-xl shadow-sm border border-border border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-placeholder uppercase tracking-widest mb-1">{getPeriodLabel()}</p>
          <h4 className="text-xs font-black uppercase text-muted mb-1">A Receber</h4>
          <h3 className="text-2xl font-black text-primary truncate">{formatCurrency(valorReceber)}</h3>
          <p className="text-[10px] bg-amber-900/30 text-amber-400 inline-block px-1.5 py-0.5 mt-2 rounded font-bold uppercase">{receberPendente.length} Títulos Pendentes</p>
        </div>

        <div className="bg-surface p-5 rounded-xl shadow-sm border border-border border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-placeholder uppercase tracking-widest mb-1">{getPeriodLabel()}</p>
          <h4 className="text-xs font-black uppercase text-muted mb-1">A Pagar</h4>
          <h3 className="text-2xl font-black text-primary truncate">{formatCurrency(valorPagar)}</h3>
          <p className="text-[10px] bg-red-900/30 text-red-400 inline-block px-1.5 py-0.5 mt-2 rounded font-bold uppercase">{pagarPendente.length} Títulos Pendentes</p>
        </div>

        <div className="bg-surface p-5 rounded-xl shadow-sm border border-border border-l-4 border-l-sky-500 hover:shadow-md transition-shadow">
          <p className="text-[10px] font-bold text-placeholder uppercase tracking-widest mb-1">{getPeriodLabel()}</p>
          <h4 className="text-xs font-black uppercase text-muted mb-1">Tks / Voos Emitidos</h4>
          <h3 className="text-2xl font-black text-primary truncate">{voosFiltrados.length}</h3>
          <p className="text-[10px] bg-sky-900/30 text-sky-400 inline-block px-1.5 py-0.5 mt-2 rounded font-bold uppercase">Passageiros no ar</p>
        </div>
      </div>

      {/* Próximos Voos (Top Priority) */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border flex flex-col mb-6">
          <div className="p-4 bg-surface-alt border-b border-border flex justify-between items-center rounded-t-2xl">
            <h4 className="font-black text-white uppercase tracking-wider flex items-center gap-2"><Plane size={18} className="text-sky-500"/> Próximos Voos / Embarques</h4>
            <span className="bg-blue-900/50 text-blue-300 text-[10px] px-2 py-1 rounded-full font-black uppercase">Tempo Real / Curto Prazo</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-alt text-[10px] uppercase font-bold text-placeholder">
                <tr>
                  <th className="px-4 py-3">Passageiro / Voo</th>
                  <th className="px-4 py-3">Trecho</th>
                  <th className="px-4 py-3">Embarque / Check-in</th>
                </tr>
              </thead>
              <tbody className="text-sm border-t border-border">
                {proximosVoos.length === 0 ? <tr><td colSpan={3} className="p-4 text-center text-sm text-muted font-medium bg-surface">Nenhum voo programado nos próximos dias.</td></tr> : null}
                {proximosVoos.map((voo: any) => {
                  const is24h = new Date(voo.dataPartida).getTime() - now.getTime() < 24 * 60 * 60 * 1000;
                  const is48h = new Date(voo.dataPartida).getTime() - now.getTime() < 48 * 60 * 60 * 1000 && !is24h;
                  
                  return (
                    <tr key={voo.id} className={`border-b border-border hover:bg-surface-alt transition-colors ${is24h ? 'bg-red-900/30/50' : is48h ? 'bg-amber-900/30/50' : 'bg-surface'}`}>
                      <td className="px-4 py-3">
                        <div className="font-black text-primary uppercase text-xs truncate max-w-[300px]" title={voo.passageiros}>{voo.passageiros}</div>
                        <div className="text-[10px] text-muted font-mono mt-1 bg-surface-alt inline-block px-1 rounded">{voo.ciaAerea} {voo.numeroVoo} • LOC: {voo.localizador || 'S/ Loc'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1 font-bold uppercase">
                          <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-[10px] tracking-wider">{voo.origem?.toUpperCase()}</span>
                          <span className="text-secondary">→</span>
                          <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-[10px] tracking-wider">{voo.destino?.toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`text-[11px] font-black uppercase ${is24h ? 'text-red-400' : 'text-white'}`}>
                              {new Date(voo.dataPartida).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })}
                            </div>
                            <div className={`text-[9px] uppercase mt-0.5 ${is24h ? 'text-red-400 font-bold' : is48h ? 'text-yellow-600 font-bold' : 'text-placeholder'}`}>
                              Checkin: {voo.checkInDisponivel ? new Date(voo.checkInDisponivel).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' }) : 'N/D'}
                            </div>
                          </div>
                          {voo.ciaAerea === 'Azul' || voo.ciaAerea === 'GOL' || voo.ciaAerea === 'LATAM' ? (
                            (() => {
                               const isLiberado = isCheckinLiberado(voo.dataPartida);
                               if (isLiberado && getCheckinUrl(voo.ciaAerea, voo.localizador) !== '#') {
                                 return (
                                   <a href={getCheckinUrl(voo.ciaAerea, voo.localizador)} 
                                      target="_blank" rel="noreferrer"
                                      className="ml-2 px-2 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 uppercase tracking-widest text-[9px] font-black rounded shadow-sm whitespace-nowrap transition-colors">
                                     Emitir Check-in
                                   </a>
                                 );
                               } else {
                                 return (
                                   <button disabled
                                      title="Check-in não liberado ou Localizador ausente"
                                      className="ml-2 px-2 py-1.5 bg-surface-alt text-placeholder cursor-not-allowed uppercase tracking-widest text-[9px] font-bold rounded shadow-sm whitespace-nowrap">
                                     Pendente
                                   </button>
                                 );
                               }
                            })()
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graph 1: Receitas e Lucro (Ultimos 6 meses) */}
        <div className="lg:col-span-2 bg-surface rounded-2xl shadow-sm border border-border p-5 flex flex-col min-h-[350px]">
           <div className="flex items-center gap-2 mb-6">
              <BarChartIcon size={18} className="text-primary" />
              <h4 className="font-black text-primary uppercase tracking-wider text-sm">Faturamento e Margem (Últimos 6 Meses)</h4>
           </div>
           <div className="flex-1 w-full h-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-muted)' }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
                    tickFormatter={(val) => `R$${(val/1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip 
                     formatter={(value: number) => formatCurrency(value)}
                     contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary)' }} />
                  <Area type="monotone" dataKey="Vendas" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
                  <Area type="monotone" dataKey="Lucro" stroke="#1D9E75" strokeWidth={3} fillOpacity={1} fill="url(#colorLucro)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Graph 2: Tipos de Venda */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-5 flex flex-col min-h-[350px]">
           <div className="flex items-center gap-2 mb-2">
              <PieChartIcon size={18} className="text-primary" />
              <h4 className="font-black text-primary uppercase tracking-wider text-sm">Distribuição de Vendas</h4>
           </div>
           <p className="text-[10px] text-placeholder font-bold uppercase tracking-wider mb-2 text-center">{getPeriodLabel()}</p>
           <div className="flex-1 w-full h-full min-h-[200px] flex items-center justify-center">
              {vendasPorTipo.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vendasPorTipo}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {vendasPorTipo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                       contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-primary)', fontSize: '12px' }}
                    />
                    <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px', color: 'var(--color-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-placeholder text-sm font-medium">Nenhuma venda no período</div>
              )}
           </div>
        </div>
      </div>

      {/* Próximos 7 Dias */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border flex flex-col p-5 mb-6">
        <h4 className="font-black text-primary uppercase tracking-wider mb-4 border-b border-border pb-2">Títulos a Pagar — Próximos 7 Dias</h4>
        {proximosAPagar7Dias.length === 0 ? (
           <p className="text-sm text-muted font-medium">Nenhum título a pagar nos próximos 7 dias.</p>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
             {proximosAPagar7Dias.map((c: any) => (
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

      {/* Utilities Tables */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Table 1: Alerta Financeiro */}
        <div className="bg-surface rounded-2xl shadow-sm border border-border flex flex-col max-h-[500px]">
          <div className="p-4 bg-surface-alt border-b border-border rounded-t-2xl flex justify-between items-center sticky top-0 z-10">
            <h4 className="font-black text-white uppercase tracking-wider flex items-center gap-2"><AlertCircle size={18} className="text-amber-500" /> Alerta Financeiro</h4>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded-full font-black uppercase flex items-center gap-1">Pendente & Atraso</span>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {contasProximas.length === 0 ? <p className="text-sm text-muted font-medium">Nenhum título pendente ou em atraso.</p> : null}
            {contasProximas.map((c: any) => {
              const statusAtratado = calculateStatusAtrasado(c.vencimento, c.status);
              return (
              <div key={c.id} className={`flex items-start justify-between border-l-4 pl-3 py-2 mb-3 bg-surface-alt/50 rounded-r-lg border border-border border-l-transparent last:mb-0
                 ${statusAtratado === 'Atrasado' ? '!border-l-red-500 bg-red-900/30/30' : c.tipo === 'Receber' ? '!border-l-blue-400' : '!border-l-[#1D9E75]'}`}>
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${statusAtratado === 'Atrasado' ? 'text-red-400' : c.tipo === 'Receber' ? 'text-blue-500' : 'text-amber-400'}`}>
                    <span>{c.tipo === 'Pagar' ? 'A Pagar (Fornecedor)' : 'A Receber (Cliente)'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] tracking-widest ${statusAtratado === 'Atrasado' ? 'bg-red-200' : 'bg-surface-hover text-muted'}`}>{statusAtratado === 'Atrasado' ? 'Atrasado' : new Date(c.vencimento).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="font-bold text-sm text-primary truncate max-w-[300px] mt-1" title={c.cliente || c.fornecedor}>
                    {c.cliente || c.fornecedor}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-primary">{formatCurrency(c.valor)}</div>
                </div>
              </div>
            )})}
          </div>
        </div>

      </div>
    </div>
  );
}

function subDays(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - amount);
  return d;
}

