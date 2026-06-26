import React, { useState } from 'react';
import { generateId } from '../utils';
import { toast } from '../toast';
import { PlusCircle, X, Search, Trash2, Edit, Star, UserCheck, Users, Building2, UserRound, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Pessoa, PessoaDocumento } from '../types';

const TIPOS = ['Passageiro', 'Cliente', 'Fornecedor', 'Representante'] as const;
const TABS = ['Contato', 'Documentos', 'Informações', 'Endereço', 'Família', 'Anexos', 'Observação'] as const;

const TIPO_COLOR: Record<string, string> = {
  Passageiro: 'bg-sky-900/30 text-sky-400 border-sky-700',
  Cliente: 'bg-emerald-900/30 text-emerald-400 border-emerald-700',
  Fornecedor: 'bg-purple-900/30 text-purple-400 border-purple-700',
  Representante: 'bg-amber-900/30 text-amber-400 border-amber-700',
};

const TIPO_ICON: Record<string, any> = {
  Passageiro: UserRound,
  Cliente: UserCheck,
  Fornecedor: Building2,
  Representante: Users,
};

const FILTER_OPTS = [
  { id: 'todos', label: 'Todos' },
  { id: 'Passageiro', label: 'Passageiros' },
  { id: 'Cliente', label: 'Clientes' },
  { id: 'Fornecedor', label: 'Fornecedores' },
  { id: 'Representante', label: 'Representantes' },
];

const emptyForm = (): Omit<Pessoa, 'id' | 'criadoEm'> => ({
  nome: '', tipo: ['Cliente'], ativo: true, rating: 0,
  telefone: '', email: '', redeSocial: '', site: '', chavePix: '', aceitaComunicacao: false,
  documento: '', rg: '', orgaoEmissorRg: '', inscricaoMunicipal: '', idEstrangeiro: '',
  nacionalidade: '', estadoCivil: '', passaporte: '', passaporteEmissao: '', passaporteValidade: '',
  passaporteNacionalidade: '', visto: '', vistoValidade: '',
  dataNascimento: '', genero: '', profissao: '', renda: undefined, canalVenda: '',
  contatoEmergenciaNome: '', contatoEmergenciaTel: '',
  pais: 'Brasil', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  familia: [], documentos: [], observacoes: '',
  isFornecedorViagem: false,
});

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button"
          onClick={() => onChange(i === value ? 0 : i)}
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
          className="p-0.5">
          <Star size={16} className={`transition-colors ${i <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-border'}`} />
        </button>
      ))}
    </div>
  );
}

const inputCls = "w-full border border-border-hover rounded-lg px-3 py-2 text-sm text-primary bg-surface-alt focus:outline-none focus:border-[#1D9E75]";
const labelCls = "block text-xs font-bold text-muted uppercase tracking-wider mb-1";

