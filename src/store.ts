import { useState, useEffect } from 'react';
import { CRMData, Venda, Voo, ContaReceber, ContaPagar } from './types';
import { calculateStatusAtrasado } from './utils';
import { auth, db } from './lib/firebase';
import { doc as getDocRef, setDoc as setD, getDoc as getD, onSnapshot as onSnap } from 'firebase/firestore';

const INITIAL_DATA: CRMData = {
  clientes: [],
  fornecedores: [],
  vendas: [],
  voos: [],
  contasReceber: [],
  contasPagar: []
};

export function useCRMStore() {
  const [data, setData] = useState<CRMData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userRef = getDocRef(db, 'usersData', user.uid);
        
        // Listen to changes
        const unsubscribeSnapshot = onSnap(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const parsed = docSnap.data().data as CRMData;
             if(parsed) {
                  parsed.contasReceber = (parsed.contasReceber || []).map(c => ({
                    ...c,
                    status: calculateStatusAtrasado(c.vencimento, c.status) as any
                  }));
                  parsed.contasPagar = (parsed.contasPagar || []).map(c => ({
                    ...c,
                    status: calculateStatusAtrasado(c.vencimento, c.status) as any
                  }));
                  setData({
                    ...INITIAL_DATA,
                    ...parsed,
                    contasReceber: parsed.contasReceber,
                    contasPagar: parsed.contasPagar
                  });
             } else {
                 setData(INITIAL_DATA);
             }
          } else {
            const stored = localStorage.getItem('@VoltaAoMundo:v2');
            let initial = INITIAL_DATA;
            if (stored) {
              try {
                initial = JSON.parse(stored);
              } catch(e){}
            }
            setData(initial);
            setD(userRef, { data: initial }, { merge: true });
          }
          setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setData(INITIAL_DATA);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const updateData = async (newData: Partial<CRMData>) => {
    const updated = { ...data, ...newData };
    setData(updated); // Optimistic update
    
    const user = auth.currentUser;
    if (user) {
      const userRef = getDocRef(db, 'usersData', user.uid);
      
      // Firestore does not support undefined values. Strip them.
      const sanitize = (obj: any): any => {
        if (obj === undefined) return null;
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(sanitize);
        const newObj: any = {};
        for (const [key, val] of Object.entries(obj)) {
          if (val !== undefined) {
            newObj[key] = sanitize(val);
          }
        }
        return newObj;
      };
      
      const cleanData = sanitize(updated);
      
      try {
        await setD(userRef, { data: cleanData }, { merge: true });
      } catch (error) {
        console.error("Database sync error:", error);
        alert("Erro ao sincronizar com o banco de dados. A venda foi registrada apenas localmente, tente atualizar a página ou verificar sua conexão.");
      }
    }
  };

  return { data, updateData, loading };
}
