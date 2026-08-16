const { JSDOM } = require('jsdom');

// Gerçek bug'ı taklit eden HTML — birden fazla yerde aynı Tailwind sınıfları
// olan wrapper div'ler, içinde gerçek tıklanabilir butonlar
const html = `
<!DOCTYPE html>
<html><body>
  <div class="max-w-7xl mx-auto px-4">
    <header>
      <button id="menu-btn"><span class="icon">☰</span></button>
    </header>
  </div>
  <div class="max-w-7xl mx-auto px-4">
    <section>
      <button class="btn btn-primary">
        <svg class="icon-svg"><path/></svg>
        <span>Kayıt Ol</span>
      </button>
    </section>
  </div>
  <div class="max-w-7xl mx-auto px-4">
    <footer>İletişim</footer>
  </div>
</body></html>
`;

const dom = new JSDOM(html, { runScripts: 'outside-only' });
global.document = dom.window.document;
global.Element = dom.window.Element;
global.CSS = dom.window.CSS || { escape: (s) => s.replace(/([^a-zA-Z0-9_-])/g, '\\$1') };

// content/index.ts'deki asıl fonksiyonları buraya (derlenmiş haliyle) kopyalıyorum
function isUniqueSelector(sel, target) {
  try {
    const matches = document.querySelectorAll(sel);
    return matches.length === 1 && matches[0] === target;
  } catch {
    return false;
  }
}

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, label, [role="button"], [role="link"], [tabindex], [onclick]';

function resolveInteractiveTarget(el) {
  if (el.matches(INTERACTIVE_SELECTOR)) return el;
  const ancestor = el.closest(INTERACTIVE_SELECTOR);
  return ancestor ?? el;
}

function getSelectors(rawEl) {
  const el = resolveInteractiveTarget(rawEl);
  const good = [];
  const weak = [];
  const add = (sel) => {
    if (!sel) return;
    (isUniqueSelector(sel, el) ? good : weak).push(sel);
  };

  if (el.id) add(`#${CSS.escape(el.id)}`);
  for (const attr of ['data-testid', 'data-cy', 'aria-label', 'name']) {
    const val = el.getAttribute(attr);
    if (val) add(`[${attr}="${CSS.escape(val)}"]`);
  }
  if (el.className && typeof el.className === 'string') {
    const cls = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3);
    if (cls.length) add(`.${cls.map((c) => CSS.escape(c)).join('.')}`);
  }
  const tag = el.tagName.toLowerCase();
  const type = el.getAttribute('type');
  if (type) add(`${tag}[type="${type}"]`);

  const path = [];
  let cur = el;
  for (let depth = 0; cur && depth < 4; depth++) {
    const parent = cur.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
    const idx = siblings.indexOf(cur) + 1;
    path.unshift(`${cur.tagName.toLowerCase()}:nth-of-type(${idx})`);
    cur = parent;
  }
  if (path.length) add(path.join(' > '));
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
    const idx = siblings.indexOf(el) + 1;
    add(`${tag}:nth-of-type(${idx})`);
  }

  return [...new Set([...good, ...weak])];
}

// ── Testler ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`ok  - ${name}`); }
  else { fail++; console.log(`FAIL - ${name}`); }
}

// TEST 1: "Kayıt Ol" butonunun içindeki <svg> ikonuna tıklandığında,
// eski kod .max-w-7xl.mx-auto.px-4 gibi benzersiz OLMAYAN bir seçici üretirdi.
// Şimdi: butonun kendisine yükselip ondan seçici üretmeli, VE seçici gerçekten benzersiz olmalı.
const svgIcon = document.querySelector('.icon-svg');
const selectors1 = getSelectors(svgIcon);
check('SVG ikonuna tıklayınca en yakın <button>a yükseliyor', selectors1[0] !== '.max-w-7xl.mx-auto.px-4');
check('Üretilen ilk seçici gerçekten benzersiz', document.querySelectorAll(selectors1[0]).length === 1);
check('Seçici doğru butonu buluyor (Kayıt Ol)', document.querySelector(selectors1[0])?.textContent.includes('Kayıt Ol'));
console.log('  -> seçilen:', selectors1[0]);

// TEST 2: menu-btn (id'si olan) — id her zaman önce gelmeli
const menuIcon = document.querySelector('.icon');
const selectors2 = getSelectors(menuIcon);
check('ID varsa öncelik ID selector', selectors2[0] === '#menu-btn');

// TEST 3: eski (yanlış) davranışı simüle et — benzersiz olmayan bir class'ı
// hâlâ üretiyor muyuz kontrol (weak fallback olarak listede olmalı ama İLK sırada değil)
check('Benzersiz olmayan .max-w-7xl... seçici hâlâ ilk sırada DEĞİL', !selectors1[0].includes('max-w-7xl'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
