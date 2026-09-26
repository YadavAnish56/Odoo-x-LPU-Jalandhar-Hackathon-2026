// Starts the backend (port 5000) and the frontend (port 3000) together: `npm run dev`
import { spawn } from 'node:child_process';

const apps = [
  { name: 'backend ', command: 'npm --prefix backend run dev', color: '\x1b[36m' },
  { name: 'frontend', command: 'npm --prefix frontend run dev', color: '\x1b[35m' },
];

let stopping = false;
const children = apps.map(({ name, command, color }) => {
  const child = spawn(command, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = `${color}[${name}]\x1b[0m `;
  const forward = (stream, out) =>
    stream.on('data', (chunk) => {
      const lines = chunk.toString().split(/\r?\n/).filter((line) => line.trim());
      if (lines.length) out.write(lines.map((line) => prefix + line).join('\n') + '\n');
    });
  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);
  child.on('exit', (code) => {
    if (stopping) return;
    console.log(`${prefix}stopped (exit code ${code}). Stopping the other app too.`);
    shutdown(code ?? 1);
  });
  return child;
});

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill());
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
