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
        cat: 'Personal finance · Web, iPhone and Android',
        name: 'Financy',
        desc: 'Personal finance tracker that runs on the web, on iPhone as a PWA and natively on Android, synced in real time, with Nubank and Mercado Pago transactions flowing in on their own through Open Finance.',
        highlights: [
          'Floating 6-step quick-entry pop-up, opened from Android Quick Settings, written in Kotlin',
          'Hourly bank import with GitHub Actions that never duplicates or overwrites manual edits',
          'Cards with limit and bill, installments, recurring entries, monthly category analysis and AI-assisted planning',
        ],
        tech: ['React 19', 'TypeScript', 'Vite', 'Tailwind', 'Recharts', 'Firebase', 'Capacitor', 'Kotlin'],
        link: { label: 'See it live', href: 'https://financy-vert.vercel.app' },
      },
      {
        id: 'vertice',
        cat: 'SaaS · Small businesses',
        name: 'O Vértice',
        desc: 'A platform for small businesses that brings together online presence, digital marketing and strategic planning. The site has a 3D carousel with five ready-made templates, each with its own identity.',
        highlights: [
          'Real templates by niche: Moraes & Vale, Aurora Derm, Brasa Norte, Impulso Fit and Nexo Prime',
          'Dashboard with leads, conversion, active campaigns and next steps, plus Basic, Professional and Premium plans',
          'Pre-rendered pages for SEO and automated tests with Vitest',
        ],
        tech: ['React 19', 'Vite', 'Tailwind', 'React Router', 'Vitest'],
        link: { label: 'See it live', href: 'https://overtice.vercel.app' },
      },
      {
        id: 'hype',
        cat: 'Real time · Mobile',
        name: 'HypeApp',
        desc: 'A crowd-sourced app that shows, in real time, the hype of each bar in Porto Alegre’s Cidade Baixa before you leave home, rated 0 to 10 by people who are already there.',
        highlights: [
          'Heat map with 3D buildings and a list that re-ranks itself, with a "Most hyped now" badge',
          'Hype score built from the average of recent ratings, limited to one every 30 minutes against abuse',
          'Points, levels and a store of avatars, frames and titles for people who keep the map alive',
        ],
        tech: ['React Native', 'Expo Router', 'TypeScript', 'Firebase', 'Google Maps'],
        link: { label: 'See the code', href: 'https://github.com/GabrielPMachado/HypeApp-Project' },
      },
      {
        id: 'dindo',
        cat: 'Management system · Bar',
        name: 'Bar do Dindo',
        desc: 'A complete system for a bar: the member loyalty app, Cérebro, a staff CRM with ten departments, and a pre-registration page, all on a single Firebase project with no server of its own.',
        highlights: [
          'Consumption logged by member number becomes points in the app and revenue in Finance, with three loyalty tiers',
          'Menu, rewards and reservations set up in the CRM show up in the app, and each redemption becomes a voucher for staff',
          'Free-grid executive dashboard and per-area permissions (view, create, edit, delete) enforced by Firestore rules',
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
