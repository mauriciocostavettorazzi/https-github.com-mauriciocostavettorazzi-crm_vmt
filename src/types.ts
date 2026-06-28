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
  // Classificação jurídica
  pessoaJuridica?: boolean;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  // Contato
  ddi?: string;
  // Passaportes múltiplos
  passaportes?: PassaporteItem[];
};

export type PassaporteItem = {
  id: string;
  numero: string;
  emissao: string;
  validade: string;
  pais: string;
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

export type VendaTarefa = {
  id: string;
  titulo: string;
  feita: boolean;
  prazo?: string;
  criadoEm: string;
};

export type SeguroViagem = {
  seguradora: string;
  apolice: string;
  cobertura?: string;
  validade?: string;
  valor?: number;
};

export type AluguelCarro = {
  empresa: string;
  voucher?: string;
  modelo?: string;
  retiradaLocal?: string;
  retiradaData?: string;
  devolucaoLocal?: string;
  devolucaoData?: string;
  observacoes?: string;
};

export type Cotacao = {
  id: string;
  cliente: string;
  destino: string;
  tipo: 'Passagem Aérea' | 'Hotel' | 'Pacote' | 'Locação de Veículo' | 'Serviço Corporativo' | 'Seguro';
  periodoIda: string;
  periodoVolta?: string;
  adultos: number;
  criancas?: number;
  valorEstimado?: number;
  status: 'Em cotação' | 'Enviada' | 'Aprovada' | 'Recusada' | 'Expirada';
  prazoValidade?: string;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type Comissao = {
  id: string;
  vendaId?: string;
  fornecedor: string;
  descricao?: string;
  valorEsperado: number;
  valorRecebido?: number;
  dataEsperada?: string;
  dataRecebida?: string;
  status: 'Pendente' | 'Recebida' | 'Parcial' | 'Cancelada';
  observacoes?: string;
  criadoEm: string;
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
  aluguel?: AluguelCarro;
  // Novos campos
  passageiros?: { pessoaId: string; nome: string }[];
  destinos?: string[];
  tarefas?: VendaTarefa[];
  seguro?: SeguroViagem;
  documentos?: PessoaDocumento[];
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

export type PagamentoConta = {
  data: string;
  valor: number;
};

export type ContaReceber = {
  id: string;
  vendaId: string;
  cliente: string;
  valor: number;          // valor original do título
  vencimento: string;
  status: 'Pendente' | 'Recebido' | 'Atrasado' | 'Parcial';
  dataRecebimento?: string;
  pagamentos?: PagamentoConta[];  // histórico de abatimentos
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

export type MensagemWpp = {
  id: string;
  tipo: 'pre-viagem' | 'pos-viagem' | 'aniversario' | 'manual';
  pessoaNome: string;
  telefone: string;
  mensagem: string;
  vendaId?: string;
  vooId?: string;
  status: 'pendente' | 'enviada' | 'ignorada';
  criadoEm: string;
  enviadaEm?: string;
};

export type TemplateWpp = {
  id: string;
  nome: string;
  tipo: MensagemWpp['tipo'];
  texto: string;
};

export type CRMData = {
  vendas: Venda[];
  voos: Voo[];
  contasReceber: ContaReceber[];
  contasPagar: ContaPagar[];
  pessoas: Pessoa[];
  leads: Lead[];
  cotacoes: Cotacao[];
  comissoes: Comissao[];
  mensagensWpp: MensagemWpp[];
  templatesWpp: TemplateWpp[];
  // Módulo Acompanhamento
  pacotes?: any[];
  hospedagensAvulsas?: any[];
  cruzeiros?: any[];
  segurosAvulsos?: any[];
  carrosLocados?: any[];
  // Legacy (mantidos para migração)
  clientes?: Cliente[];
  fornecedores?: Fornecedor[];
};
