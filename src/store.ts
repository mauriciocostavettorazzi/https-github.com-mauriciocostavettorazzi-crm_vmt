import { useState, useEffect } from 'react';
import { CRMData } from './types';
import { calculateStatusAtrasado } from './utils';
import { supabase } from './lib/supabase';

const INITIAL_DATA: CRMData = {
  clientes: [],
  fornecedores: [],
  vendas: [],
  voos: [],
  contasReceber: [],
  contasPagar: [],
  leads: []
};

const ROW_ID = 'default';

function parseData(raw: any): CRMData {
  if (!raw) return INITIAL_DATA;
  const parsed = raw as CRMData;
  return {
    ...INITIAL_DATA,
    ...parsed,
    contasReceber: (parsed.contasReceber || []).map(c => ({
      ...c,
      status: calculateStatusAtrasado(c.vencimento, c.status) as any
    })),
    contasPagar: (parsed.contasPagar || []).map(c => ({
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
