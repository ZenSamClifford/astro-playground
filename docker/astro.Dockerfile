# syntax=docker/dockerfile:1
#
# The Astro app as a Contensis block. Build context is the repo root: the app lives at
# the root and packages/content-resolver is an npm workspace member, so npm needs both
# manifests and the lockfile.

# --- build stage ---
# Node 24 rather than 20: packages/content-resolver builds with `node esbuild.config.ts`,
# which relies on native TypeScript stripping (Node 22.18+). Astro itself is happy on 20.
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Manifests first so the install layer caches across source changes.
COPY package.json package-lock.json ./
COPY packages/content-resolver/package.json ./packages/content-resolver/

# --ignore-scripts is load-bearing, not caution. The root devDependency esbuild@0.27.x
# hoists its bin shim to node_modules/.bin/esbuild, and the copy nested under vite runs
# a postinstall that validates the version through that shim:
#   Error: Expected "0.25.12" but got "0.27.4"
# esbuild since 0.18 ships its platform binary as an optional dependency
# (@esbuild/linux-x64), so the JS API both builds here use resolves it without that
# script ever running. A clean install in an empty tree is what exposes this; locally it
# is masked by an already-populated node_modules.
RUN npm ci --ignore-scripts

COPY . .

# astro:env validates PUBLIC_PROJECT, PUBLIC_ACCESS_TOKEN and CONTENSIS_CMS_URL during
# the build and inlines them. CONTENSIS_API_URL is deliberately outside that schema (see
# the note in astro.config.mjs) because contensis.config.ts is reachable from client
# components, so it reads import.meta.env, which Vite also inlines at build. All four are
# therefore build args and never runtime env, and this image is specific to one Contensis
# environment. Omitting CONTENSIS_API_URL builds and starts cleanly, then 500s on the
# first page render with "You cannot specify a relative root url if not in a browser
# context".
ARG PUBLIC_PROJECT
ARG PUBLIC_ACCESS_TOKEN
ARG PUBLIC_ALIAS
ARG CONTENSIS_CMS_URL
ARG CONTENSIS_API_URL

ENV PUBLIC_PROJECT=$PUBLIC_PROJECT \
    PUBLIC_ACCESS_TOKEN=$PUBLIC_ACCESS_TOKEN \
    PUBLIC_ALIAS=$PUBLIC_ALIAS \
    CONTENSIS_CMS_URL=$CONTENSIS_CMS_URL \
    CONTENSIS_API_URL=$CONTENSIS_API_URL

# The root build script builds the package first: the app imports `.` and `/nodejs`,
# which map to dist, alongside `./framework/*`, which maps to raw src.
RUN npm run build

# The standalone adapter leaves dependencies external, so the runtime needs a real
# node_modules. Prune on the root tree, which is where npm workspaces hoists to.
RUN npm prune --omit=dev

# --- runtime stage ---
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# The workspace layout has to survive intact. node_modules/@contensis/content-resolver
# is a symlink to ../../packages/content-resolver, so the package's dist and manifest
# must land at that path or the link dangles and the server dies on startup. COPY keeps
# symlinks as symlinks, so the relative target resolves inside the image.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/content-resolver/package.json ./packages/content-resolver/
COPY --from=build /app/packages/content-resolver/dist ./packages/content-resolver/dist
COPY --from=build /app/dist ./dist

# Image root, not WORKDIR. Confirmed against the deployed CRB image: the manifest sits
# at / and nowhere else, even though that image's WORKDIR is /usr/src/app. A manifest in
# the wrong place fails quietly, taking enableFullUriRouting with it.
COPY manifest.json /manifest.json

# 3001 is the block default and what the CRB image exposes. The node adapter otherwise
# listens on 4321 bound to localhost, which leaves the container up but unreachable.
ENV HOST=0.0.0.0 \
    PORT=3001
EXPOSE 3001

LABEL org.opencontainers.image.source="https://github.com/ZenSamClifford/astro-playground"

USER node
CMD ["node", "./dist/server/entry.mjs"]
