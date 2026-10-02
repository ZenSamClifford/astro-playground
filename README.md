# Astro Playground

An Astro site rendering Contensis content, used to prove patterns for building Contensis-backed sites with Astro. See [CONTEXT.md](CONTEXT.md) for the domain vocabulary and [TODO.md](TODO.md) for progress.

## 🚀 Project Structure

This is a pnpm workspace. The Astro app lives at the root and the shared content resolver lives in `packages/`.

```text
/
├── .github/workflows/
│   └── astro-block.yml            # CI for building and publishing the block
├── docker/
│   └── astro.Dockerfile           # Container build for the Astro block
├── packages/
│   └── content-resolver/          # @contensis/content-resolver workspace package
│       ├── esbuild.config.ts
│       └── src/
│           ├── framework/         # Route loaders (Astro, React, Next.js, client)
│           ├── models/            # Content type mapping and page prop types
│           ├── server/            # Node.js server helpers
│           ├── surrogate-keys/    # Surrogate key store
│           ├── index.ts
│           ├── resolver.ts
│           └── util.ts
├── public/
│   └── static/                    # Favicons and other static files
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ContentArticle/
│   │   ├── ContentPage/
│   │   ├── Forms/                 # Form selector and renderer
│   │   ├── Hero/
│   │   ├── LandingPage/           # Composer landing page template
│   │   ├── PageHome/
│   │   ├── PrimaryNavigation/
│   │   ├── SearchPage/            # Site and listing search
│   │   ├── deprecated/Search/     # Earlier search implementations
│   │   ├── ui/                    # shadcn/ui primitives
│   │   └── AppClientRouteLoader.tsx
│   ├── contensis/                 # Loaders, API proxy, navigation, surrogate keys
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   └── utils.ts
│   ├── pages/
│   │   ├── [...slug].astro        # Catch-all page route
│   │   ├── api/[...slug].ts       # API proxy route
│   │   └── form/[...formId].astro
│   ├── styles/
│   │   ├── global.css
│   │   └── typeset.css
│   ├── contensis-api.ts
│   ├── contensis.config.ts
│   ├── contensis.mappers.ts
│   ├── env.d.ts
│   ├── live.config.ts             # Astro live content collections config
│   ├── middleware.ts
│   └── search.config.ts
├── astro.config.mjs
├── biome.json                     # Formatting and linting
├── components.json                # shadcn/ui config
├── manifest.json                  # Contensis block manifest
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.json
```

To learn more about the folder structure of an Astro project, refer to [the Astro guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                                          |
| :--------------------- | :-------------------------------------------------------------- |
| `pnpm install`         | Installs dependencies for the app and workspace packages        |
| `pnpm dev`             | Starts local dev server at `localhost:4321`                     |
| `pnpm build`           | Builds `@contensis/content-resolver`, then the site to `./dist/` |
| `pnpm build:app`       | Builds only the Astro site                                      |
| `pnpm preview`         | Preview your build locally, before deploying                    |
| `pnpm format`          | Format the project with Biome                                   |
| `pnpm lint`            | Lint the project with Biome                                     |
| `pnpm check`           | Run Biome format, lint and import checks                        |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check`                |
