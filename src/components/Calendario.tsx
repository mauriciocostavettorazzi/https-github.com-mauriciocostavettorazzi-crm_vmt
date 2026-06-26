import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plane, BedDouble, DollarSign, CheckSquare, Gift, AlertTriangle } from 'lucide-react';

type CalEvent = {
  date: string; // YYYY-MM-DD
  label: string;
  type: 'voo' | 'checkin' | 'checkout' | 'pagar' | 'receber' | 'tarefa' | 'aniversario' | 'passaporte';
  ref?: any;
};

const TYPE_STYLE: Record<CalEvent['type'], { color: string; bg: string; Icon: any }> = {
  voo:         { color: 'text-sky-400',     bg: 'bg-sky-900/40',      Icon: Plane },
  checkin:     { color: 'text-emerald-400', bg: 'bg-emerald-900/40',  Icon: BedDouble },
  checkout:    { color: 'text-teal-400',    bg: 'bg-teal-900/40',     Icon: BedDouble },
  pagar:       { color: 'text-red-400',     bg: 'bg-red-900/40',      Icon: DollarSign },
  receber:     { color: 'text-amber-400',   bg: 'bg-amber-900/40',    Icon: DollarSign },
  tarefa:      { color: 'text-purple-400',  bg: 'bg-purple-900/40',   Icon: CheckSquare },
  aniversario: { color: 'text-pink-400',    bg: 'bg-pink-900/40',     Icon: Gift },
  passaporte:  { color: 'text-orange-400',  bg: 'bg-orange-900/40',   Icon: AlertTriangle },
};

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function toYMD(d: Date) { return d.toISOString().substring(0, 10); }

