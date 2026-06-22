import React, { useState, useMemo } from 'react';
import { generateId, maskCpfCnpj, maskPhone, sanitizePhone, formatCurrency } from '../utils';
import { PlusCircle, Trash2, Edit, Trophy, Eye, X, BookOpen, ShoppingCart, MessageCircle } from 'lucide-react';

export function Fornecedores({ data, updateData }: any) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOverviewFornecedor, setSelectedOverviewFornecedor] = useState<any>(null);

  const topFornecedores = useMemo(() => {
    const contasPagar = data.contasPagar || [];
    const agrupado: Record<string, { nome: string; totalGasto: number; vezesUsado: number }> = {};
    
    contasPagar.forEach((cp: any) => {
      if (cp.status !== 'Cancelado' && cp.fornecedor) {
        if (!agrupado[cp.fornecedor]) {
          agrupado[cp.fornecedor] = { nome: cp.fornecedor, totalGasto: 0, vezesUsado: 0 };
        }
        agrupado[cp.fornecedor].totalGasto += cp.valor || 0;
        agrupado[cp.fornecedor].vezesUsado += 1;
      }
    });

    const fornecedoresMap = new Map<string, any>((data.fornecedores || []).map((f: any) => [f.nome, f]));

    const result = Object.values(agrupado)
      .sort((a, b) => b.totalGasto - a.totalGasto)
      .slice(0, 5)
      .map(t => {
        const f = fornecedoresMap.get(t.nome);
        return {
          ...t,
          telefone: f?.telefone || '',
          email: f?.email || '',
          documento: f?.documento || '',
        };
      });

    return result;
  }, [data.contasPagar, data.fornecedores]);

  const [formData, setFormData] = useState({
    nome: '',
    observacoes: '',
    isFornecedorViagem: false,
    telefone: '',
    email: '',
    documento: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const updatedFornecedores = data.fornecedores.map((f: any) => 
        f.id === editingId ? { ...formData, id: editingId } : f
      );
      updateData({ fornecedores: updatedFornecedores });
    } else {
      const novoFornecedor = { ...formData, id: generateId() };
      updateData({ fornecedores: [novoFornecedor, ...(data.fornecedores || [])] });
    }
    
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({ nome: '', observacoes: '', isFornecedorViagem: false, telefone: '', email: '', documento: '', cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '' });
  };

  const handleEdit = (forn: any) => {
    setFormData({
      nome: forn.nome || '',
      observacoes: forn.observacoes || '',
      isFornecedorViagem: forn.isFornecedorViagem || false,
      telefone: forn.telefone || '',
      email: forn.email || '',
      documento: forn.documento || '',
      cep: forn.cep || '',
      endereco: forn.endereco || '',
      numero: forn.numero || '',
      bairro: forn.bairro || '',
      cidade: forn.cidade || '',
      estado: forn.estado || ''
    });
    setEditingId(forn.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    const updatedFornecedores = data.fornecedores.filter((f: any) => f.id !== id);
    updateData({ fornecedores: updatedFornecedores });
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({ nome: '', observacoes: '', isFornecedorViagem: false, telefone: '', email: '', documento: '', cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '' });
    setIsFormOpen(!isFormOpen);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-[#0A2463] tracking-tighter uppercase">Fornecedores</h2>
        <button 
          onClick={handleNew}
          className="bg-[#D4A017] text-[#0A2463] px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:brightness-110 uppercase flex items-center gap-2"
        >
          <PlusCircle size={18} /> {isFormOpen ? 'Fechar Formulário' : 'Novo Fornecedor'}
        </button>
      </div>

      {topFornecedores.length > 0 && (
        <div className="bg-gradient-to-br from-[#0A2463] to-blue-900 rounded-2xl shadow-lg p-6 text-white mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="text-[#D4A017]" size={28} />
            <h3 className="text-xl font-black uppercase tracking-wider">Top 5 Fornecedores em Gastos</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {topFornecedores.map((fornecedor: any, idx: number) => (
              <div key={idx} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-[#D4A017] text-[#0A2463] font-black w-8 h-8 flex items-center justify-center rounded-bl-xl z-10 shadow-sm">
                  {idx + 1}º
                </div>
                
                <div className="flex-1 z-10">
                  <h4 className="font-bold text-sm uppercase tracking-wide truncate pr-6" title={fornecedor.nome}>{fornecedor.nome}</h4>
                  {fornecedor.documento ? (
                    <div className="text-[10px] text-white/50 font-mono mt-1">{fornecedor.documento}</div>
                  ) : <div className="h-4"></div>}
                </div>
                
                <div className="z-10 bg-black/20 -mx-4 -mb-4 p-4 mt-4 border-t border-white/5 group-hover:bg-black/30 transition-colors">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] text-white/60 uppercase font-bold tracking-wider mb-0.5">Total Gasto</div>
                      <div className="font-mono font-bold text-red-400">{formatCurrency(fornecedor.totalGasto)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-white/60 uppercase font-bold tracking-wider mb-0.5">Usos</div>
                      <div className="font-bold text-lg leading-none">{fornecedor.vezesUsado}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border-b-4 border-[#0A2463] mb-6">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome / Fornecedor</label>
              <input required type="text" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ / CPF</label>
              <input type="text" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.documento} onChange={e => setFormData({...formData, documento: maskCpfCnpj(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / Contato</label>
              <input type="text" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.telefone} onChange={e => setFormData({...formData, telefone: maskPhone(e.target.value)})} />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input type="email" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <input type="text" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.cep} onChange={e => setFormData({...formData, cep: e.target.value})} />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço (Rua/Av)</label>
              <input type="text" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número / Comp.</label>
              <input type="text" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input type="text" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.bairro} onChange={e => setFormData({...formData, bairro: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input type="text" className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
              <input type="text" maxLength={2} className="w-full border border-gray-300 rounded-md p-2 uppercase" 
                value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value.toUpperCase()})} />
            </div>

            <div className="lg:col-span-4 border-t border-slate-100 pt-4 mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações / Detalhes Adicionais</label>
              <textarea className="w-full border border-gray-300 rounded-md p-2" 
                value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} />
            </div>
            <div className="lg:col-span-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 cursor-pointer w-max">
                <input type="checkbox" className="rounded border-gray-300 text-[#0A2463] focus:ring-[#0A2463]" 
                  checked={formData.isFornecedorViagem} onChange={(e) => setFormData({...formData, isFornecedorViagem: e.target.checked})} />
                <span>Fornecedor de serviços de viagem (Milhas, etc.)</span>
              </label>
            </div>
            <div className="lg:col-span-4 flex justify-end mt-4 gap-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="bg-slate-200 text-slate-700 px-6 py-2 rounded-md font-bold uppercase tracking-wider text-sm hover:bg-slate-300">
                Cancelar
              </button>
              <button type="submit" className="bg-[#0A2463] text-white px-6 py-2 rounded-md font-bold uppercase tracking-wider text-sm hover:bg-blue-900">
                {editingId ? 'Atualizar Fornecedor' : 'Salvar Fornecedor'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-black text-[#0A2463] uppercase tracking-wider">Parceiros e Fornecedores</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
              <tr>
                <th className="px-4 py-3">Fornecedor</th>
                <th className="px-4 py-3">Contato & Doc</th>
                <th className="px-4 py-3">Endereço & Tipo</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm border-t border-slate-200">
              {(data.fornecedores || []).map((f: any) => (
                <tr key={f.id} className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedOverviewFornecedor(f)}>
                  <td className="px-4 py-3">
                    <span className="text-slate-800 font-bold uppercase">{f.nome}</span>
                    {f.observacoes && <div className="text-[10px] text-slate-400 mt-1 uppercase truncate max-w-[200px]">{f.observacoes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-slate-600 tracking-wider text-xs">{f.documento || '-'}</div>
                    <div className="font-medium text-slate-600 text-xs mt-1">{f.telefone ? maskPhone(f.telefone) : '-'} {f.email ? `• ${f.email}` : ''}</div>
                  </td>
                  <td className="px-4 py-3">
                     <div className="text-slate-500 text-xs uppercase mb-1">{f.cidade ? `${f.cidade}-${f.estado}` : '-'}</div>
                     {f.isFornecedorViagem && (
                        <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded font-black uppercase tracking-wider inline-block">Viagem</span>
                     )}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center space-x-3 items-center">
                      {f.telefone && (
                        <a href={`https://wa.me/55${sanitizePhone(f.telefone)}`} target="_blank" rel="noreferrer"
                           className="text-green-500 hover:text-green-700" title="Mensagem no WhatsApp" onClick={(e) => e.stopPropagation()}>
                          <MessageCircle size={16} />
                        </a>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(f); }} className="text-blue-500 hover:text-blue-700" title="Editar">
                        <Edit size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }} className="text-red-500 hover:text-red-700" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data.fornecedores || data.fornecedores.length === 0) && (
                <tr><td colSpan={4} className="p-4 text-center text-slate-500 font-medium">Nenhum fornecedor cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOverviewFornecedor && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10 rounded-t-2xl">
              <div>
                 <h3 className="text-xl font-black text-[#0A2463] uppercase tracking-wider flex items-center gap-2">
                     <BookOpen size={20} className="text-[#D4A017]" />
                     Overview do Fornecedor
                 </h3>
                 <p className="text-xs font-mono text-slate-500 mt-1">{selectedOverviewFornecedor.nome} | Doc: {selectedOverviewFornecedor.documento || '-'}</p>
              </div>
              <button onClick={() => setSelectedOverviewFornecedor(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">Dados Cadastrais</h4>
                  <div className="flex flex-col gap-2">
                      <span className="text-sm font-bold text-slate-800 uppercase">{selectedOverviewFornecedor.nome}</span>
                      <div className="text-xs text-slate-600 mt-1 flex flex-col gap-1">
                          <p><strong>Telefone:</strong> {selectedOverviewFornecedor.telefone ? maskPhone(selectedOverviewFornecedor.telefone) : '-'}</p>
                          <p><strong>E-mail:</strong> {selectedOverviewFornecedor.email || '-'}</p>
                          <p><strong>Endereço:</strong> {selectedOverviewFornecedor.endereco} {selectedOverviewFornecedor.numero}, {selectedOverviewFornecedor.bairro}</p>
                          <p><strong>Cidade/UF:</strong> {selectedOverviewFornecedor.cidade}/{selectedOverviewFornecedor.estado} - {selectedOverviewFornecedor.cep}</p>
                      </div>
                  </div>
               </div>

               <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><ShoppingCart size={14}/> Histórico de Pagamentos/Gastos</h4>
                  <div className="flex flex-col flex-1">
                      {data.contasPagar && data.contasPagar.filter((cp: any) => cp.fornecedor === selectedOverviewFornecedor.nome && cp.status !== 'Cancelado').length > 0 ? (
                        <div className="space-y-3 mt-2 overflow-y-auto max-h-48 mb-2">
                          {data.contasPagar.filter((cp: any) => cp.fornecedor === selectedOverviewFornecedor.nome && cp.status !== 'Cancelado').map((cp: any) => (
                             <div key={cp.id} className="text-xs bg-slate-50 p-2 border border-slate-200 rounded flex justify-between">
                                 <div>
                                   <strong className="text-[#0A2463] block mb-1">{cp.categoria} - {cp.status}</strong>
                                   Venc: {new Date(cp.vencimento + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                                 </div>
                                 <strong className="text-slate-800">{formatCurrency(cp.valor)}</strong>
                             </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic mt-2">Nenhum gasto registrado.</p>
                      )}
                      
                      <div className="mt-auto border-t border-slate-200 pt-3">
                         <p className="text-[10px] text-slate-500 uppercase font-medium">Total Gasto</p>
                         <p className="text-xl font-black text-red-600">
                           {formatCurrency(data.contasPagar?.filter((cp: any) => cp.fornecedor === selectedOverviewFornecedor.nome && cp.status !== 'Cancelado').reduce((acc: number, cp: any) => acc + (cp.valor || 0), 0) || 0)}
                         </p>
                      </div>
                  </div>
               </div>
            </div>
            {selectedOverviewFornecedor.observacoes && (
              <div className="px-6 pb-6">
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <h4 className="text-[10px] font-black uppercase text-orange-400 tracking-widest mb-1 items-center gap-1">Observações</h4>
                  <p className="text-xs text-orange-900/80 whitespace-pre-line">{selectedOverviewFornecedor.observacoes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
