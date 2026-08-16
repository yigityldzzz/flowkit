// Content script — runs on every page
// Listens for START_RECORDING / STOP_RECORDING messages from background
// and captures user interactions as workflow steps.

interface RecordedStep {
  type: 'click' | 'input' | 'navigate' | 'scroll' | 'select';
  selector?: string;
  selectorAlternatives?: string[];
  value?: string;
  url?: string;
  delay?: number;
  description?: string;
  timestamp: number;
}

// Guard against double-injection: background.ts programmatically re-injects
// this script as a safety net for tabs that were open before the extension
// loaded (manifest content_scripts only auto-inject on new page loads).
// Without this guard, a page could end up with two copies of this script,
// causing duplicate event listeners and steps recorded twice per action.
if ((window as any).__flowkitContentLoaded) {
  // Already loaded in this page — do nothing.
} else {
(window as any).__flowkitContentLoaded = true;

let recording = false;
let steps: RecordedStep[] = [];
let lastTimestamp = 0;

// A selector is only trustworthy for replay if it resolves to exactly the
// one element we generated it from — not zero (typo/escaping issue) and not
// more than one (the classic failure mode: a "unique class combination" that
// was never actually checked for uniqueness, e.g. shared Tailwind utility
// classes like ".max-w-7xl.mx-auto.px-4" that appear on dozens of unrelated
// wrapper divs across a page).
function isUniqueSelector(sel: string, target: Element): boolean {
  try {
    const matches = document.querySelectorAll(sel);
    return matches.length === 1 && matches[0] === target;
  } catch {
    return false;
  }
}

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, label, [role="button"], [role="link"], [tabindex], [onclick]';

// Clicks often land on an inner <span>/<div>/<svg> inside the actual
// clickable control (icon-inside-a-button is extremely common). Recording a
// selector for that inner wrapper produces exactly the kind of
// low-specificity, non-unique selector that broke replay here — walk up to
// the nearest real interactive ancestor first, same idea replayStep() already
// uses on the playback side for the inverse problem (SVG targets with no
// .click()).
function resolveInteractiveTarget(el: Element): Element {
  if (el.matches(INTERACTIVE_SELECTOR)) return el;
  const ancestor = el.closest(INTERACTIVE_SELECTOR);
  return ancestor ?? el;
}

// Generate multiple selectors for an element, ranked by how much we can
// trust them: every candidate is checked for uniqueness before being
// considered "good" — a selector that matches 0 or >1 elements only survives
// as a last-resort fallback, never as the primary `selector` a replay
// actually depends on.
function getSelectors(rawEl: Element): string[] {
  const el = resolveInteractiveTarget(rawEl);
  const good: string[] = [];
  const weak: string[] = [];
  const add = (sel: string | null) => {
    if (!sel) return;
    (isUniqueSelector(sel, el) ? good : weak).push(sel);
  };

  // 1. id
  if (el.id) add(`#${CSS.escape(el.id)}`);

  // 2. data-testid / aria attributes
  for (const attr of ['data-testid', 'data-cy', 'aria-label', 'name']) {
    const val = el.getAttribute(attr);
    if (val) add(`[${attr}="${CSS.escape(val)}"]`);
  }

  // 3. Class combination (only trusted if actually unique on this page)
  if (el.className && typeof el.className === 'string') {
    const cls = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3);
    if (cls.length) add(`.${cls.map((c) => CSS.escape(c)).join('.')}`);
  }

  // 4. Tag + type
  const tag = el.tagName.toLowerCase();
  const type = el.getAttribute('type');
  if (type) add(`${tag}[type="${type}"]`);

  // 5. nth-of-type — a full ancestor-anchored path, so it's unique even when
  // the bare tag:nth-of-type(n) on its own wouldn't be.
  const path: string[] = [];
  let cur: Element | null = el;
  for (let depth = 0; cur && depth < 4; depth++) {
    const parent: Element | null = cur.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((c) => c.tagName === cur!.tagName);
    const idx = siblings.indexOf(cur) + 1;
    path.unshift(`${cur.tagName.toLowerCase()}:nth-of-type(${idx})`);
    cur = parent;
  }
  if (path.length) add(path.join(' > '));
  // Also keep the old single-level version as a weak fallback for older
  // saved workflows / simpler pages where it happens to already be unique.
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
    const idx = siblings.indexOf(el) + 1;
    add(`${tag}:nth-of-type(${idx})`);
  }

  // Unique candidates first (these are the ones worth using as the primary
  // `selector`), then everything else as a last-resort fallback chain.
  return [...new Set([...good, ...weak])];
}

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const text = (el as HTMLElement).innerText?.trim().slice(0, 40);
  const label = el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name');
  if (text) return `${tag}: "${text}"`;
  if (label) return `${tag}[${label}]`;
  return tag;
}

