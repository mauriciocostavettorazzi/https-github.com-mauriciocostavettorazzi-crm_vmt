import { useState, useEffect } from 'react';
import { useCRMStore } from './store';
import { Dashboard } from './components/Dashboard';
import { Vendas } from './components/Vendas';
import { ContasReceber } from './components/ContasReceber';
import { ContasPagar } from './components/ContasPagar';
import { Pessoas } from './components/Pessoas';
import { Acompanhamento } from './components/Acompanhamento';
import { Calendario } from './components/Calendario';
import { Comissoes } from './components/Comissoes';
import { Comunicacoes } from './components/Comunicacoes';
import {
  LayoutDashboard, Briefcase, Plane, Download, Upload, Users,
  Sun, Moon, CheckCircle2, XCircle, Info, FileText,
  CalendarDays, DollarSign, MessageCircle, Plus, Bell, Search,
} from 'lucide-react';
import { registerToast } from './toast';

const NAV_PRINCIPAL = [
  { id: 'dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'vendas',         label: 'Vendas',         icon: Briefcase },
  { id: 'acompanhamento', label: 'Acompanhamento', icon: Plane },
  { id: 'pessoas',        label: 'Pessoas',        icon: Users },
  // { id: 'cotacoes', label: 'Cotações', icon: FileText }, // desativado temporariamente
];

const NAV_OPERACAO = [
  { id: 'receber',      label: 'A Receber',  icon: Download },
  { id: 'pagar',        label: 'A Pagar',    icon: Upload },
  { id: 'comissoes',    label: 'Comissões',  icon: DollarSign },
  { id: 'calendario',   label: 'Calendário', icon: CalendarDays },
  { id: 'comunicacoes', label: 'WhatsApp',   icon: MessageCircle },
];

const ALL_MENU = [...NAV_PRINCIPAL, ...NAV_OPERACAO];

export default function App() {
  const { data, updateData, loading: storeLoading } = useCRMStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    registerToast((msg, type = 'success') => {
      setToastMsg({ msg, type });
      setTimeout(() => setToastMsg(null), 3500);
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark';
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const currentLabel = ALL_MENU.find(m => m.id === activeTab)?.label ?? '';

  // badge counts
  const receber = (data.contasReceber || []).filter((c: any) => c.status !== 'Recebido').length;
  const pagar   = (data.contasPagar  || []).filter((c: any) => c.status !== 'Pago').length;
  const wpp     = (data.mensagensWpp || []).filter((m: any) => m.status === 'pendente').length;

  const badges: Record<string, { count: number; color: string }> = {
    receber:      { count: receber, color: '#1FBE93' },
    pagar:        { count: pagar,   color: '#FF5A6E' },
    comunicacoes: { count: wpp,     color: '#25C2F2' },
  };

  if (storeLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-[#FF2D74] font-display font-bold text-lg tracking-tight">
          Volta ao Mundo · CRM
        </div>
      </div>
    );
  }

  function NavItem({ id, label, icon: Icon }: { id: string; label: string; icon: any }) {
    const isActive = activeTab === id;
    const badge = badges[id];
    return (
      <button
        onClick={() => setActiveTab(id)}
        className="relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 group/item"
        style={{
          background: isActive ? 'rgba(255,45,116,.14)' : 'transparent',
          border: isActive ? '1px solid rgba(255,45,116,.28)' : '1px solid transparent',
          color: isActive ? '#EEF2FF' : '#9AA6CC',
        }}
        title={label}
      >
        {/* barra vertical ativa */}
        {isActive && (
          <span
            className="absolute"
            style={{
              left: -14, top: '50%', transform: 'translateY(-50%)',
              width: 3, height: 20,
              background: '#FF2D74',
              borderRadius: '0 4px 4px 0',
            }}
          />
        )}
        <Icon
          size={18}
          style={{ color: isActive ? '#FF2D74' : '#7886B0', flexShrink: 0 }}
        />
        <span className="text-sm font-semibold truncate flex-1 text-left">{label}</span>
        {badge && badge.count > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${badge.color}22`, color: badge.color, border: `1px solid ${badge.color}44` }}
          >
            {badge.count}
          </span>
        )}
        {id === 'comunicacoes' && (
          <span className="w-2 h-2 rounded-full bg-[#25D366] shrink-0" />
        )}
        {!isActive && (
          <span
            className="absolute inset-0 rounded-xl opacity-0 group-hover/item:opacity-100 transition-opacity"
            style={{ background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }}
          />
        )}
      </button>
    );
  }

  return (
    <div className="flex h-screen bg-background font-sans text-primary overflow-hidden">

      {/* ── SIDEBAR (desktop, fixa 252px) ── */}
      <aside
        className="hidden md:flex flex-col h-full shrink-0 z-50"
        style={{
          width: 252,
          background: 'linear-gradient(180deg, #0A1129 0%, #0C1431 100%)',
          borderRight: '1px solid rgba(255,255,255,.07)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* glow magenta no topo */}
        <div
          className="absolute pointer-events-none"
          style={{
            inset: 0,
            background: 'radial-gradient(120% 80% at 30% 0%, rgba(255,45,116,.16), transparent 60%)',
          }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div
            className="shrink-0 overflow-hidden"
            style={{ width: 46, height: 46, borderRadius: 13, background: '#0F1838', border: '1px solid rgba(255,255,255,.1)' }}
          >
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as any).style.display = 'none'; }} />
          </div>
          <div className="overflow-hidden">
            <p className="font-display font-bold text-[15px] text-[#EEF2FF] leading-tight truncate">Volta ao Mundo</p>
            <p className="text-[10px] font-semibold text-[#566394]" style={{ letterSpacing: '.32em' }}>TRAVEL · CRM</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[#566394] px-2 mb-2" style={{ letterSpacing: '.18em' }}>PRINCIPAL</p>
            {NAV_PRINCIPAL.map(item => <NavItem key={item.id} {...item} />)}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-[#566394] px-2 mb-2" style={{ letterSpacing: '.18em' }}>OPERAÇÃO</p>
            {NAV_OPERACAO.map(item => <NavItem key={item.id} {...item} />)}
          </div>
        </nav>

        {/* Rodapé */}
        <div
          className="px-4 py-4 shrink-0 flex items-center gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}
        >
          <div
            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #FF2D74, #FF9F2E)' }}
          >
            V
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-semibold text-[#EEF2FF] truncate">Volta ao Mundo</p>
            <p className="text-[11px] text-[#566394]">Agente · <span className="text-[#1FBE93]">Online</span></p>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg text-[#566394] hover:text-[#AEB9DC] transition-colors"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </aside>

      {/* ── NAV MOBILE ── */}
      <div
        className="md:hidden flex overflow-x-auto shrink-0 items-center gap-1 p-2"
        style={{ background: '#0A1129', borderBottom: '1px solid rgba(255,255,255,.07)' }}
      >
        {ALL_MENU.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex-none flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors"
              style={{
                background: isActive ? 'rgba(255,45,116,.14)' : 'transparent',
                color: isActive ? '#EEF2FF' : '#9AA6CC',
              }}
            >
              <Icon size={15} style={{ color: isActive ? '#FF2D74' : '#7886B0' }} />
              {item.label}
            </button>
          );
        })}
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="ml-auto p-2 text-[#566394]">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header
          className="hidden md:flex shrink-0 items-center justify-between px-8 gap-4"
          style={{
            height: 68,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-[color:var(--text-placeholder)]">Volta ao Mundo</span>
            <span className="text-[color:var(--text-placeholder)]">/</span>
            <h2
              className="font-display font-bold text-[20px] text-[color:var(--text-primary)]"
              style={{ letterSpacing: '-0.02em' }}
            >
              {currentLabel}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Busca */}
            <div
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ width: 260, background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)' }}
            >
              <Search size={15} className="text-[color:var(--text-placeholder)] shrink-0" />
              <span className="text-sm text-[color:var(--text-placeholder)]">Buscar...</span>
            </div>

            {/* Sino */}
            <div className="relative">
              <button
                className="p-2 rounded-xl transition-colors"
                style={{ color: 'var(--text-placeholder)' }}
              >
                <Bell size={18} />
              </button>
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: '#FF2D74' }}
              />
            </div>

            {/* Nova venda */}
            <button
              onClick={() => setActiveTab('vendas')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
              style={{
                background: '#FF2D74',
                boxShadow: '0 6px 18px rgba(255,45,116,.4)',
              }}
            >
              <Plus size={16} /> Nova venda
            </button>
          </div>
        </header>

        {/* Scroll area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1240px] w-full mx-auto space-y-6">
            {activeTab === 'dashboard'    && <Dashboard    data={data} />}
            {activeTab === 'vendas'         && <Vendas         data={data} updateData={updateData} setActiveTab={setActiveTab} />}
            {activeTab === 'acompanhamento' && <Acompanhamento data={data} updateData={updateData} />}
            {activeTab === 'receber'      && <ContasReceber data={data} updateData={updateData} />}
            {activeTab === 'pagar'        && <ContasPagar  data={data} updateData={updateData} />}
            {activeTab === 'pessoas'      && <Pessoas      data={data} updateData={updateData} />}
            {activeTab === 'calendario'   && <Calendario   data={data} />}
            {activeTab === 'comissoes'    && <Comissoes    data={data} updateData={updateData} />}
            {activeTab === 'comunicacoes' && <Comunicacoes data={data} updateData={updateData} />}
          </div>
        </main>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-[600] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm max-w-sm animate-fade-in
          ${toastMsg.type === 'success' ? 'bg-[#1FBE93]' : toastMsg.type === 'error' ? 'bg-[#FF5A6E]' : 'bg-[#25C2F2]'}`}>
          {toastMsg.type === 'success' && <CheckCircle2 size={18} className="shrink-0" />}
          {toastMsg.type === 'error'   && <XCircle      size={18} className="shrink-0" />}
          {toastMsg.type === 'info'    && <Info         size={18} className="shrink-0" />}
          <span>{toastMsg.msg}</span>
        </div>
      )}
    </div>
  );
}
