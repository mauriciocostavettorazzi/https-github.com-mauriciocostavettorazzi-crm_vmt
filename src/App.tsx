import { useState, useEffect } from 'react';
import { useCRMStore } from './store';
import { Dashboard } from './components/Dashboard';
import { Vendas } from './components/Vendas';
import { Voos } from './components/Voos';
import { ContasReceber } from './components/ContasReceber';
import { ContasPagar } from './components/ContasPagar';
import { Pessoas } from './components/Pessoas';
import { Cotacoes } from './components/Cotacoes';
import { Calendario } from './components/Calendario';
import { Comissoes } from './components/Comissoes';
import { Home, Briefcase, Plane, Download, Upload, Users, Sun, Moon, CheckCircle2, XCircle, Info, FileText, CalendarDays, DollarSign } from 'lucide-react';
import { registerToast } from './toast';

export default function App() {
  const { data, updateData, loading: storeLoading } = useCRMStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    registerToast((msg, type = 'success') => {
      setToastMsg({ msg, type });
      setTimeout(() => setToastMsg(null), 3500);
    });
  }, []);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Update HTML class when theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    setLoading(false);
  }, []);

  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'vendas', label: 'Vendas', icon: Briefcase },
    { id: 'voos', label: 'Voos', icon: Plane },
    { id: 'receber', label: 'A Receber', icon: Download },
    { id: 'pagar', label: 'A Pagar', icon: Upload },
    { id: 'pessoas', label: 'Pessoas', icon: Users },
    { id: 'cotacoes', label: 'Cotações', icon: FileText },
    { id: 'calendario', label: 'Calendário', icon: CalendarDays },
    { id: 'comissoes', label: 'Comissões', icon: DollarSign },
  ];

  if (loading || storeLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="text-[#1D9E75] font-bold">Carregando...</div></div>;
  }

  return (
    <div className="flex h-screen bg-background font-sans text-primary overflow-hidden">
      <aside className="bg-surface border-r border-border flex flex-col z-50 hidden md:flex absolute h-full top-0 left-0 transition-all duration-300 w-[72px] hover:w-64 group whitespace-nowrap overflow-hidden shadow-2xl">
        <div className="p-4 flex items-center h-20 shrink-0 border-b border-border/50">
          <div className="w-10 h-10 bg-[#1D9E75] rounded-xl flex items-center justify-center shrink-0">
             <Plane size={24} className="text-white" />
          </div>
          <h1 className="ml-3 text-primary font-black text-xl tracking-tighter leading-none opacity-0 group-hover:opacity-100 transition-opacity">
            VOLTA AO MUNDO<br/><span className="text-muted font-light text-sm uppercase tracking-widest italic">Travel</span>
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-hidden">
          {menu.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-semibold transition-all overflow-hidden ${
                  isActive ? 'bg-[#E1F5EE] dark:bg-[#1D9E75]/20 text-[#0F6E56] dark:text-[#34d399]' : 'text-placeholder hover:bg-surface-hover hover:text-secondary'
                }`}
                title={item.label}
              >
                <Icon size={24} className={`shrink-0 ${isActive ? 'text-[#0F6E56] dark:text-[#34d399]' : 'text-placeholder'}`} />
                <span className="font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-border flex flex-col gap-4 overflow-hidden shrink-0 bg-surface-alt">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 shrink-0 rounded-full bg-[#E1F5EE] dark:bg-[#1D9E75]/20 flex items-center justify-center font-bold text-[#0F6E56] dark:text-[#34d399]">
              V
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col overflow-hidden">
              <div className="text-primary text-sm font-medium truncate w-[140px]">Volta ao Mundo</div>
              <div className="text-xs text-placeholder uppercase font-bold tracking-widest">Agente</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="md:hidden flex overflow-x-auto bg-surface text-secondary p-2 shrink-0 border-b border-border justify-between items-center">
        <div className="flex">
         {menu.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-none flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isActive ? 'bg-[#E1F5EE] dark:bg-[#1D9E75]/20 text-[#0F6E56] dark:text-[#34d399]' : 'text-muted'
                }`}
              >
                <Icon size={16} />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1 ml-2 pr-2 shrink-0">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-placeholder hover:text-primary transition-colors"
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <main className="flex-1 h-screen overflow-auto bg-background relative flex flex-col md:ml-[72px]">
        <header className="h-[72px] bg-surface border-b border-border flex items-center justify-between px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
             <span className="text-placeholder font-medium text-sm">Volta ao Mundo</span>
             <span className="text-placeholder">/</span>
             <h2 className="text-lg font-black text-primary uppercase tracking-wide">{menu.find(m => m.id === activeTab)?.label}</h2>
          </div>
          <div className="flex items-center space-x-4">
             <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 text-placeholder hover:text-primary transition-colors rounded-lg border border-transparent hover:border-border"
                title={theme === 'dark' ? "Mudar para modo claro" : "Mudar para modo escuro"}
             >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <button className="bg-transparent border border-border hover:border-border-hover text-primary px-4 py-1.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2" onClick={() => setActiveTab('vendas')}>
                <Plane size={16} /> Nova venda
             </button>
          </div>
        </header>
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && <Dashboard data={data} />}
          {activeTab === 'vendas' && <Vendas data={data} updateData={updateData} setActiveTab={setActiveTab} />}
          {activeTab === 'voos' && <Voos data={data} updateData={updateData} />}
          {activeTab === 'receber' && <ContasReceber data={data} updateData={updateData} />}
          {activeTab === 'pagar' && <ContasPagar data={data} updateData={updateData} />}
          {activeTab === 'pessoas' && <Pessoas data={data} updateData={updateData} />}
          {activeTab === 'cotacoes' && <Cotacoes data={data} updateData={updateData} />}
          {activeTab === 'calendario' && <Calendario data={data} />}
          {activeTab === 'comissoes' && <Comissoes data={data} updateData={updateData} />}
        </div>
      </main>

      {/* Toast notifications */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-[600] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-white font-semibold text-sm max-w-sm transition-all animate-fade-in
          ${toastMsg.type === 'success' ? 'bg-[#1D9E75]' : toastMsg.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
          {toastMsg.type === 'success' && <CheckCircle2 size={18} className="shrink-0" />}
          {toastMsg.type === 'error' && <XCircle size={18} className="shrink-0" />}
          {toastMsg.type === 'info' && <Info size={18} className="shrink-0" />}
          <span>{toastMsg.msg}</span>
        </div>
      )}
    </div>
  );
}
