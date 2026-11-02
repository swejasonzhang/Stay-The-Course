# Stay the Course: frontend

React + TypeScript app built with Vite. It talks to the Spring Boot API in [`../backend`](../backend).

```bash
npm install
npm run dev      # http://localhost:5173 (expects the API on http://localhost:8080)
npm test         # Vitest
npm run lint     # oxlint
npm run build    # production files in dist/
```

Set `VITE_API_URL` (see `.env.example`) to point at a different API; `infra/deploy.sh` sets it to the API Gateway URL.

How it's organized and how it works: [docs/05-frontend.md](../docs/05-frontend.md).
