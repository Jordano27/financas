##Aviso de conta a vencer e vencida

node -e "import('./src/automacoes/automacoes_email/scheduler.js').then(m => m.verificarAvisosVencimento())"

##Relatório mensal - saúde financeira

node -e "import('./src/automacoes/automacoes_email/scheduler.js').then(m => m.enviarRelatorioMensal())"

##Verificar metas concluídas

node -e "import('./src/automacoes/automacoes_email/scheduler.js').then(m => m.verificarMetasConcluidas())"

##Relatório de investimentos

node -e "import('./src/automacoes/automacoes_email/scheduler.js').then(m => m.enviarRelatorioInvestimentos())"