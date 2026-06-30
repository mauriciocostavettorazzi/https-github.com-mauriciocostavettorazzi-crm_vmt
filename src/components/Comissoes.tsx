import React, { useState } from 'react';
import { formatCurrency } from '../utils';
import { toast } from '../toast';
import { Trash2, Percent, TrendingUp, Briefcase } from 'lucide-react';
import type { Comissao } from '../types';

// Aba de CONSULTA: mostra a margem (comissão) de cada venda. Sem baixa —
// os recebimentos/pagamentos são feitos em A Receber e A Pagar.
export function Comissoes({ data, updateData }: any) {
  const comissoes: Comissao[] = data.comissoes || [];
  const vendas = data.vendas || [];
  const [periodo, setPeriodo] = useState<'mes' | 'ano' | 'tudo' | 'personalizado'>('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [comToDelete, setComToDelete] = useState<Comissao | null>(null);

  const dataDe = (c: Comissao) => (c as any).criadoEm || c.dataEsperada || '';

  const filterByDate = (dateStr?: string) => {
    if (periodo === 'tudo') return true;
    if (!dateStr) return false;
    const d = new Date(dateStr.length <= 10 ? dateStr + 'T12:00:00' : dateStr);
    const now = new Date();
    if (periodo === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (periodo === 'ano') return d.getFullYear() === now.getFullYear();
    if (periodo === 'personalizado') {
      const s = dataInicio ? new Date(dataInicio + 'T00:00:00') : new Date(0);
      const e = dataFim ? new Date(dataFim + 'T23:59:59') : new Date(8640000000000000);
      return d >= s && d <= e;
    }
    return true;
  };

  const vendaDe = (c: Comissao) => (c.vendaId ? vendas.find((v: any) => v.id === c.vendaId) : null);

  const filtradas = comissoes
    .filter((c) => c.status !== 'Cancelada' && filterByDate(dataDe(c)))
    .filter((c) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      const v = vendaDe(c);
      return (c.fornecedor?.toLowerCase().includes(s) || c.descricao?.toLowerCase().includes(s) || v?.cliente?.toLowerCase().includes(s));
    })
    .sort((a, b) => (dataDe(b)).localeCompare(dataDe(a)));

  const totalMargem = filtradas.reduce((s, c) => s + (c.valorEsperado || 0), 0);
  const totalVendido = filtradas.reduce((s, c) => { const v = vendaDe(c); return s + (v?.valorBruto || 0); }, 0);
  const margemMedia = totalVendido > 0 ? (totalMargem / totalVendido) * 100 : 0;

  const confirmDelete = () => {
    if (!comToDelete) return;
    updateData({ comissoes: comissoes.filter((c) => c.id !== comToDelete.id) });
    toast('Comissão removida.', 'info');
    setComToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex rounded-xl p-1 gap-1 w-fit" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)' }}>
          {([['mes', 'Mês'], ['ano', 'Ano'], ['tudo', 'Tudo'], ['personalizado', 'Personalizado']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setPeriodo(id)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: periodo === id ? '#FF2D74' : 'transparent', color: periodo === id ? '#fff' : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>
        {periodo === 'personalizado' && (
          <div className="flex items-center gap-2">
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="text-xs rounded-lg px-2 py-1.5 border border-border-hover bg-surface-alt text-primary" />
            <span className="text-placeholder">→</span>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="text-xs rounded-lg px-2 py-1.5 border border-border-hover bg-surface-alt text-primary" />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border border-b-4 border-b-emerald-500 rounded-xl p-5">
          <p className="text-[10px] font-bold text-placeholder uppercase tracking-wider flex items-center gap-1"><TrendingUp size={13} /> Comissão Total (Margem)</p>
          <p className="text-2xl font-black mt-1 text-emerald-400">{formatCurrency(totalMargem)}</p>
        </div>
        <div className="bg-surface border border-border border-b-4 border-b-sky-500 rounded-xl p-5">
          <p className="text-[10px] font-bold text-placeholder uppercase tracking-wider flex items-center gap-1"><Briefcase size={13} /> Vendas com Comissão</p>
          <p className="text-2xl font-black mt-1 text-primary">{filtradas.length}</p>
        </div>
        <div className="bg-surface border border-border border-b-4 border-b-amber-500 rounded-xl p-5">
          <p className="text-[10px] font-bold text-placeholder uppercase tracking-wider flex items-center gap-1"><Percent size={13} /> Margem Média</p>
          <p className="text-2xl font-black mt-1 text-amber-400">{margemMedia.toFixed(1)}%</p>
        </div>
      </div>

      {/* Tabela de consulta */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="p-4 bg-surface-alt border-b border-border flex flex-col md:flex-row justify-between items-center gap-3">
          <div>
            <h4 className="font-black text-white uppercase tracking-wider">Comissões por Venda</h4>
            <p className="text-[11px] text-placeholder mt-0.5">Apenas consulta — recebimentos e pagamentos são feitos em A Receber / A Pagar.</p>
          </div>
          <input type="text" placeholder="Buscar cliente, fornecedor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 border border-border-hover rounded-md px-3 py-1.5 text-sm bg-surface text-primary" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-alt text-[10px] uppercase font-bold text-placeholder">
              <tr>
                <th className="px-4 py-3">Cliente / Venda</th>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3 whitespace-nowrap">Valor da Venda</th>
                <th className="px-4 py-3 whitespace-nowrap">Comissão (Margem)</th>
                <th className="px-4 py-3 whitespace-nowrap">Margem %</th>
                <th className="px-4 py-3 whitespace-nowrap">Data</th>
                <th className="px-4 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="text-sm border-t border-border divide-y divide-border">
              {filtradas.map((c) => {
                const venda = vendaDe(c);
                const pct = venda?.valorBruto ? (c.valorEsperado / venda.valorBruto) * 100 : null;
                const d = dataDe(c);
                return (
                  <tr key={c.id} className="hover:bg-surface-alt transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-primary text-sm uppercase">{venda?.cliente || c.fornecedor}</p>
                      {venda?.numeroPedido && <p className="text-[10px] font-mono text-muted">Ped. {venda.numeroPedido}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted uppercase">{c.fornecedor || '—'}</td>
                    <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">{venda ? formatCurrency(venda.valorBruto) : '—'}</td>
                    <td className="px-4 py-3 font-black text-emerald-400 whitespace-nowrap">{formatCurrency(c.valorEsperado || 0)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {pct != null ? <span className="text-[11px] font-bold text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded">{pct.toFixed(1)}%</span> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{d ? new Date(d.length <= 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setComToDelete(c)} title="Remover registro" className="bg-red-900/20 text-red-400 p-1.5 rounded hover:bg-red-900/40"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                );
              })}
              {filtradas.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-muted">Nenhuma comissão no período. As comissões são geradas automaticamente a cada venda com margem.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirm */}
      {comToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 border border-border max-w-sm w-full text-center">
            <Trash2 size={36} className="text-red-500 mx-auto mb-3" />
            <p className="text-primary font-bold mb-1">Remover este registro de comissão?</p>
            <p className="text-xs text-muted mb-4">A venda e seus títulos não são afetados — só o registro de consulta da margem.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setComToDelete(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
