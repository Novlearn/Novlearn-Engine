import { MathfieldElement } from '/mathlive/mathlive.min.mjs';

MathfieldElement.locale = 'fr';
MathfieldElement.decimalSeparator = ',';
MathfieldElement.fontsDirectory = '/mathlive/fonts';
MathfieldElement.soundsDirectory = null;
await customElements.whenDefined('math-field');
const mf = document.querySelector('#mf');
mf.mathVirtualKeyboardPolicy = 'manual';
const status = document.querySelector('#status');
const current = document.querySelector('#current');
const source = document.querySelector('#source');
const caseId = document.querySelector('#case-id');
const operation = document.querySelector('#operation');
const records = [];
const events = [];
const update = () => {
  current.textContent = mf.getValue('latex');
};
mf.addEventListener('input', (event) => {
  events.push({ type: event.type, inputType: event.inputType ?? null });
  update();
});
mf.addEventListener('paste', (event) => {
  events.push({
    type: 'paste',
    text: event.clipboardData?.getData('text/plain') ?? '',
  });
});
mf.addEventListener('keydown', (event) => {
  if (!event.ctrlKey && !event.metaKey)
    events.push({ type: 'keydown', key: event.key });
});
document.querySelector('#load').onclick = () => {
  events.length = 0;
  mf.setValue(source.value);
  update();
};
document.querySelector('#clear').onclick = () => {
  events.length = 0;
  mf.setValue('');
  update();
};
document.querySelector('#focus').onclick = () => {
  mf.focus();
};
document.querySelector('#keyboard').onclick = () => {
  mf.focus();
  window.mathVirtualKeyboard.show();
};
function record(id, path, input) {
  records.push({
    id,
    operation: path,
    input,
    latex: mf.getValue('latex'),
    expandedLatex: mf.getValue('latex-expanded'),
    prompts: mf.getPrompts(),
    events: events.slice(),
  });
  document.querySelector('#observations').textContent = JSON.stringify(
    records,
    null,
    2,
  );
  status.textContent = `MathLive ${MathfieldElement.version} — ${records.length} observations.`;
}
document.querySelector('#record').onclick = () => {
  record(caseId.value, operation.value, source.value);
  events.length = 0;
};
document.querySelector('#corpus').onclick = async () => {
  const cases = await (await fetch('/cases.json')).json();
  for (const item of cases) {
    events.length = 0;
    mf.setValue(item.input);
    record(item.id, 'set-value', item.input);
  }
  update();
};
document.querySelector('#save').onclick = async () => {
  const capture = {
    schemaVersion: 1,
    mathliveVersion: MathfieldElement.version,
    locale: MathfieldElement.locale,
    decimalSeparator: MathfieldElement.decimalSeparator,
    capturedAt: new Date().toISOString(),
    browser: navigator.userAgent,
    records,
  };
  const response = await fetch('/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(capture),
  });
  status.textContent = await response.text();
};
status.textContent = `MathLive ${MathfieldElement.version} prêt — français, virgule décimale.`;
update();
