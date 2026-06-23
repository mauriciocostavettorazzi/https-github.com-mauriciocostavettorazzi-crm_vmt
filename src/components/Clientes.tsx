import React, { useState } from "react";
import {
  generateId,
  maskCpfCnpj,
  maskPhone,
  sanitizePhone,
  formatCurrency,
} from "../utils";
import { PlusCircle, Trash2, Edit, MessageCircle, Trophy, Eye, X, BookOpen, ShoppingCart } from "lucide-react";

export function Clientes({ data, updateData }: any) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOverviewCliente, setSelectedOverviewCliente] = useState<any>(null);

  const topClientes = React.useMemo(() => {
    const vendas = data.vendas || [];
    const agrupado: Record<
      string,
      { nome: string; totalComprado: number; vendasRealizadas: number }
    > = {};

    vendas.forEach((v: any) => {
      if (v.status !== "Cancelado" && v.cliente) {
        if (!agrupado[v.cliente]) {
          agrupado[v.cliente] = {
            nome: v.cliente,
            totalComprado: 0,
            vendasRealizadas: 0,
          };
        }
        agrupado[v.cliente].totalComprado += v.valorBruto || 0;
        agrupado[v.cliente].vendasRealizadas += 1;
      }
    });

    const clientesMap = new Map<string, any>(
      (data.clientes || []).map((c: any) => [c.nome, c]),
    );

    const result = Object.values(agrupado)
      .sort((a, b) => b.totalComprado - a.totalComprado)
      .slice(0, 5)
      .map((t) => {
        const c = clientesMap.get(t.nome);
        return {
          ...t,
          telefone: c?.telefone || "",
          email: c?.email || "",
          documento: c?.documento || "",
        };
      });

    return result;
  }, [data.vendas, data.clientes]);

  const [formData, setFormData] = useState({
    nome: "",
    documento: "",
    passaporte: "",
    telefone: "",
    email: "",
    cep: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    observacoes: "",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const updatedClientes = data.clientes.map((c: any) =>
        c.id === editingId ? { ...formData, id: editingId } : c,
      );
      updateData({ clientes: updatedClientes });
    } else {
      const novoCliente = { ...formData, id: generateId() };
      updateData({ clientes: [novoCliente, ...(data.clientes || [])] });
    }

    setIsFormOpen(false);
    setEditingId(null);
    setFormData({
      nome: "",
      documento: "",
      passaporte: "",
      telefone: "",
      email: "",
      cep: "",
      endereco: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "",
      observacoes: "",
    });
  };

  const handleEdit = (cliente: any) => {
    setFormData({
      nome: cliente.nome || "",
      documento: cliente.documento || "",
      passaporte: cliente.passaporte || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      cep: cliente.cep || "",
      endereco: cliente.endereco || "",
      numero: cliente.numero || "",
      bairro: cliente.bairro || "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
      observacoes: cliente.observacoes || "",
    });
    setEditingId(cliente.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    const updatedClientes = data.clientes.filter((c: any) => c.id !== id);
    updateData({ clientes: updatedClientes });
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({
      nome: "",
      documento: "",
      passaporte: "",
      telefone: "",
      email: "",
      cep: "",
      endereco: "",
      numero: "",
      bairro: "",
      cidade: "",
      estado: "",
      observacoes: "",
    });
    setIsFormOpen(!isFormOpen);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">
          Clientes
        </h2>
        <button
          onClick={handleNew}
          className="bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:brightness-110 uppercase flex items-center gap-2"
        >
          <PlusCircle size={18} />{" "}
          {isFormOpen ? "Fechar Formulário" : "Novo Cliente"}
        </button>
      </div>

      {topClientes.length > 0 && (
        <div className="bg-gradient-to-br from-[#1F2220] to-blue-900 rounded-2xl shadow-lg p-6 text-white mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="text-[#1D9E75]" size={28} />
            <h3 className="text-xl font-black uppercase tracking-wider">
              Top 5 Clientes em Compras
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {topClientes.map((cliente: any, idx: number) => (
              <div
                key={idx}
                className="bg-surface/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 flex flex-col relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 bg-[#1D9E75] text-white font-black w-8 h-8 flex items-center justify-center rounded-bl-xl z-10 shadow-sm">
                  {idx + 1}º
                </div>

                <div className="flex-1 z-10">
                  <h4
                    className="font-bold text-sm uppercase tracking-wide truncate pr-6"
                    title={cliente.nome}
                  >
                    {cliente.nome}
                  </h4>
                  {cliente.documento ? (
                    <div className="text-[10px] text-white/50 font-mono mt-1">
                      {cliente.documento}
                    </div>
                  ) : (
                    <div className="h-4"></div>
                  )}
                </div>

                <div className="z-10 bg-black/20 -mx-4 -mb-4 p-4 mt-4 border-t border-white/5 group-hover:bg-black/30 transition-colors">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] text-white/60 uppercase font-bold tracking-wider mb-0.5">
                        Total Investido
                      </div>
                      <div className="font-mono font-bold text-green-400">
                        {formatCurrency(cliente.totalComprado)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-white/60 uppercase font-bold tracking-wider mb-0.5">
                        Vendas
                      </div>
                      <div className="font-bold text-lg leading-none">
                        {cliente.vendasRealizadas}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="bg-surface p-6 rounded-2xl shadow-sm border-b-4 border-[#1D9E75] mb-6">
          <form
            onSubmit={handleSave}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome / Razão Social
              </label>
              <input
                required
                type="text"
                className="w-full border border-border-hover rounded-md p-2"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF / CNPJ
              </label>
              <input
                type="text"
                className="w-full border border-border-hover rounded-md p-2"
                value={formData.documento}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    documento: maskCpfCnpj(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passaporte
              </label>
              <input
                type="text"
                className="w-full border border-border-hover rounded-md p-2 uppercase"
                value={formData.passaporte}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    passaporte: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone / Contato
              </label>
              <input
                type="text"
                className="w-full border border-border-hover rounded-md p-2"
                value={formData.telefone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    telefone: maskPhone(e.target.value),
                  })
                }
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                className="w-full border border-border-hover rounded-md p-2"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CEP
              </label>
              <input
                type="text"
                className="w-full border border-border-hover rounded-md p-2"
                value={formData.cep}
                onChange={(e) =>
                  setFormData({ ...formData, cep: e.target.value })
                }
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço (Rua/Av)
              </label>
              <input
                type="text"
                className="w-full border border-border-hover rounded-md p-2"
                value={formData.endereco}
                onChange={(e) =>
                  setFormData({ ...formData, endereco: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número / Comp.
              </label>
              <input
                type="text"
                className="w-full border border-border-hover rounded-md p-2"
                value={formData.numero}
                onChange={(e) =>
                  setFormData({ ...formData, numero: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bairro
              </label>
              <input
                type="text"
                className="w-full border border-border-hover rounded-md p-2"
                value={formData.bairro}
                onChange={(e) =>
                  setFormData({ ...formData, bairro: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cidade
              </label>
              <input
                type="text"
                className="w-full border border-border-hover rounded-md p-2"
                value={formData.cidade}
                onChange={(e) =>
                  setFormData({ ...formData, cidade: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado (UF)
              </label>
              <input
                type="text"
                maxLength={2}
                className="w-full border border-border-hover rounded-md p-2 uppercase"
                value={formData.estado}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estado: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>

            <div className="lg:col-span-4 border-t border-border pt-4 mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                className="w-full border border-border-hover rounded-md p-2"
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
              />
            </div>
            <div className="lg:col-span-4 flex justify-end mt-4 gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="bg-surface-hover text-primary px-6 py-2 rounded-md font-bold uppercase tracking-wider text-sm hover:bg-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#1D9E75] text-white px-6 py-2 rounded-md font-bold uppercase tracking-wider text-sm hover:bg-emerald-700"
              >
                {editingId ? "Atualizar Cliente" : "Salvar Cliente"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-md border border-border overflow-hidden flex flex-col">
        <div className="p-4 bg-surface-alt border-b border-border flex justify-between items-center">
          <h4 className="font-black text-white uppercase tracking-wider">
            Carteira de Clientes
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-alt text-[10px] uppercase font-bold text-placeholder">
              <tr>
                <th className="px-4 py-3">Nome / Razão Social</th>
                <th className="px-4 py-3">Contato & Doc</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm border-t border-border">
              {(data.clientes || []).map((c: any) => (
                <tr
                  key={c.id}
                  className="border-b border-border hover:bg-surface-alt cursor-pointer"
                  onClick={() => setSelectedOverviewCliente(c)}
                >
                  <td className="px-4 py-3">
                    <span className="text-primary font-bold uppercase">
                      {c.nome}
                    </span>
                    {c.observacoes && (
                      <div className="text-[10px] text-placeholder mt-1 uppercase truncate max-w-[200px]">
                        {c.observacoes}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-muted tracking-wider text-xs">
                      {c.documento || "-"}
                    </div>
                    <div className="font-medium text-muted text-xs mt-1">
                      {c.telefone ? maskPhone(c.telefone) : "-"} {c.email ? `• ${c.email}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs uppercase">
                    {c.cidade ? `${c.cidade}-${c.estado}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center space-x-3 items-center">
                      {c.telefone && (
                        <a
                          href={`https://wa.me/55${sanitizePhone(c.telefone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-500 hover:text-green-700"
                          title="Mensagem no WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle size={16} />
                        </a>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                        className="text-blue-500 hover:text-blue-700"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                        className="text-red-500 hover:text-red-700"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!data.clientes || data.clientes.length === 0) && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-4 text-center text-muted font-medium"
                  >
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOverviewCliente && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-border flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-alt sticky top-0 z-10 rounded-t-2xl">
              <div>
                 <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                     <BookOpen size={20} className="text-[#1D9E75]" />
                     Overview do Cliente
                 </h3>
                 <p className="text-xs font-mono text-muted mt-1">{selectedOverviewCliente.nome} | Doc: {selectedOverviewCliente.documento || '-'}</p>
              </div>
              <button onClick={() => setSelectedOverviewCliente(null)} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                <X size={20} className="text-muted" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col gap-3">
                  <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest flex items-center gap-1">Dados Cadastrais</h4>
                  <div className="flex flex-col gap-2">
                      <span className="text-sm font-bold text-primary uppercase">{selectedOverviewCliente.nome}</span>
                      <div className="text-xs text-muted mt-1 flex flex-col gap-1">
                          <p><strong>Telefone:</strong> {selectedOverviewCliente.telefone ? maskPhone(selectedOverviewCliente.telefone) : '-'}</p>
                          <p><strong>E-mail:</strong> {selectedOverviewCliente.email || '-'}</p>
                          <p><strong>Passaporte:</strong> {selectedOverviewCliente.passaporte || '-'}</p>
                          <p><strong>Endereço:</strong> {selectedOverviewCliente.endereco} {selectedOverviewCliente.numero}, {selectedOverviewCliente.bairro}</p>
                          <p><strong>Cidade/UF:</strong> {selectedOverviewCliente.cidade}/{selectedOverviewCliente.estado} - {selectedOverviewCliente.cep}</p>
                      </div>
                  </div>
               </div>

               <div className="bg-surface p-5 rounded-xl border border-border shadow-sm flex flex-col gap-3">
                  <h4 className="text-[10px] font-black uppercase text-placeholder tracking-widest flex items-center gap-1"><ShoppingCart size={14}/> Histórico de Compras</h4>
                  <div className="flex flex-col flex-1">
                      {data.vendas && data.vendas.filter((v: any) => v.cliente === selectedOverviewCliente.nome && v.status !== 'Cancelado').length > 0 ? (
                        <div className="space-y-3 mt-2 overflow-y-auto max-h-48 mb-2">
                          {data.vendas.filter((v: any) => v.cliente === selectedOverviewCliente.nome && v.status !== 'Cancelado').map((v: any) => (
                             <div key={v.id} className="text-xs bg-surface-alt p-2 border border-border rounded flex justify-between">
                                 <div>
                                   <strong className="text-white block mb-1">Venda {v.numeroPedido || v.id.slice(0,6)} - {v.tipo}</strong>
                                   {new Date(v.criadoEm).toLocaleDateString('pt-BR')}
                                 </div>
                                 <strong className="text-primary">{formatCurrency(v.valorBruto)}</strong>
                             </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted italic mt-2">Nenhuma compra registrada.</p>
                      )}
                      
                      <div className="mt-auto border-t border-border pt-3">
                         <p className="text-[10px] text-muted uppercase font-medium">Total Gasto</p>
                         <p className="text-xl font-black text-green-600">
                           {formatCurrency(data.vendas?.filter((v: any) => v.cliente === selectedOverviewCliente.nome && v.status !== 'Cancelado').reduce((acc: number, v: any) => acc + (v.valorBruto || 0), 0) || 0)}
                         </p>
                      </div>
                  </div>
               </div>
            </div>
            {selectedOverviewCliente.observacoes && (
              <div className="px-6 pb-6">
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                  <h4 className="text-[10px] font-black uppercase text-orange-400 tracking-widest mb-1 items-center gap-1">Observações</h4>
                  <p className="text-xs text-orange-900/80 whitespace-pre-line">{selectedOverviewCliente.observacoes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