export function Calendario({ data }: any) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const events = useMemo<CalEvent[]>(() => {
    const evs: CalEvent[] = [];

    // Voos
    (data.voos || []).forEach((v: any) => {
      if (v.dataPartida) evs.push({ date: v.dataPartida.substring(0, 10), label: `✈ ${v.origem} → ${v.destino}`, type: 'voo', ref: v });
    });

    // Hospedagens (check-in / check-out de cada venda)
    (data.vendas || []).forEach((venda: any) => {
      (venda.hospedagens || []).forEach((h: any) => {
        if (h.checkIn) evs.push({ date: h.checkIn, label: `🏨 Check-in: ${h.nome || 'Hotel'}`, type: 'checkin', ref: h });
        if (h.checkOut) evs.push({ date: h.checkOut, label: `🏨 Check-out: ${h.nome || 'Hotel'}`, type: 'checkout', ref: h });
      });
      // Tarefas da venda
      (venda.tarefas || []).filter((t: any) => !t.feita && t.prazo).forEach((t: any) => {
        evs.push({ date: t.prazo, label: `☑ ${t.titulo} (${venda.cliente})`, type: 'tarefa', ref: t });
      });
    });

    // Contas a pagar
    (data.contasPagar || []).filter((c: any) => c.status === 'Pendente').forEach((c: any) => {
      if (c.vencimento) evs.push({ date: c.vencimento, label: `💸 Pagar: ${c.fornecedor}`, type: 'pagar', ref: c });
    });

    // Contas a receber
    (data.contasReceber || []).filter((c: any) => c.status !== 'Recebido' && c.status !== 'Cancelado').forEach((c: any) => {
      if (c.vencimento) evs.push({ date: c.vencimento, label: `💰 Receber: ${c.cliente}`, type: 'receber', ref: c });
    });

    // Aniversários de pessoas
    (data.pessoas || []).forEach((p: any) => {
      if (!p.dataNascimento) return;
      const d = new Date(p.dataNascimento + 'T12:00:00');
      const aniv = `${year}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      evs.push({ date: aniv, label: `🎂 Aniversário: ${p.nome}`, type: 'aniversario', ref: p });
    });

    // Passaportes vencendo em < 180 dias
    const today2 = new Date();
    (data.pessoas || []).forEach((p: any) => {
      if (!p.passaporteValidade) return;
      const d = new Date(p.passaporteValidade + 'T12:00:00');
      const diff = (d.getTime() - today2.getTime()) / (1000 * 60 * 60 * 24);
      if (diff >= 0 && diff <= 180) {
        evs.push({ date: p.passaporteValidade, label: `⚠ Passaporte: ${p.nome}`, type: 'passaporte', ref: p });
      }
    });

    return evs;
  }, [data, year, month]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsForDay = (day: number) => {
    const ymd = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return events.filter(e => e.date === ymd);
  };

  const selectedDate = selected;
  const selectedEvents = selectedDate ? events.filter(e => e.date === selectedDate) : [];
  const todayYMD = toYMD(today);

  const legend = [
    { type: 'voo', label: 'Voo' }, { type: 'checkin', label: 'Check-in' }, { type: 'checkout', label: 'Check-out' },
    { type: 'pagar', label: 'A Pagar' }, { type: 'receber', label: 'A Receber' },
    { type: 'tarefa', label: 'Tarefa' }, { type: 'aniversario', label: 'Aniversário' }, { type: 'passaporte', label: 'Passaporte' },
  ] as { type: CalEvent['type']; label: string }[];

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {legend.map(l => {
          const s = TYPE_STYLE[l.type];
          const Icon = s.Icon;
          return <span key={l.type} className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${s.bg} ${s.color}`}><Icon size={10}/>{l.label}</span>;
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-3 bg-surface border border-border rounded-2xl overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-alt">
            <button onClick={prevMonth} className="p-1.5 hover:bg-surface-hover rounded-lg text-muted hover:text-primary"><ChevronLeft size={18}/></button>
            <h3 className="font-black text-primary text-lg uppercase tracking-wider">{MONTHS[month]} {year}</h3>
            <button onClick={nextMonth} className="p-1.5 hover:bg-surface-hover rounded-lg text-muted hover:text-primary"><ChevronRight size={18}/></button>
          </div>
          {/* Day names */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map(d => <div key={d} className="text-center text-[10px] font-black text-placeholder uppercase py-2">{d}</div>)}
          </div>
          {/* Grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="min-h-[80px] border-b border-r border-border last:border-r-0 bg-surface-alt/20" />;
              const ymd = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayEvents = eventsForDay(day);
              const isToday = ymd === todayYMD;
              const isSelected = ymd === selected;
              return (
                <div key={i} onClick={() => setSelected(ymd === selected ? null : ymd)}
                  className={`min-h-[80px] border-b border-r border-border p-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-[#1D9E75]/10 border-[#1D9E75]' : 'hover:bg-surface-alt'} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black mb-1 ${isToday ? 'bg-[#1D9E75] text-white' : 'text-muted'}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev, ei) => {
                      const s = TYPE_STYLE[ev.type];
                      return <div key={ei} className={`text-[9px] font-bold px-1 py-0.5 rounded truncate ${s.bg} ${s.color}`}>{ev.label}</div>;
                    })}
                    {dayEvents.length > 3 && <div className="text-[9px] text-placeholder font-bold">+{dayEvents.length - 3} mais</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected day panel */}
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <h4 className="font-black text-primary uppercase tracking-wider text-sm">
            {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecione um dia'}
          </h4>
          {selectedEvents.length === 0 && <p className="text-sm text-muted">Nenhum evento neste dia.</p>}
          <div className="space-y-2">
            {selectedEvents.map((ev, i) => {
              const s = TYPE_STYLE[ev.type];
              const Icon = s.Icon;
              return (
                <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border ${s.bg} border-current/20`}>
                  <Icon size={14} className={`${s.color} shrink-0 mt-0.5`} />
                  <p className={`text-xs font-bold ${s.color} leading-tight`}>{ev.label}</p>
                </div>
              );
            })}
          </div>

          {/* Upcoming events (next 7 days) */}
          {!selectedDate && (
            <div className="space-y-2">
              <p className="text-xs font-black text-muted uppercase tracking-wider">Próximos 7 dias</p>
              {events
                .filter(ev => {
                  const d = new Date(ev.date + 'T12:00:00');
                  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
                  return diff >= 0 && diff <= 7;
                })
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 10)
                .map((ev, i) => {
                  const s = TYPE_STYLE[ev.type];
                  const Icon = s.Icon;
                  return (
                    <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${s.bg}`}>
                      <Icon size={12} className={`${s.color} shrink-0 mt-0.5`} />
                      <div>
                        <p className={`text-[10px] font-bold ${s.color}`}>{ev.label}</p>
                        <p className="text-[9px] text-placeholder">{new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
