import React, { useState, useRef } from "react";
import { generateId, maskCpfCnpj, maskPhone, sanitizePhone, formatCurrency } from "../utils";
import { PlusCircle, Trash2, Edit, MessageCircle, Trophy, X, BookOpen, ShoppingCart, Upload, FileText, Image, Download, AlertTriangle, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "../toast";
import { supabase } from "../lib/supabase";
import type { Cliente, ClienteDocumento } from "../types";

const EMPTY_FORM = (): Omit<Cliente, 'id'> => ({
  nome: "", documento: "", passaporte: "", passaporteValidade: "",
  nacionalidade: "Brasileira", dataNascimento: "", genero: "",
  profissao: "", telefone: "", email: "",
  cep: "", endereco: "", numero: "", bairro: "", cidade: "", estado: "",
  contatoEmergenciaNome: "", contatoEmergenciaTel: "",
  observacoes: "", documentos: [],
});

export function Clientes({ data, updateData }: any) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [formSection, setFormSection] = useState<'pessoal' | 'endereco' | 'emergencia'>('pessoal');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docTipo, setDocTipo] = useState<ClienteDocumento['tipo']>('Passaporte');

  const [formData, setFormData] = useState(EMPTY_FORM());

  // ── Top 5 clientes ──────────────────────────────────────────────────
  const topClientes = React.useMemo(() => {
    const agrupado: Record<string, { nome: string; totalComprado: number; vendasRealizadas: number }> = {};
    (data.vendas || []).forEach((v: any) => {
      if (v.status !== "Cancelado" && v.cliente) {
        if (!agrupado[v.cliente]) agrupado[v.cliente] = { nome: v.cliente, totalComprado: 0, vendasRealizadas: 0 };
        agrupado[v.cliente].totalComprado += v.valorBruto || 0;
        agrupado[v.cliente].vendasRealizadas += 1;
      }
    });
    const clientesMap = new Map((data.clientes || []).map((c: any) => [c.nome, c]));
    return Object.values(agrupado).sort((a, b) => b.totalComprado - a.totalComprado).slice(0, 5).map((t) => {
      const c: any = clientesMap.get(t.nome);
      return { ...t, telefone: c?.telefone || "", email: c?.email || "", documento: c?.documento || "" };
    });
  }, [data.vendas, data.clientes]);

  // ── CEP lookup ──────────────────────────────────────────────────────
  const handleCepBlur = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const json = await res.json();
      if (!json.erro) {
        setFormData(prev => ({ ...prev, endereco: json.logradouro || prev.endereco, bairro: json.bairro || prev.bairro, cidade: json.localidade || prev.cidade, estado: json.uf || prev.estado }));
        toast('Endereço preenchido automaticamente!', 'info');
      } else { toast('CEP não encontrado.', 'error'); }
    } catch { toast('Erro ao buscar CEP.', 'error'); }
    finally { setCepLoading(false); }
  };

  // ── Document upload ─────────────────────────────────────────────────
  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) { toast('Salve o cliente antes de enviar documentos.', 'info'); return; }
    setUploadingDoc(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${editingId}/${generateId()}-${file.name.replace(/\s+/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('client-docs').upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('client-docs').getPublicUrl(path);
      const novoDoc: ClienteDocumento = { id: generateId(), nome: file.name, tipo: docTipo, url: urlData.publicUrl, tamanho: file.size, criadoEm: new Date().toISOString() };
      const docs = [...(formData.documentos || []), novoDoc];
      setFormData(prev => ({ ...prev, documentos: docs }));
      // Persist immediately
      const clienteAtualizado = { ...formData, id: editingId, documentos: docs };
      updateData({ clientes: data.clientes.map((c: any) => c.id === editingId ? clienteAtualizado : c) });
      toast('Documento enviado com sucesso!', 'success');
    } catch (err: any) { toast(`Erro no upload: ${err.message}`, 'error'); }
    finally { setUploadingDoc(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDeleteDoc = async (docId: string, url: string) => {
    const path = url.split('/client-docs/')[1];
    if (path) await supabase.storage.from('client-docs').remove([path]);
    const docs = (formData.documentos || []).filter(d => d.id !== docId);
    setFormData(prev => ({ ...prev, documentos: docs }));
    if (editingId) updateData({ clientes: data.clientes.map((c: any) => c.id === editingId ? { ...formData, id: editingId, documentos: docs } : c) });
    toast('Documento removido.', 'info');
  };

  // ── Save ────────────────────────────────────────────────────────────
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateData({ clientes: data.clientes.map((c: any) => c.id === editingId ? { ...formData, id: editingId } : c) });
      toast('Cliente atualizado!', 'success');
    } else {
      updateData({ clientes: [{ ...formData, id: generateId() }, ...(data.clientes || [])] });
      toast('Cliente cadastrado!', 'success');
    }
    setIsFormOpen(false);
    setEditingId(null);
    setFormData(EMPTY_FORM());
    setFormSection('pessoal');
  };

  const handleEdit = (c: Cliente) => {
    setFormData({ ...EMPTY_FORM(), ...c });
    setEditingId(c.id);
    setIsFormOpen(true);
    setFormSection('pessoal');
  };

  const handleDelete = (id: string) => {
    const cliente = data.clientes.find((c: any) => c.id === id);
    if (!window.confirm(`Excluir o cliente "${cliente?.nome}"?\nEsta ação não pode ser desfeita.`)) return;
    updateData({ clientes: data.clientes.filter((c: any) => c.id !== id) });
    toast('Cliente excluído.', 'info');
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM());
    setIsFormOpen(!isFormOpen);
    setFormSection('pessoal');
  };

  const clientesFiltrados = (data.clientes || []).filter((c: any) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return c.nome?.toLowerCase().includes(s) || c.documento?.toLowerCase().includes(s) || c.cidade?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.telefone?.includes(searchTerm);
  });

  const labelCls = "block text-xs font-bold text-muted uppercase tracking-wider mb-1";
  const inputCls = "w-full border border-border-hover rounded-lg px-3 py-2 text-sm text-primary bg-surface focus:outline-none focus:border-[#1D9E75] transition-colors";

  const sectionTab = (id: typeof formSection, label: string) => (
    <button type="button" onClick={() => setFormSection(id)}
      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${formSection === id ? 'bg-[#1D9E75] text-white' : 'text-muted hover:text-primary hover:bg-surface-hover'}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-primary tracking-tighter uppercase">Clientes</h2>
        <button onClick={handleNew} className="bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:brightness-110 uppercase flex items-center gap-2">
          <PlusCircle size={18} /> {isFormOpen && !editingId ? "Fechar" : "Novo Cliente"}
        </button>
      </div>

      {/* Top 5 */}
      {topClientes.length > 0 && (
        <div className="bg-gradient-to-br from-[#1F2220] to-blue-900 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="text-[#1D9E75]" size={28} />
            <h3 className="text-xl font-black uppercase tracking-wider">Top 5 Clientes em Compras</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {topClientes.map((cliente: any, idx: number) => (
              <div key={idx} className="bg-surface/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-[#1D9E75] text-white font-black w-8 h-8 flex items-center justify-center rounded-bl-xl z-10">{idx + 1}º</div>
                <h4 className="font-bold text-sm uppercase tracking-wide truncate pr-6" title={cliente.nome}>{cliente.nome}</h4>
                {cliente.documento && <div className="text-[10px] text-white/50 font-mono mt-1">{cliente.documento}</div>}
                <div className="bg-black/20 -mx-4 -mb-4 p-4 mt-4 border-t border-white/5">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] text-white/60 uppercase font-bold tracking-wider mb-0.5">Total Investido</div>
                      <div className="font-mono font-bold text-green-400">{formatCurrency(cliente.totalComprado)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-white/60 uppercase font-bold tracking-wider mb-0.5">Vendas</div>
                      <div className="font-bold text-lg leading-none">{cliente.vendasRealizadas}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {isFormOpen && (
        <div className="bg-surface rounded-2xl shadow-sm border border-border border-b-4 border-b-[#1D9E75]">
          {/* Section tabs */}
          <div className="p-4 border-b border-border flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted font-bold uppercase tracking-widest mr-2">Seção:</span>
            {sectionTab('pessoal', 'Dados Pessoais')}
            {sectionTab('endereco', 'Endereço')}
            {sectionTab('emergencia', 'Emergência & Obs.')}
          </div>

          <form onSubmit={handleSave} className="p-6">
            {/* ── PESSOAL ── */}
            {formSection === 'pessoal' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className={labelCls}>Nome / Razão Social *</label>
                  <input required type="text" className={inputCls} value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>CPF / CNPJ</label>
                  <input type="text" className={inputCls} value={formData.documento} onChange={e => setFormData({ ...formData, documento: maskCpfCnpj(e.target.value) })} />
                </div>
                <div>
                  <label className={labelCls}>Gênero</label>
                  <select className={inputCls} value={formData.genero} onChange={e => setFormData({ ...formData, genero: e.target.value as any })}>
                    <option value="">Não informado</option>
                    <option>Masculino</option>
                    <option>Feminino</option>
                    <option>Outro</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Data de Nascimento</label>
                  <input type="date" className={inputCls} value={formData.dataNascimento} onChange={e => setFormData({ ...formData, dataNascimento: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Nacionalidade</label>
                  <input type="text" className={inputCls} value={formData.nacionalidade} onChange={e => setFormData({ ...formData, nacionalidade: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Profissão</label>
                  <input type="text" className={inputCls} value={formData.profissao} onChange={e => setFormData({ ...formData, profissao: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Telefone / WhatsApp</label>
                  <input type="text" className={inputCls} value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: maskPhone(e.target.value) })} />
                </div>
                <div className="lg:col-span-2">
                  <label className={labelCls}>E-mail</label>
                  <input type="email" className={inputCls} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Nº Passaporte</label>
                  <input type="text" className={`${inputCls} uppercase font-mono tracking-widest`} value={formData.passaporte} onChange={e => setFormData({ ...formData, passaporte: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label className={labelCls}>Validade do Passaporte</label>
                  <input type="date" className={inputCls} value={formData.passaporteValidade} onChange={e => setFormData({ ...formData, passaporteValidade: e.target.value })} />
                </div>
              </div>
            )}

            {/* ── ENDEREÇO ── */}
            {formSection === 'endereco' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>CEP {cepLoading && <span className="text-[#1D9E75] normal-case">buscando...</span>}</label>
                  <input type="text" className={inputCls} value={formData.cep} placeholder="00000-000" maxLength={9}
                    onChange={e => setFormData({ ...formData, cep: e.target.value })}
                    onBlur={e => handleCepBlur(e.target.value)} />
                </div>
                <div className="lg:col-span-2">
                  <label className={labelCls}>Rua / Avenida</label>
                  <input type="text" className={inputCls} value={formData.endereco} onChange={e => setFormData({ ...formData, endereco: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Número / Comp.</label>
                  <input type="text" className={inputCls} value={formData.numero} onChange={e => setFormData({ ...formData, numero: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Bairro</label>
                  <input type="text" className={inputCls} value={formData.bairro} onChange={e => setFormData({ ...formData, bairro: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Cidade</label>
                  <input type="text" className={inputCls} value={formData.cidade} onChange={e => setFormData({ ...formData, cidade: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Estado (UF)</label>
                  <input type="text" maxLength={2} className={`${inputCls} uppercase`} value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value.toUpperCase() })} />
                </div>
              </div>
            )}

            {/* ── EMERGÊNCIA ── */}
            {formSection === 'emergencia' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Contato de Emergência — Nome</label>
                  <input type="text" className={inputCls} value={formData.contatoEmergenciaNome} onChange={e => setFormData({ ...formData, contatoEmergenciaNome: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Contato de Emergência — Telefone</label>
                  <input type="text" className={inputCls} value={formData.contatoEmergenciaTel} onChange={e => setFormData({ ...formData, contatoEmergenciaTel: maskPhone(e.target.value) })} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Observações</label>
                  <textarea rows={4} className={inputCls} value={formData.observacoes} onChange={e => setFormData({ ...formData, observacoes: e.target.value })} />
                </div>

                {/* Documents — só disponível ao editar */}
                {editingId && (
                  <div className="md:col-span-2 mt-2">
                    <div className="border border-border rounded-xl p-4 bg-surface-alt">
                      <h5 className="text-xs font-black uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
                        <FileText size={14} /> Documentos do Cliente
                      </h5>

                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <select value={docTipo} onChange={e => setDocTipo(e.target.value as any)} className="border border-border-hover rounded-lg px-3 py-1.5 text-sm bg-surface text-primary focus:outline-none focus:border-[#1D9E75]">
                          <option>Passaporte</option>
                          <option>RG</option>
                          <option>CNH</option>
                          <option>Visto</option>
                          <option>Outro</option>
                        </select>
                        <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleUploadDoc} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}
                          className="flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:brightness-110 disabled:opacity-50">
                          <Upload size={15} /> {uploadingDoc ? 'Enviando...' : 'Enviar Arquivo'}
                        </button>
                        <span className="text-[10px] text-placeholder">JPG, PNG, PDF — máx 10MB</span>
                      </div>

                      {(formData.documentos || []).length === 0 ? (
                        <p className="text-sm text-muted italic">Nenhum documento enviado.</p>
                      ) : (
                        <div className="space-y-2">
                          {(formData.documentos || []).map(doc => (
                            <div key={doc.id} className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-2">
                              <div className="flex items-center gap-3">
                                {doc.nome.endsWith('.pdf') ? <FileText size={16} className="text-red-400 shrink-0" /> : <Image size={16} className="text-blue-400 shrink-0" />}
                                <div>
                                  <p className="text-sm font-medium text-primary truncate max-w-[250px]">{doc.nome}</p>
                                  <p className="text-[10px] text-placeholder uppercase font-bold">{doc.tipo} · {doc.tamanho ? `${(doc.tamanho / 1024).toFixed(0)} KB` : ''}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 p-1" title="Abrir"><Download size={15} /></a>
                                <button type="button" onClick={() => handleDeleteDoc(doc.id, doc.url)} className="text-red-400 hover:text-red-300 p-1" title="Remover"><Trash2 size={15} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!editingId && (
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2 text-xs text-placeholder bg-surface-alt border border-border rounded-lg px-3 py-2">
                      <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                      Salve o cadastro primeiro para habilitar o envio de documentos.
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold hover:bg-surface-hover text-sm">Cancelar</button>
              <div className="flex gap-2">
                {formSection !== 'pessoal' && (
                  <button type="button" onClick={() => setFormSection(formSection === 'emergencia' ? 'endereco' : 'pessoal')}
                    className="px-4 py-2 border border-border rounded-lg text-muted font-bold hover:bg-surface-hover text-sm flex items-center gap-1">
                    <ChevronUp size={15} /> Anterior
                  </button>
                )}
                {formSection !== 'emergencia' ? (
                  <button type="button" onClick={() => setFormSection(formSection === 'pessoal' ? 'endereco' : 'emergencia')}
                    className="px-4 py-2 bg-surface-alt border border-border rounded-lg text-primary font-bold hover:bg-surface-hover text-sm flex items-center gap-1">
                    Próximo <ChevronDown size={15} />
                  </button>
                ) : (
                  <button type="submit" className="bg-[#1D9E75] text-white px-6 py-2 rounded-lg font-bold uppercase tracking-wider text-sm hover:bg-emerald-700">
                    {editingId ? "Atualizar Cliente" : "Salvar Cliente"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-2xl shadow-md border border-border overflow-hidden">
        <div className="p-4 bg-surface-alt border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h4 className="font-black text-primary uppercase tracking-wider">Carteira de Clientes</h4>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-placeholder" />
            <input type="text" placeholder="Buscar cliente, doc, cidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-surface border border-border rounded-lg text-primary placeholder:text-placeholder focus:outline-none focus:border-[#1D9E75]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-alt text-[10px] uppercase font-bold text-placeholder">
              <tr>
                <th className="px-4 py-3">Nome / Razão Social</th>
                <th className="px-4 py-3">Contato & Doc</th>
                <th className="px-4 py-3">Passaporte</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3 text-center">Docs</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm border-t border-border">
              {clientesFiltrados.map((c: Cliente) => {
                const passExp = c.passaporteValidade ? new Date(c.passaporteValidade) : null;
                const passVencido = passExp && passExp < new Date();
                const passSoon = passExp && !passVencido && (passExp.getTime() - Date.now()) < 180 * 86400000;
                return (
                  <tr key={c.id} className="border-b border-border hover:bg-surface-alt cursor-pointer" onClick={() => setSelectedCliente(c)}>
                    <td className="px-4 py-3">
                      <span className="text-primary font-bold uppercase">{c.nome}</span>
                      {c.profissao && <div className="text-[10px] text-placeholder mt-0.5">{c.profissao}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-muted tracking-wider text-xs">{c.documento || "—"}</div>
                      <div className="text-xs text-muted mt-0.5">{c.telefone ? maskPhone(c.telefone) : "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {c.passaporte ? (
                        <div>
                          <span className="font-mono text-xs text-primary">{c.passaporte}</span>
                          {c.passaporteValidade && (
                            <div className={`text-[10px] font-bold mt-0.5 ${passVencido ? 'text-red-400' : passSoon ? 'text-amber-400' : 'text-placeholder'}`}>
                              Val: {new Date(c.passaporteValidade).toLocaleDateString('pt-BR')}
                              {passVencido && ' ⚠ VENCIDO'}
                              {passSoon && ' ⚠ A vencer'}
                            </div>
                          )}
                        </div>
                      ) : <span className="text-placeholder text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs uppercase">{c.cidade ? `${c.cidade}/${c.estado}` : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {(c.documentos || []).length > 0 ? (
                        <span className="bg-blue-900/30 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full">{c.documentos!.length}</span>
                      ) : <span className="text-placeholder text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-center space-x-2 items-center">
                        {c.telefone && (
                          <a href={`https://wa.me/55${sanitizePhone(c.telefone)}`} target="_blank" rel="noreferrer"
                            className="text-green-500 hover:text-green-400 p-1" title="WhatsApp" onClick={e => e.stopPropagation()}>
                            <MessageCircle size={15} />
                          </a>
                        )}
                        <button onClick={e => { e.stopPropagation(); handleEdit(c); }} className="text-blue-400 hover:text-blue-300 p-1" title="Editar"><Edit size={15} /></button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(c.id); }} className="text-red-400 hover:text-red-300 p-1" title="Excluir"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {clientesFiltrados.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted font-medium">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overview Modal */}
      {selectedCliente && (
        <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border flex flex-col">
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface-alt sticky top-0 z-10 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-black text-primary uppercase tracking-wider flex items-center gap-2">
                  <BookOpen size={20} className="text-[#1D9E75]" /> {selectedCliente.nome}
                </h3>
                <p className="text-xs font-mono text-muted mt-0.5">
                  {selectedCliente.documento || '—'} {selectedCliente.nacionalidade ? `· ${selectedCliente.nacionalidade}` : ''}
                </p>
              </div>
              <button onClick={() => setSelectedCliente(null)} className="p-2 hover:bg-surface-hover rounded-full">
                <X size={20} className="text-muted" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dados pessoais */}
              <div className="bg-surface-alt p-4 rounded-xl border border-border space-y-1.5">
                <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest mb-3">Dados Pessoais</h4>
                {[
                  ['Nascimento', selectedCliente.dataNascimento ? new Date(selectedCliente.dataNascimento).toLocaleDateString('pt-BR') : null],
                  ['Gênero', selectedCliente.genero],
                  ['Profissão', selectedCliente.profissao],
                  ['Telefone', selectedCliente.telefone ? maskPhone(selectedCliente.telefone) : null],
                  ['E-mail', selectedCliente.email],
                  ['Passaporte', selectedCliente.passaporte],
                  ['Val. Passaporte', selectedCliente.passaporteValidade ? new Date(selectedCliente.passaporteValidade).toLocaleDateString('pt-BR') : null],
                ].map(([k, v]) => v ? (
                  <p key={k as string} className="text-xs text-muted"><strong className="text-secondary">{k}:</strong> {v}</p>
                ) : null)}
              </div>

              {/* Endereço + Emergência */}
              <div className="bg-surface-alt p-4 rounded-xl border border-border space-y-1.5">
                <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest mb-3">Endereço & Emergência</h4>
                {selectedCliente.endereco && <p className="text-xs text-muted"><strong className="text-secondary">End:</strong> {selectedCliente.endereco}, {selectedCliente.numero}</p>}
                {selectedCliente.bairro && <p className="text-xs text-muted">{selectedCliente.bairro} — {selectedCliente.cidade}/{selectedCliente.estado} {selectedCliente.cep}</p>}
                {selectedCliente.contatoEmergenciaNome && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <h5 className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-1.5">Emergência</h5>
                    <p className="text-xs text-muted"><strong className="text-secondary">Nome:</strong> {selectedCliente.contatoEmergenciaNome}</p>
                    {selectedCliente.contatoEmergenciaTel && <p className="text-xs text-muted"><strong className="text-secondary">Tel:</strong> {maskPhone(selectedCliente.contatoEmergenciaTel)}</p>}
                  </div>
                )}
                {selectedCliente.observacoes && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted italic whitespace-pre-line">{selectedCliente.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Histórico */}
              <div className="bg-surface-alt p-4 rounded-xl border border-border flex flex-col">
                <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest mb-3 flex items-center gap-1"><ShoppingCart size={12} /> Compras</h4>
                <div className="flex-1 overflow-y-auto space-y-2 max-h-48">
                  {data.vendas?.filter((v: any) => v.cliente === selectedCliente.nome && v.status !== 'Cancelado').map((v: any) => (
                    <div key={v.id} className="text-xs bg-surface p-2 border border-border rounded flex justify-between">
                      <div>
                        <strong className="text-primary block">{v.numeroPedido || v.id.slice(0, 6)} · {v.tipo}</strong>
                        <span className="text-placeholder">{new Date(v.criadoEm).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <strong className="text-primary">{formatCurrency(v.valorBruto)}</strong>
                    </div>
                  ))}
                  {!data.vendas?.some((v: any) => v.cliente === selectedCliente.nome && v.status !== 'Cancelado') && (
                    <p className="text-xs text-muted italic">Nenhuma compra registrada.</p>
                  )}
                </div>
                <div className="mt-auto pt-3 border-t border-border">
                  <p className="text-[10px] text-muted uppercase font-bold">Total Gasto</p>
                  <p className="text-xl font-black text-green-500">
                    {formatCurrency(data.vendas?.filter((v: any) => v.cliente === selectedCliente.nome && v.status !== 'Cancelado').reduce((acc: number, v: any) => acc + (v.valorBruto || 0), 0) || 0)}
                  </p>
                </div>
              </div>

              {/* Documents */}
              {(selectedCliente.documentos || []).length > 0 && (
                <div className="md:col-span-3 bg-surface-alt p-4 rounded-xl border border-border">
                  <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest mb-3 flex items-center gap-2"><FileText size={12} /> Documentos ({selectedCliente.documentos!.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {selectedCliente.documentos!.map(doc => (
                      <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 bg-surface border border-border rounded-lg px-3 py-2 hover:border-[#1D9E75] transition-colors group">
                        {doc.nome.endsWith('.pdf') ? <FileText size={20} className="text-red-400 shrink-0" /> : <Image size={20} className="text-blue-400 shrink-0" />}
                        <div className="overflow-hidden">
                          <p className="text-xs font-medium text-primary truncate group-hover:text-[#1D9E75]">{doc.nome}</p>
                          <p className="text-[10px] text-placeholder uppercase font-bold">{doc.tipo}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
