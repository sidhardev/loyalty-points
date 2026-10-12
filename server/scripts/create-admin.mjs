// Creates a superadmin, or sets a new password for an existing one. Run it on the server, from the project folder:
//   npm run create-admin -w server -- you@example.com
// The password is typed here (hidden) and only its hash is stored. Admins can't be created from the website.
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync } from 'node:fs';
import readline from 'node:readline';
import { DatabaseSync } from 'node:sqlite';

const FILE = process.env.DB_FILE || 'data/loyalty.db';
const MIN_LENGTH = 12;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const email = String(process.argv[2] ?? '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Usage: npm run create-admin -w server -- you@example.com');
if (!existsSync(FILE)) fail(`No database at ${FILE} — start the server once first.`);

const db = new DatabaseSync(FILE);
if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'admins'").get()) {
  fail('Start the updated server once first, so the database gets its admin tables.');
}

/** Reads a line without showing what is typed. */
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let hidden = false;
    rl._writeToOutput = (text) => {
      if (!hidden) rl.output.write(text);
      else if (/[\r\n]/.test(text)) rl.output.write('\n');
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    hidden = true;
  });
}

const exists = db.prepare('SELECT 1 FROM admins WHERE email = ?').get(email);
console.log(exists ? `Setting a new password for superadmin ${email}` : `Creating superadmin ${email}`);
const password = await askHidden(`Password (at least ${MIN_LENGTH} characters): `);
if (password.length < MIN_LENGTH) fail(`Too short — use at least ${MIN_LENGTH} characters.`);
if ((await askHidden('Type it again: ')) !== password) fail("The passwords don't match. Nothing was changed.");

const salt = randomBytes(16).toString('hex');
const hash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
db.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash').run(email, hash);
db.close();
console.log(`✓ Superadmin ${email} is ready. Log in at /admin`);
