import { MathfieldElement } from '/mathlive/mathlive.min.mjs';

MathfieldElement.locale = 'fr';
MathfieldElement.decimalSeparator = ',';
MathfieldElement.fontsDirectory = '/mathlive/fonts';
MathfieldElement.soundsDirectory = null;
await customElements.whenDefined('math-field');
const records = [];
const fields = new Map();
let current;
let previousRound;
const status = document.querySelector('#status');
async function request(path, body, method = 'POST') {
  const response = await fetch(path, {
    method,
    headers: {
      Authorization: 'Bearer demo-alice',
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}
function observe(record) {
  records.push(record);
  document.querySelector('#observations').textContent = JSON.stringify(
    record,
    null,
    2,
  );
}
function answerFor(element, section) {
  if (element.type === 'mcq')
    return {
      format: 'selection',
      optionIds: [...section.querySelectorAll('input:checked')].map(
        (input) => input.value,
      ),
    };
  return {
    format: 'latex',
    source: fields.get(element.id).mf.getValue('latex-expanded'),
  };
}
function render(instance, progress = []) {
  current = instance;
  localStorage.setItem('novlearn-bench-instance', instance.instanceId);
  fields.clear();
  const root = document.querySelector('#exercise');
  root.replaceChildren();
  status.textContent = `${instance.title} — ${instance.instanceId}`;
  for (const element of instance.elements) {
    const section = document.createElement('section');
    const text = document.createElement('p');
    text.textContent = element.text ?? element.title ?? '';
    section.append(text);
    root.append(section);
    if (!['question', 'mcq'].includes(element.type)) continue;
    const latest = progress.find((item) => item.questionId === element.id);
    if (element.type === 'question') {
      const mf = document.createElement('math-field');
      mf.setAttribute('aria-label', `Réponse ${element.id}`);
      mf.mathVirtualKeyboardPolicy = 'manual';
      const entry = { mf, path: 'unanswered', events: [] };
      fields.set(element.id, entry);
      mf.addEventListener('keydown', (event) => {
        entry.path = 'keyboard';
        entry.events.push({ type: 'keydown', key: event.key });
      });
      mf.addEventListener('paste', (event) => {
        entry.path = 'paste';
        entry.events.push({
          type: 'paste',
          text: event.clipboardData?.getData('text/plain') ?? '',
        });
      });
      mf.addEventListener('input', (event) => {
        entry.events.push({
          type: 'input',
          inputType: event.inputType ?? null,
        });
      });
      section.append(mf);
      if (latest?.answer.format === 'latex') {
        mf.setValue(latest.answer.source);
        entry.path = 'resume';
      }
    } else {
      const options = document.createElement('div');
      for (const option of element.options) {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = element.mode === 'single' ? 'radio' : 'checkbox';
        input.name = element.id;
        input.value = option.id;
        input.checked = latest?.answer.optionIds?.includes(option.id) ?? false;
        label.append(
          input,
          document.createTextNode(
            option.content.text ?? option.content.latex ?? '',
          ),
        );
        options.append(label);
      }
      const reorder = document.createElement('button');
      reorder.textContent = 'Inverser les options';
      reorder.onclick = () =>
        options.replaceChildren(...[...options.children].reverse());
      section.append(options, reorder);
    }
    const output = document.createElement('output');
    output.textContent = latest
      ? JSON.stringify(latest.correction)
      : 'Non répondu';
    const submit = document.createElement('button');
    submit.textContent = `Corriger ${element.id}`;
    submit.onclick = async () => {
      submit.disabled = true;
      try {
        const answer = answerFor(element, section);
        const entry = fields.get(element.id);
        const evidence = {
          path: entry?.path ?? 'selection-ids',
          latex: entry?.mf.getValue('latex') ?? null,
          prompts: entry?.mf.getPrompts() ?? [],
          events: entry?.events.slice() ?? [],
          ...(element.type === 'mcq'
            ? {
                optionOrder: [...section.querySelectorAll('input')].map(
                  (input) => input.value,
                ),
              }
            : {}),
        };
        if (entry) entry.events.length = 0;
        const result = await request(
          `/instances/${instance.instanceId}/answers`,
          { questionId: element.id, answer },
        );
        output.textContent = `HTTP ${result.status} — ${JSON.stringify(result.data)}`;
        observe({
          instanceId: instance.instanceId,
          questionId: element.id,
          answer,
          ...evidence,
          ...result,
        });
      } finally {
        submit.disabled = false;
      }
    };
    section.append(submit, output);
  }
}
async function create(id, duel = false) {
  if (duel && current) previousRound = current.instanceId;
  const result = await request(
    duel ? '/duels/demo-duel/instances' : '/instances',
    { exerciseId: id },
  );
  if (result.status === 200) render(result.data);
  else status.textContent = JSON.stringify(result);
  observe({ operation: duel ? 'create-round' : 'create', ...result });
}
document.querySelector('#practice').onclick = () => create('78');
document.querySelector('#log').onclick = () => create('106');
document.querySelector('#duel').onclick = () => create('78', true);
document.querySelector('#resume').onclick = async () => {
  const id = localStorage.getItem('novlearn-bench-instance');
  if (!id) return;
  const result = await request(`/instances/${id}`, undefined, 'GET');
  if (result.status === 200) render(result.data.instance, result.data.progress);
  else status.textContent = JSON.stringify(result);
  observe({ operation: 'resume', ...result });
};
document.querySelector('#old-round').onclick = async () => {
  if (previousRound)
    observe({
      operation: 'expired-round',
      ...(await request(`/instances/${previousRound}/answers`, {
        questionId: '1781009000002',
        answer: { format: 'latex', source: '0' },
      })),
    });
};
document.querySelector('#spoof').onclick = async () => {
  if (current)
    observe({
      operation: 'spoof',
      ...(await request(`/instances/${current.instanceId}/answers`, {
        questionId: '1781009000002',
        answer: { format: 'latex', source: '0' },
        policy: { tolerance: 100 },
        seed: 42,
        verdict: 'correct',
        score: 999,
      })),
    });
};
document.querySelector('#load').onclick = () => {
  const entry = fields.values().next().value;
  if (entry) {
    entry.mf.setValue(document.querySelector('#source').value);
    entry.path = 'mathlive-api';
    entry.events.length = 0;
  }
};
document.querySelector('#clear').onclick = () => {
  const entry = fields.values().next().value;
  if (entry) {
    entry.mf.setValue('');
    entry.path = 'mathlive-api';
    entry.events.length = 0;
  }
};
document.querySelector('#save').onclick = async () => {
  status.textContent = JSON.stringify(
    await request('/bench/capture', {
      version: MathfieldElement.version,
      locale: 'fr',
      browser: navigator.userAgent,
      records,
    }),
  );
};
