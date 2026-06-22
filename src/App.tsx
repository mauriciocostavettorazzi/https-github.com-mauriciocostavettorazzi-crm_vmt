import { useState, useEffect } from 'react';
import { useCRMStore } from './store';
import { Dashboard } from './components/Dashboard';
import { Vendas } from './components/Vendas';
import { Voos } from './components/Voos';
import { ContasReceber } from './components/ContasReceber';
import { ContasPagar } from './components/ContasPagar';
import { Clientes } from './components/Clientes';
import { Fornecedores } from './components/Fornecedores';
import { Home, Briefcase, Plane, Download, Upload, Users, Building2, LogOut } from 'lucide-react';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const { data, updateData, loading: storeLoading } = useCRMStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      if (error.code === 'auth/popup-closed-by-user') {
        alert("O login foi cancelado. Por favor, tente novamente e não feche a janela de login.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Múltiplas requisições de popup; ignoramos ou avisamos
        console.warn("Um popup de login já estava aberto.");
      } else {
        alert("Erro no login. Se estiver usando o modo de visualização, tente abrir o app em uma nova guia.");
      }
    }
  };

  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'vendas', label: 'Vendas', icon: Briefcase },
    { id: 'voos', label: 'Voos', icon: Plane },
    { id: 'receber', label: 'A Receber', icon: Download },
    { id: 'pagar', label: 'A Pagar', icon: Upload },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'fornecedores', label: 'Fornecedores', icon: Building2 }
  ];

  if (loading || (user && storeLoading)) {
    return <div className="h-screen w-full flex items-center justify-center bg-[#F4F6F9]"><div className="text-[#0A2463] font-bold">Carregando...</div></div>;
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F4F6F9]">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-[#D4A017] font-black text-3xl tracking-tighter leading-none mb-2">
            VOLTA AO MUNDO
          </h1>
          <h2 className="text-[#0A2463] font-light text-xl uppercase tracking-widest italic mb-10">Travel</h2>
          
          <button 
            onClick={handleLogin}
            className="w-full bg-[#0A2463] text-white flex justify-center items-center gap-3 px-6 py-4 rounded-lg font-bold uppercase tracking-wider hover:bg-blue-900 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12.24V14.26H18.06C17.81 15.63 17.02 16.79 15.86 17.57V20.33H19.34C21.37 18.45 22.56 15.61 22.56 12.25Z" fill="#4285F4"/>
              <path d="M12.24 22.75C15.15 22.75 17.58 21.78 19.34 20.33L15.86 17.57C14.91 18.21 13.68 18.59 12.24 18.59C9.44 18.59 7.08 16.7 6.23 14.16H2.63V16.95C4.39 20.45 8.01 22.75 12.24 22.75Z" fill="#34A853"/>
              <path d="M6.23 14.16C6.01 13.52 5.89 12.84 5.89 12.15C5.89 11.46 6.01 10.78 6.23 10.14V7.35H2.63C1.91 8.78 1.5 10.42 1.5 12.15C1.5 13.88 1.91 15.52 2.63 16.95L6.23 14.16Z" fill="#FBBC05"/>
              <path d="M12.24 5.71C13.82 5.71 15.24 6.25 16.36 7.32L19.42 4.26C17.57 2.53 15.15 1.5 12.24 1.5C8.01 1.5 4.39 3.8 2.63 7.35L6.23 10.14C7.08 7.6 9.44 5.71 12.24 5.71Z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F4F6F9] font-sans text-slate-800">
      <aside className="w-64 bg-[#0A2463] flex flex-col z-10 hidden md:flex">
        <div className="p-6">
          <h1 className="text-[#D4A017] font-black text-2xl tracking-tighter leading-none">
            VOLTA AO MUNDO<br/><span className="text-white font-light text-lg uppercase tracking-widest italic">Travel</span>
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {menu.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                  isActive ? 'bg-white/10 text-white border-l-4 border-[#D4A017]' : 'text-white/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-white/70'} />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="p-6 mt-auto border-t border-white/10 flex justify-between items-center">
          <div>
            <div className="text-xs text-white/40 uppercase font-bold mb-2">Agente Logado</div>
            <div className="flex items-center space-x-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#D4A017] flex items-center justify-center font-bold text-[#0A2463]">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="text-white text-sm font-medium truncate max-w-[100px]">{user.displayName || user.email?.split('@')[0]}</div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="text-white/50 hover:text-white transition-colors" title="Sair">
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      <div className="md:hidden flex overflow-x-auto bg-[#0A2463] text-white p-2 shrink-0 border-b border-blue-900 justify-between items-center">
        <div className="flex">
         {menu.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-none flex items-center gap-2 px-4 py-2 rounded-md ${
                  isActive ? 'bg-[#15347D] text-[#D4A017]' : 'text-blue-100'
                }`}
              >
                <Icon size={16} />
                <span className="text-sm">{item.label}</span>
              </button>
            )
          })}
        </div>
        <button onClick={() => signOut(auth)} className="text-white/50 hover:text-white ml-2 pr-2" title="Sair">
          <LogOut size={20} />
        </button>
      </div>

      <main className="flex-1 overflow-auto bg-[#F4F6F9] relative flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
          <h2 className="text-xl font-black text-[#0A2463] uppercase tracking-wider">{menu.find(m => m.id === activeTab)?.label}</h2>
          <div className="flex space-x-4">
             <div className="flex items-center text-slate-400 font-bold text-sm uppercase tracking-widest">
                <span className="mr-2">CRM System</span>
             </div>
          </div>
        </header>
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && <Dashboard data={data} />}
          {activeTab === 'vendas' && <Vendas data={data} updateData={updateData} setActiveTab={setActiveTab} />}
          {activeTab === 'voos' && <Voos data={data} updateData={updateData} />}
          {activeTab === 'receber' && <ContasReceber data={data} updateData={updateData} />}
          {activeTab === 'pagar' && <ContasPagar data={data} updateData={updateData} />}
          {activeTab === 'clientes' && <Clientes data={data} updateData={updateData} />}
          {activeTab === 'fornecedores' && <Fornecedores data={data} updateData={updateData} />}
        </div>
      </main>
    </div>
  );
}
