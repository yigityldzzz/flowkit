// Simulates the X/Instagram-style hostile-page scenario: the page itself
// attaches a document-level capture listener (before our extension starts
// recording) that calls stopImmediatePropagation() on every click — a real,
// known pattern in aggressive SPAs for custom gesture/analytics handling.
// If our listener were attached to `document` (the old code), it would never
// fire since the page's document-level listener runs first and stops it.
// Attached to `window` instead, ours must always run first regardless.
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html><html><body><button id="btn">Click me</button></body></html>`, {
  runScripts: 'outside-only',
});
const { window } = dom;
global.document = window.document;
global.window = window;

let ourListenerFired = false;

// 1. Simulate the HOSTILE PAGE's own script running first (page loads before
//    the user ever clicks "Start Recording").
document.addEventListener(
  'click',
  (e) => {
    e.stopImmediatePropagation();
  },
  { capture: true }
);

// 2. Simulate our extension attaching AFTER, when recording starts —
//    this is the fix: window-level, not document-level.
window.addEventListener(
  'click',
  () => {
    ourListenerFired = true;
  },
  { capture: true }
);

// 3. Simulate the click.
const btn = document.getElementById('btn');
btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

if (ourListenerFired) {
  console.log('ok  - window-level capture listener still fires even when the page stops propagation at document level');
  process.exit(0);
} else {
  console.log('FAIL - our listener was blocked by the page\'s own stopImmediatePropagation()');
  process.exit(1);
}
