import type { Dict } from './pt';

export const en: Dict = {
  lang: 'en',
  meta: {
    title: 'Gabriel Pinto Machado · Full-stack developer',
    description:
      'Gabriel Pinto Machado, full-stack developer in Porto Alegre, Brazil. Web and mobile apps and real-time systems, from the database to the last pixel.',
  },
  skip: 'Skip to content',
  nav: {
    projects: 'Projects',
    about: 'About',
    contact: 'Contact',
    cta: 'Get in touch',
    fxOn: 'Effects on',
    fxOff: 'Effects off',
    fxLabel: 'Turn visual effects on or off',
    langLabel: 'Language',
    menu: 'Menu',
  },
  hero: {
    tag: 'Full-stack developer · Porto Alegre, Brazil',
    title: ['Systems that', 'run live.'],
    text: "I'm Gabriel Pinto Machado. I build web and mobile apps and real-time systems, from the database to the last pixel.",
    primary: 'See projects',
    secondary: 'Get in touch',
    data: [
      { k: 'Based in', v: 'Porto Alegre, Brazil', clock: true },
      { k: 'Languages', v: 'TypeScript · Python · Kotlin' },
      { k: 'Education', v: 'Computer Science, Estácio' },
    ],
    visualLabel: 'Holographic neural network rotating in 3D',
  },
  tech: ['TypeScript', 'React', 'React Native', 'Expo', 'Node.js', 'Firebase', 'Firestore', 'Kotlin', 'Capacitor', 'Vite', 'Tailwind', 'Python', 'Google Maps', 'GitHub Actions'],
  projects: {
    tag: 'Selected work · 04',
    title: ['The proof is', 'in what runs.'],
    privateNote: 'Private code · illustrative demo',
    demoNote: 'Illustrative demo',
    items: [
      {
        id: 'financy',
        cat: 'Personal finance · Android',
        name: 'Financy',
        desc: 'A finance app that started as a PWA and became a native Android app, with a shortcut that opens a quick entry on top of any app.',
        highlights: [
          'Floating overlay triggered from Quick Settings, through a Capacitor plugin written in Kotlin',
          'Step-by-step entries, linked cards and running balance',
        ],
        tech: ['React', 'Vite', 'TypeScript', 'Firebase', 'Tailwind', 'Capacitor', 'Kotlin'],
        link: { label: 'See it live', href: 'https://financy-vert.vercel.app' },
      },
      {
        id: 'vertice',
        cat: 'SaaS · Landing page',
        name: 'O Vértice',
        desc: 'Landing page for a ready-made websites SaaS, with a 3D carousel that presents five templates by niche.',
        highlights: [
          '3D perspective carousel with five templates, indicators in each one’s color',
          'Collaborative design phase before the first line of code',
          'Cyan, blue and purple palette',
        ],
        tech: ['Vite', 'React', 'Tailwind'],
        link: { label: 'See it live', href: 'https://overtice.vercel.app' },
      },
      {
        id: 'hype',
        cat: 'Real time · Mobile',
        name: 'HypeApp',
        desc: 'A crowd-sourced app that shows, in real time, how busy each bar in Porto Alegre’s Cidade Baixa is before you leave home.',
        highlights: [
          'Geolocated heat map and a ranking of places',
          'Status updated in two taps: quiet, busy or packed',
          'Bar partnerships through QR codes on the tables',
        ],
        tech: ['React Native', 'Expo', 'Firebase', 'Google Maps', 'TypeScript'],
        link: { label: 'See the code', href: 'https://github.com/GabrielPMachado/HypeApp-Project' },
      },
      {
        id: 'dindo',
        cat: 'Management system · Bar',
        name: 'Bar do Dindo',
        desc: 'A complete system for a bar: a customer loyalty app, a staff CRM and a pre-registration page, all on a single Firebase project with no server of its own.',
        highlights: [
          'Consumption logged in the CRM becomes points in the app and revenue in finance',
          'Rewards, reservations and menu kept in sync between app and CRM',
          'Per-area permissions enforced by Firestore rules, tested in CI',
        ],
        tech: ['TypeScript', 'Vite', 'Firebase', 'Firestore', 'Capacitor', 'GitHub Actions'],
        link: { label: 'See the code', href: 'https://github.com/GabrielPMachado/BarDoDindo' },
      },
    ],
  },
  about: {
    tag: 'About',
    title: ['Organized code,', 'interfaces that talk.'],
    text: 'I study Computer Science at Estácio and build systems end to end, from the data model to the last animation. I like real-time problems, where several screens have to agree at the same instant.',
    principles: [
      { h: 'Structure first', d: 'Clear layers, tested access rules and a project someone else can open and understand.' },
      { h: 'Flows that guide', d: 'Steps, confirmations and shortcuts instead of huge forms. The interface leads; the user doesn’t memorize.' },
      { h: 'No clutter', d: 'State in one place, data in sync across screens and nothing left lying around when nobody uses it.' },
    ],
  },
  contact: {
    tag: 'Contact',
    title: ['Got a system', 'to get off the ground?'],
    paths: [
      { k: 'Job', h: 'I have a role', d: 'Full-time or contract, on-site in Porto Alegre or remote. Tell me about the team and the product.', cta: 'Talk about the role', subject: 'Role for Gabriel Pinto Machado' },
      { k: 'Project', h: 'I have a project', d: 'An app, a real-time system or a landing page. Tell me the idea and the timeline and I’ll reply with a plan.', cta: 'Talk about the project', subject: 'Project with Gabriel Pinto Machado' },
    ],
  },
  footer: { made: 'Built with Astro, React and Three.js · Porto Alegre, Brazil' },
};
