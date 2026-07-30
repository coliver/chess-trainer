FROM mcr.microsoft.com/playwright:v1.62.0-jammy

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .

RUN npx playwright install

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
