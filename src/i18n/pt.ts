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
        cat: 'Finanças pessoais · Android',
        name: 'Financy',
        desc: 'App de finanças que começou como PWA e virou app Android nativo, com um atalho que abre um lançamento rápido por cima de qualquer app.',
        highlights: [
          'Overlay flutuante acionado pelas Configurações rápidas, com plugin Capacitor escrito em Kotlin',
          'Lançamento em etapas, cartões vinculados e saldo acumulado',
        ],
        tech: ['React', 'Vite', 'TypeScript', 'Firebase', 'Tailwind', 'Capacitor', 'Kotlin'],
        link: { label: 'Ver ao vivo', href: 'https://financy-vert.vercel.app' },
      },
      {
        id: 'vertice',
        cat: 'SaaS · Landing page',
        name: 'O Vértice',
        desc: 'Landing page de um SaaS de sites prontos, com um carrossel 3D que apresenta cinco modelos por nicho.',
        highlights: [
          'Carrossel 3D em perspectiva com cinco modelos, indicadores na cor de cada um',
          'Fase de design colaborativo antes da primeira linha de código',
          'Paleta ciano, azul e roxo',
        ],
        tech: ['Vite', 'React', 'Tailwind'],
        link: { label: 'Ver ao vivo', href: 'https://overtice.vercel.app' },
      },
      {
        id: 'hype',
        cat: 'Tempo real · Mobile',
        name: 'HypeApp',
        desc: 'O Waze do Rolê: um app colaborativo que mostra, em tempo real, como está o movimento de cada bar da Cidade Baixa antes de você sair de casa.',
        highlights: [
          'Mapa de calor por geolocalização e ranking dos lugares',
          'Status atualizado em dois toques: tranquilo, movimentado ou lotado',
          'Parceria com os bares via QR code nas mesas',
        ],
        tech: ['React Native', 'Expo', 'Firebase', 'Google Maps', 'TypeScript'],
        link: { label: 'Ver código', href: 'https://github.com/GabrielPMachado/HypeApp-Project' },
      },
      {
        id: 'dindo',
        cat: 'Sistema de gestão · Bar',
        name: 'Bar do Dindo',
        desc: 'Sistema completo para um bar: app de fidelidade do cliente, CRM da equipe e página de pré-cadastro, tudo em um único projeto Firebase, sem servidor próprio.',
        highlights: [
          'Consumo lançado no CRM vira pontos no app e receita no financeiro',
          'Recompensas, reservas e cardápio sincronizados entre app e CRM',
          'Permissões por área garantidas nas regras do Firestore, testadas no CI',
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
