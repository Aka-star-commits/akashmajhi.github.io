import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('index.html', () => {
  it('loads the behaviour as a module and keeps no inline logic', () => {
    expect(html).toContain('<script type="module" src="js/main.js"></script>');
    expect(html).not.toContain('requestAnimationFrame');
  });

  it('still exposes the hooks the script depends on', () => {
    document.documentElement.innerHTML = html;

    expect(document.getElementById('loader')).not.toBeNull();
    expect(document.getElementById('cursor')).not.toBeNull();
    expect(document.getElementById('cursorRing')).not.toBeNull();
    expect(document.getElementById('navbar')).not.toBeNull();
    expect(document.querySelectorAll('.fade-up').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.btn-primary').length).toBeGreaterThan(0);
  });
});
