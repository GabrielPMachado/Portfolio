export const pt = {
  lang: 'pt-BR',
  meta: {
    title: 'Gabriel Pinto Machado · Desenvolvedor full-stack',
    description:
      'Gabriel Pinto Machado, desenvolvedor full-stack em Porto Alegre. Apps web e mobile e sistemas em tempo real, do banco de dados ao último pixel.',
  },
  skip: 'Pular para o conteúdo',
  nav: {
    projects: 'Projetos',
    about: 'Sobre',
    contact: 'Contato',
    cta: 'Falar comigo',
    fxOn: 'Efeitos on',
    fxOff: 'Efeitos off',
    fxLabel: 'Ligar ou desligar os efeitos visuais',
    langLabel: 'Idioma',
    menu: 'Menu',
  },
  hero: {
    tag: 'Desenvolvedor full-stack · Porto Alegre',
    title: ['Sistemas que', 'rodam ao vivo.'],
    text: 'Sou o Gabriel Pinto Machado. Construo apps web e mobile e sistemas em tempo real, do banco de dados ao último pixel.',
    primary: 'Ver projetos',
    secondary: 'Falar comigo',
    data: [
      { k: 'Base', v: 'Porto Alegre, RS', clock: true },
      { k: 'Linguagens', v: 'TypeScript · Python · Kotlin' },
      { k: 'Formação', v: 'Ciência da Computação, Estácio' },
    ],
    visualLabel: 'Rede neural holográfica girando em 3D',
  },
  tech: ['TypeScript', 'React', 'React Native', 'Expo', 'Node.js', 'Firebase', 'Firestore', 'Kotlin', 'Capacitor', 'Vite', 'Tailwind', 'Python', 'Google Maps', 'GitHub Actions'],
  projects: {
    tag: 'Projetos selecionados · 04',
    title: ['A prova está', 'no que roda.'],
    privateNote: 'Código privado · demo ilustrativa',
    demoNote: 'Demo ilustrativa',
    items: [
      {
        id: 'financy',
        cat: 'Finanças pessoais · Web, iPhone e Android',
        name: 'Financy',
        desc: 'Controle financeiro pessoal que roda na web, no iPhone como PWA e no Android nativo, sincronizado em tempo real e com as transações do Nubank e do Mercado Pago entrando sozinhas via Open Finance.',
        highlights: [
          'Pop-up flutuante de lançamento rápido em 6 etapas, aberto pelas Configurações rápidas do Android, escrito em Kotlin',
          'Importação automática dos bancos de hora em hora com GitHub Actions, sem duplicar nem sobrescrever edições',
          'Cartões com limite e fatura, parcelas, recorrência, análise mensal por categoria e planejamento com IA',
        ],
        tech: ['React 19', 'TypeScript', 'Vite', 'Tailwind', 'Recharts', 'Firebase', 'Capacitor', 'Kotlin'],
        link: { label: 'Ver ao vivo', href: 'https://financy-vert.vercel.app' },
      },
      {
        id: 'vertice',
        cat: 'SaaS · Pequenas empresas',
        name: 'O Vértice',
        desc: 'Plataforma para micro e pequenas empresas que junta presença online, marketing digital e planejamento estratégico. O site tem um carrossel 3D com cinco templates prontos, cada um com identidade própria.',
        highlights: [
          'Templates reais por nicho: Moraes & Vale, Aurora Derm, Brasa Norte, Impulso Fit e Nexo Prime',
          'Painel com leads, conversão, campanhas ativas e próximos passos, além de planos Basic, Professional e Premium',
          'Páginas pré-renderizadas para SEO e testes automatizados com Vitest',
        ],
        tech: ['React 19', 'Vite', 'Tailwind', 'React Router', 'Vitest'],
        link: { label: 'Ver ao vivo', href: 'https://overtice.vercel.app' },
      },
      {
        id: 'hype',
        cat: 'Tempo real · Mobile',
        name: 'HypeApp',
        desc: 'O Waze do Rolê: um app colaborativo que mostra, em tempo real, o hype de cada bar da Cidade Baixa antes de você sair de casa, com nota de 0 a 10 dada por quem já está lá.',
        highlights: [
          'Mapa de calor com prédios em 3D e uma lista que reordena o ranking sozinha, com selo de "Mais hypado agora"',
          'Nota do Hype feita da média das avaliações recentes, com limite de uma a cada 30 minutos contra abuso',
          'Pontos, níveis e uma loja de avatares, molduras e títulos para quem mantém o mapa vivo',
        ],
        tech: ['React Native', 'Expo Router', 'TypeScript', 'Firebase', 'Google Maps'],
        link: { label: 'Ver código', href: 'https://github.com/GabrielPMachado/HypeApp-Project' },
      },
      {
        id: 'dindo',
        cat: 'Sistema de gestão · Bar',
        name: 'Bar do Dindo',
        desc: 'Sistema completo para um bar: o app do afilhado (fidelidade), o Cérebro, CRM da equipe com dez departamentos, e a página de pré-cadastro, tudo em um único projeto Firebase, sem servidor próprio.',
        highlights: [
          'Consumo lançado pelo número do afilhado vira pontos no app e receita no Financeiro, com níveis Afilhado, Compadre e Padrinho',
          'Cardápio, recompensas e reservas cadastrados no CRM aparecem no app, e o resgate vira voucher para a equipe',
          'Painel executivo em grade livre e permissões por área (ver, criar, editar, excluir) garantidas nas regras do Firestore',
        ],
        tech: ['TypeScript', 'Vite', 'Firebase', 'Firestore', 'Capacitor', 'GitHub Actions'],
        link: { label: 'Ver código', href: 'https://github.com/GabrielPMachado/BarDoDindo' },
      },
    ],
  },
  about: {
    tag: 'Sobre',
    title: ['Código organizado,', 'interface que conversa.'],
    text: 'Estudo Ciência da Computação na Estácio e construo sistemas de ponta a ponta, do modelo de dados à última animação. Gosto de problemas em tempo real, em que várias telas precisam concordar no mesmo instante.',
    principles: [
      { h: 'Estrutura antes de tudo', d: 'Camadas bem separadas, regras de acesso testadas e um projeto que outra pessoa consegue abrir e entender.' },
      { h: 'Fluxos que guiam', d: 'Etapas, confirmações e atalhos no lugar de formulários enormes. A interface conduz, o usuário não decora.' },
      { h: 'Nada de bagunça', d: 'Estado em um só lugar, dados sincronizados entre telas e nada que fique sobrando quando ninguém usa.' },
    ],
  },
  contact: {
    tag: 'Contato',
    title: ['Tem um sistema', 'pra tirar do papel?'],
    paths: [
      { k: 'Vaga', h: 'Tenho uma vaga', d: 'CLT ou PJ, presencial em Porto Alegre ou remoto. Me conta sobre o time e o produto.', cta: 'Falar sobre a vaga', subject: 'Vaga para Gabriel Pinto Machado' },
      { k: 'Projeto', h: 'Tenho um projeto', d: 'App, sistema em tempo real ou landing page. Me conta a ideia e o prazo, que eu respondo com um caminho.', cta: 'Falar sobre o projeto', subject: 'Projeto com Gabriel Pinto Machado' },
    ],
  },
  footer: { made: 'Feito com Astro, React e Three.js · Porto Alegre, RS' },
};

export type Dict = typeof pt;
