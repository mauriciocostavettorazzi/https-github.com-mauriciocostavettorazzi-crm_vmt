export type Cliente = {
  id: string;
  nome: string;
  documento: string;
  passaporte?: string;
  telefone: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacoes: string;
};

export type Fornecedor = {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  documento?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacoes: string;
  isFornecedorViagem?: boolean;
};

export type Venda = {
  id: string;
  cliente: string;
  tipo: 'Passagem Aérea' | 'Hotel' | 'Pacote' | 'Locação de Veículo' | 'Serviço Corporativo' | 'Seguro';
  valorBruto: number;
  comissao: number;
  formaPagamento: 'Cartão' | 'Boleto' | 'PIX' | 'Faturado';
  numeroPedido: string;
  status: 'Em aberto' | 'Confirmado' | 'Cancelado';
  observacoes: string;
  criadoEm: string;
  statusP?: boolean; // Valor pago (fornecedor)
  statusR?: boolean; // Valor recebido (cliente)
  statusV?: boolean; // Voado / Concluído
  modoLucro?: 'Comissao' | 'Custo';
  custo?: number;
  fornecedorCusto?: string;
};

export type Voo = {
  id: string;
  vendaId: string;
  ciaAerea: string;
  numeroVoo: string;
  origem: string;
  destino: string;
  dataPartida: string;
  dataChegada: string;
  localizador: string;
  passageiros: string;
  checkInDisponivel: string;
  status: 'Emitido' | 'Reemitido' | 'Cancelado' | 'Voado';
  formaEmissao?: 'Milhas' | 'Tarifa Pagante' | 'Consolidadora' | string;
  fornecedor?: string;
  agendado?: boolean;
};

export type ContaReceber = {
  id: string;
  vendaId: string;
  cliente: string;
  valor: number;
  vencimento: string;
  status: 'Pendente' | 'Recebido' | 'Atrasado';
};

export type ContaPagar = {
  id: string;
  fornecedor: string;
  categoria: 'Passagem' | 'Hotel' | 'GDS/SABRE' | 'IATA' | 'Aluguel' | 'Folha' | 'Imposto' | 'Outros';
  valor: number;
  vencimento: string;
  status: 'Pendente' | 'Pago' | 'Atrasado';
  dataPagamento?: string;
};

export type CRMData = {
  vendas: Venda[];
  voos: Voo[];
  contasReceber: ContaReceber[];
  contasPagar: ContaPagar[];
  clientes: Cliente[];
  fornecedores: Fornecedor[];
};
