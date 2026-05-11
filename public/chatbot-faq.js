/**
 * chatbot-faq.js
 * Árvore de perguntas e respostas do assistente virtual.
 * Cada nó tem:
 *   text    – mensagem exibida pelo bot
 *   options – array de botões de resposta rápida { label, next?, action? }
 *             next   → navega para outro nó
 *             action → executa ação especial ('start_tour' | 'go_page:XXX')
 */
export const FAQ_TREE = {

    /* ── Boas-vindas ──────────────────────────────────────────────────────── */
    welcome: {
        text: 'Olá! 👋 Sou o assistente virtual do Finanças. Como posso te ajudar hoje?',
        options: [
            { label: '🗺️ Tour pelo sistema', action: 'start_tour' },
            { label: '💬 Falar com assistente', next: 'main_menu' }
        ]
    },

    /* ── Menu principal ───────────────────────────────────────────────────── */
    main_menu: {
        text: 'Ótimo! Sobre qual módulo você tem dúvidas?',
        options: [
            { label: '💰 Ganhos & Gastos', next: 'income_expense' },
            { label: '📄 Contas Fixas', next: 'bills' },
            { label: '🎯 Metas', next: 'goals' },
            { label: '📈 Investimentos', next: 'investments' },
            { label: '🧠 Inteligência & Relatórios', next: 'insights' },
            { label: '❤️ Saúde Financeira', next: 'health_faq' },
            { label: '👤 Conta & Plano', next: 'account' }
        ]
    },

    /* ── Ganhos & Gastos ──────────────────────────────────────────────────── */
    income_expense: {
        text: 'Sobre Ganhos & Gastos, o que você precisa saber?',
        options: [
            { label: 'Como adicionar um ganho?', next: 'q_add_income' },
            { label: 'Como registrar um gasto?', next: 'q_add_expense' },
            { label: 'Como editar ou excluir um lançamento?', next: 'q_edit_transaction' },
            { label: 'Como filtrar por mês?', next: 'q_filter_month' },
            { label: '↩️ Voltar ao menu', next: 'main_menu' }

        ]
    },
    q_add_income: {
        text: 'No menu lateral, clique em "Ganhos" e depois em "+ Adicionar Ganho". Preencha valor, categoria, data e descrição e clique em Salvar.',
        options: [
            { label: 'Outra dúvida sobre Ganhos & Gastos', next: 'income_expense' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_add_expense: {
        text: 'Acesse "Gastos" no menu e clique em "+ Adicionar Gasto". Preencha o valor, escolha a categoria (ex: Alimentação, Transporte) e confirme.',
        options: [
            { label: 'Outra dúvida sobre Ganhos & Gastos', next: 'income_expense' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_edit_transaction: {
        text: 'Na lista de ganhos ou gastos, clique no ícone de lápis ✏️ para editar ou na lixeira 🗑️ para excluir um lançamento.',
        options: [
            { label: 'Outra dúvida sobre Ganhos & Gastos', next: 'income_expense' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_filter_month: {
        text: 'No topo da tela use os seletores de Ano e Mês. Todos os módulos atualizam automaticamente ao mudar o mês.',
        options: [
            { label: 'Outra dúvida sobre Ganhos & Gastos', next: 'income_expense' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },

    /* ── Contas Fixas ─────────────────────────────────────────────────────── */
    bills: {
        text: 'Sobre Contas Fixas, o que você precisa saber?',
        options: [
            { label: 'Como cadastrar uma conta fixa?', next: 'q_add_bill' },
            { label: 'Como marcar uma conta como paga?', next: 'q_pay_bill' },
            { label: 'O que é inadimplência?', next: 'q_default' },
            { label: 'Como desativar uma conta fixa?', next: 'q_deactivate_bill' },
            { label: '↩️ Voltar ao menu', next: 'main_menu' }
        ]
    },
    q_add_bill: {
        text: 'Vá em "Contas Fixas" e clique em "+ Adicionar Conta". Informe descrição, valor, dia de vencimento e categoria. A conta será cobrada automaticamente todo mês.',
        options: [
            { label: 'Outra dúvida sobre Contas Fixas', next: 'bills' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_pay_bill: {
        text: 'Em cada card de conta fixa há um botão "Pagar". Ao clicar, o mês atual é marcado como pago e o card muda de cor para indicar adimplência.',
        options: [
            { label: 'Outra dúvida sobre Contas Fixas', next: 'bills' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_default: {
        text: 'Inadimplência indica contas com vencimento já ultrapassado e que ainda não foram pagas no mês. O percentual aparece nos Relatórios.',
        options: [
            { label: 'Outra dúvida sobre Contas Fixas', next: 'bills' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_deactivate_bill: {
        text: 'No card da conta fixa, clique no ícone de edição ✏️ e desmarque a opção "Ativa". A conta deixa de aparecer nos meses seguintes.',
        options: [
            { label: 'Outra dúvida sobre Contas Fixas', next: 'bills' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },

    /* ── Metas ────────────────────────────────────────────────────────────── */
    goals: {
        text: 'Sobre o módulo de Metas, o que você precisa saber?',
        options: [
            { label: 'Como criar uma meta?', next: 'q_add_goal' },
            { label: 'Como registrar um aporte?', next: 'q_contribute_goal' },
            { label: 'Como acompanhar o progresso?', next: 'q_goal_progress' },
            { label: 'O que é poupar/mês?', next: 'q_monthly_saving' },
            { label: '↩️ Voltar ao menu', next: 'main_menu' }
        ]
    },
    q_add_goal: {
        text: 'Em "Metas", clique em "+ Nova Meta". Defina o nome, valor alvo, prazo (data) e categoria. A barra de progresso é calculada automaticamente.',
        options: [
            { label: 'Outra dúvida sobre Metas', next: 'goals' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_contribute_goal: {
        text: 'No card da meta, clique em "Aportar". Informe o valor e uma nota opcional. O valor é somado ao progresso e o histórico de aportes fica registrado.',
        options: [
            { label: 'Outra dúvida sobre Metas', next: 'goals' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_goal_progress: {
        text: 'A barra colorida na meta mostra a porcentagem atingida. Verde = ≥ 70%, Amarelo = ≥ 40%, Azul = início. Quando 100% é atingido a meta é concluída.',
        options: [
            { label: 'Outra dúvida sobre Metas', next: 'goals' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_monthly_saving: {
        text: 'É o valor que você precisa guardar por mês para atingir a meta no prazo. Calculado como: (Valor restante) ÷ (meses até o prazo).',
        options: [
            { label: 'Outra dúvida sobre Metas', next: 'goals' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },

    /* ── Investimentos ────────────────────────────────────────────────────── */
    investments: {
        text: 'Sobre Investimentos, o que você precisa saber?',
        options: [
            { label: 'Como adicionar um investimento?', next: 'q_add_investment' },
            { label: 'Como ver o rendimento?', next: 'q_investment_yield' },
            { label: 'Quais tipos são suportados?', next: 'q_investment_types' },
            { label: '↩️ Voltar ao menu', next: 'main_menu' }
        ]
    },
    q_add_investment: {
        text: 'Em "Investimentos", clique em "+ Adicionar Investimento". Informe o ativo, valor investido, rendimento (%) e data de aplicação.',
        options: [
            { label: 'Outra dúvida sobre Investimentos', next: 'investments' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_investment_yield: {
        text: 'O rendimento é exibido na tabela como valor em R$ e percentual. O total acumulado aparece no resumo do módulo e no Dashboard.',
        options: [
            { label: 'Outra dúvida sobre Investimentos', next: 'investments' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_investment_types: {
        text: 'Você pode cadastrar qualquer tipo: renda fixa (CDB, Tesouro), renda variável (ações, FIIs), criptomoedas, poupança e outros.',
        options: [
            { label: 'Outra dúvida sobre Investimentos', next: 'investments' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },

    /* ── Inteligência & Relatórios ────────────────────────────────────────── */
    insights: {
        text: 'Sobre Inteligência & Relatórios, o que você precisa saber?',
        options: [
            { label: 'O que é a previsão de saldo?', next: 'q_forecast' },
            { label: 'Como funciona a detecção de assinaturas?', next: 'q_subscriptions' },
            { label: 'O que é a saúde financeira?', next: 'q_health' },
            { label: 'O que são os relatórios?', next: 'q_reports' },
            { label: '↩️ Voltar ao menu', next: 'main_menu' }
        ]
    },
    q_forecast: {
        text: 'A previsão projeta seu saldo ao fim do mês baseada no ritmo de gastos diários atual. Se ficar vermelho, é sinal de alerta para reduzir despesas.',
        options: [
            { label: 'Outra dúvida sobre Inteligência', next: 'insights' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_subscriptions: {
        text: 'O sistema analisa seus gastos e contas fixas e identifica automaticamente serviços recorrentes como streamings, plataformas de IA, jogos e mais.',
        options: [
            { label: 'Outra dúvida sobre Inteligência', next: 'insights' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_health: {
        text: 'O módulo Saúde Financeira aplica a regra 50-30-20: 50% da renda para necessidades, 30% para desejos e 20% para investimentos, gerando uma pontuação de 0-100.',
        options: [
            { label: 'Outra dúvida sobre Inteligência', next: 'insights' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_reports: {
        text: 'Os Relatórios (plano Premium) trazem comparação com o mês anterior, médias históricas, inadimplência, progresso das metas e total de assinaturas.',
        options: [
            { label: 'Outra dúvida sobre Inteligência', next: 'insights' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },

    /* ── Conta & Plano ────────────────────────────────────────────────────── */
    account: {
        text: 'Sobre sua conta e plano, o que você precisa saber?',
        options: [
            { label: 'Como mudar para o plano Premium?', next: 'q_upgrade' },
            { label: 'Quais as diferenças de planos?', next: 'q_plans' },
            { label: 'Como alterar minha senha?', next: 'q_change_pass' },
            { label: 'Como sair do sistema?', next: 'q_logout' },
            { label: '↩️ Voltar ao menu', next: 'main_menu' }
        ]
    },
    q_upgrade: {
        text: 'Clique no seu avatar no canto inferior do menu lateral → "Minha Conta". Lá você encontra a opção para fazer upgrade para o plano Premium.',
        options: [
            { label: 'Outra dúvida sobre Conta', next: 'account' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_plans: {
        text: 'O plano Gratuito oferece Ganhos, Gastos, Contas Fixas, Metas e Inteligência. O Premium adiciona Dashboard, Relatórios completos e Investimentos.',
        options: [
            { label: 'Outra dúvida sobre Conta', next: 'account' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_change_pass: {
        text: 'Acesse "Minha Conta" pelo seu avatar no menu lateral. Na seção de segurança você pode alterar sua senha atual.',
        options: [
            { label: 'Outra dúvida sobre Conta', next: 'account' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_logout: {
        text: 'Clique no seu avatar no canto inferior do menu lateral e selecione "Sair". Sua sessão será encerrada com segurança.',
        options: [
            { label: 'Outra dúvida sobre Conta', next: 'account' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },

    /* ── Saúde Financeira ──────────────────────────────────────────────────── */
    health_faq: {
        text: 'Sobre Saúde Financeira, o que você precisa saber?',
        options: [
            { label: 'O que é a regra 50-30-20?', next: 'q_5030' },
            { label: 'Como é calculada a pontuação?', next: 'q_score_calc' },
            { label: 'O que são os pilares?', next: 'q_pillars' },
            { label: 'O que é o plano de melhora?', next: 'q_improve_plan' },
            { label: '↩️ Voltar ao menu', next: 'main_menu' }
        ]
    },
    q_5030: {
        text: 'A regra 50-30-20 sugere destinar 50% da renda para necessidades (contas fixas), 30% para desejos (gastos variáveis) e 20% para investimentos.',
        options: [
            { label: 'Outra dúvida sobre Saúde', next: 'health_faq' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_score_calc: {
        text: 'A pontuação de 0-100 é calculada com três pilares ponderados: Necessidades (40%), Desejos (30%) e Investimentos (30%), comparando o real com a meta ideal.',
        options: [
            { label: 'Outra dúvida sobre Saúde', next: 'health_faq' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_pillars: {
        text: 'Cada pilar mostra quanto você está usando em relação à meta. Verde = dentro da meta, Vermelho = fora da meta. O gap indica o quanto ajustar.',
        options: [
            { label: 'Outra dúvida sobre Saúde', next: 'health_faq' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    },
    q_improve_plan: {
        text: 'Se a pontuação estiver baixa, o sistema gera ações específicas por pilar (ex: reduzir contas fixas, cortar gastos). Se estiver boa, sugere formas de aprimorar ainda mais.',
        options: [
            { label: 'Outra dúvida sobre Saúde', next: 'health_faq' },
            { label: '↩️ Menu principal', next: 'main_menu' }
        ]
    }
};