export function Pessoas({ data, updateData }: any) {
  const pessoas: Pessoa[] = data.pessoas || [];

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Contato');
  const [formData, setFormData] = useState(emptyForm());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [cepLoading, setCepLoading] = useState(false);
  const [familiaSearch, setFamiliaSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pessoaToDelete, setPessoaToDelete] = useState<Pessoa | null>(null);

  const fd = (patch: Partial<typeof formData>) => setFormData(f => ({ ...f, ...patch }));

  const openNew = () => {
    setFormData(emptyForm());
    setEditingId(null);
    setActiveTab('Contato');
    setShowForm(true);
  };

  const openEdit = (p: Pessoa) => {
    setFormData({ ...emptyForm(), ...p });
    setEditingId(p.id);
    setActiveTab('Contato');
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) { toast('Nome é obrigatório.', 'error'); return; }
    if (formData.tipo.length === 0) { toast('Selecione ao menos um tipo.', 'error'); return; }
    const now = new Date().toISOString();
    if (editingId) {
      updateData({ pessoas: pessoas.map(p => p.id === editingId ? { ...p, ...formData, id: editingId } : p) });
      toast('Pessoa atualizada!');
    } else {
      const nova: Pessoa = { ...formData, id: generateId(), criadoEm: now };
      updateData({ pessoas: [nova, ...pessoas] });
      toast('Pessoa cadastrada!');
    }
    setShowForm(false);
  };

  const handleDelete = (p: Pessoa) => { setPessoaToDelete(p); };
  const confirmDelete = () => {
    if (!pessoaToDelete) return;
    updateData({ pessoas: pessoas.filter(p => p.id !== pessoaToDelete.id) });
    toast('Pessoa excluída.', 'info');
    setPessoaToDelete(null);
  };

  const toggleTipo = (t: typeof TIPOS[number]) => {
    const cur = formData.tipo;
    const next = cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t];
    fd({ tipo: next });
  };

  const handleCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const j = await r.json();
      if (!j.erro) fd({ endereco: j.logradouro, bairro: j.bairro, cidade: j.localidade, estado: j.uf, pais: 'Brasil' });
    } catch {} finally { setCepLoading(false); }
  };

  // Família helpers
  const familiaIds = formData.familia || [];
  const familiaMembers = pessoas.filter(p => familiaIds.includes(p.id));
  const familiaResults = pessoas.filter(p =>
    p.id !== editingId &&
    !familiaIds.includes(p.id) &&
    familiaSearch.length >= 2 &&
    p.nome.toLowerCase().includes(familiaSearch.toLowerCase())
  ).slice(0, 8);

  const addFamilia = (id: string) => { fd({ familia: [...familiaIds, id] }); setFamiliaSearch(''); };
  const removeFamilia = (id: string) => { fd({ familia: familiaIds.filter(x => x !== id) }); };

  // Família circles — find all pessoas that have this person in their familia too
  const circleIds = pessoas
    .filter(p => p.id !== editingId && (p.familia || []).includes(editingId || ''))
    .map(p => p.id);
  const allFamiliaIds = [...new Set([...familiaIds, ...circleIds])];
  const allFamiliaMembers = pessoas.filter(p => allFamiliaIds.includes(p.id));

  // Annexos
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    if (file.size > 10 * 1024 * 1024) { toast('Arquivo muito grande (máx 10MB).', 'error'); return; }
    setUploading(true);
    try {
      const path = `pessoas/${editingId}/${generateId()}_${file.name}`;
      const { error } = await supabase.storage.from('documentos').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path);
      const doc: PessoaDocumento = { id: generateId(), nome: file.name, tipo: 'Outro', url: urlData.publicUrl, tamanho: file.size, criadoEm: new Date().toISOString() };
      const newDocs = [...(formData.documentos || []), doc];
      fd({ documentos: newDocs });
      updateData({ pessoas: pessoas.map(p => p.id === editingId ? { ...p, documentos: newDocs } : p) });
      toast('Documento enviado!');
    } catch { toast('Erro ao enviar documento.', 'error'); } finally { setUploading(false); }
  };

  const removeDoc = async (doc: PessoaDocumento) => {
    const newDocs = (formData.documentos || []).filter(d => d.id !== doc.id);
    fd({ documentos: newDocs });
    updateData({ pessoas: pessoas.map(p => p.id === editingId ? { ...p, documentos: newDocs } : p) });
  };

  // Filtered list
  const listFiltered = pessoas.filter(p => {
    const matchTipo = filterTipo === 'todos' || p.tipo.includes(filterTipo as any);
    const s = searchTerm.toLowerCase();
    const matchSearch = !s || p.nome.toLowerCase().includes(s) || (p.documento || '').includes(s) || (p.email || '').toLowerCase().includes(s);
    return matchTipo && matchSearch;
  });

  const passagemAlert = (p: Pessoa) => {
    if (!p.passaporteValidade) return null;
    const d = new Date(p.passaporteValidade);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'text-red-400';
    if (diff < 180) return 'text-amber-400';
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTS.map(f => (
            <button key={f.id} onClick={() => setFilterTipo(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filterTipo === f.id ? 'bg-[#1D9E75] text-white' : 'bg-surface-alt text-muted hover:text-primary border border-border'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-placeholder" />
            <input type="text" placeholder="Buscar nome, CPF, e-mail..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-surface border border-border rounded-lg text-primary placeholder:text-placeholder focus:outline-none focus:border-[#1D9E75]" />
          </div>
          <button onClick={openNew} className="bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-bold text-sm uppercase flex items-center gap-2 hover:brightness-110 shrink-0">
            <PlusCircle size={16} /> Nova Pessoa
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['Passageiro', 'Cliente', 'Fornecedor', 'Representante'] as const).map(t => {
          const Icon = TIPO_ICON[t];
          const count = pessoas.filter(p => p.tipo.includes(t)).length;
          return (
            <div key={t} className={`bg-surface border border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-[#1D9E75] transition-colors ${filterTipo === t ? 'border-[#1D9E75]' : ''}`}
              onClick={() => setFilterTipo(filterTipo === t ? 'todos' : t)}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${TIPO_COLOR[t]}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-placeholder uppercase tracking-wider">{t}s</p>
                <p className="text-xl font-black text-primary">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-alt text-[10px] uppercase font-bold text-placeholder">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Passaporte</th>
              <th className="px-4 py-3">Família</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm border-t border-border">
            {listFiltered.map(p => {
              const alertColor = passagemAlert(p);
              const familiaCount = [...new Set([...(p.familia || []), ...pessoas.filter(x => (x.familia || []).includes(p.id)).map(x => x.id)])].length;
              return (
                <tr key={p.id} onClick={() => openEdit(p)} className="border-b border-border hover:bg-surface-alt cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${p.ativo ? 'bg-[#1D9E75]/20 text-emerald-400' : 'bg-surface-alt text-muted'}`}>
                        {p.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-primary uppercase text-xs">{p.nome}</p>
                        {p.rating ? (
                          <div className="flex gap-0.5 mt-0.5">
                            {[1,2,3,4,5].map(i => <Star key={i} size={9} className={i <= p.rating! ? 'fill-amber-400 text-amber-400' : 'text-border'} />)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.tipo.map(t => (
                        <span key={t} className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${TIPO_COLOR[t]}`}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-muted">{p.telefone || '—'}</p>
                    <p className="text-[10px] text-placeholder truncate max-w-[160px]">{p.email || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    {p.passaporte ? (
                      <div>
                        <p className="text-xs font-mono text-muted">{p.passaporte}</p>
                        <p className={`text-[10px] font-bold ${alertColor || 'text-placeholder'}`}>
                          {p.passaporteValidade ? new Date(p.passaporteValidade).toLocaleDateString('pt-BR') : '—'}
                        </p>
                      </div>
                    ) : <span className="text-placeholder text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {familiaCount > 0 ? (
                      <span className="text-xs font-bold text-sky-400 bg-sky-900/20 px-2 py-0.5 rounded-full">{familiaCount} membro{familiaCount > 1 ? 's' : ''}</span>
                    ) : <span className="text-placeholder text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(p)} className="bg-blue-900/30 text-blue-400 p-1.5 rounded hover:bg-blue-900/50" title="Editar">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(p)} className="bg-red-900/30 text-red-400 p-1.5 rounded hover:bg-red-900/50" title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {listFiltered.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">Nenhuma pessoa encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-border">
            {/* Modal header */}
            <div className="p-5 border-b border-border bg-surface-alt rounded-t-2xl shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <input type="text" placeholder="Nome completo *" required
                      className="flex-1 text-lg font-black bg-transparent text-primary border-b-2 border-border focus:border-[#1D9E75] outline-none pb-1"
                      value={formData.nome} onChange={e => fd({ nome: e.target.value })} />
                    <StarRating value={formData.rating || 0} onChange={v => fd({ rating: v })} />
                    <label className="flex items-center gap-2 text-xs font-bold text-muted cursor-pointer">
                      <div onClick={() => fd({ ativo: !formData.ativo })}
                        className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${formData.ativo ? 'bg-[#1D9E75]' : 'bg-surface-hover'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                      {formData.ativo ? 'Ativo' : 'Inativo'}
                    </label>
                  </div>
                  {/* Tipo checkboxes */}
                  <div className="flex flex-wrap gap-2">
                    {TIPOS.map(t => {
                      const Icon = TIPO_ICON[t];
                      const checked = formData.tipo.includes(t);
                      return (
                        <button key={t} type="button" onClick={() => toggleTipo(t)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase transition-all ${checked ? TIPO_COLOR[t] + ' border-current' : 'border-border text-muted hover:border-border-hover'}`}>
                          <Icon size={12} /> {t}
                        </button>
                      );
                    })}
                    {formData.tipo.includes('Fornecedor') && (
                      <label className="flex items-center gap-1.5 text-xs font-bold text-purple-400 cursor-pointer ml-2">
                        <input type="checkbox" checked={formData.isFornecedorViagem || false} onChange={e => fd({ isFornecedorViagem: e.target.checked })} />
                        Fornecedor de Viagem (milhas/bilhetes)
                      </label>
                    )}
                  </div>
                </div>
                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-surface-hover rounded-full shrink-0">
                  <X size={18} className="text-muted" />
                </button>
              </div>
              {/* Tabs */}
              <div className="flex gap-1 mt-4 flex-wrap">
                {TABS.map(tab => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === tab ? 'bg-[#1D9E75] text-white' : 'text-muted hover:text-primary'}`}>
                    {tab}
                    {tab === 'Família' && allFamiliaMembers.length > 0 && (
                      <span className="ml-1 bg-sky-500 text-white text-[8px] px-1 rounded-full">{allFamiliaMembers.length}</span>
                    )}
                    {tab === 'Anexos' && (formData.documentos || []).length > 0 && (
                      <span className="ml-1 bg-purple-500 text-white text-[8px] px-1 rounded-full">{(formData.documentos || []).length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5">
              {/* TAB: Contato */}
              {activeTab === 'Contato' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className={labelCls}>Telefone / WhatsApp</label>
                    <input type="text" className={inputCls} value={formData.telefone || ''} onChange={e => fd({ telefone: e.target.value })} placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <label className={labelCls}>E-mail</label>
                    <input type="email" className={inputCls} value={formData.email || ''} onChange={e => fd({ email: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Rede Social (Instagram, LinkedIn...)</label>
                    <input type="text" className={inputCls} value={formData.redeSocial || ''} onChange={e => fd({ redeSocial: e.target.value })} placeholder="@usuario" />
                  </div>
                  <div>
                    <label className={labelCls}>Site</label>
                    <input type="text" className={inputCls} value={formData.site || ''} onChange={e => fd({ site: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Chave PIX</label>
                    <input type="text" className={inputCls} value={formData.chavePix || ''} onChange={e => fd({ chavePix: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-muted cursor-pointer">
                      <input type="checkbox" checked={formData.aceitaComunicacao || false} onChange={e => fd({ aceitaComunicacao: e.target.checked })} />
                      Aceita receber comunicação via E-mail / WhatsApp
                    </label>
                  </div>
                </div>
              )}

              {/* TAB: Documentos */}
              {activeTab === 'Documentos' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>CPF / CNPJ</label><input type="text" className={inputCls} value={formData.documento || ''} onChange={e => fd({ documento: e.target.value })} /></div>
                  <div><label className={labelCls}>RG</label><input type="text" className={inputCls} value={formData.rg || ''} onChange={e => fd({ rg: e.target.value })} /></div>
                  <div><label className={labelCls}>Órgão Emissor RG</label><input type="text" className={inputCls} value={formData.orgaoEmissorRg || ''} onChange={e => fd({ orgaoEmissorRg: e.target.value })} /></div>
                  <div><label className={labelCls}>Inscrição Municipal</label><input type="text" className={inputCls} value={formData.inscricaoMunicipal || ''} onChange={e => fd({ inscricaoMunicipal: e.target.value })} /></div>
                  <div><label className={labelCls}>ID Estrangeiro</label><input type="text" className={inputCls} value={formData.idEstrangeiro || ''} onChange={e => fd({ idEstrangeiro: e.target.value })} /></div>
                  <div><label className={labelCls}>Nacionalidade</label><input type="text" className={inputCls} value={formData.nacionalidade || ''} onChange={e => fd({ nacionalidade: e.target.value })} /></div>
                  <div><label className={labelCls}>Estado Civil</label>
                    <select className={inputCls} value={formData.estadoCivil || ''} onChange={e => fd({ estadoCivil: e.target.value as any })}>
                      <option value="">Não informado</option>
                      <option>Solteiro</option><option>Casado</option><option>Divorciado</option><option>Viúvo</option><option>União Estável</option>
                    </select>
                  </div>
                  <div className="col-span-2 border-t border-border pt-4 mt-2">
                    <p className="text-xs font-black text-muted uppercase tracking-wider mb-3">Passaporte</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelCls}>Nº Passaporte</label><input type="text" className={inputCls + ' font-mono uppercase'} value={formData.passaporte || ''} onChange={e => fd({ passaporte: e.target.value })} /></div>
                      <div><label className={labelCls}>Emissão</label><input type="date" className={inputCls} value={formData.passaporteEmissao || ''} onChange={e => fd({ passaporteEmissao: e.target.value })} /></div>
                      <div><label className={labelCls}>Validade</label><input type="date" className={inputCls} value={formData.passaporteValidade || ''} onChange={e => fd({ passaporteValidade: e.target.value })} /></div>
                      <div><label className={labelCls}>País do Passaporte</label><input type="text" className={inputCls} value={formData.passaporteNacionalidade || ''} onChange={e => fd({ passaporteNacionalidade: e.target.value })} /></div>
                    </div>
                  </div>
                  <div className="col-span-2 border-t border-border pt-4">
                    <p className="text-xs font-black text-muted uppercase tracking-wider mb-3">Visto</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelCls}>Nº Visto</label><input type="text" className={inputCls + ' font-mono'} value={formData.visto || ''} onChange={e => fd({ visto: e.target.value })} /></div>
                      <div><label className={labelCls}>Validade do Visto</label><input type="date" className={inputCls} value={formData.vistoValidade || ''} onChange={e => fd({ vistoValidade: e.target.value })} /></div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Informações */}
              {activeTab === 'Informações' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>Data de Nascimento</label><input type="date" className={inputCls} value={formData.dataNascimento || ''} onChange={e => fd({ dataNascimento: e.target.value })} /></div>
                  <div><label className={labelCls}>Gênero</label>
                    <select className={inputCls} value={formData.genero || ''} onChange={e => fd({ genero: e.target.value as any })}>
                      <option value="">Não informado</option><option>Masculino</option><option>Feminino</option><option>Outro</option>
                    </select>
                  </div>
                  <div><label className={labelCls}>Profissão</label><input type="text" className={inputCls} value={formData.profissao || ''} onChange={e => fd({ profissao: e.target.value })} /></div>
                  <div><label className={labelCls}>Renda Mensal (R$)</label><input type="number" min="0" className={inputCls} value={formData.renda || ''} onChange={e => fd({ renda: e.target.value ? Number(e.target.value) : undefined })} /></div>
                  <div><label className={labelCls}>Canal de Venda</label>
                    <select className={inputCls} value={formData.canalVenda || ''} onChange={e => fd({ canalVenda: e.target.value })}>
                      <option value="">Selecione</option><option>WhatsApp</option><option>Instagram</option><option>Indicação</option><option>Site</option><option>Presencial</option><option>Outro</option>
                    </select>
                  </div>
                  <div className="col-span-2 border-t border-border pt-4 mt-2">
                    <p className="text-xs font-black text-muted uppercase tracking-wider mb-3">Contato de Emergência</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelCls}>Nome</label><input type="text" className={inputCls} value={formData.contatoEmergenciaNome || ''} onChange={e => fd({ contatoEmergenciaNome: e.target.value })} /></div>
                      <div><label className={labelCls}>Telefone</label><input type="text" className={inputCls} value={formData.contatoEmergenciaTel || ''} onChange={e => fd({ contatoEmergenciaTel: e.target.value })} /></div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: Endereço */}
              {activeTab === 'Endereço' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelCls}>País</label><input type="text" className={inputCls} value={formData.pais || 'Brasil'} onChange={e => fd({ pais: e.target.value })} /></div>
                  <div>
                    <label className={labelCls}>CEP {cepLoading && <span className="text-[#1D9E75]">Buscando...</span>}</label>
                    <input type="text" className={inputCls} value={formData.cep || ''} onChange={e => fd({ cep: e.target.value })} onBlur={e => handleCep(e.target.value)} placeholder="00000-000" />
                  </div>
                  <div className="col-span-2"><label className={labelCls}>Endereço</label><input type="text" className={inputCls} value={formData.endereco || ''} onChange={e => fd({ endereco: e.target.value })} /></div>
                  <div><label className={labelCls}>Número</label><input type="text" className={inputCls} value={formData.numero || ''} onChange={e => fd({ numero: e.target.value })} /></div>
                  <div><label className={labelCls}>Complemento</label><input type="text" className={inputCls} value={formData.complemento || ''} onChange={e => fd({ complemento: e.target.value })} /></div>
                  <div><label className={labelCls}>Bairro</label><input type="text" className={inputCls} value={formData.bairro || ''} onChange={e => fd({ bairro: e.target.value })} /></div>
                  <div><label className={labelCls}>Cidade</label><input type="text" className={inputCls} value={formData.cidade || ''} onChange={e => fd({ cidade: e.target.value })} /></div>
                  <div><label className={labelCls}>Estado</label><input type="text" className={inputCls} value={formData.estado || ''} onChange={e => fd({ estado: e.target.value })} /></div>
                </div>
              )}

              {/* TAB: Família */}
              {activeTab === 'Família' && (
                <div className="space-y-4">
                  <p className="text-xs text-muted">Vincule membros da família ou grupo de viagem. O círculo é compartilhado — quem está aqui também vê esta pessoa em seu círculo.</p>
                  {/* Search to add */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-placeholder" />
                    <input type="text" placeholder="Buscar pessoa para adicionar ao círculo..." value={familiaSearch}
                      onChange={e => setFamiliaSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm bg-surface border border-border rounded-lg text-primary focus:outline-none focus:border-[#1D9E75]" />
                  </div>
                  {familiaResults.length > 0 && (
                    <div className="border border-border rounded-lg overflow-hidden">
                      {familiaResults.map(p => (
                        <button key={p.id} type="button" onClick={() => addFamilia(p.id)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-alt border-b border-border last:border-0 text-left">
                          <div>
                            <p className="text-sm font-bold text-primary">{p.nome}</p>
                            <div className="flex gap-1 mt-0.5">{p.tipo.map(t => <span key={t} className={`text-[9px] px-1 rounded ${TIPO_COLOR[t]}`}>{t}</span>)}</div>
                          </div>
                          <PlusCircle size={16} className="text-[#1D9E75]" />
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Family members */}
                  {allFamiliaMembers.length === 0 ? (
                    <p className="text-sm text-muted text-center py-8">Nenhum membro no círculo familiar.</p>
                  ) : (
                    <div className="space-y-2">
                      {allFamiliaMembers.map(p => {
                        const isLinkedHere = familiaIds.includes(p.id);
                        const isLinkedFromThem = circleIds.includes(p.id);
                        return (
                          <div key={p.id} className="flex items-center justify-between bg-surface-alt border border-border rounded-lg px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#1D9E75]/20 flex items-center justify-center text-emerald-400 font-black text-xs">
                                {p.nome.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-primary">{p.nome}</p>
                                <div className="flex gap-1 mt-0.5">{p.tipo.map(t => <span key={t} className={`text-[9px] px-1 rounded border ${TIPO_COLOR[t]}`}>{t}</span>)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isLinkedFromThem && !isLinkedHere && (
                                <span className="text-[9px] text-sky-400 font-bold uppercase">Vínculo deles</span>
                              )}
                              {isLinkedHere && (
                                <button type="button" onClick={() => removeFamilia(p.id)} className="text-red-400 hover:text-red-300">
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Anexos */}
              {activeTab === 'Anexos' && (
                <div className="space-y-4">
                  {!editingId && <p className="text-sm text-amber-400 bg-amber-900/20 p-3 rounded-lg">Salve o cadastro primeiro para poder anexar documentos.</p>}
                  {editingId && (
                    <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-[#1D9E75] transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      <PlusCircle size={24} className="text-muted" />
                      <p className="text-sm font-bold text-muted">{uploading ? 'Enviando...' : 'Clique para anexar documento'}</p>
                      <p className="text-xs text-placeholder">PDF, JPG, PNG — máx 10MB</p>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                  )}
                  <div className="space-y-2">
                    {(formData.documentos || []).map(doc => (
                      <div key={doc.id} className="flex items-center justify-between bg-surface-alt border border-border rounded-lg px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-primary">{doc.nome}</p>
                          <p className="text-[10px] text-placeholder">{new Date(doc.criadoEm).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="flex gap-2">
                          <a href={doc.url} target="_blank" rel="noreferrer" className="text-[#1D9E75] text-xs font-bold hover:underline">Ver</a>
                          <button type="button" onClick={() => removeDoc(doc)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: Observação */}
              {activeTab === 'Observação' && (
                <div>
                  <label className={labelCls}>Observações / Preferências de viagem</label>
                  <textarea rows={8} className={inputCls} value={formData.observacoes || ''} onChange={e => fd({ observacoes: e.target.value })} placeholder="Preferências de assento, restrições alimentares, notas importantes..." />
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-border">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold hover:bg-surface-hover text-sm">Cancelar</button>
                <button type="submit" className="bg-[#1D9E75] text-white px-6 py-2 rounded-lg font-bold uppercase tracking-wider text-sm hover:brightness-110">
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {pessoaToDelete && (
        <div className="fixed inset-0 bg-slate-900/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 border border-border text-center">
            <Trash2 size={40} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-primary mb-2">Excluir Pessoa</h3>
            <p className="text-sm text-muted mb-6"><strong className="text-primary">{pessoaToDelete.nome}</strong> será excluído permanentemente.</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setPessoaToDelete(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold hover:bg-surface-alt">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
