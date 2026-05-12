import nodemailer from 'nodemailer';
import { SMTP } from './config.js';

// ── Detecta se SMTP está configurado ─────────────────────────────────────────
export function isSmtpConfigured() {
    return Boolean(SMTP.user && SMTP.pass);
}

// ── Cria o transporte (reutilizável) ─────────────────────────────────────────
function createTransport() {
    return nodemailer.createTransport({
        host: SMTP.host,
        port: SMTP.port,
        secure: SMTP.port === 465,   // true só para porta 465
        auth: {
            user: SMTP.user,
            pass: SMTP.pass,
        },
    });
}

// ── Envia um email ────────────────────────────────────────────────────────────
// Retorna { success: true } ou { success: false, error: string }
export async function sendMail({ to, subject, html }) {
    if (!isSmtpConfigured()) {
        // Modo desenvolvimento: loga no console em vez de enviar
        console.log('\n📧  [MAILER - modo dev, SMTP não configurado]');
        console.log(`   Para: ${to}`);
        console.log(`   Assunto: ${subject}`);
        console.log('   (configure SMTP_USER e SMTP_PASS no .env para enviar de verdade)\n');
        return { success: true, dev: true };
    }

    try {
        const transporter = createTransport();
        const info = await transporter.sendMail({
            from: SMTP.from || SMTP.user,
            to,
            subject,
            html,
        });
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error(`[MAILER] Erro ao enviar para ${to}:`, err.message);
        return { success: false, error: err.message };
    }
}
