import { useState, useEffect } from 'react';
import { CRMData } from './types';
import { calculateStatusAtrasado } from './utils';
import { supabase } from './lib/supabase';

const INITIAL_DATA: CRMData = {
  pessoas: [],
  vendas: [],
  voos: [],
  contasReceber: [],
  contasPagar: [],
  leads: [],
  cotacoes: [],
  comissoes: [],
};

const ROW_ID = 'default';

function migrateToFessoas(raw: any): any[] {
  const pessoas = raw.pessoas || [];
  if (pessoas.length > 0) return pessoas;
  // Migrate legacy clientes → pessoas
  const fromClientes = (raw.clientes || []).map((c: any) => ({
    id: c.id,
    nome: c.nome,
    tipo: ['Cliente'],
    ativo: true,
    telefone: c.telefone,
    email: c.email,
    documento: c.documento,
    passaporte: c.passaporte,
    passaporteValidade: c.passaporteValidade,
    nacionalidade: c.nacionalidade,
    dataNascimento: c.dataNascimento,
    genero: c.genero,
    profissao: c.profissao,
    cep: c.cep,
    endereco: c.endereco,
    numero: c.numero,
    bairro: c.bairro,
    cidade: c.cidade,
    estado: c.estado,
    contatoEmergenciaNome: c.contatoEmergenciaNome,
    contatoEmergenciaTel: c.contatoEmergenciaTel,
    observacoes: c.observacoes,
    documentos: c.documentos || [],
    familia: [],
    criadoEm: c.criadoEm || new Date().toISOString(),
  }));
  const fromFornecedores = (raw.fornecedores || []).map((f: any) => ({
    id: f.id,
    nome: f.nome,
    tipo: ['Fornecedor'],
    ativo: true,
    telefone: f.telefone,
    email: f.email,
    documento: f.documento,
    cep: f.cep,
    endereco: f.endereco,
    numero: f.numero,
    bairro: f.bairro,
    cidade: f.cidade,
    estado: f.estado,
    observacoes: f.observacoes,
    isFornecedorViagem: f.isFornecedorViagem || false,
    documentos: [],
    familia: [],
    criadoEm: new Date().toISOString(),
  }));
  return [...fromClientes, ...fromFornecedores];
}

function parseData(raw: any): CRMData {
  if (!raw) return INITIAL_DATA;
  return {
    ...INITIAL_DATA,
    ...raw,
    pessoas: migrateToFessoas(raw),
    leads: raw.leads || [],
    cotacoes: raw.cotacoes || [],
    comissoes: raw.comissoes || [],
    contasReceber: (raw.contasReceber || []).map((c: any) => ({
      ...c,
      status: calculateStatusAtrasado(c.vencimento, c.status) as any
    })),
    contasPagar: (raw.contasPagar || []).map((c: any) => ({
      ...c,
      status: calculateStatusAtrasado(c.vencimento, c.status) as any
    }))
  };
}

export function useCRMStore() {
  const [data, setData] = useState<CRMData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    supabase
      .from('crm_data')
      .select('data')
      .eq('id', ROW_ID)
      .single()
      .then(({ data: row, error }) => {
        if (error && error.code !== 'PGRST116') {
          // PGRST116 = row not found, fallback to localStorage
          console.error('Supabase load error:', error);
        }
        if (row?.data) {
          setData(parseData(row.data));
        } else {
          // Fallback to localStorage for offline/dev use
          const stored = localStorage.getItem('@VoltaAoMundo:v2');
          if (stored) {
            try { setData(parseData(JSON.parse(stored))); } catch { setData(INITIAL_DATA); }
          }
        }
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel('crm_data_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'crm_data',
        filter: `id=eq.${ROW_ID}`
      }, (payload) => {
        if (payload.new?.data) {
          setData(parseData(payload.new.data));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateData = async (newData: Partial<CRMData>) => {
    const updated = { ...data, ...newData };
    setData(updated); // optimistic update

    // Always persist to localStorage as backup
    localStorage.setItem('@VoltaAoMundo:v2', JSON.stringify(updated));

    const sanitize = (obj: any): any => {
      if (obj === undefined) return null;
      if (typeof obj !== 'object' || obj === null) return obj;
      if (Array.isArray(obj)) return obj.map(sanitize);
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) out[k] = sanitize(v);
      }
      return out;
    };

    const { error } = await supabase
      .from('crm_data')
      .upsert({ id: ROW_ID, data: sanitize(updated), updated_at: new Date().toISOString() });

    if (error) {
      console.error('Supabase save error:', error);
    }
  };

  return { data, updateData, loading };
}
