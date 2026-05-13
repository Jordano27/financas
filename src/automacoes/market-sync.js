/**
 * market-sync.js
 * Busca cotações reais de mercado e atualiza o currentValue de cada investimento.
 *
 * Tipos suportados:
 *   stock    → brapi.dev (ações e FIIs da B3)
 *   crypto   → CoinGecko (criptomoedas, retorno em BRL)
 *   cdi      → BCB/BACEN (CDI acumulado × % contratado)
 *   tesouro  → B3/Tesouro Direto (PU do título)
 *   manual   → não atualiza automaticamente
 */

import { listUsers, findUserById } from '../users.js';
import { getInvestments, updateInvestmentCurrentValue } from '../transactions.js';

// ── Helpers de fetch com timeout ──────────────────────────────────────────────

async function fetchJSON(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

// ── Cotadores por tipo ────────────────────────────────────────────────────────

/** Ações e FIIs — brapi.dev (gratuito, sem chave) */
async function fetchStock(ticker) {
    const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?range=1d&interval=1d&fundamental=false`;
    const data = await fetchJSON(url);
    const result = data?.results?.[0];
    if (!result || result.regularMarketPrice == null)
        throw new Error(`Ticker "${ticker}" não encontrado na brapi.dev`);
    return result.regularMarketPrice;
}

/** Criptomoedas — CoinGecko (gratuito, sem chave) */
async function fetchCrypto(coinId) {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=brl`;
    const data = await fetchJSON(url);
    const price = data?.[coinId]?.brl;
    if (price == null) throw new Error(`Coin "${coinId}" não encontrado na CoinGecko`);
    return price;
}

/**
 * Renda Fixa CDI — BCB API (série 12 = CDI over diário)
 * Calcula o valor corrigido pelo CDI acumulado desde startDate.
 * rateInfo: { type: 'CDI', rate: 110 }  → 110% do CDI
 */
/** Erro especial: API não tem dados para o período ainda */
class NoDataYetError extends Error {
    constructor(msg) { super(msg); this.noData = true; }
}

async function fetchCDI(initialAmount, startDate, rateInfo) {
    const pct = (rateInfo?.rate ?? 100) / 100; // ex: 1.10 para 110% CDI

    // BCB publica as taxas CDI do dia somente no dia seguinte.
    // Se o investimento começou hoje ou no futuro, ainda não há rendimento acumulado.
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (startDate >= todayStr) throw new NoDataYetError('Dados do CDI ainda não disponíveis para hoje');

    const dataInicio = startDate.replaceAll('-', '/').split('/').reverse().join('/'); // dd/mm/yyyy
    const hoje = new Date().toLocaleDateString('pt-BR').replaceAll('/', '/');
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${dataInicio}&dataFinal=${hoje}`;

    let data;
    try {
        data = await fetchJSON(url);
    } catch (err) {
        // 404 = sem dados para o período (ex: iniciou ontem, BCB ainda não publicou)
        if (err.message.includes('404')) throw new NoDataYetError('BCB ainda não publicou os dados do CDI para este período');
        throw err;
    }

    // Array vazio = período sem dados úteis ainda
    if (!Array.isArray(data) || !data.length) throw new NoDataYetError('BCB sem dados CDI para o período');

    // Acumula (1 + taxa_diária * pct)
    let fator = 1;
    for (const entry of data) {
        const taxa = parseFloat(entry.valor.replace(',', '.')) / 100;
        fator *= (1 + taxa * pct);
    }
    return initialAmount * fator;
}

/**
 * Tesouro Direto — API pública B3
 * marketId deve ser o nome exato do título, ex: "Tesouro IPCA+ 2029"
 */
async function fetchTesouro(titleName, initialAmount) {
    const url = 'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/component/app/rates/json/index.json';
    const data = await fetchJSON(url);
    const bonds = data?.response?.TrsrBdTradgList;
    if (!Array.isArray(bonds)) throw new Error('API Tesouro sem dados');
    const found = bonds.find(b =>
        b.TrsrBd?.nm?.toLowerCase().includes(titleName.toLowerCase())
    );
    if (!found) throw new Error(`Título "${titleName}" não encontrado no Tesouro Direto`);
    const pu = parseFloat(found.TrsrBd.untrRedVal); // PU de resgate
    // currentValue = (initialAmount / PU_inicial) * PU_atual
    // Como não temos o PU inicial, retornamos o PU atual para o frontend exibir
    // O usuário informa a quantidade de títulos em rateInfo.quantity
    const qty = found._qty || 1; // fallback
    return pu * qty;
}

// ── Sync de um único investimento ─────────────────────────────────────────────

async function syncOne(inv) {
    const { marketType, marketId, initialAmount, startDate, rateInfo } = inv;

    switch (marketType) {
        case 'stock': {
            if (!marketId) throw new Error('marketId (ticker) obrigatório para stock');
            // Para ações: currentValue = preço_atual × quantidade
            const qty = rateInfo?.quantity ?? 1;
            const price = await fetchStock(marketId);
            return price * qty;
        }
        case 'crypto': {
            if (!marketId) throw new Error('marketId (coin id) obrigatório para crypto');
            const qty = rateInfo?.quantity ?? 1;
            const price = await fetchCrypto(marketId);
            return price * qty;
        }
        case 'cdi': {
            return await fetchCDI(initialAmount, startDate, rateInfo);
        }
        case 'tesouro': {
            if (!marketId) throw new Error('marketId (nome do título) obrigatório para tesouro');
            return await fetchTesouro(marketId, initialAmount);
        }
        default:
            return null; // manual — não sincroniza
    }
}

// ── Sync de todos os usuários ─────────────────────────────────────────────────

export async function syncInvestmentValues() {
    console.log('\n[MarketSync] ▶ Iniciando sincronização de cotações...');
    const allUsers = listUsers();

    for (const u of allUsers) {
        if (!u.active) continue;
        const fullUser = findUserById(u.id);
        if (!fullUser) continue;

        const investments = getInvestments(fullUser.id);
        const toSync = investments.filter(i => i.marketType && i.marketType !== 'manual');
        if (!toSync.length) continue;

        for (const inv of toSync) {
            try {
                const newValue = await syncOne(inv);
                if (newValue == null) continue;
                updateInvestmentCurrentValue(fullUser.id, inv.id, newValue);
                const gain = newValue - (inv.initialAmount || 0);
                const pct = inv.initialAmount > 0 ? ((gain / inv.initialAmount) * 100).toFixed(2) : '0.00';
                const arrow = gain >= 0 ? '▲' : '▼';
                console.log(`[MarketSync] ✅ ${u.name} — "${inv.description}": R$ ${newValue.toFixed(2)} (${arrow}${Math.abs(parseFloat(pct))}%)`);
            } catch (err) {
                console.error(`[MarketSync] ❌ ${u.name} — "${inv.description}": ${err.message}`);
            }
        }
    }

    console.log('[MarketSync] ✅ Sincronização concluída.\n');
}

// ── Sync de um único usuário (chamado por rota /api/investments/sync) ─────────

export async function syncInvestmentsForUser(userId) {
    const investments = getInvestments(userId);
    const toSync = investments.filter(i => i.marketType && i.marketType !== 'manual');
    const results = [];

    for (const inv of toSync) {
        try {
            const newValue = await syncOne(inv);
            if (newValue == null) { results.push({ id: inv.id, skipped: true }); continue; }
            const updated = updateInvestmentCurrentValue(userId, inv.id, newValue);
            results.push({ id: inv.id, currentValue: newValue, ok: true, investment: updated });
        } catch (err) {
            if (err.noData) {
                results.push({ id: inv.id, ok: true, noData: true, description: inv.description, currentValue: inv.currentValue });
            } else {
                results.push({ id: inv.id, ok: false, error: err.message });
            }
        }
    }

    return results;
}

/** Comando terminal */
export async function sincronizarCotacoes() {
    console.log('[MarketSync] Sincronização manual de cotações...');
    await syncInvestmentValues();
}
