FROM node:24.19.0-bookworm-slim AS build
WORKDIR /app
RUN npm install --global npm@11.17.0
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY runtime ./runtime
COPY tools/copy-runtime.mjs ./tools/copy-runtime.mjs
RUN npm run build && npm prune --omit=dev

FROM node:24.19.0-bookworm-slim AS runtime
ARG ENGINE_ARTIFACT_SHA256
ENV NODE_ENV=production PORT=8080 ENGINE_ARTIFACT_SHA256=${ENGINE_ARTIFACT_SHA256}
WORKDIR /app
RUN node -e "if(!/^[a-f0-9]{64}$/.test(process.env.ENGINE_ARTIFACT_SHA256||''))process.exit(1)"
RUN apt-get update \
  && apt-get install --yes --no-install-recommends python3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
# Import the actual launcher without executing its main function. The minimal
# Debian Python package lacks standard-library modules such as ctypes/resource.
RUN python3 -c "import runpy; runpy.run_path('dist/node-host/linux/job.py', run_name='dependency_check')"
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=2s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/node-host/server.js"]
