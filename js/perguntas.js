// ═══════════════════════════════════════════════════════════════
// WeCare — Perguntas do Formulário do Proprietário (modelo Airbnb)
// Usado por index.html (equipe pré-preenche) e form.html (proprietário confirma)
// tipo: 'text' | 'number' | 'textarea' | 'select'
// ═══════════════════════════════════════════════════════════════
window.FORM_SECOES = [
  {
    secao: 'O Espaço',
    icon: 'house',
    perguntas: [
      { id: 'q1',  label: 'Qual das seguintes opções descreve melhor seu espaço?', tipo: 'text' },
      { id: 'q2',  label: 'Que tipo de espaço você oferece aos hóspedes?', tipo: 'text' },
      { id: 'q3',  label: 'Quantos andares tem o seu imóvel (casa ou apartamento)?', tipo: 'text' },
      { id: 'q80', label: 'Em qual andar fica o seu imóvel?', tipo: 'text' },
      { id: 'q4',  label: 'Se apartamento, quantos andares o prédio tem?', tipo: 'text' },
      { id: 'q5',  label: 'Qual o ano de construção?', tipo: 'text' },
      { id: 'q6',  label: 'Qual o tamanho do imóvel (área útil, em m²)?', tipo: 'text' },
    ]
  },
  {
    secao: 'Descrições',
    icon: 'pen',
    perguntas: [
      { id: 'q7',  label: 'Descrição do espaço: por que os hóspedes vão adorar ficar lá.', tipo: 'textarea' },
      { id: 'q8',  label: 'O espaço: descrição geral da propriedade e dos cômodos.', tipo: 'textarea' },
      { id: 'q10', label: 'Descrição do bairro: destaques e pontos de atenção.', tipo: 'textarea' },
      { id: 'q11', label: 'Locomoção: como circular pelo bairro, metrô por perto, etc.', tipo: 'textarea' },
      { id: 'q12', label: 'O imóvel tem uma vista espetacular? Descreva.', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Endereço & Acesso',
    icon: 'location-dot',
    perguntas: [
      { id: 'q9',  label: 'Endereço completo + link do Google Maps (compartilhado só após reserva).', tipo: 'textarea' },
      { id: 'q81', label: 'Como os hóspedes fazem para acessar o imóvel?', tipo: 'textarea' },
      { id: 'q73', label: 'Acesso do hóspede: a quais áreas do espaço eles terão acesso.', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Capacidade',
    icon: 'users',
    perguntas: [
      { id: 'q13', label: 'Número máximo de hóspedes para pernoite', tipo: 'number' },
      { id: 'q14', label: 'Número máximo de hóspedes para day use (visita)', tipo: 'number' },
    ]
  },
  {
    secao: 'Cômodos',
    icon: 'door-open',
    perguntas: [
      { id: 'q15', label: 'Número de quartos', tipo: 'number' },
      { id: 'q16', label: 'Do total de quartos, quantos são suítes?', tipo: 'number' },
      { id: 'q17', label: 'Número de camas', tipo: 'number' },
      { id: 'q18', label: 'Sobre as camas, especifique (tipos e tamanhos)', tipo: 'textarea' },
      { id: 'q19', label: 'Número de banheiros completos', tipo: 'number' },
      { id: 'q20', label: 'Número de lavabos (só vaso e pia)', tipo: 'number' },
      { id: 'q21', label: 'Número de salas (estar, jantar, copa, etc.)', tipo: 'number' },
      { id: 'q22', label: 'Sobre as salas, especifique', tipo: 'textarea' },
      { id: 'q23', label: 'Fale um pouco sobre sua cozinha', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Comodidades Principais',
    icon: 'star',
    perguntas: [
      { id: 'q24', label: 'O que seu espaço tem para oferecer (resumo de comodidades)', tipo: 'textarea' },
      { id: 'q25', label: 'WI-FI: velocidade, nome da rede, senha e se há conexão via cabo', tipo: 'textarea' },
      { id: 'q26', label: 'TVs: quantidade, tamanho, se é smart, TV a cabo/aberta', tipo: 'textarea' },
      { id: 'q27', label: 'Máquina de lavar: se é secadora, se é do condomínio ou do imóvel', tipo: 'textarea' },
      { id: 'q28', label: 'Estacionamento: incluído? Quantas vagas e como estacionar', tipo: 'textarea' },
      { id: 'q29', label: 'Ar condicionado: quantidade, localização, quente/frio e tipo', tipo: 'textarea' },
      { id: 'q30', label: 'Espaço de trabalho exclusivo: localização e equipamentos', tipo: 'textarea' },
      { id: 'q31', label: 'Roupas de cama, mesa e banho: quantidades', tipo: 'textarea' },
      { id: 'q34', label: 'Água quente: chuveiros e torneiras? Gás e/ou eletricidade?', tipo: 'textarea' },
      { id: 'q35', label: 'Local para guardar roupas: closet, cômoda ou guarda-roupas', tipo: 'textarea' },
      { id: 'q36', label: 'Cortinas: manuais e/ou automáticas, tipo (blackout, etc.)', tipo: 'textarea' },
      { id: 'q37', label: 'Cofre: chave ou senha', tipo: 'text' },
      { id: 'q49', label: 'Tomadas: padrão (antigo/novo) e voltagem', tipo: 'text' },
      { id: 'q50', label: 'Rede/grade de proteção nas janelas: todas ou algumas?', tipo: 'text' },
      { id: 'q51', label: 'Ventilador: tipo, quantidade e localização', tipo: 'textarea' },
      { id: 'q52', label: 'Lareira interna: tipo e se há combustível disponível', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Cozinha & Utensílios',
    icon: 'utensils',
    perguntas: [
      { id: 'q55', label: 'Cafeteira: tipo (cápsula/modelo, elétrica, coador) e quantidade', tipo: 'textarea' },
      { id: 'q56', label: 'Forno: tipo (elétrico, gás, indução, etc.)', tipo: 'text' },
      { id: 'q57', label: 'Taças de vinho: material e quantidade', tipo: 'text' },
      { id: 'q54', label: 'Utensílios para churrasco: tipo e quantidade', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Lazer & Equipamentos',
    icon: 'gamepad',
    perguntas: [
      { id: 'q32', label: 'Jacuzzi: capacidade e se é do condomínio ou do imóvel', tipo: 'textarea' },
      { id: 'q33', label: 'Piscina: condomínio ou imóvel, regras e horários', tipo: 'textarea' },
      { id: 'q38', label: 'Videogame: modelo', tipo: 'text' },
      { id: 'q39', label: 'Equipamentos de ginástica: tipo e se é condomínio/imóvel', tipo: 'textarea' },
      { id: 'q40', label: 'Piano e instrumentos: tipo e outros instrumentos', tipo: 'textarea' },
      { id: 'q41', label: 'Sistema de som: tipo e se há manual', tipo: 'textarea' },
      { id: 'q42', label: 'Cinema: se é do condomínio ou do imóvel', tipo: 'textarea' },
      { id: 'q43', label: 'Tênis de mesa/bilhar: condomínio ou imóvel', tipo: 'textarea' },
      { id: 'q65', label: 'Academia: condomínio ou imóvel, regras e horários', tipo: 'textarea' },
      { id: 'q66', label: 'Sauna: condomínio ou imóvel, regras e horários', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Família & Crianças',
    icon: 'children',
    perguntas: [
      { id: 'q44', label: 'Sala de jogos para crianças: condomínio ou imóvel', tipo: 'textarea' },
      { id: 'q45', label: 'Recomendação de babá: contato, custo e disponibilidade', tipo: 'textarea' },
      { id: 'q46', label: 'Livros e brinquedos infantis: faixa etária', tipo: 'text' },
      { id: 'q47', label: 'Cadeira alta: tipo e características', tipo: 'textarea' },
      { id: 'q48', label: 'Parque infantil ao ar livre: condomínio ou imóvel', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Área Externa & Praia',
    icon: 'umbrella-beach',
    perguntas: [
      { id: 'q58', label: 'Acesso à praia/lago/rio: distância e acessibilidade', tipo: 'textarea' },
      { id: 'q59', label: 'Acesso a hotel/resort anexo: pago ou gratuito', tipo: 'textarea' },
      { id: 'q60', label: 'Quintal: tem? É totalmente cercado?', tipo: 'text' },
      { id: 'q61', label: 'Churrasqueira: tipo e se é condomínio ou imóvel', tipo: 'textarea' },
      { id: 'q62', label: 'Itens básicos de praia: quantidade e condomínio/imóvel', tipo: 'textarea' },
      { id: 'q63', label: 'Fogueira/pira: há madeira disponível? Como conseguir?', tipo: 'textarea' },
      { id: 'q64', label: 'Caiaque: oferta próxima e valor aproximado', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Acessibilidade',
    icon: 'wheelchair',
    perguntas: [
      { id: 'q67', label: 'É térreo, sem escadas? Possui acessibilidade?', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Serviços & Recomendações',
    icon: 'concierge-bell',
    perguntas: [
      { id: 'q68', label: 'Alguma comodidade que merece destaque?', tipo: 'textarea' },
      { id: 'q69', label: 'Recomendação de café da manhã: contato, custo e disponibilidade', tipo: 'textarea' },
      { id: 'q70', label: 'Recomendação de limpeza durante a estadia: contato e custo', tipo: 'textarea' },
      { id: 'q71', label: 'É permitido deixar malas antes do check-in / após check-out?', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Segurança',
    icon: 'shield-halved',
    perguntas: [
      { id: 'q53', label: 'Extintor de incêndio: quantidade e tipo', tipo: 'text' },
      { id: 'q72', label: 'Quais itens de segurança você tem? (detector de fumaça, CO, etc.)', tipo: 'textarea' },
      { id: 'q75', label: 'Sua acomodação tem alguma opção especial de segurança?', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Outras Informações',
    icon: 'circle-info',
    perguntas: [
      { id: 'q74', label: 'Outras informações importantes para os hóspedes saberem.', tipo: 'textarea' },
    ]
  },
];

// Lista plana de todas as perguntas (útil para lookups)
window.FORM_PERGUNTAS_FLAT = window.FORM_SECOES.flatMap(s => s.perguntas);
