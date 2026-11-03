FROM node:24.19.0-bookworm@sha256:4196d66a565c6f195728d9952f161f4adfe2ad753052a08b7ec7f1c5a6bda42b
WORKDIR /opt/engine
COPY deploy/vendor/ /archives/
COPY releases/0.2.0/engine-release-0.2.0.json ./engine-release.json
COPY deploy/verify-installed.mjs ./verify-installed.mjs
RUN printf '{"private":true,"type":"module"}\n' > package.json && npm install --offline --ignore-scripts --no-audit --no-fund /archives/engine.tgz /archives/cortex.tgz /archives/colors.tgz /archives/complex.tgz
RUN node verify-installed.mjs
COPY deploy/server.mjs ./server.mjs
COPY deploy/smoke-definition.json ./smoke-definition.json
USER node
EXPOSE 3151
CMD ["node", "server.mjs"]
