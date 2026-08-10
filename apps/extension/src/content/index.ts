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

let recording = false;
let steps: RecordedStep[] = [];
let lastTimestamp = 0;

// Generate multiple selectors for an element (robustness)
function getSelectors(el: Element): string[] {
  const selectors: string[] = [];

  // 1. id
  if (el.id) selectors.push(`#${CSS.escape(el.id)}`);

  // 2. data-testid / aria attributes
  for (const attr of ['data-testid', 'data-cy', 'aria-label', 'name']) {
    const val = el.getAttribute(attr);
    if (val) selectors.push(`[${attr}="${CSS.escape(val)}"]`);
  }

  // 3. Unique class combination
  if (el.className && typeof el.className === 'string') {
    const cls = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3);
    if (cls.length) selectors.push(`.${cls.map((c) => CSS.escape(c)).join('.')}`);
  }

  // 4. Tag + type
  const tag = el.tagName.toLowerCase();
  const type = el.getAttribute('type');
  if (type) selectors.push(`${tag}[type="${type}"]`);

  // 5. nth-of-type fallback
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
    const idx = siblings.indexOf(el) + 1;
    selectors.push(`${tag}:nth-of-type(${idx})`);
  }

  return [...new Set(selectors)];
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
  const el = e.target as Element;
  if (!el || el.tagName === 'HTML' || el.tagName === 'BODY') return;

  const selectors = getSelectors(el);
  recordStep({
    type: 'click',
    selector: selectors[0],
    selectorAlternatives: selectors.slice(1),
    description: `Click ${describeElement(el)}`,
    timestamp: Date.now(),
  });
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
    inputDebounce.delete(el);
  }, 600));
}

// Select handler
function onChangeCapture(e: Event) {
  if (!recording) return;
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
}

function startRecording() {
  recording = true;
  steps = [];
  lastTimestamp = Date.now();
  document.addEventListener('click', onClickCapture, { capture: true, passive: true });
  document.addEventListener('input', onInputCapture, { capture: true, passive: true });
  document.addEventListener('change', onChangeCapture, { capture: true, passive: true });
}

function stopRecording(): RecordedStep[] {
  recording = false;
  document.removeEventListener('click', onClickCapture, { capture: true });
  document.removeEventListener('input', onInputCapture, { capture: true });
  document.removeEventListener('change', onChangeCapture, { capture: true });
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
