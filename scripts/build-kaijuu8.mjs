import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// Keep the hidden edition's content identical to the standard homepage.
let html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function replaceOnce(before, after) {
  if (!html.includes(before)) throw new Error(`Homepage markup changed: ${before}`);
  html = html.replace(before, after);
}

replaceOnce('<html lang=en-US>', '<html lang=en-US data-theme=kaijuu8>');
replaceOnce('name=color-scheme content="only light"', 'name=color-scheme content="dark"');
replaceOnce('name=theme-color content="#ffffff"', 'name=theme-color content="#000000"');
replaceOnce('</head>', '<link rel=canonical href=https://mvazcar.com/><meta name=robots content="noindex,follow"></head>');

// Stay in the hidden edition when following its Home and section links.
html = html.replace(/href=\/(#[\w-]+)?(?=[\s>])/g, (_, hash = '') => `href=/kaijuu8/${hash}`);

const directory = new URL('../kaijuu8/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('index.html', directory), html);
console.log('Generated kaijuu8/index.html from index.html');
