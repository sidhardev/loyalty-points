// Development API: same as `nest start --watch`, on port 4001 (the website dev server on 4000 forwards /api here).
import { spawn } from 'node:child_process';

spawn('nest', ['start', '--watch'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: process.env.API_PORT || '4001' },
}).on('exit', (code) => process.exit(code ?? 0));