function recordStep(step: RecordedStep) {
  const now = Date.now();
  if (lastTimestamp) step.delay = now - lastTimestamp;
  lastTimestamp = now;
  steps.push(step);
  chrome.runtime.sendMessage({ type: 'STEP_RECORDED', step });
}

// Click handler
function onClickCapture(e: MouseEvent) {
  if (!recording) return;
  try {
    const rawEl = e.target as Element;
    if (!rawEl || rawEl.tagName === 'HTML' || rawEl.tagName === 'BODY') return;

    // Resolve once so the recorded description matches what getSelectors()
    // actually targets — e.g. clicking an icon <svg> inside a <button>
    // describes and selects the button, not the inner icon.
    const el = resolveInteractiveTarget(rawEl);
    const selectors = getSelectors(el);
    recordStep({
      type: 'click',
      selector: selectors[0],
      selectorAlternatives: selectors.slice(1),
      description: `Click ${describeElement(el)}`,
      timestamp: Date.now(),
    });
  } catch (err) {
    // A single unusual element (odd SVG/shadow-DOM/custom-element structure
    // on a particular site) must never silently swallow the whole click with
    // no trace — log it so "0 steps on this one site" is debuggable instead
    // of a mystery, and still record a bare-minimum step so the user sees
    // *something* rather than the click vanishing entirely.
    console.error('[FlowKit] click capture failed, recording minimal fallback step', err);
    recordStep({ type: 'click', description: 'Click (selector generation failed)', timestamp: Date.now() });
  }
}

