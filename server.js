import app from './src/app.js';
import { initScheduler } from './src/jobs/scheduler.js';
import { runMigrations } from './src/utils/migracoes.js';

const PORT = process.env.PORT || 3000;

runMigrations();

app.listen(PORT, () => {
    console.log(`\n  💰  Gerenciador Financeiro  →  http://localhost:${PORT}\n`);
    initScheduler();
});
