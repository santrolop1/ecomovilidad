import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';

test('el atlas permite buscar sin tildes, filtrar y ampliar los diagramas sin red', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  const { document, Event, MouseEvent } = dom.window;
  const cards = [...document.querySelectorAll('article')];
  const visible = () => cards.filter(card => !card.classList.contains('hidden'));
  const search = document.getElementById('search');
  const group = document.getElementById('group');
  const change = (element, value, event) => {
    element.value = value;
    element.dispatchEvent(new Event(event, { bubbles: true }));
  };
  assert.equal(cards.length, 32);
  assert.equal(visible().length, 32);
  assert.equal(document.querySelectorAll('script[src],link[href^="http"]').length, 0);
  assert(cards.every(card => card.querySelector('img').getAttribute('src').startsWith('data:image/svg+xml;base64,')));

  change(search, 'SECUENCIA: INICIO Y CIERRE DE SESION', 'input');
  assert.deepEqual(visible().map(card => card.id), ['17-secuencia-login']);
  change(search, '', 'input');
  change(group, 'Estructurales', 'change');
  assert.equal(visible().length, 3);
  change(search, 'no existe este diagrama', 'input');
  assert.equal(visible().length, 0);
  assert(!document.getElementById('empty').classList.contains('hidden'));

  document.querySelector('nav a').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(visible().length, 32);
  const slider = cards[0].querySelector('input[type=range]');
  change(slider, '200', 'input');
  assert.equal(cards[0].querySelector('img').style.width, '200%');
  dom.window.close();
});
