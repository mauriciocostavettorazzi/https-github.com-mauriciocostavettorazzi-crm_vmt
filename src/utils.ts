import { format, addDays, isPast, isToday, startOfDay, parseISO, differenceInHours } from 'date-fns';

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const maskCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  } else {
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
};

export const maskPhone = (value: string) => {
  if (value.startsWith('+')) {
    return '+' + value.substring(1).replace(/[^\d\s()-]/g, '');
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  } else {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
};

export const sanitizePhone = (value: string) => {
  if (value.startsWith('+')) {
    return '+' + value.replace(/\D/g, '');
  }
  return value.replace(/\D/g, '');
};

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const generateCalendarLink = (voo: any, isCheckin: boolean = false) => {
  // Dates must be YYYYMMDDTHHMMSSZ (UTC) for Google Calendar
  // But without explicit timezone handling, we can pass basic UTC strings
  // or YYYYMMDDTHHMMSS for local time in Google Calendar
  
  const formatDateForGCal = (dateString: string) => {
    return new Date(dateString).toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const text = isCheckin 
    ? `⏰ Check-in disponível — ${voo.ciaAerea} ${voo.numeroVoo}`
    : `✈️ Voo ${voo.numeroVoo} — ${voo.origem} → ${voo.destino}`;

  let dates = '';
  if (isCheckin) {
    const start = formatDateForGCal(voo.checkInDisponivel);
    const endObj = new Date(voo.checkInDisponivel);
    endObj.setMinutes(endObj.getMinutes() + 30);
    const end = endObj.toISOString().replace(/-|:|\.\d\d\d/g, '');
    dates = `${start}/${end}`;
  } else {
    const start = formatDateForGCal(voo.dataPartida);
    const end = formatDateForGCal(voo.dataChegada);
    dates = `${start}/${end}`;
  }

  const details = `Passageiro: ${voo.passageiros}%0ALocalizador: ${voo.localizador}%0ACia Aérea: ${voo.ciaAerea}`;
  const location = `Aeroporto de ${voo.origem}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${dates}&details=${details}&location=${encodeURIComponent(location)}`;
};

export const calculateStatusAtrasado = (dateStr: string, status: string) => {
  if (status !== 'Pendente' && status !== 'Em dia' && status !== 'Pgto do dia' && status !== 'Atrasado') return status;
  const isLate = isPast(parseISO(dateStr)) && !isToday(parseISO(dateStr));
  if (isLate) return 'Atrasado';
  if (isToday(parseISO(dateStr))) return 'Pgto do dia';
  return 'Em dia';
};

export const parseMonetaryValue = (value: string | number): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  let str = value.trim();
  // Se tem vírgula, tratamos a vírgula como separador decimal.
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes('.')) {
    // Se tem ponto, precisamos saber se é separador de milhar ou decimal (ex: 1.500 vs 15.00)
    const parts = str.split('.');
    if (parts[parts.length - 1].length === 2) {
      // provável decimal: 1500.50
      // deixa o ultimo ponto, remove os outros
      const decimalStr = parts.pop();
      str = parts.join('') + '.' + decimalStr;
    } else {
      // provável milhar: 1.500 ou 1.500.000
      str = str.replace(/\./g, '');
    }
  }
  return Number(str) || 0;
};

export const isCheckinLiberado = (dataPartidaStr: string) => {
  if (!dataPartidaStr) return false;
  const dataPartida = new Date(dataPartidaStr);
  const now = new Date();
  const diffHoras = differenceInHours(dataPartida, now);
  // Se faltam 48 horas ou menos e o voo ainda não passou muito tempo
  return diffHoras <= 48 && diffHoras >= -24; 
};

export const getCheckinUrl = (ciaAerea: string, localizador: string = '') => {
  switch(ciaAerea?.toUpperCase()) {
    case 'AZUL': return `https://www.voeazul.com.br/br/pt/home/check-in?loc=${localizador}`;
    case 'GOL': return `https://b2c.voegol.com.br/checkin/`;
    case 'LATAM': return `https://www.latamairlines.com/br/pt/check-in?pnr=${localizador}`;
    default: return '#';
  }
};

export const formatMonetaryInput = (value: string | number): string => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseMonetaryValue(value);
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

// ── Status da viagem (derivado das datas dos produtos da venda) ───────────────
export type StatusViagem = 'Em breve' | 'Em andamento' | 'Concluído';

// Datas só-dia (YYYY-MM-DD) viram início (00:00) ou fim (23:59:59) do dia.
// Datas com hora (datetime-local "YYYY-MM-DDTHH:mm") são usadas como estão.
const parseInicioMs = (s?: string): number | null => {
  if (!s) return null;
  const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
  return isNaN(d.getTime()) ? null : d.getTime();
};
const parseFimMs = (s?: string): number | null => {
  if (!s) return null;
  const d = new Date(s.length <= 10 ? s + 'T23:59:59' : s);
  return isNaN(d.getTime()) ? null : d.getTime();
};

/**
 * Calcula o status da viagem combinando as datas de todos os produtos da venda.
 * - voos: dataPartida → dataChegada (com hora)
 * - hospedagens: checkIn → checkOut (dia inteiro)
 * - seguro: validade (dia inteiro — "em andamento" no dia, "concluído" depois)
 * - aluguel: retiradaData → devolucaoData (com hora)
 * Retorna null quando a venda não tem nenhuma data de produto.
 */
export const calcularStatusViagem = (venda: any, voos: any[] = []): StatusViagem | null => {
  const inicios: number[] = [];
  const fins: number[] = [];
  const add = (ini: number | null, fim: number | null) => {
    if (ini == null) return;
    inicios.push(ini);
    fins.push(fim ?? ini);
  };

  voos.forEach((v: any) => add(parseInicioMs(v.dataPartida), parseFimMs(v.dataChegada || v.dataPartida)));
  (venda.hospedagens || []).forEach((h: any) => add(parseInicioMs(h.checkIn), parseFimMs(h.checkOut || h.checkIn)));
  if (venda.seguro?.validade) add(parseInicioMs(venda.seguro.validade), parseFimMs(venda.seguro.validade));
  if (venda.aluguel?.retiradaData) add(parseInicioMs(venda.aluguel.retiradaData), parseFimMs(venda.aluguel.devolucaoData || venda.aluguel.retiradaData));

  if (inicios.length === 0) return null; // sem datas → indefinido

  const inicioGeral = Math.min(...inicios);
  const fimGeral = Math.max(...fins);
  const agora = Date.now();

  if (agora < inicioGeral) return 'Em breve';
  if (agora > fimGeral) return 'Concluído';
  return 'Em andamento';
};
