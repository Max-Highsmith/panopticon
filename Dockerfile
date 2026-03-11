FROM node:20-slim

WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --production

# Copy server code + shared modules + data
COPY server/*.js server/*.mjs ./server/
COPY js/simulation.mjs js/toolformat.mjs js/layercatalog.js ./js/
COPY scenarios/ ./scenarios/
COPY data/layers/ ./data/layers/
COPY playbacks/ ./playbacks/

# Results dir (writable at runtime)
RUN mkdir -p results

EXPOSE 3001

CMD ["node", "server/index.js"]