// Input handler (debounced)
const inputDebounce = new Map<Element, ReturnType<typeof setTimeout>>();
function onInputCapture(e: Event) {
  if (!recording) return;
  const el = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (!el || !('value' in el)) return;

  const existing = inputDebounce.get(el);
  if (existing) clearTimeout(existing);

  inputDebounce.set(el, setTimeout(() => {
    try {
      const selectors = getSelectors(el);
      // Never record password field values
      const inputType = el.getAttribute('type')?.toLowerCase();
      const value = inputType === 'password' ? '***' : el.value;
      recordStep({
        type: 'input',
        selector: selectors[0],
        selectorAlternatives: selectors.slice(1),
        value,
        description: `Type "${value.slice(0, 30)}" into ${describeElement(el)}`,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('[FlowKit] input capture failed', err);
    }
    inputDebounce.delete(el);
  }, 600));
}

// Select handler
function onChangeCapture(e: Event) {
  if (!recording) return;
  try {
    const el = e.target as HTMLSelectElement;
    if (!el || el.tagName !== 'SELECT') return;
    const selectors = getSelectors(el);
    recordStep({
      type: 'select',
      selector: selectors[0],
      selectorAlternatives: selectors.slice(1),
      value: el.value,
      description: `Select "${el.value}" in ${describeElement(el)}`,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[FlowKit] select capture failed', err);
  }
}

// Listeners are attached to `window`, not `document`. Capture-phase events
// travel window -> document -> html -> ... -> target, so a window-level
// capture listener always runs before any document-level one — including
// listeners the *page itself* (React/Vue apps, analytics scripts) may have
// already attached to `document` before we start recording. Sites like
// X/Instagram are heavy SPAs that commonly install their own document-level
// click handling early on page load; if that handler calls
// stopImmediatePropagation(), a document-level listener of ours (added
// later, when the user clicks "Start Recording") would never run at all —
// silently, with 0 steps and no error. window-level capture isn't
// interceptable that way since nothing sits above it in the chain.
function startRecording() {
  recording = true;
  steps = [];
  lastTimestamp = Date.now();
  window.addEventListener('click', onClickCapture, { capture: true, passive: true });
  window.addEventListener('input', onInputCapture, { capture: true, passive: true });
  window.addEventListener('change', onChangeCapture, { capture: true, passive: true });
}

function stopRecording(): RecordedStep[] {
  recording = false;
  window.removeEventListener('click', onClickCapture, { capture: true });
  window.removeEventListener('input', onInputCapture, { capture: true });
  window.removeEventListener('change', onChangeCapture, { capture: true });
  return [...steps];
}

// Message listener
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'START_RECORDING') {
    startRecording();
    sendResponse({ ok: true });
  } else if (msg.type === 'STOP_RECORDING') {
    const captured = stopRecording();
    sendResponse({ ok: true, steps: captured });
  } else if (msg.type === 'IS_RECORDING') {
    sendResponse({ recording });
  } else if (msg.type === 'PING') {
    sendResponse({ ok: true });
  } else if (msg.type === 'REPLAY_STEP') {
    replayStep(msg.step).then((result) => sendResponse(result)).catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // async
  }
});

// ── REPLAY ENGINE ────────────────────────────────────────────────────────────
async function findElement(selector: string, alternatives: string[] = []): Promise<Element | null> {
  const all = [selector, ...alternatives];
  for (const sel of all) {
    try {
      const el = document.querySelector(sel);
      if (el) return el;
    } catch {}
  }
  return null;
}

async function waitForElement(selector: string, alternatives: string[] = [], timeout = 5000): Promise<Element | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const el = await findElement(selector, alternatives);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

async function replayStep(step: RecordedStep): Promise<{ ok: boolean; error?: string }> {
  try {
    if (step.type === 'navigate' && step.url) {
      window.location.href = step.url;
      return { ok: true };
    }

    if (!step.selector) return { ok: false, error: 'No selector' };

    const el = await waitForElement(step.selector, step.selectorAlternatives);
    if (!el) return { ok: false, error: `Element not found: ${step.selector}` };

    // Scroll into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise((r) => setTimeout(r, 200));

    if (step.type === 'click') {
      // SVG/path elements don't have .click() — walk up to nearest clickable parent
      const clickTarget = el instanceof HTMLElement
        ? el
        : (el.closest('button, a, [role="button"], [tabindex], li, div') as HTMLElement | null) ?? el.parentElement;
      if (clickTarget && clickTarget instanceof HTMLElement) {
        clickTarget.click();
      }
      // Also dispatch synthetic events for JS-driven UIs (React, Vue, etc.)
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    } else if (step.type === 'input' && step.value !== undefined) {
      const input = el as HTMLInputElement;
      input.focus();
      const nativeInputValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      nativeInputValue?.set?.call(input, step.value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (step.type === 'select' && step.value !== undefined) {
      const select = el as HTMLSelectElement;
      select.value = step.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// Record navigation as steps
let lastUrl = location.href;
const observer = new MutationObserver(() => {
  if (recording && location.href !== lastUrl) {
    recordStep({ type: 'navigate', url: location.href, description: `Navigate to ${location.href}`, timestamp: Date.now() });
    lastUrl = location.href;
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// Signal background that this page has loaded.
// Background uses this to re-activate recording after navigation
// (replaces chrome.tabs.onUpdated which requires the broad 'tabs' permission).
chrome.runtime.sendMessage({ type: 'PAGE_LOADED' }).catch(() => {});

} // end __flowkitContentLoaded guard
