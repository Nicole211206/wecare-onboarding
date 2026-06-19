// ═══════════════════════════════════════════════════════════════
// WeCare — Perguntas do Formulário do Proprietário (modelo Airbnb)
// Usado por index.html (equipe pré-preenche) e form.html (proprietário confirma)
// tipo: 'text' | 'number' | 'textarea' | 'radio' | 'checkbox'
// ═══════════════════════════════════════════════════════════════
window.FORM_SECOES = [
  {
    secao: 'O Espaço',
    icon: 'house',
    perguntas: [
      {
        id: 'q1',
        label: 'Qual das seguintes opções descreve melhor seu espaço?',
        tipo: 'radio',
        opcoes: ['Casa', 'Apartamento', 'Pousada', 'Cabana', 'Casa ecológica', 'Fazenda', 'Casa de hóspedes']
      },
      {
        id: 'q2',
        label: 'Que tipo de espaço você oferece aos hóspedes?',
        tipo: 'radio',
        opcoes: [
          'Espaço inteiro (os hóspedes têm o lugar todo só para eles)',
          'Quarto inteiro (os hóspedes dormem em um quarto inteiro, mas algumas áreas podem ser compartilhadas)',
          'Quarto compartilhado (os hóspedes dormem em um quarto ou área comum que pode ser compartilhada)'
        ]
      },
      { id: 'q3',  label: 'Possui quantos andares o seu imóvel (casa ou apartamento)?', tipo: 'number' },
      { id: 'q80', label: 'Em qual andar fica o seu imóvel?', tipo: 'number' },
      { id: 'q4',  label: 'Se apartamento, quantos andares o prédio tem?', tipo: 'number' },
      { id: 'q82', label: 'Em qual andar ficam as áreas de lazer do condomínio? (piscina, academia, salão, etc.)', tipo: 'text' },
      { id: 'q5',  label: 'Qual o ano de construção?', tipo: 'number' },
      { id: 'q6',  label: 'Qual o tamanho do imóvel (área útil, em m²)?', tipo: 'number' },
    ]
  },
  {
    secao: 'Descrições',
    icon: 'pen',
    perguntas: [
      { id: 'q7',  label: 'Descrição do espaço: dê aos hóspedes uma ideia de como é se ficar na sua acomodação, incluindo por que eles vão adorar ficar lá.', tipo: 'textarea' },
      { id: 'q8',  label: 'O espaço: ofereça uma descrição geral da propriedade e dos cômodos para que os hóspedes saibam o que esperar.', tipo: 'textarea' },
      { id: 'q10', label: 'Descrição do bairro: compartilhe alguns destaques: o que o bairro tem de melhor e pontos de atenção, caso tenham.', tipo: 'textarea' },
      { id: 'q11', label: 'Locomoção: diga aos hóspedes como podem circular pelo bairro. Se há metrô por perto.', tipo: 'textarea' },
      {
        id: 'q12',
        label: 'Seu imóvel tem uma vista espetacular? Vistas dignas de fotos, que deixarão os hóspedes de boca aberta.',
        tipo: 'checkbox',
        opcoes: [
          'Vista para a baía', 'Vista para a praia', 'Vista para o canal',
          'Vista para o horizonte da cidade', 'Vista para o pátio', 'Vista para o jardim',
          'Vista para um campo de golfe', 'Vista para o porto', 'Vista para o lago',
          'Vista para a marina', 'Vista para as montanhas', 'Vista para o parque',
          'Vista para a piscina', 'Vista para o resort', 'Vista para o rio',
          'Vista para o mar', 'Vista para o vale', 'Vista para os vinhedos'
        ]
      },
    ]
  },
  {
    secao: 'Endereço & Acesso',
    icon: 'location-dot',
    perguntas: [
      { id: 'q83', label: 'Número de contato com o prédio (portaria ou zelador)', tipo: 'text' },
      { id: 'q9',  label: 'Por favor, confirme seu endereço completo (compartilhado com os hóspedes só após a reserva). Compartilhe também um link do Google Maps, se possível.', tipo: 'textarea' },
      { id: 'q81', label: 'Nos diga como os hóspedes fazem para acessar o imóvel. Descreva em detalhes o método de entrada: necessidade de envio de documento, aviso à portaria, fechadura eletrônica — senhas, chaves, etc.', tipo: 'textarea' },
      { id: 'q73', label: 'Acesso do hóspede: conte aos hóspedes a quais áreas do seu espaço eles terão acesso.', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Capacidade',
    icon: 'users',
    perguntas: [
      { id: 'q13', label: 'Número máximo de hóspedes para pernoite', tipo: 'number' },
      { id: 'q14', label: 'Número máximo de hóspedes para day use (visita)\nObs: considere o total (ex: 04 pernoite + 02 day use = 06 pessoas no total)', tipo: 'number' },
    ]
  },
  {
    secao: 'Cômodos',
    icon: 'door-open',
    perguntas: [
      { id: 'q15', label: 'Número de quartos', tipo: 'number' },
      { id: 'q16', label: 'Do total de quartos, quantos são suítes?', tipo: 'number' },
      { id: 'q17', label: 'Número de camas', tipo: 'number' },
      { id: 'q18', label: 'Sobre as camas, especifique:\n• tamanho (infantil, solteiro, viúvo, casal padrão, queen, king, beliche, colchão de chão, colchão de ar, etc.) e distribuição em cada quarto', tipo: 'textarea' },
      { id: 'q19', label: 'Número de banheiros completos (com vaso sanitário, pia, chuveiro e/ou banheira)', tipo: 'number' },
      { id: 'q20', label: 'Número de lavabos (somente vaso sanitário e pia)', tipo: 'number' },
      { id: 'q21', label: 'Número de salas (estar, jantar, copa, etc.)', tipo: 'number' },
      { id: 'q22', label: 'Sobre as salas, especifique:\n• quantidade de cada tipo, se há sofá-cama na(s) sala(s) de estar e tamanho das mesas para refeição (quantidade de lugares)', tipo: 'textarea' },
      { id: 'q23', label: 'Fale um pouco sobre sua cozinha: o que você mais gosta sobre ela e como os hóspedes devem utilizá-la.', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Comodidades',
    icon: 'star',
    perguntas: [
      {
        id: 'q24',
        label: 'Informe aos hóspedes o que seu espaço tem para oferecer.',
        tipo: 'checkbox',
        opcoes: [
          'Wi-Fi', 'TV', 'Cozinha', 'Máquina de lavar',
          'Estacionamento incluído', 'Estacionamento pago no local ou fora',
          'Ar-condicionado', 'Espaço de trabalho exclusivo',
          'Básico (roupas de cama e banho): toalhas, lençóis, cobertores, travesseiros, etc.',
          'Produtos de limpeza',
          'Itens básicos de cozinha: vasilhas, panelas, óleo, sal, pimenta, etc.',
          'Louças e talheres: tigelas, hashi, pratos, copos, etc.',
          'Secadora', 'Secador de cabelo', 'Aquecimento central',
          'Jacuzzi', 'Piscina', 'Banheira', 'Bidê',
          'Itens de higiene pessoal: sabonete, xampu, condicionador, papel higiênico, etc.',
          'Água quente', 'Chuveiro externo',
          'Local para guardar as roupas', 'Varal para secar roupas', 'Cabides',
          'Ferro e tábua de passar roupas', 'Mosquiteiro', 'Cortinas', 'Cofre',
          'Videogame', 'Livros', 'Equipamentos de ginástica', 'Cinema',
          'Piano ou outros instrumentos musicais', 'Tênis de mesa', 'Mesa de bilhar',
          'Sistema de som', 'Banheira de bebê', 'Babá eletrônica',
          'Sala de jogos para crianças', 'Portões de segurança para bebês',
          'Recomendação de babá', 'Jogos de tabuleiro', 'Trocador de fraldas',
          'Livros e brinquedos infantis', 'Pratos e talheres para crianças', 'Berço',
          'Protetores de lareira', 'Cadeira alta', 'Parque infantil ao ar livre',
          'Protetores de tomada', 'Cercadinho/berço portátil', 'Protetores de cantos de mesa',
          'Rede/grade de proteção nas janelas', 'Ventilador de teto',
          'Lareira interna', 'Ventiladores portáteis',
          'Alarme de monóxido de carbono', 'Extintor de incêndio',
          'Kit de primeiros socorros', 'Detector de fumaça', 'Assadeira',
          'Utensílios para churrasco: grelha, carvão, espetos, etc.',
          'Máquina de pão', 'Liquidificador', 'Café', 'Cafeteira',
          'Mesa de jantar', 'Lava-louças', 'Freezer', 'Chaleira de água quente',
          'Microondas', 'Frigobar', 'Forno', 'Refrigerador',
          'Panela elétrica de arroz', 'Fogão', 'Torradeira', 'Lixeira compactadora',
          'Taças de vinho', 'Acesso à praia', 'Acesso ao lago', 'Lavanderia',
          'Entrada privada: por outra rua ou prédio', 'Acesso ao resort',
          'Vista para as águas', 'Quintal', 'Churrasqueira',
          'Itens básicos de praia: toalhas de praia, guarda-sol, esteira, equipamento de mergulho, etc.',
          'Bicicletas', 'Rampa para barcos', 'Rede', 'Caiaque',
          'Área de jantar externa', 'Móveis externos', 'Cozinha ao ar livre',
          'Pátio ou varanda', 'Cadeira espreguiçadeira', 'Elevador',
          'Carregador de veículos elétricos', 'Academia',
          'Estacionamento pago fora da propriedade', 'Sauna', 'Casa térrea sem escadas',
          'Recomendação de café da manhã', 'Recomendação de limpeza durante a estadia',
          'Estadias de longa duração são permitidas: 28 dias ou mais',
          'É permitido deixar as malas', 'Air Fryer'
        ]
      },
    ]
  },
  {
    secao: 'Detalhes das Comodidades',
    icon: 'list-check',
    perguntas: [
      { id: 'q84', label: 'Informe aos hóspedes o que seu espaço tem para oferecer — especifique ao máximo :)', tipo: 'textarea' },
      { id: 'q85', label: 'Voltagem do imóvel', tipo: 'text' },
      { id: 'q25', label: 'WI-FI: velocidade, nome da rede, senha e se há conexão via cabo.', tipo: 'textarea' },
      { id: 'q86', label: 'Por gentileza, informe a operadora de Wi-Fi e dados do contratante. Solicitamos estes dados para caso houver algum problema de conexão no futuro, nós mesmos conseguimos acionar a operadora para resolver.', tipo: 'textarea' },
      { id: 'q26', label: 'TVs: quantidade, tamanho, se é smart e se possui TV a cabo e/ou TV aberta.', tipo: 'textarea' },
      { id: 'q27', label: 'MÁQUINA DE LAVAR: se também é secadora e se é do condomínio (há regras para utilização?) ou do imóvel', tipo: 'textarea' },
      { id: 'q28', label: 'Tem ESTACIONAMENTO incluído? Quantidade de vagas e como estacionar. Caso não tenha, há estacionamento no local ou próximo?', tipo: 'textarea' },
      { id: 'q29', label: 'AR CONDICIONADO: quantidade, localização, se é quente e/ou frio e tipo (central, portátil, de janela, split, etc.)', tipo: 'textarea' },
      { id: 'q30', label: 'ESPAÇO DE TRABALHO exclusivo: localização (quarto reservado ou área comum) e equipamentos (escrivaninha/mesa, cadeira, suporte, monitor, estabilizador, impressora, etc.)', tipo: 'textarea' },
      { id: 'q31', label: 'Roupas de cama, mesa e banho: quantidades', tipo: 'textarea' },
      { id: 'q32', label: 'JACUZZI: quantas pessoas comporta e se é do condomínio (há regras?) ou do imóvel (há manual?)', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Jacuzzi' },
      { id: 'q33', label: 'PISCINA: se é do condomínio ou no imóvel, regras para utilização e horários.', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Piscina' },
      { id: 'q34', label: 'ÁGUA QUENTE: chuveiros e torneiras? Gás e/ou eletricidade?', tipo: 'textarea' },
      { id: 'q35', label: 'Local para guardar as roupas: se é closet, cômoda ou guarda-roupas', tipo: 'textarea' },
      { id: 'q36', label: 'CORTINAS: se são manuais e/ou automáticas e o tipo (blackout, tecido comum, etc.)', tipo: 'textarea' },
      { id: 'q37', label: 'COFRE: se possui chave ou senha', tipo: 'text' },
      { id: 'q38', label: 'VIDEOGAME: modelo', tipo: 'text', dependeDe: 'q24', dependeContem: 'Videogame' },
      { id: 'q39', label: 'Equipamentos de ginástica: tipo (elíptico, pesos, bicicleta, esteira, tapete de ioga, etc.) e se é do condomínio (há regras?) ou do imóvel', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Equipamentos de ginástica' },
      { id: 'q40', label: 'PIANO E INSTRUMENTOS: tipo e se há outros instrumentos musicais (violão, guitarra, etc.)', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Piano' },
      { id: 'q41', label: 'SISTEMA DE SOM: tipo (toca-discos, home theater, receiver, caixa bluetooth, etc.) e se há manual', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Sistema de som' },
      { id: 'q42', label: 'CINEMA: se é do condomínio (há regras para utilização?) ou do imóvel', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Cinema' },
      { id: 'q43', label: 'Tênis de mesa/Mesa de bilhar: se é do condomínio (há regras?) ou do imóvel', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Tênis de mesa' },
      { id: 'q65', label: 'ACADEMIA: se é do condomínio ou dentro do imóvel. Por favor explique as regras e horários para utilização', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Academia' },
      { id: 'q66', label: 'SAUNA: se é do condomínio ou dentro do imóvel. Por favor explique as regras e horários para utilização', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Sauna' },
      { id: 'q49', label: 'TOMADAS: padrão (se antigo ou novo) e voltagem', tipo: 'text' },
      { id: 'q50', label: 'REDE/GRADE de proteção nas janelas: em todas ou apenas algumas?', tipo: 'text' },
      { id: 'q51', label: 'VENTILADOR de teto ou portátil: tipo, quantidade e localização', tipo: 'textarea' },
      { id: 'q52', label: 'LAREIRA interna: tipo (elétrica, etanol, gás, pellets, lenha, etc.) e se há combustível a disposição', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Lareira interna' },
    ]
  },
  {
    secao: 'Cozinha & Utensílios',
    icon: 'utensils',
    perguntas: [
      { id: 'q55', label: 'CAFETEIRA: tipo (cápsula/modelo, elétrica, coador, etc.) e quantidade', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Cafeteira' },
      { id: 'q56', label: 'FORNO: tipo (elétrico, gás, indução, etc.)', tipo: 'text' },
      { id: 'q57', label: 'TAÇAS DE VINHO: material (vidro, acrílico, etc.) e quantidade', tipo: 'text', dependeDe: 'q24', dependeContem: 'Taças de vinho' },
      { id: 'q54', label: 'UTENSÍLIOS para churrasco: tipo e quantidade', tipo: 'textarea', dependeDe: 'q24', dependeContem: 'Churrasqueira' },
    ]
  },
  {
    secao: 'Família & Crianças',
    icon: 'children',
    perguntas: [
      { id: 'q44', label: 'Sala de jogos para crianças: se é do condomínio (há regras?) ou do imóvel', tipo: 'textarea' },
      { id: 'q45', label: 'Recomendação de babá: se há um contato para indicar, custo aproximado e disponibilidade', tipo: 'textarea' },
      { id: 'q46', label: 'LIVROS E BRINQUEDOS infantis: faixa etária', tipo: 'text' },
      { id: 'q47', label: 'CADEIRA ALTA: tipo (independente, dobrável, assento de elevação, etc.) e características (acolchoada, com cinto, com bandeja de comida, etc.)', tipo: 'textarea' },
      { id: 'q48', label: 'Parque infantil ao ar livre: se é do condomínio (há regras?) ou do imóvel', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Área Externa & Praia',
    icon: 'umbrella-beach',
    perguntas: [
      { id: 'q58', label: 'ACESSO À PRAIA/LAGO/RIO: distância aproximada a pé e de carro e se possui acessibilidade (cadeirante, idoso, criança, etc.)', tipo: 'textarea' },
      { id: 'q59', label: 'Tem acesso ao HOTEL/RESORT anexo: se pago (valor aproximado) ou gratuito', tipo: 'textarea' },
      { id: 'q60', label: 'QUINTAL: se tem e é totalmente cercado?', tipo: 'text' },
      { id: 'q61', label: 'CHURRASQUEIRA: tipo (carvão, elétrica, gás, lenha, etc.) e se é do condomínio (há regras e horários?)', tipo: 'textarea' },
      { id: 'q62', label: 'Itens básicos de praia: quantidade e se é do condomínio (há regras?) ou do imóvel', tipo: 'textarea' },
      { id: 'q63', label: 'FOGUEIRA/PIRA: se há madeira disponível, como conseguir?', tipo: 'textarea' },
      { id: 'q64', label: 'CAIAQUE: se há oferta próxima e o valor aproximado', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Acessibilidade',
    icon: 'wheelchair',
    perguntas: [
      { id: 'q67', label: 'É um imóvel TÉRREO, sem escadas? Possui acessibilidade (cadeirante, idoso, criança, etc.)', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Serviços & Recomendações',
    icon: 'concierge-bell',
    perguntas: [
      {
        id: 'q68',
        label: 'Você tem alguma comodidade que merece destaque?',
        tipo: 'checkbox',
        opcoes: [
          'Piscina', 'Jacuzzi', 'Pátio', 'Churrasqueira',
          'Área de jantar externa', 'Fogueira', 'Mesa de bilhar',
          'Lareira interna', 'Piano ou outros instrumentos musicais',
          'Equipamento de ginástica', 'Acesso ao lago', 'Acesso à praia', 'Chuveiro externo'
        ]
      },
      { id: 'q69', label: 'Você tem recomendação de café da manhã: se há um contato para indicar, custo aproximado e disponibilidade', tipo: 'textarea' },
      { id: 'q70', label: 'Você tem recomendação de limpeza durante a estadia: se há um contato para indicar, custo aproximado e disponibilidade', tipo: 'textarea' },
      { id: 'q71', label: 'É permitido deixar as malas: se há um local reservado ou disponível antes do check-in e após o check-out', tipo: 'textarea' },
    ]
  },
  {
    secao: 'Segurança',
    icon: 'shield-halved',
    perguntas: [
      {
        id: 'q72',
        label: 'Você tem algum destes itens de segurança?',
        tipo: 'checkbox',
        opcoes: ['Detector de fumaça', 'Kit de primeiros socorros', 'Extintor de incêndio', 'Alarme de monóxido de carbono']
      },
      { id: 'q53', label: 'EXTINTOR DE INCÊNDIO: quantidade e tipo', tipo: 'text' },
      {
        id: 'q75',
        label: 'Sua acomodação tem alguma dessas opções?',
        tipo: 'checkbox',
        opcoes: ['Câmera(s) de segurança', 'Armas', 'Animais perigosos']
      },
    ]
  },
  {
    secao: 'Outras Informações',
    icon: 'circle-info',
    perguntas: [
      { id: 'q74', label: 'Outras informações importantes: inclua informações especiais que você quer que os hóspedes em potencial saibam antes de reservar e que não estejam presentes em outras configurações.', tipo: 'textarea' },
      {
        id: 'q76',
        label: '* Confirmo o envio dos dados acima',
        tipo: 'radio',
        opcoes: ['Sim']
      },
    ]
  },
];

// Lista plana de todas as perguntas (útil para lookups)
window.FORM_PERGUNTAS_FLAT = window.FORM_SECOES.flatMap(s => s.perguntas);
