import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const SECRET_FILE = join(DATA_DIR, '.secret');

function loadOrCreateSecret() {
    if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (existsSync(SECRET_FILE)) {
        return readFileSync(SECRET_FILE, 'utf-8').trim();
    }
    const secret = randomBytes(32).toString('hex');
    writeFileSync(SECRET_FILE, secret, { mode: 0o600, encoding: 'utf-8' });
    return secret;
}

export const JWT_SECRET = loadOrCreateSecret();
export const JWT_EXPIRES = '8h';
