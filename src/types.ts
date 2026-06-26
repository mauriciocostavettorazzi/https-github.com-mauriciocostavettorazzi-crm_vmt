export type PessoaDocumento = {
  id: string;
  nome: string;
  tipo: 'Passaporte' | 'RG' | 'CNH' | 'Visto' | 'Contrato' | 'Outro';
  url: string;
  tamanho?: number;
  criadoEm: string;
};

// Legacy alias
export type ClienteDocumento = PessoaDocumento;

export type Pessoa = {
  id: string;
  nome: string;
  tipo: ('Passageiro' | 'Cliente' | 'Fornecedor' | 'Representante')[];
  rating?: number;
  ativo: boolean;
  // Contato
  telefone?: string;
  email?: string;
  redeSocial?: string;
  site?: string;
  chavePix?: string;
  aceitaComunicacao?: boolean;
  // Documentos
  documento?: string;
  rg?: string;
  orgaoEmissorRg?: string;
  inscricaoMunicipal?: string;
  idEstrangeiro?: string;
  nacionalidade?: string;
  estadoCivil?: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'União Estável' | '';
  passaporte?: string;
  passaporteEmissao?: string;
  passaporteValidade?: string;
  passaporteNacionalidade?: string;
  visto?: string;
  vistoValidade?: string;
  // Informações
  dataNascimento?: string;
  genero?: 'Masculino' | 'Feminino' | 'Outro' | '';
  profissao?: string;
  renda?: number;
  canalVenda?: string;
  contatoEmergenciaNome?: string;
  contatoEmergenciaTel?: string;
  // Endereço
  pais?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  // Família (vínculos com grau de parentesco)
  familia?: { id: string; grau?: string }[];
  // Documentos anexados
  documentos?: PessoaDocumento[];
  observacoes?: string;
  criadoEm?: string;
  // Fornecedor específico
  isFornecedorViagem?: boolean;
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
  pessoas: Pessoa[];
  leads: Lead[];
  // Legacy (mantidos para migração)
  clientes?: Cliente[];
  fornecedores?: Fornecedor[];
};
