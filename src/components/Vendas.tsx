import React, { useState, useRef, useMemo } from 'react';

// ── Lista de destinos para autocomplete ──────────────────────────────────────
const DESTINOS_SUGESTOES = [
  // América do Sul
  'Buenos Aires, Argentina','Bariloche, Argentina','Santiago, Chile','Atacama, Chile',
  'Lima, Peru','Machu Picchu, Peru','Cusco, Peru','Cartagena, Colômbia','Bogotá, Colômbia',
  'Montevidéu, Uruguai','Punta del Este, Uruguai','Assunção, Paraguai',
  'Santa Cruz, Bolívia','Salar de Uyuni, Bolívia','Quito, Equador','Galápagos, Equador',
  'Caracas, Venezuela','Rio de Janeiro, Brasil','São Paulo, Brasil','Salvador, Brasil',
  'Fortaleza, Brasil','Recife, Brasil','Manaus, Brasil','Foz do Iguaçu, Brasil',
  'Florianópolis, Brasil','Porto Alegre, Brasil','Brasília, Brasil','Natal, Brasil',
  'Maceió, Brasil','Porto Seguro, Brasil','Bonito, Brasil',
  // América Central e Caribe
  'Cancún, México','Cidade do México, México','Los Cabos, México','Playa del Carmen, México',
  'Havana, Cuba','Punta Cana, República Dominicana','Aruba','Curaçao',
  'San José, Costa Rica','Panamá City, Panamá','Jamaica','Bahamas',
  // América do Norte
  'Nova York, EUA','Miami, EUA','Orlando, EUA','Las Vegas, EUA','Los Angeles, EUA',
  'San Francisco, EUA','Chicago, EUA','Washington D.C., EUA','Boston, EUA',
  'Toronto, Canadá','Vancouver, Canadá','Montreal, Canadá',
  // Europa
  'Lisboa, Portugal','Porto, Portugal','Algarve, Portugal',
  'Madrid, Espanha','Barcelona, Espanha','Sevilha, Espanha','Ibiza, Espanha',
  'Paris, França','Nice, França','Lyon, França',
  'Roma, Itália','Milão, Itália','Veneza, Itália','Florença, Itália','Amalfi, Itália',
  'Londres, Reino Unido','Edimburgo, Reino Unido',
  'Amsterdã, Holanda','Berlim, Alemanha','Munique, Alemanha','Frankfurt, Alemanha',
  'Viena, Áustria','Zurique, Suíça','Genebra, Suíça','Interlaken, Suíça',
  'Praga, República Tcheca','Budapeste, Hungria','Varsóvia, Polônia',
  'Atenas, Grécia','Santorini, Grécia','Mykonos, Grécia','Creta, Grécia',
  'Istambul, Turquia','Antalya, Turquia',
  'Moscou, Rússia','São Petersburgo, Rússia',
  'Estocolmo, Suécia','Oslo, Noruega','Copenhague, Dinamarca','Helsínque, Finlândia',
  'Dublin, Irlanda','Bruxelas, Bélgica',
  // Oriente Médio e África
  'Dubai, Emirados Árabes','Abu Dhabi, Emirados Árabes',
  'Doha, Catar','Tel Aviv, Israel','Jerusalém, Israel',
  'Cairo, Egito','Marrakech, Marrocos','Cidade do Cabo, África do Sul',
  // Ásia e Oceania
  'Tóquio, Japão','Osaka, Japão','Kyoto, Japão',
  'Seul, Coreia do Sul','Pequim, China','Xangai, China','Hong Kong',
  'Cingapura','Bangkok, Tailândia','Phuket, Tailândia','Bali, Indonésia',
  'Kuala Lumpur, Malásia','Manila, Filipinas','Mumbai, Índia','Nova Déli, Índia',
  'Maldivas','Sri Lanka',
  'Sydney, Austrália','Melbourne, Austrália','Auckland, Nova Zelândia',
];
import { formatCurrency, maskCpfCnpj, generateId, parseMonetaryValue, formatMonetaryInput, calcularStatusViagem } from '../utils';
import { PlusCircle, Search, Trash2, Edit, XCircle, X, Filter, ShoppingCart, BedDouble, Users, CheckSquare, Square, Shield, Car, Paperclip, FileUp, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../toast';
import { addDays } from 'date-fns';
import { VendaOverviewModal } from './VendaOverviewModal';
import { extractTextFromPdf, extractReservationData } from '../lib/extractPdf';
import type { Lead, HospedagemItem } from '../types';

// Badge automático de status da viagem (derivado das datas dos produtos)
function StatusViagemBadge({ status }: { status: 'Em breve' | 'Em andamento' | 'Concluído' | null }) {
  if (!status) return <span className="text-[10px] text-placeholder font-medium uppercase tracking-wider">Sem data</span>;
  const cfg: Record<string, string> = {
    'Em breve':      'bg-sky-900/30 text-sky-400 border border-sky-700',
    'Em andamento':  'bg-emerald-900/30 text-emerald-400 border border-emerald-700',
    'Concluído':     'bg-surface-alt text-muted border border-border',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-black tracking-wider leading-none whitespace-nowrap ${cfg[status]}`}>
      {status}
    </span>
  );
}

export function Vendas({ data, updateData, setActiveTab }: any) {
  const [activeSection, setActiveSection] = useState<'vendas' | 'leads'>('vendas');
  const [pdfLoading, setPdfLoading] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPdfLoading(true);
    try {
      const text = await extractTextFromPdf(file);
      if (!text.trim()) { toast('Não foi possível extrair texto deste PDF.', 'error'); return; }
      const dados = await extractReservationData(text);

      // Preenche os campos do formulário com os dados extraídos
      setFormData((prev: any) => ({
        ...prev,
        ...(dados.cliente   && { cliente: dados.cliente }),
        ...(dados.tipo      && { tipo: dados.tipo }),
        ...(dados.valorBruto && { valorBruto: formatMonetaryInput(String(dados.valorBruto)) }),
        ...(dados.numeroPedido && { numeroPedido: dados.numeroPedido }),
        ...(dados.observacoes  && { observacoes: dados.observacoes }),
        // Se vier voo, pré-preenche o voosList
        ...(dados.voo && {
          incluirVoo: true,
          voosList: [{
            id: generateId(),
            ciaAerea:     dados.voo.ciaAerea     || '',
            numeroVoo:    dados.voo.numeroVoo     || '',
            origem:       dados.voo.origem        || '',
            destino:      dados.voo.destino       || '',
            dataPartida:  dados.voo.dataPartida   || '',
            dataChegada:  dados.voo.dataChegada   || '',
            localizador:  dados.voo.localizador   || '',
            passageiros:  dados.voo.passageiros   || '',
            formaEmissao: dados.voo.formaEmissao  || 'Tarifa Pagante',
            fornecedor:   '',
          }],
        }),
        // Se vier hospedagem, pré-preenche
        ...(dados.hospedagem && {
          hospedagens: [{
            id: generateId(),
            nome:            dados.hospedagem.nome       || '',
            checkIn:         dados.hospedagem.checkIn    || '',
            checkOut:        dados.hospedagem.checkOut   || '',
            cidade:          dados.hospedagem.cidade     || '',
            voucher:         dados.hospedagem.voucher    || '',
            tipoQuarto:      dados.hospedagem.tipoQuarto || '',
            plataforma:      'Direto',
            regimeAlimentar: 'Café da Manhã',
            quartos:         1,
            observacoes:     '',
          }],
        }),
      }));

      toast('Dados extraídos com sucesso! Revise antes de salvar.', 'info');
      setIsFormOpen(true);
    } catch (err: any) {
      toast(`Erro ao processar PDF: ${err.message}`, 'error');
    } finally {
      setPdfLoading(false);
    }
  };
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOverviewVenda, setSelectedOverviewVenda] = useState<any>(null);
  
  const [sortCol, setSortCol] = useState('dataPartida');
  const [sortAsc, setSortAsc] = useState(true);
  
  const [vendaToDelete, setVendaToDelete] = useState<string | null>(null);
  const [vendaToCancel, setVendaToCancel] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const initialVoo = {
    id: generateId(),
    ciaAerea: '',
    numeroVoo: '',
    origem: '',
    destino: '',
    dataPartida: '',
    passageiros: '',
    localizador: '',
    formaEmissao: 'Milhas',
    fornecedor: ''
  };

  const initForm = () => ({
    cliente: '',
    tipo: 'Passagem Aérea',
    dataVenda: new Date().toISOString().substring(0, 10),
    valorBruto: '',
    comissao: '',
    formaPagamento: 'Boleto',
    numeroPedido: '',
    status: 'Em aberto',
    observacoes: '',
    
    modoLucro: 'Comissao',
    custo: '',
    fornecedorCusto: '',
    fornecedoresCustoList: [{ id: generateId(), fornecedor: '', valor: '' }],

    incluirVoo: false,
    tipoViagem: 'Ida', // Ida, Ida e Volta, Multi-destinos
    voosList: [{ ...initialVoo }],
    mesmasInformacoesEmissao: true,

    receberVencimento: addDays(new Date(), 30).toISOString().substring(0, 10),

    incluirPagar: false,
    pagarList: [{ id: generateId(), fornecedor: '', valor: '', vencimento: addDays(new Date(), 15).toISOString().substring(0, 10) }],

    incluirHospedagem: false,
    hospedagens: [{ id: generateId(), nome: '', plataforma: 'Booking.com', voucher: '', checkIn: '', checkOut: '', quartos: 1, tipoQuarto: 'Standard', regimeAlimentar: 'Café da Manhã', cidade: '', observacoes: '' }],

    // Passageiros
    passageiros: [] as { pessoaId: string; nome: string }[],
    passageirosSearch: '',

    // Destinos
    destinos: [] as string[],
    destinoInput: '',

    // Tarefas
    tarefas: [] as { id: string; titulo: string; feita: boolean; prazo?: string; criadoEm: string }[],
    novaTarefa: '',
    novaTarefaPrazo: '',

    // Seguro
    incluirSeguro: false,
    seguro: { seguradora: '', apolice: '', cobertura: '', validade: '', valor: '' },

    // Aluguel de Carro
    incluirAluguel: false,
    aluguel: { empresa: '', voucher: '', modelo: '', retiradaLocal: '', retiradaData: '', devolucaoLocal: '', devolucaoData: '', observacoes: '' },

    // Documentos (gerenciados direto na venda salva)
    documentos: [] as any[],
  });

  const [formData, setFormData] = useState(initForm());

  const fornecedoresViagem = (data.pessoas || []).filter((p: any) => p.tipo?.includes('Fornecedor') && p.isFornecedorViagem);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const vendaId = editingId || generateId();
    const valorBruto = parseMonetaryValue(formData.valorBruto);
    const calculatedCustoList = formData.modoLucro === 'Custo' ? formData.fornecedoresCustoList.map(fc => parseMonetaryValue(fc.valor)).reduce((acc, curr) => acc + curr, 0) : 0;
    const custo = formData.modoLucro === 'Custo' ? calculatedCustoList : 0;
    const comissao = formData.modoLucro === 'Custo' ? valorBruto - custo : parseMonetaryValue(formData.comissao);

    const novaVenda = {
      ...(data.vendas?.find((v:any) => v.id === vendaId) || {}),
      cliente: formData.cliente,
      tipo: formData.tipo,
      valorBruto: valorBruto,
      comissao: comissao,
      modoLucro: formData.modoLucro as 'Comissao' | 'Custo',
      custo: custo,
      fornecedorCusto: formData.modoLucro === 'Custo' ? formData.fornecedoresCustoList.map(fc => fc.fornecedor).filter(Boolean).join(', ') : '',
      fornecedoresCustoList: formData.modoLucro === 'Custo' ? formData.fornecedoresCustoList.map(fc => ({...fc, valor: parseMonetaryValue(fc.valor)})) : [],
      formaPagamento: formData.formaPagamento,
      numeroPedido: formData.numeroPedido,
      status: formData.status,
      observacoes: formData.observacoes,
      id: vendaId,
      criadoEm: formData.dataVenda ? new Date(formData.dataVenda + 'T12:00:00Z').toISOString() : new Date().toISOString(),
      statusP: editingId ? data.vendas.find((v:any) => v.id === vendaId)?.statusP : false,
      statusR: editingId ? data.vendas.find((v:any) => v.id === vendaId)?.statusR : false,
      statusV: editingId ? data.vendas.find((v:any) => v.id === vendaId)?.statusV : false,
      hospedagens: formData.incluirHospedagem ? formData.hospedagens.filter((h: any) => h.nome) : [],
      passageiros: formData.passageiros || [],
      destinos: formData.destinos || [],
      tarefas: formData.tarefas || [],
      seguro: formData.incluirSeguro && formData.seguro.seguradora ? { ...formData.seguro, valor: formData.seguro.valor ? parseMonetaryValue(formData.seguro.valor) : 0 } : undefined,
      aluguel: formData.incluirAluguel && formData.aluguel.empresa ? { ...formData.aluguel } : undefined,
      documentos: formData.documentos || [],
    };
    
    // Voos
    let novosVoos: any[] = [];
    if ((formData.tipo === 'Passagem Aérea' || formData.tipo === 'Pacote') && formData.incluirVoo) {
      novosVoos = formData.voosList.map((voo, idx) => ({
        id: voo.id,
        vendaId,
        ciaAerea: voo.ciaAerea,
        numeroVoo: voo.numeroVoo,
        origem: voo.origem,
        destino: voo.destino,
        dataPartida: voo.dataPartida,
        dataChegada: voo.dataPartida, // Simplificado
        localizador: voo.localizador,
        passageiros: voo.passageiros,
        checkInDisponivel: voo.dataPartida,
        tipoVoo: 'Nacional',
        status: 'Emitido',
        formaEmissao: voo.formaEmissao,
        fornecedor: voo.fornecedor
      }));
    }

    // A Receber
    const prevReceber = editingId ? data.contasReceber.find((cr:any) => cr.vendaId === vendaId) : null;
    const novoAReceber = {
      id: prevReceber?.id || generateId(),
      vendaId,
      cliente: formData.cliente,
      valor: valorBruto,
      vencimento: formData.receberVencimento,
      status: prevReceber?.status || 'Pendente',
      criadoEm: prevReceber?.criadoEm || novaVenda.criadoEm || new Date().toISOString(),
    };

    // A Pagar
    const prevPagarList = editingId ? data.contasPagar.filter((cp:any) => cp.vendaId === vendaId) : [];
    let novosAPagar: any[] = [];
    if (formData.incluirPagar) {
       novosAPagar = formData.pagarList.filter((p: any) => parseMonetaryValue(p.valor) && p.fornecedor).map((p: any) => {
         const prev = prevPagarList.find((op: any) => op.id === p.id);
         return {
           id: prev ? prev.id : (p.id || generateId()),
           vendaId,
           fornecedor: p.fornecedor,
           categoria: formData.tipo === 'Passagem Aérea' ? 'Passagem' : (formData.tipo === 'Hotel' ? 'Hospedagem' : 'Serviços'),
           valor: parseMonetaryValue(p.valor),
           vencimento: p.vencimento,
           status: prev ? prev.status : 'Pendente',
           criadoEm: prev?.criadoEm || novaVenda.criadoEm || new Date().toISOString(),
         };
       });
    }

    // Save
    let updatedVendas = [...(data.vendas || [])];
    let updatedVoos = [...(data.voos || [])];
    let updatedReceber = [...(data.contasReceber || [])];
    let updatedPagar = [...(data.contasPagar || [])];

    if (editingId) {
      updatedVendas = updatedVendas.map((v: any) => v.id === vendaId ? novaVenda : v);
      updatedVoos = updatedVoos.filter((v: any) => v.vendaId !== vendaId).concat(novosVoos);
      updatedReceber = updatedReceber.filter((r: any) => r.vendaId !== vendaId).concat([novoAReceber]);
      updatedPagar = updatedPagar.filter((p: any) => p.vendaId !== vendaId).concat(novosAPagar);
    } else {
      updatedVendas = [novaVenda, ...updatedVendas];
      updatedVoos = [...novosVoos, ...updatedVoos];
      updatedReceber = [novoAReceber, ...updatedReceber];
      updatedPagar = [...novosAPagar, ...updatedPagar];
    }

    updateData({
      vendas: updatedVendas,
      voos: updatedVoos,
      contasReceber: updatedReceber,
      contasPagar: updatedPagar,
    });
    
    setIsFormOpen(false);
    setEditingId(null);
    setFormData(initForm());
    toast(editingId ? 'Venda atualizada com sucesso!' : 'Venda registrada com sucesso!');
  };

  const handleEdit = (venda: any) => {
     // Load Venda into formData
     const voos = data.voos.filter((v:any) => v.vendaId === venda.id);
     const receber = data.contasReceber.find((c:any) => c.vendaId === venda.id);
     const pagar = data.contasPagar.filter((c:any) => c.vendaId === venda.id);

     const loadedVoos = voos.length > 0 ? voos : [{...initialVoo}];
     const sameEmissao = loadedVoos.length > 0 && loadedVoos.every((v: any) => v.fornecedor === loadedVoos[0].fornecedor && v.formaEmissao === loadedVoos[0].formaEmissao);
     
     setFormData({
       cliente: venda.cliente || '',
       tipo: venda.tipo || 'Passagem Aérea',
       dataVenda: venda.criadoEm ? venda.criadoEm.substring(0, 10) : new Date().toISOString().substring(0, 10),
       valorBruto: venda.valorBruto ? formatMonetaryInput(venda.valorBruto) : '',
       comissao: venda.comissao ? formatMonetaryInput(venda.comissao) : '',
       formaPagamento: venda.formaPagamento || 'Boleto',
       numeroPedido: venda.numeroPedido || '',
       status: venda.status || 'Em aberto',
       observacoes: venda.observacoes || '',
       
       modoLucro: venda.modoLucro || 'Comissao',
       custo: venda.custo ? formatMonetaryInput(venda.custo) : '',
       fornecedorCusto: venda.fornecedorCusto || '',
       fornecedoresCustoList: venda.fornecedoresCustoList && venda.fornecedoresCustoList.length > 0 ? venda.fornecedoresCustoList.map((fc: any) => ({...fc, valor: formatMonetaryInput(fc.valor)})) : [{ id: generateId(), fornecedor: '', valor: '' }],

       incluirVoo: voos.length > 0,
       tipoViagem: voos.length > 1 ? (voos.length === 2 ? 'Ida e Volta' : 'Multi-destinos') : 'Ida',
       voosList: loadedVoos,
       mesmasInformacoesEmissao: sameEmissao,

       receberVencimento: receber ? receber.vencimento : addDays(new Date(), 30).toISOString().substring(0, 10),

       incluirPagar: pagar.length > 0,
       pagarList: pagar.length > 0 ? pagar.map((p: any) => ({ id: p.id, fornecedor: p.fornecedor, valor: formatMonetaryInput(p.valor), vencimento: p.vencimento })) : [{ id: generateId(), fornecedor: '', valor: '', vencimento: addDays(new Date(), 15).toISOString().substring(0, 10) }],

       incluirHospedagem: (venda.hospedagens || []).length > 0,
       hospedagens: (venda.hospedagens || []).length > 0 ? venda.hospedagens : [{ id: generateId(), nome: '', plataforma: 'Booking.com', voucher: '', checkIn: '', checkOut: '', quartos: 1, tipoQuarto: 'Standard', regimeAlimentar: 'Café da Manhã', cidade: '', observacoes: '' }],

       passageiros: venda.passageiros || [],
       passageirosSearch: '',
       destinos: venda.destinos || [],
       destinoInput: '',
       tarefas: venda.tarefas || [],
       novaTarefa: '',
       novaTarefaPrazo: '',
       incluirSeguro: !!(venda.seguro?.seguradora),
       seguro: venda.seguro ? { ...venda.seguro, valor: venda.seguro.valor ? formatMonetaryInput(venda.seguro.valor) : '' } : { seguradora: '', apolice: '', cobertura: '', validade: '', valor: '' },
       incluirAluguel: !!(venda.aluguel?.empresa),
       aluguel: venda.aluguel || { empresa: '', voucher: '', modelo: '', retiradaLocal: '', retiradaData: '', devolucaoLocal: '', devolucaoData: '', observacoes: '' },
       documentos: venda.documentos || [],
     });
     setEditingId(venda.id);
     setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
      setVendaToDelete(id);
  };

  const confirmDelete = () => {
      if (!vendaToDelete) return;
      updateData({
        vendas: data.vendas.filter((v: any) => v.id !== vendaToDelete),
        voos: data.voos.filter((v: any) => v.vendaId !== vendaToDelete),
        contasReceber: data.contasReceber.filter((c: any) => c.vendaId !== vendaToDelete),
        contasPagar: data.contasPagar.filter((c: any) => c.vendaId !== vendaToDelete)
      });
      setVendaToDelete(null);
  };

  const handleCancel = (id: string) => {
      setVendaToCancel(id);
  };

  const confirmCancel = () => {
      if (!vendaToCancel) return;
      updateData({
        vendas: data.vendas.map((v: any) => v.id === vendaToCancel ? {...v, status: 'Cancelado'} : v),
        contasReceber: data.contasReceber.map((c: any) => c.vendaId === vendaToCancel && c.status === 'Pendente' ? {...c, status: 'Cancelado'} : c)
      });
      setVendaToCancel(null);
  };

  const searchFilter = (v: any) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      v.cliente?.toLowerCase().includes(s) ||
      v.tipo?.toLowerCase().includes(s) ||
      v.numeroPedido?.toLowerCase().includes(s) ||
      v.status?.toLowerCase().includes(s)
    );
  };

  // Status da viagem é derivado das datas dos produtos (voos, hospedagem, seguro, aluguel)
  const statusViagemDe = (v: any) => calcularStatusViagem(v, data.voos.filter((vo: any) => vo.vendaId === v.id));

  const vendasAtivasBase = data.vendas.filter((v: any) => statusViagemDe(v) !== 'Concluído');
  const vendasAtivas = [...vendasAtivasBase].filter(searchFilter).sort((a: any, b: any) => {
    let valA = a[sortCol];
    let valB = b[sortCol];
    
    if (sortCol === 'dataPartida') {
        const vooA = data.voos.find((vo: any) => vo.vendaId === a.id);
        const vooB = data.voos.find((vo: any) => vo.vendaId === b.id);
        valA = vooA?.dataPartida || a.criadoEm || '9999-12-31';
        valB = vooB?.dataPartida || b.criadoEm || '9999-12-31';
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const vendasAnterioresBase = data.vendas.filter((v: any) => statusViagemDe(v) === 'Concluído');
  const vendasAnteriores = [...vendasAnterioresBase].filter(searchFilter).sort((a: any, b: any) => {
    let valA = a[sortCol];
    let valB = b[sortCol];
    
    if (sortCol === 'dataPartida') {
        const vooA = data.voos.find((vo: any) => vo.vendaId === a.id);
        const vooB = data.voos.find((vo: any) => vo.vendaId === b.id);
        valA = vooA?.dataPartida || a.criadoEm || '9999-12-31';
        valB = vooB?.dataPartida || b.criadoEm || '9999-12-31';
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const toggleSort = (col: string) => {
      if (sortCol === col) {
          setSortAsc(!sortAsc);
      } else {
          setSortCol(col);
          setSortAsc(true);
      }
  };

  const handleConvertLead = (lead: Lead) => {
    setActiveSection('vendas');
    setFormData({ ...initForm(), cliente: lead.nome });
    setEditingId(null);
    setIsFormOpen(true);
    toast(`Lead "${lead.nome}" carregado no formulário de venda.`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Funil de Leads temporariamente desativado — preservado para implementação futura */}

      {true && <>
      <div className="flex justify-end">
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-[#1D9E75] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:brightness-110 uppercase flex items-center gap-2"
        >
          <PlusCircle size={18} /> Nova Venda
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-alt sticky top-0 z-10 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <PlusCircle size={20} className="text-[#1D9E75]" />
                  {editingId ? 'Editar Venda / Embarque' : 'Nova Venda / Embarque'}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Botão IA — importar PDF */}
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleImportPdf}
                />
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={pdfLoading}
                  title="Importar dados de um PDF de reserva via IA"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #FF2D74, #8B5CF6)', boxShadow: '0 4px 14px rgba(255,45,116,.35)' }}
                >
                  {pdfLoading
                    ? <><Loader2 size={15} className="animate-spin" /> Lendo PDF...</>
                    : <><Sparkles size={15} /> Importar PDF com IA</>}
                </button>
                <button onClick={() => { setIsFormOpen(false); setEditingId(null); setFormData(initForm()); }} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                  <X size={20} className="text-muted" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Cliente</label>
                  <select required className="w-full border border-border-hover rounded-md p-2" 
                    value={formData.cliente} onChange={e => setFormData({...formData, cliente: e.target.value})}>
                    <option value="">Selecione um cliente...</option>
                {(data.pessoas || []).filter((p: any) => p.tipo?.includes('Cliente')).map((p: any) => (
                  <option key={p.id} value={p.nome}>{p.nome}{p.documento ? ` - ${p.documento}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Data da Venda</label>
              <input required type="date" className="w-full border border-border-hover rounded-md p-2" 
                value={formData.dataVenda} onChange={e => setFormData({...formData, dataVenda: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Tipo de Venda</label>
              <select className="w-full border border-border-hover rounded-md p-2" 
                value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                <option>Passagem Aérea</option>
                <option>Hotel</option>
                <option>Pacote</option>
                <option>Locação de Veículo</option>
                <option>Serviço Corporativo</option>
                <option>Seguro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Valor Bruto (R$)</label>
              <input required type="text" className="w-full border border-border-hover rounded-md p-2" 
                value={formData.valorBruto} 
                onChange={e => {
                  const val = e.target.value;
                  setFormData({...formData, valorBruto: val})
                }} 
                onBlur={e => {
                  const val = e.target.value;
                  const valorNum = parseMonetaryValue(val);
                  setFormData({...formData, valorBruto: formatMonetaryInput(val), comissao: formatMonetaryInput(valorNum * 0.1)})
                }} />
            </div>
            <div className="md:col-span-2 xl:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-border rounded-lg bg-surface-alt">
               <div className="md:col-span-4">
                  <label className="flex items-center space-x-3 text-sm font-medium text-primary cursor-pointer">
                    <span className="font-bold text-white">Como calcular o lucro?</span>
                    <select className="border border-border-hover rounded-md p-1.5" value={formData.modoLucro} onChange={e => setFormData({...formData, modoLucro: e.target.value})}>
                      <option value="Comissao">Lançar Comissão R$</option>
                      <option value="Custo">Lançar Custo de Fornecedor</option>
                    </select>
                  </label>
               </div>
               
               {formData.modoLucro === 'Comissao' ? (
                  <div className="md:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-muted mb-1">Comissão de Lucro (R$)</label>
                    <input required type="text" className="w-full border border-border-hover rounded-md p-2" 
                      value={formData.comissao} onChange={e => setFormData({...formData, comissao: e.target.value})} onBlur={e => setFormData({...formData, comissao: formatMonetaryInput(e.target.value)})} />
                  </div>
               ) : (
                  <div className="md:col-span-4 lg:col-span-2 space-y-3">
                     {formData.fornecedoresCustoList.map((fc: any, idx: number) => (
                        <div key={fc.id} className="grid grid-cols-2 gap-3 relative pb-2 border-b border-gray-100 last:border-0">
                           {formData.fornecedoresCustoList.length > 1 && (
                             <button type="button" onClick={() => {
                                 const list = [...formData.fornecedoresCustoList];
                                 list.splice(idx, 1);
                                 setFormData({...formData, fornecedoresCustoList: list});
                             }} className="absolute top-8 -right-6 text-red-500 hover:text-red-700">
                                <X size={16}/>
                             </button>
                           )}
                           <div>
                             <label className="block text-sm font-medium text-muted mb-1">Fornecedor {idx + 1}</label>
                             <select required className="w-full border border-border-hover rounded-md p-2" 
                               value={fc.fornecedor} onChange={e => {
                                 const list = [...formData.fornecedoresCustoList];
                                 list[idx].fornecedor = e.target.value;
                                 setFormData({...formData, fornecedoresCustoList: list});
                               }}>
                               <option value="">Selecione...</option>
                               {(data.pessoas || []).filter((p: any) => p.tipo?.includes('Fornecedor')).map((p: any) => (
                                 <option key={p.id} value={p.nome}>{p.nome}</option>
                               ))}
                             </select>
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-muted mb-1">Custo (R$)</label>
                             <input required type="text" className="w-full border border-border-hover rounded-md p-2 pl-2" 
                               value={fc.valor} onChange={e => {
                                 const list = [...formData.fornecedoresCustoList];
                                 list[idx].valor = e.target.value;
                                 setFormData({...formData, fornecedoresCustoList: list});
                               }} onBlur={e => {
                                 const list = [...formData.fornecedoresCustoList];
                                 list[idx].valor = formatMonetaryInput(e.target.value);
                                 setFormData({...formData, fornecedoresCustoList: list});
                               }} />
                           </div>
                        </div>
                     ))}
                     <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                         <button type="button" onClick={() => {
                             setFormData({...formData, fornecedoresCustoList: [...formData.fornecedoresCustoList, { id: generateId(), fornecedor: '', valor: ''}]});
                         }} className="text-[#1D9E75] text-xs font-bold hover:brightness-110 flex items-center gap-1 uppercase tracking-wider">
                             <PlusCircle size={16}/> Adicionar custo
                         </button>
                         <p className="text-sm font-bold text-emerald-400 bg-emerald-900/30 px-3 py-1 rounded">Lucro Calculado: {formatCurrency(parseMonetaryValue(formData.valorBruto || 0) - formData.fornecedoresCustoList.reduce((acc: number, curr: any) => acc + parseMonetaryValue(curr.valor), 0))}</p>
                     </div>
                  </div>
               )}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Forma Pagamento</label>
              <select className="w-full border border-border-hover rounded-md p-2" 
                value={formData.formaPagamento} onChange={e => setFormData({...formData, formaPagamento: e.target.value})}>
                <option>Cartão</option>
                <option>Boleto</option>
                <option>PIX</option>
                <option>Faturado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Nº OS/Pedido</label>
              <input type="text" className="w-full border border-border-hover rounded-md p-2" 
                value={formData.numeroPedido} onChange={e => setFormData({...formData, numeroPedido: e.target.value})} />
            </div>
            <div className="md:col-span-2 xl:col-span-4">
              <label className="block text-sm font-medium text-muted mb-1">Observações</label>
              <textarea className="w-full border border-border-hover rounded-md p-2" 
                value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})} />
            </div>

            {/* Integrações Expandidas */}
            <div className="md:col-span-2 xl:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-alt p-4 rounded-lg border border-border mt-2">
              
              {/* Contas a Receber */}
              <div className="space-y-3">
                 <h5 className="font-bold text-white uppercase tracking-wider text-sm border-b border-border pb-2">Contas a Receber (Automático)</h5>
                 <div>
                    <label className="block text-sm font-medium text-muted mb-1">Vencimento (Agendamento)</label>
                    <input required type="date" className="w-full border border-border-hover rounded-md p-2 text-sm" 
                      value={formData.receberVencimento} onChange={e => setFormData({...formData, receberVencimento: e.target.value})} />
                 </div>
              </div>

              {/* Contas a Pagar */}
              <div className="space-y-3">
                 <div className="flex items-center space-x-2 border-b border-border pb-2">
                    <input type="checkbox" className="rounded border-border-hover text-white focus:ring-[#1F2220]" 
                       checked={formData.incluirPagar} onChange={(e) => setFormData({...formData, incluirPagar: e.target.checked})} />
                    <h5 className="font-bold text-white uppercase tracking-wider text-sm">Contas a Pagar</h5>
                 </div>
                 
                 {formData.incluirPagar && (
                   <div className="space-y-4">
                     {formData.pagarList.map((pagarItem: any, idx: number) => (
                       <div key={pagarItem.id} className="grid grid-cols-2 gap-3 relative bg-surface-alt p-3 rounded border border-border">
                          {formData.pagarList.length > 1 && (
                            <button type="button" onClick={() => {
                                const list = [...formData.pagarList];
                                list.splice(idx, 1);
                                setFormData({...formData, pagarList: list});
                            }} className="absolute top-2 right-2 text-red-500 hover:text-red-700">
                               <X size={16}/>
                            </button>
                          )}
                          <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-muted uppercase">Fornecedor {idx + 1}</label>
                            <select required className="w-full border border-border-hover rounded text-sm p-1.5" 
                               value={pagarItem.fornecedor} onChange={e => {
                                 const list = [...formData.pagarList];
                                 list[idx].fornecedor = e.target.value;
                                 setFormData({...formData, pagarList: list});
                               }}>
                              <option value="">Selecione...</option>
                              {(data.pessoas || []).filter((p: any) => p.tipo?.includes('Fornecedor')).map((p: any) => (
                                <option key={p.id} value={p.nome}>{p.nome}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-muted uppercase">Valor R$ (Custo Líc.)</label>
                             <input required type="text" className="w-full border border-border-hover rounded text-sm p-1.5" 
                                value={pagarItem.valor} onChange={e => {
                                 const list = [...formData.pagarList];
                                 list[idx].valor = e.target.value;
                                 setFormData({...formData, pagarList: list});
                               }} onBlur={e => {
                                 const list = [...formData.pagarList];
                                 list[idx].valor = formatMonetaryInput(e.target.value);
                                 setFormData({...formData, pagarList: list});
                               }} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-muted uppercase">Vencimento</label>
                             <input required type="date" className="w-full border border-border-hover rounded text-sm p-1.5" 
                                value={pagarItem.vencimento} onChange={e => {
                                 const list = [...formData.pagarList];
                                 list[idx].vencimento = e.target.value;
                                 setFormData({...formData, pagarList: list});
                               }} />
                          </div>
                       </div>
                     ))}
                     <button type="button" onClick={() => {
                         setFormData({...formData, pagarList: [...formData.pagarList, { id: generateId(), fornecedor: '', valor: '', vencimento: addDays(new Date(), 15).toISOString().substring(0, 10)}]});
                     }} className="text-[#1D9E75] text-xs font-bold hover:brightness-110 flex items-center gap-1 uppercase tracking-wider">
                         <PlusCircle size={16}/> Adicionar outro fornecedor
                     </button>
                   </div>
                 )}
              </div>

              {/* ── Destinos ── mostrar para Passagem Aérea, Hotel, Pacote */}
              {['Passagem Aérea', 'Hotel', 'Pacote'].includes(formData.tipo) && (
                <div className="col-span-1 md:col-span-2 border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                      🌍 Destinos
                    </h5>
                    <span className="text-[10px] text-placeholder">Usado no Dashboard como referência</span>
                  </div>
                  {/* Input com autocomplete */}
                  {(() => {
                    const q = (formData.destinoInput || '').trim().toLowerCase();
                    const sugestoes = q.length >= 2
                      ? DESTINOS_SUGESTOES.filter(d =>
                          d.toLowerCase().includes(q) &&
                          !(formData.destinos || []).includes(d)
                        ).slice(0, 8)
                      : [];
                    const addDestino = (val: string) => {
                      const novo = val.trim();
                      if (novo && !(formData.destinos || []).includes(novo)) {
                        setFormData({...formData, destinos: [...(formData.destinos || []), novo], destinoInput: ''});
                      }
                    };
                    return (
                      <div className="relative flex gap-2 mb-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Ex: Paris, França / Cancún / Lisboa..."
                            className="w-full border border-border-hover rounded text-sm p-1.5"
                            value={formData.destinoInput || ''}
                            onChange={e => setFormData({...formData, destinoInput: e.target.value})}
                            onKeyDown={e => {
                              if ((e.key === 'Enter' || e.key === ',') && formData.destinoInput?.trim()) {
                                e.preventDefault();
                                addDestino(formData.destinoInput.replace(/,$/, ''));
                              }
                            }}
                            autoComplete="off"
                          />
                          {sugestoes.length > 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                              {sugestoes.map(s => (
                                <button
                                  key={s}
                                  type="button"
                                  onMouseDown={e => { e.preventDefault(); addDestino(s); }}
                                  className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-surface-alt flex items-center gap-2 border-b border-border last:border-0">
                                  🌍 {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button type="button"
                          onClick={() => addDestino(formData.destinoInput || '')}
                          className="px-3 py-1.5 bg-[#1D9E75] text-white rounded text-xs font-bold hover:brightness-110 shrink-0">
                          + Adicionar
                        </button>
                      </div>
                    );
                  })()}
                  <div className="flex flex-wrap gap-1.5">
                    {(formData.destinos || []).map((d: string) => (
                      <span key={d} className="flex items-center gap-1 bg-surface-raised border border-border text-xs text-primary px-2 py-1 rounded-full">
                        {d}
                        <button type="button" onClick={() => setFormData({...formData, destinos: (formData.destinos || []).filter((x: string) => x !== d)})}
                          className="text-muted hover:text-red-400 ml-0.5">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                    {(formData.destinos || []).length === 0 && (
                      <span className="text-xs text-placeholder">Nenhum destino adicionado. Digite e pressione Enter.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Componentes do Pacote */}
              {formData.tipo === 'Pacote' && (
                <div className="col-span-1 md:col-span-2 mt-2 border-t border-border pt-4">
                  <h5 className="font-black text-white uppercase tracking-wider text-sm mb-3 flex items-center gap-2">
                    <span className="text-[#C084FC]">📦</span> Componentes do Pacote
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'incluirVoo',        label: 'Passagem Aérea', icon: '✈️' },
                      { key: 'incluirHospedagem', label: 'Hospedagem',     icon: '🏨' },
                      { key: 'incluirSeguro',     label: 'Seguro Viagem',  icon: '🛡️' },
                      { key: 'incluirAluguel',    label: 'Aluguel de Carro', icon: '🚗' },
                    ].map(({ key, label, icon }) => (
                      <label key={key} className={`flex items-center gap-2 cursor-pointer p-3 rounded-xl border transition-all select-none
                        ${(formData as any)[key]
                          ? 'border-[#C084FC] bg-purple-900/20 text-white'
                          : 'border-border bg-surface-alt text-muted hover:border-border-hover'}`}>
                        <input type="checkbox" className="hidden"
                          checked={(formData as any)[key]}
                          onChange={e => setFormData({ ...formData, [key]: e.target.checked })} />
                        <span className="text-base">{icon}</span>
                        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Voos Emissao */}
              {(formData.tipo === 'Passagem Aérea' || formData.tipo === 'Pacote') && (
                <div className="col-span-1 md:col-span-2 space-y-3 mt-2 border-t border-border pt-4">
                  <div className="flex items-center space-x-2 border-b border-border pb-2">
                      {formData.tipo !== 'Pacote' && <input type="checkbox" className="rounded border-border-hover text-white focus:ring-[#1F2220]"
                        checked={formData.incluirVoo} onChange={(e) => setFormData({...formData, incluirVoo: e.target.checked})} />}
                      <h5 className="font-bold text-white uppercase tracking-wider text-sm">Emitir Voo / Detalhes de Embarque</h5>
                  </div>
                  
                  {formData.incluirVoo && (
                    <div className="space-y-4">
                      <div className="flex space-x-4 border-b border-border pb-2">
                         <label className="flex items-center space-x-2 text-sm font-medium text-primary cursor-pointer">
                           <input type="radio" value="Ida" checked={formData.tipoViagem === 'Ida'} 
                             onChange={() => setFormData({...formData, tipoViagem: 'Ida', voosList: [formData.voosList[0]]})} name="tipoViagem" />
                           <span>Somente Ida</span>
                         </label>
                         <label className="flex items-center space-x-2 text-sm font-medium text-primary cursor-pointer">
                           <input type="radio" value="Ida e Volta" checked={formData.tipoViagem === 'Ida e Volta'} 
                             onChange={() => setFormData({...formData, tipoViagem: 'Ida e Volta', voosList: [formData.voosList[0], formData.voosList[1] || {...initialVoo, id: generateId()}]})} name="tipoViagem" />
                           <span>Ida e Volta</span>
                         </label>
                         <label className="flex items-center space-x-2 text-sm font-medium text-primary cursor-pointer">
                           <input type="radio" value="Multi-destinos" checked={formData.tipoViagem === 'Multi-destinos'} 
                             onChange={() => setFormData({...formData, tipoViagem: 'Multi-destinos'})} name="tipoViagem" />
                           <span>Multi-destinos</span>
                         </label>
                      </div>

                      {formData.voosList.map((voo, idx) => (
                        <div key={voo.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-surface border border-border rounded-lg relative">
                            {formData.tipoViagem === 'Multi-destinos' && formData.voosList.length > 1 && (
                                <button type="button" onClick={() => {
                                  const newVoos = [...formData.voosList];
                                  newVoos.splice(idx, 1);
                                  setFormData({...formData, voosList: newVoos});
                                }} className="absolute top-2 right-2 text-red-500 hover:scale-110 tooltip" title="Remover Voo">
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <div className="col-span-full">
                               <h6 className="text-[11px] font-black uppercase text-white mb-1">
                                  {formData.tipoViagem === 'Ida' ? 'Trecho Único' : (formData.tipoViagem === 'Ida e Volta' ? (idx === 0 ? 'Ida' : 'Volta') : `Trecho ${idx + 1}`)}
                               </h6>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-bold text-muted uppercase mb-1">Passageiros</label>
                              {/* Tags dos selecionados */}
                              <div className="flex flex-wrap gap-1 mb-1">
                                {(voo.passageiros ? voo.passageiros.split(',').map((s: string) => s.trim()).filter(Boolean) : []).map((nome: string) => (
                                  <span key={nome} className="flex items-center gap-1 bg-sky-900/30 border border-sky-700 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {nome}
                                    <button type="button" onClick={() => {
                                      const newVoos = [...formData.voosList];
                                      const lista = newVoos[idx].passageiros.split(',').map((s: string) => s.trim()).filter((s: string) => s !== nome);
                                      newVoos[idx].passageiros = lista.join(', ');
                                      setFormData({...formData, voosList: newVoos});
                                    }} className="hover:text-red-400"><X size={10}/></button>
                                  </span>
                                ))}
                              </div>
                              {/* Dropdown de seleção */}
                              <select className="w-full border border-border-hover rounded text-sm p-1.5"
                                value=""
                                onChange={e => {
                                  const nome = e.target.value;
                                  if (!nome) return;
                                  const newVoos = [...formData.voosList];
                                  const atual = newVoos[idx].passageiros ? newVoos[idx].passageiros.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                                  if (!atual.includes(nome)) {
                                    newVoos[idx].passageiros = [...atual, nome].join(', ');
                                    setFormData({...formData, voosList: newVoos});
                                  }
                                }}>
                                <option value="">+ Adicionar passageiro...</option>
                                {(data.pessoas || [])
                                  .filter((p: any) => p.tipo?.includes('Passageiro') || p.tipo?.includes('Cliente'))
                                  .map((p: any) => (
                                    <option key={p.id} value={p.nome}>{p.nome}</option>
                                  ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-muted uppercase">Localizador PNR</label>
                              <input required type="text" className="w-full border border-border-hover rounded text-sm p-1.5 font-mono uppercase" 
                                value={voo.localizador} onChange={e => {
                                  const newVoos = [...formData.voosList];
                                  newVoos[idx].localizador = e.target.value;
                                  setFormData({...formData, voosList: newVoos});
                                }} />
                            </div>
                            <div className={`${voo.ciaAerea === 'Outras' ? 'col-span-2 sm:col-span-1' : ''}`}>
                              <label className="block text-xs font-bold text-muted uppercase">Cia Aérea</label>
                              <select required className="w-full border border-border-hover rounded text-sm p-1.5" 
                                value={voo.ciaAerea === 'Azul' || voo.ciaAerea === 'GOL' || voo.ciaAerea === 'LATAM' || voo.ciaAerea === '' ? voo.ciaAerea : 'Outras'} 
                                onChange={e => {
                                  const newVoos = [...formData.voosList];
                                  newVoos[idx].ciaAerea = e.target.value === 'Outras' ? 'Outra Cia' : e.target.value;
                                  setFormData({...formData, voosList: newVoos});
                                }}>
                                 <option value="">Selecione...</option>
                                 <option value="Azul">Azul</option>
                                 <option value="GOL">GOL</option>
                                 <option value="LATAM">LATAM</option>
                                 <option value="Outras">Outras</option>
                              </select>
                            </div>
                            {voo.ciaAerea !== 'Azul' && voo.ciaAerea !== 'GOL' && voo.ciaAerea !== 'LATAM' && voo.ciaAerea !== '' && (
                              <div>
                                <label className="block text-xs font-bold text-muted uppercase">Nome da Cia Aérea</label>
                                <input required type="text" className="w-full border border-border-hover rounded text-sm p-1.5" 
                                  value={voo.ciaAerea === 'Outra Cia' ? '' : voo.ciaAerea} onChange={e => {
                                    const newVoos = [...formData.voosList];
                                    newVoos[idx].ciaAerea = e.target.value;
                                    setFormData({...formData, voosList: newVoos});
                                  }} placeholder="Ex: TAP, Copa..."/>
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-bold text-muted uppercase">Nº do Voo</label>
                              <input required type="text" className="w-full border border-border-hover rounded text-sm p-1.5 font-mono" 
                                value={voo.numeroVoo} onChange={e => {
                                    const newVoos = [...formData.voosList];
                                    newVoos[idx].numeroVoo = e.target.value;
                                    setFormData({...formData, voosList: newVoos});
                                }} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-muted uppercase">Origem (IATA)</label>
                              <input required type="text" maxLength={3} className="w-full border border-border-hover rounded text-sm p-1.5 uppercase font-mono tracking-widest" 
                                value={voo.origem} onChange={e => {
                                    const newVoos = [...formData.voosList];
                                    newVoos[idx].origem = e.target.value.toUpperCase();
                                    setFormData({...formData, voosList: newVoos});
                                }} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-muted uppercase">Destino (IATA)</label>
                              <input required type="text" maxLength={3} className="w-full border border-border-hover rounded text-sm p-1.5 uppercase font-mono tracking-widest" 
                                value={voo.destino} onChange={e => {
                                    const newVoos = [...formData.voosList];
                                    newVoos[idx].destino = e.target.value.toUpperCase();
                                    setFormData({...formData, voosList: newVoos});
                                }} />
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                               <label className="block text-xs font-bold text-muted uppercase">Data/Hora Partida</label>
                               <input required type="datetime-local" className="w-full border border-border-hover rounded text-sm p-1.5" 
                                 value={voo.dataPartida} onChange={e => {
                                     const newVoos = [...formData.voosList];
                                     newVoos[idx].dataPartida = e.target.value;
                                     setFormData({...formData, voosList: newVoos});
                                 }} />
                            </div>
                        </div>
                      ))}

                      <div className="flex flex-col gap-3 p-3 bg-surface-alt border border-border rounded-lg">
                        <div className="flex items-center justify-between">
                            <h6 className="text-[11px] font-black uppercase text-white">Informações de Emissão</h6>
                            <label className="flex items-center space-x-2 text-xs font-bold text-muted cursor-pointer">
                              <span>Aplicar mesma emissão para todos os trechos?</span>
                              <input type="checkbox" className="rounded border-border-hover text-white focus:ring-[#1F2220]"
                                checked={formData.mesmasInformacoesEmissao}
                                onChange={(e) => {
                                  const eq = e.target.checked;
                                  const newVoos = [...formData.voosList];
                                  if (eq && newVoos.length > 0) {
                                      // Copy from first to others
                                      const primaryForn = newVoos[0].fornecedor;
                                      const primaryEmi = newVoos[0].formaEmissao;
                                      newVoos.forEach(v => { v.fornecedor = primaryForn; v.formaEmissao = primaryEmi; });
                                  }
                                  setFormData({...formData, mesmasInformacoesEmissao: eq, voosList: newVoos});
                                }} />
                            </label>
                        </div>
                        
                        {formData.mesmasInformacoesEmissao ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                               <label className="block text-xs font-bold text-muted uppercase">Fornecedor / Forma Pag.</label>
                               <select className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface" 
                                 value={formData.voosList[0]?.fornecedor || ''} onChange={e => {
                                    const newVoos = [...formData.voosList];
                                    newVoos.forEach(v => v.fornecedor = e.target.value);
                                    setFormData({...formData, voosList: newVoos});
                                 }}>
                                 <option value="">Selecione Viagem/Milhas...</option>
                                 {fornecedoresViagem.map((f: any) => (
                                   <option key={f.id} value={f.nome}>{f.nome}</option>
                                 ))}
                               </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted uppercase">Formato Emissão</label>
                                <select className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface" 
                                   value={formData.voosList[0]?.formaEmissao || 'Milhas'} onChange={e => {
                                      const newVoos = [...formData.voosList];
                                      newVoos.forEach(v => v.formaEmissao = e.target.value);
                                      setFormData({...formData, voosList: newVoos});
                                   }}>
                                   <option value="Milhas">Milhas</option>
                                   <option value="Tarifa Pagante">Tarifa Pagante</option>
                                   <option value="Consolidadora">Consolidadora</option>
                                </select>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 border-t border-border mt-2 pt-3">
                            {formData.voosList.map((voo, vIdx) => (
                              <div key={"emi-" + voo.id} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                                <div className="col-span-full">
                                  <h6 className="text-[10px] uppercase font-bold text-muted tracking-wider">Trecho {vIdx + 1} ({voo.origem || '?'} - {voo.destino || '?'})</h6>
                                </div>
                                <div>
                                   <label className="block text-xs font-bold text-muted uppercase">Fornecedor / Forma Pag.</label>
                                   <select className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface" 
                                     value={voo.fornecedor || ''} onChange={e => {
                                        const newVoos = [...formData.voosList];
                                        newVoos[vIdx].fornecedor = e.target.value;
                                        setFormData({...formData, voosList: newVoos});
                                     }}>
                                     <option value="">Selecione Viagem/Milhas...</option>
                                     {fornecedoresViagem.map((f: any) => (
                                       <option key={f.id} value={f.nome}>{f.nome}</option>
                                     ))}
                                   </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted uppercase">Formato Emissão</label>
                                    <select className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface" 
                                       value={voo.formaEmissao || 'Milhas'} onChange={e => {
                                          const newVoos = [...formData.voosList];
                                          newVoos[vIdx].formaEmissao = e.target.value;
                                          setFormData({...formData, voosList: newVoos});
                                       }}>
                                       <option value="Milhas">Milhas</option>
                                       <option value="Tarifa Pagante">Tarifa Pagante</option>
                                       <option value="Consolidadora">Consolidadora</option>
                                    </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {formData.tipoViagem === 'Multi-destinos' && (
                         <div className="flex justify-end mt-2">
                            <button type="button" onClick={() => {
                               setFormData({...formData, voosList: [...formData.voosList, {...initialVoo, id: generateId()}]});
                            }} className="text-xs font-bold bg-[#1D9E75] text-white px-3 py-1.5 rounded-md hover:bg-blue-800 flex items-center gap-1 uppercase tracking-widest">
                               <PlusCircle size={14} /> Add Voo
                            </button>
                         </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hospedagem */}
            {(formData.tipo === 'Hotel' || formData.tipo === 'Pacote') && (
              <div className="md:col-span-2 xl:col-span-4 space-y-3 mt-2 border-t border-border pt-4">
                <div className="flex items-center space-x-2 border-b border-border pb-2">
                  {formData.tipo !== 'Pacote' && <input type="checkbox" checked={formData.incluirHospedagem}
                    onChange={e => setFormData({ ...formData, incluirHospedagem: e.target.checked })} />}
                  <h5 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                    <BedDouble size={16} className="text-[#1D9E75]" /> Registrar Hospedagem
                  </h5>
                </div>
                {formData.incluirHospedagem && (
                  <div className="space-y-4">
                    {formData.hospedagens.map((h: any, idx: number) => (
                      <div key={h.id} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3 bg-surface border border-border rounded-lg relative">
                        {formData.hospedagens.length > 1 && (
                          <button type="button" onClick={() => {
                            const list = [...formData.hospedagens]; list.splice(idx, 1);
                            setFormData({ ...formData, hospedagens: list });
                          }} className="absolute top-2 right-2 text-red-400 hover:text-red-300"><X size={14} /></button>
                        )}
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-muted uppercase mb-1">Nome do Hotel / Propriedade</label>
                          <input type="text" className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface text-primary"
                            value={h.nome} onChange={e => { const l = [...formData.hospedagens]; l[idx].nome = e.target.value; setFormData({ ...formData, hospedagens: l }); }} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted uppercase mb-1">Plataforma</label>
                          <select className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface text-primary"
                            value={h.plataforma} onChange={e => { const l = [...formData.hospedagens]; l[idx].plataforma = e.target.value; setFormData({ ...formData, hospedagens: l }); }}>
                            <option>Booking.com</option><option>Airbnb</option><option>Direto</option><option>Expedia</option><option>Outro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted uppercase mb-1">Voucher / Reserva Nº</label>
                          <input type="text" className="w-full border border-border-hover rounded text-sm p-1.5 font-mono bg-surface text-primary"
                            value={h.voucher} onChange={e => { const l = [...formData.hospedagens]; l[idx].voucher = e.target.value; setFormData({ ...formData, hospedagens: l }); }} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted uppercase mb-1">Check-in</label>
                          <input type="date" className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface text-primary"
                            value={h.checkIn} onChange={e => { const l = [...formData.hospedagens]; l[idx].checkIn = e.target.value; setFormData({ ...formData, hospedagens: l }); }} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted uppercase mb-1">Check-out</label>
                          <input type="date" className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface text-primary"
                            value={h.checkOut} onChange={e => { const l = [...formData.hospedagens]; l[idx].checkOut = e.target.value; setFormData({ ...formData, hospedagens: l }); }} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted uppercase mb-1">Nº Quartos</label>
                          <input type="number" min={1} className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface text-primary"
                            value={h.quartos} onChange={e => { const l = [...formData.hospedagens]; l[idx].quartos = Number(e.target.value); setFormData({ ...formData, hospedagens: l }); }} />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted uppercase mb-1">Tipo de Quarto</label>
                          <select className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface text-primary"
                            value={h.tipoQuarto} onChange={e => { const l = [...formData.hospedagens]; l[idx].tipoQuarto = e.target.value; setFormData({ ...formData, hospedagens: l }); }}>
                            <option>Standard</option><option>Superior</option><option>Deluxe</option><option>Suite</option><option>Master Suite</option><option>Outro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted uppercase mb-1">Regime Alimentar</label>
                          <select className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface text-primary"
                            value={h.regimeAlimentar} onChange={e => { const l = [...formData.hospedagens]; l[idx].regimeAlimentar = e.target.value; setFormData({ ...formData, hospedagens: l }); }}>
                            <option>Sem Refeição</option><option>Café da Manhã</option><option>Meia Pensão</option><option>All-Inclusive</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted uppercase mb-1">Cidade</label>
                          <input type="text" className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface text-primary"
                            value={h.cidade} onChange={e => { const l = [...formData.hospedagens]; l[idx].cidade = e.target.value; setFormData({ ...formData, hospedagens: l }); }} />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-muted uppercase mb-1">Observações</label>
                          <input type="text" className="w-full border border-border-hover rounded text-sm p-1.5 bg-surface text-primary"
                            value={h.observacoes} onChange={e => { const l = [...formData.hospedagens]; l[idx].observacoes = e.target.value; setFormData({ ...formData, hospedagens: l }); }} />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setFormData({ ...formData, hospedagens: [...formData.hospedagens, { id: generateId(), nome: '', plataforma: 'Booking.com', voucher: '', checkIn: '', checkOut: '', quartos: 1, tipoQuarto: 'Standard', regimeAlimentar: 'Café da Manhã', cidade: '', observacoes: '' }] })}
                      className="text-[#1D9E75] text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:brightness-110">
                      <PlusCircle size={14} /> Adicionar outra hospedagem
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Passageiros ── */}
            <div className="md:col-span-2 xl:col-span-4 space-y-3 mt-2 border-t border-border pt-4">
              <h5 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                <Users size={16} className="text-[#1D9E75]" /> Passageiros da Viagem
              </h5>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-placeholder" />
                <input type="text" placeholder="Buscar passageiro pelo nome..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-border-hover rounded bg-surface text-primary"
                  value={formData.passageirosSearch}
                  onChange={e => setFormData({ ...formData, passageirosSearch: e.target.value })} />
              </div>
              {formData.passageirosSearch.length >= 2 && (
                <div className="border border-border rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                  {(data.pessoas || []).filter((p: any) =>
                    !formData.passageiros.some((x: any) => x.pessoaId === p.id) &&
                    p.nome.toLowerCase().includes(formData.passageirosSearch.toLowerCase())
                  ).map((p: any) => (
                    <button key={p.id} type="button"
                      onClick={() => setFormData({ ...formData, passageiros: [...formData.passageiros, { pessoaId: p.id, nome: p.nome }], passageirosSearch: '' })}
                      className="w-full text-left px-3 py-2 hover:bg-surface-alt text-sm text-primary border-b border-border last:border-0 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#1D9E75]/20 text-emerald-400 text-xs flex items-center justify-center font-bold">{p.nome[0]}</div>
                      <span>{p.nome}</span>
                      <span className="text-xs text-muted">{(p.tipo || []).join(', ')}</span>
                    </button>
                  ))}
                </div>
              )}
              {formData.passageiros.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.passageiros.map((p: any) => (
                    <span key={p.pessoaId} className="flex items-center gap-1 bg-sky-900/30 text-sky-400 border border-sky-700 text-xs font-bold px-2 py-1 rounded-full">
                      {p.nome}
                      <button type="button" onClick={() => setFormData({ ...formData, passageiros: formData.passageiros.filter((x: any) => x.pessoaId !== p.pessoaId) })}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Seguro de Viagem ── */}
            <div className="md:col-span-2 xl:col-span-4 space-y-3 mt-2 border-t border-border pt-4">
              {formData.tipo !== 'Pacote' && <div className="flex items-center gap-2">
                <input type="checkbox" checked={formData.incluirSeguro}
                  onChange={e => setFormData({ ...formData, incluirSeguro: e.target.checked })} />
                <h5 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                  <Shield size={16} className="text-[#1D9E75]" /> Seguro de Viagem
                </h5>
              </div>}
              {formData.tipo === 'Pacote' && formData.incluirSeguro && <h5 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2"><Shield size={16} className="text-[#1D9E75]" /> Seguro de Viagem</h5>}
              {formData.incluirSeguro && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-surface border border-border rounded-lg">
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Seguradora</label>
                    <input type="text" className="w-full border border-border-hover rounded p-1.5 text-sm" value={formData.seguro.seguradora} onChange={e => setFormData({ ...formData, seguro: { ...formData.seguro, seguradora: e.target.value } })} /></div>
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Nº Apólice</label>
                    <input type="text" className="w-full border border-border-hover rounded p-1.5 text-sm font-mono" value={formData.seguro.apolice} onChange={e => setFormData({ ...formData, seguro: { ...formData.seguro, apolice: e.target.value } })} /></div>
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Cobertura</label>
                    <input type="text" className="w-full border border-border-hover rounded p-1.5 text-sm" value={formData.seguro.cobertura || ''} onChange={e => setFormData({ ...formData, seguro: { ...formData.seguro, cobertura: e.target.value } })} placeholder="Ex: Básico, Premium..." /></div>
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Validade</label>
                    <input type="date" className="w-full border border-border-hover rounded p-1.5 text-sm" value={formData.seguro.validade || ''} onChange={e => setFormData({ ...formData, seguro: { ...formData.seguro, validade: e.target.value } })} /></div>
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Valor (R$)</label>
                    <input type="text" className="w-full border border-border-hover rounded p-1.5 text-sm" value={formData.seguro.valor || ''} onChange={e => setFormData({ ...formData, seguro: { ...formData.seguro, valor: e.target.value } })} /></div>
                </div>
              )}
            </div>

            {/* ── Aluguel de Carro ── */}
            {(formData.tipo === 'Locação de Veículo' || (formData.tipo === 'Pacote' && formData.incluirAluguel)) && (
            <div className="md:col-span-2 xl:col-span-4 space-y-3 mt-2 border-t border-border pt-4">
              <h5 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                <Car size={16} className="text-[#1D9E75]" /> Aluguel de Carro
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-surface border border-border rounded-lg">
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Locadora</label>
                    <input type="text" className="w-full border border-border-hover rounded p-1.5 text-sm" placeholder="Localiza, Hertz..." value={formData.aluguel.empresa} onChange={e => setFormData({ ...formData, aluguel: { ...formData.aluguel, empresa: e.target.value } })} /></div>
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Voucher</label>
                    <input type="text" className="w-full border border-border-hover rounded p-1.5 text-sm font-mono" value={formData.aluguel.voucher || ''} onChange={e => setFormData({ ...formData, aluguel: { ...formData.aluguel, voucher: e.target.value } })} /></div>
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Modelo / Categoria</label>
                    <input type="text" className="w-full border border-border-hover rounded p-1.5 text-sm" placeholder="SUV, Básico..." value={formData.aluguel.modelo || ''} onChange={e => setFormData({ ...formData, aluguel: { ...formData.aluguel, modelo: e.target.value } })} /></div>
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Local de Retirada</label>
                    <input type="text" className="w-full border border-border-hover rounded p-1.5 text-sm" value={formData.aluguel.retiradaLocal || ''} onChange={e => setFormData({ ...formData, aluguel: { ...formData.aluguel, retiradaLocal: e.target.value } })} /></div>
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Data e Hora de Retirada</label>
                    <input type="datetime-local" className="w-full border border-border-hover rounded p-1.5 text-sm" value={formData.aluguel.retiradaData || ''} onChange={e => setFormData({ ...formData, aluguel: { ...formData.aluguel, retiradaData: e.target.value } })} /></div>
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Local de Devolução</label>
                    <input type="text" className="w-full border border-border-hover rounded p-1.5 text-sm" value={formData.aluguel.devolucaoLocal || ''} onChange={e => setFormData({ ...formData, aluguel: { ...formData.aluguel, devolucaoLocal: e.target.value } })} /></div>
                  <div><label className="block text-xs font-bold text-muted uppercase mb-1">Data e Hora de Devolução</label>
                    <input type="datetime-local" className="w-full border border-border-hover rounded p-1.5 text-sm" value={formData.aluguel.devolucaoData || ''} onChange={e => setFormData({ ...formData, aluguel: { ...formData.aluguel, devolucaoData: e.target.value } })} /></div>
                  <div className="col-span-2 md:col-span-2"><label className="block text-xs font-bold text-muted uppercase mb-1">Observações</label>
                    <input type="text" className="w-full border border-border-hover rounded p-1.5 text-sm" value={formData.aluguel.observacoes || ''} onChange={e => setFormData({ ...formData, aluguel: { ...formData.aluguel, observacoes: e.target.value } })} /></div>
              </div>
            </div>
            )}

            {/* ── Tarefas / Checklist ── */}
            <div className="md:col-span-2 xl:col-span-4 space-y-3 mt-2 border-t border-border pt-4">
              <h5 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                <CheckSquare size={16} className="text-[#1D9E75]" /> Checklist da Venda
              </h5>
              <div className="flex gap-2">
                <input type="text" placeholder="Nova tarefa..." value={formData.novaTarefa}
                  onChange={e => setFormData({ ...formData, novaTarefa: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault();
                      if (!formData.novaTarefa.trim()) return;
                      setFormData({ ...formData, tarefas: [...formData.tarefas, { id: generateId(), titulo: formData.novaTarefa.trim(), feita: false, prazo: formData.novaTarefaPrazo, criadoEm: new Date().toISOString() }], novaTarefa: '', novaTarefaPrazo: '' });
                    }
                  }}
                  className="flex-1 border border-border-hover rounded p-1.5 text-sm bg-surface text-primary" />
                <input type="date" value={formData.novaTarefaPrazo} onChange={e => setFormData({ ...formData, novaTarefaPrazo: e.target.value })}
                  className="border border-border-hover rounded p-1.5 text-sm bg-surface text-primary w-36" />
                <button type="button" onClick={() => {
                  if (!formData.novaTarefa.trim()) return;
                  setFormData({ ...formData, tarefas: [...formData.tarefas, { id: generateId(), titulo: formData.novaTarefa.trim(), feita: false, prazo: formData.novaTarefaPrazo, criadoEm: new Date().toISOString() }], novaTarefa: '', novaTarefaPrazo: '' });
                }} className="bg-[#1D9E75] text-white px-3 py-1.5 rounded text-sm font-bold"><PlusCircle size={14} /></button>
              </div>
              <div className="space-y-1.5">
                {formData.tarefas.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 bg-surface border border-border rounded p-2">
                    <button type="button" onClick={() => setFormData({ ...formData, tarefas: formData.tarefas.map((x: any) => x.id === t.id ? { ...x, feita: !x.feita } : x) })}>
                      {t.feita ? <CheckSquare size={16} className="text-[#1D9E75]" /> : <Square size={16} className="text-muted" />}
                    </button>
                    <span className={`flex-1 text-sm ${t.feita ? 'line-through text-muted' : 'text-primary'}`}>{t.titulo}</span>
                    {t.prazo && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${new Date(t.prazo) < new Date() && !t.feita ? 'bg-red-900/30 text-red-400' : 'text-placeholder'}`}>{new Date(t.prazo).toLocaleDateString('pt-BR')}</span>}
                    <button type="button" onClick={() => setFormData({ ...formData, tarefas: formData.tarefas.filter((x: any) => x.id !== t.id) })} className="text-red-400 hover:text-red-300"><X size={13} /></button>
                  </div>
                ))}
                {formData.tarefas.length === 0 && <p className="text-xs text-muted">Nenhuma tarefa. Adicione acima e pressione Enter.</p>}
              </div>
            </div>

            {/* ── Documentos da Venda ── */}
            {editingId && (
              <div className="md:col-span-2 xl:col-span-4 space-y-3 mt-2 border-t border-border pt-4">
                <h5 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                  <Paperclip size={16} className="text-[#1D9E75]" /> Documentos Anexados
                </h5>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1D9E75] font-bold hover:underline">
                  <PlusCircle size={14} /> Anexar documento
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const path = `vendas/${editingId}/${generateId()}_${file.name}`;
                    const { error } = await supabase.storage.from('documentos').upload(path, file);
                    if (error) { toast('Erro ao enviar.', 'error'); return; }
                    const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path);
                    const doc = { id: generateId(), nome: file.name, tipo: 'Outro', url: urlData.publicUrl, tamanho: file.size, criadoEm: new Date().toISOString() };
                    const newDocs = [...formData.documentos, doc];
                    setFormData({ ...formData, documentos: newDocs });
                    updateData({ vendas: data.vendas.map((v: any) => v.id === editingId ? { ...v, documentos: newDocs } : v) });
                    toast('Documento anexado!');
                  }} />
                </label>
                {formData.documentos.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between bg-surface border border-border rounded px-3 py-2">
                    <p className="text-sm text-primary truncate max-w-xs">{doc.nome}</p>
                    <div className="flex gap-2">
                      <a href={doc.url} target="_blank" rel="noreferrer" className="text-[#1D9E75] text-xs font-bold hover:underline">Ver</a>
                      <button type="button" onClick={() => {
                        const newDocs = formData.documentos.filter((d: any) => d.id !== doc.id);
                        setFormData({ ...formData, documentos: newDocs });
                        updateData({ vendas: data.vendas.map((v: any) => v.id === editingId ? { ...v, documentos: newDocs } : v) });
                      }} className="text-red-400 hover:text-red-300"><X size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="md:col-span-2 xl:col-span-4 flex justify-end mt-4">
              <button type="submit" className="bg-[#1D9E75] text-white px-6 py-2 rounded-md font-bold uppercase tracking-wider text-sm hover:bg-emerald-700">
                    Salvar Venda
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-md border border-border overflow-hidden flex flex-col mb-6">
        <div className="p-4 bg-surface-alt border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h4 className="font-black text-white uppercase tracking-wider">Vendas em Andamento</h4>
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-placeholder" />
              <input
                type="text"
                placeholder="Buscar cliente, tipo, OS..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-surface border border-border rounded-lg text-primary placeholder:text-placeholder focus:outline-none focus:border-[#1D9E75]"
              />
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-alt text-[10px] uppercase font-bold text-placeholder">
              <tr>
                <th className="px-4 py-3 cursor-pointer hover:text-muted truncate" onClick={() => toggleSort('dataPartida')}>Partida {sortCol === 'dataPartida' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-muted truncate" onClick={() => toggleSort('cliente')}>Cliente {sortCol === 'cliente' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-muted truncate" onClick={() => toggleSort('tipo')}>Tipo {sortCol === 'tipo' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-muted truncate" onClick={() => toggleSort('valorBruto')}>Valor {sortCol === 'valorBruto' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 text-center tooltip truncate">Status da Viagem</th>
                <th className="px-4 py-3 text-center truncate">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm border-t border-border">
              {vendasAtivas.map((v: any, i: number) => {
                 const voo = data.voos.find((vo: any) => vo.vendaId === v.id);
                 const dataPartida = voo?.dataPartida ? new Date(voo.dataPartida).toLocaleDateString('pt-BR') : '-';
                 return (
                 <tr key={v.id} onClick={() => setSelectedOverviewVenda(v)} className="border-b border-border hover:bg-surface-alt cursor-pointer">
                   <td className="px-4 py-3 text-muted font-bold">{dataPartida}</td>
                   <td className="px-4 py-3 text-primary font-bold uppercase">{v.cliente}</td>
                   <td className="px-4 py-3 font-medium text-muted">{v.tipo}</td>
                   <td className="px-4 py-3 font-black text-primary">{formatCurrency(v.valorBruto)}</td>
                   <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                       <StatusViagemBadge status={statusViagemDe(v)} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center space-x-2">
                       <button onClick={() => handleEdit(v)} className="bg-blue-900/30 text-blue-500 p-1.5 rounded-md hover:scale-105 tooltip" title="Editar Venda">
                          <Edit size={16} />
                       </button>
                       {v.status !== 'Cancelado' && (
                         <button onClick={() => handleCancel(v.id)} className="bg-orange-50 text-orange-500 p-1.5 rounded-md hover:scale-105 tooltip" title="Cancelar Venda">
                           <XCircle size={16} />
                         </button>
                       )}
                       <button onClick={() => handleDelete(v.id)} className="bg-red-900/30 text-red-500 p-1.5 rounded-md hover:scale-105 tooltip" title="Excluir Definitivamente">
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
                 );
              })}
              {vendasAtivas.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-muted font-medium">Nenhuma venda em andamento.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-md border border-border overflow-hidden flex flex-col opacity-70 hover:opacity-100 transition-opacity">
        <div className="p-4 bg-surface-alt border-b border-border flex justify-between items-center">
            <h4 className="font-black text-muted uppercase tracking-wider">Vendas Anteriores (Concluídas)</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-alt text-[10px] uppercase font-bold text-placeholder">
              <tr>
                <th className="px-4 py-3 cursor-pointer hover:text-muted truncate" onClick={() => toggleSort('dataPartida')}>Partida {sortCol === 'dataPartida' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-muted truncate" onClick={() => toggleSort('cliente')}>Cliente {sortCol === 'cliente' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-muted truncate" onClick={() => toggleSort('tipo')}>Tipo {sortCol === 'tipo' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-muted truncate" onClick={() => toggleSort('valorBruto')}>Valor {sortCol === 'valorBruto' && (sortAsc ? '↑' : '↓')}</th>
                <th className="px-4 py-3 text-center tooltip truncate">Status da Viagem</th>
                <th className="px-4 py-3 text-center truncate">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm border-t border-border">
              {vendasAnteriores.map((v: any, i: number) => {
                 const voo = data.voos.find((vo: any) => vo.vendaId === v.id);
                 const dataPartida = voo?.dataPartida ? new Date(voo.dataPartida).toLocaleDateString('pt-BR') : '-';
                 return (
                <tr key={v.id} onClick={() => setSelectedOverviewVenda(v)} className="border-b border-border hover:bg-surface-alt cursor-pointer">
                  <td className="px-4 py-3 text-muted font-bold">{dataPartida}</td>
                  <td className="px-4 py-3 text-muted font-bold uppercase">{v.cliente}</td>
                  <td className="px-4 py-3 font-medium text-muted">{v.tipo}</td>
                  <td className="px-4 py-3 font-black text-muted">{formatCurrency(v.valorBruto)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                       <StatusViagemBadge status={statusViagemDe(v)} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center space-x-2">
                       <button onClick={() => handleEdit(v)} className="bg-blue-900/30 text-blue-500 p-1.5 rounded-md hover:scale-105 tooltip" title="Editar Venda">
                          <Edit size={16} />
                       </button>
                       {v.status !== 'Cancelado' && (
                         <button onClick={() => handleCancel(v.id)} className="bg-orange-50 text-orange-500 p-1.5 rounded-md hover:scale-105 tooltip" title="Cancelar Venda">
                           <XCircle size={16} />
                         </button>
                       )}
                       <button onClick={() => handleDelete(v.id)} className="bg-red-900/30 text-red-500 p-1.5 rounded-md hover:scale-105 tooltip" title="Excluir Definitivamente">
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {vendasAnteriores.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-muted font-medium">Nenhuma venda concluída.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOverviewVenda && (
         <VendaOverviewModal 
           venda={selectedOverviewVenda} 
           data={data} 
           onClose={() => setSelectedOverviewVenda(null)} 
         />
      )}

      {vendaToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 border border-border text-center">
            <Trash2 size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-primary mb-2">Excluir Venda</h3>
            <p className="text-sm text-muted mb-6">Tem certeza de que deseja excluir permanentemente esta venda? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setVendaToDelete(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold hover:bg-surface-alt">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Excluir Permanentemente</button>
            </div>
          </div>
        </div>
      )}

      {vendaToCancel && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-6 border border-border text-center">
            <XCircle size={48} className="text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-primary mb-2">Cancelar Venda</h3>
            <p className="text-sm text-muted mb-6">Tem certeza de que deseja cancelar esta venda? Suas contas a receber pendentes também serão canceladas.</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setVendaToCancel(null)} className="px-4 py-2 border border-border rounded-lg text-muted font-bold hover:bg-surface-alt">Voltar</button>
              <button onClick={confirmCancel} className="px-4 py-2 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600">Cancelar Venda</button>
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
