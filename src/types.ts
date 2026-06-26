export type ClienteDocumento = {
  id: string;
  nome: string;
  tipo: 'Passaporte' | 'RG' | 'CNH' | 'Visto' | 'Outro';
  url: string;
  tamanho?: number;
  criadoEm: string;
};

export type Cliente = {
  id: string;
  nome: string;
  documento: string;
  passaporte?: string;
  passaporteValidade?: string;
  nacionalidade?: string;
  dataNascimento?: string;
  genero?: 'Masculino' | 'Feminino' | 'Outro' | '';
  profissao?: string;
  telefone: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  contatoEmergenciaNome?: string;
  contatoEmergenciaTel?: string;
  observacoes: string;
  documentos?: ClienteDocumento[];
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

export type HospedagemItem = {
  id: string;
  nome: string;
  plataforma: 'Booking.com' | 'Airbnb' | 'Direto' | 'Expedia' | 'Outro';
  voucher: string;
  checkIn: string;
  checkOut: string;
  quartos: number;
  tipoQuarto: string;
  regimeAlimentar: 'Sem Refeição' | 'Café da Manhã' | 'Meia Pensão' | 'All-Inclusive';
  cidade: string;
  observacoes: string;
};

export type Lead = {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  interesse: string;
  destino?: string;
  orcamento?: number;
  stage: 'novo' | 'contato' | 'proposta' | 'aprovacao' | 'fechado' | 'perdido';
  criadoEm: string;
  atualizadoEm: string;
  observacoes?: string;
  origem?: 'WhatsApp' | 'Instagram' | 'Indicação' | 'Site' | 'Outro';
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
  statusP?: boolean;
  statusR?: boolean;
  statusV?: boolean;
  modoLucro?: 'Comissao' | 'Custo';
  custo?: number;
  fornecedorCusto?: string;
  hospedagens?: HospedagemItem[];
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
  leads: Lead[];
};
