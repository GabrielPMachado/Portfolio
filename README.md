# Portfólio · Gabriel Pinto Machado

Site pessoal em Astro + React + Three.js, em português (`/`) e inglês (`/en/`).

## Rodar

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/
```

## Estrutura

- `src/i18n/pt.ts` e `src/i18n/en.ts`: todos os textos do site. Para mudar um texto, edite aqui.
- `src/components/Page.astro`: as seções (hero, projetos, sobre, contato).
- `src/components/NeuralNet.tsx`: a rede neural 3D do topo.
- `src/components/demos/`: as demos animadas de cada projeto (ilustrativas).
- `src/scripts/fx.ts`: o bando de cursores que monta cada bloco, o texto embaralhado, o botão de efeitos e o relógio.

## Efeitos

- Os cursores aparecem na abertura e quando cada bloco entra na tela, depois somem.
- O botão "Efeitos" no menu desliga tudo e a escolha fica salva no navegador.
- Com `prefers-reduced-motion`, nada se mexe e o conteúdo aparece direto.

## Deploy

Pensado para a Vercel: importar o repositório, framework Astro, sem variáveis de ambiente.
