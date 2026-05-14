// EMERLIMITATOR — Lógica de la aplicación

let currentMode = null;
let examStartTime = null;

// ── Navegación ────────────────────────────────────────────────────────────────

function selectMode(mode) {
  currentMode = mode;
  show('screen-exam');
  hide('screen-welcome');
  renderExam();
  examStartTime = Date.now();
  window.scrollTo(0, 0);
}

function restartExam() {
  currentMode = null;
  hide('screen-exam');
  hide('screen-results');
  show('screen-welcome');
  window.scrollTo(0, 0);
}

function restartSameMode() {
  hide('screen-results');
  show('screen-exam');
  renderExam();
  examStartTime = Date.now();
  window.scrollTo(0, 0);
}

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

// ── Validación de respuestas ──────────────────────────────────────────────────

function normalizeText(val) {
  return val.trim().replace(/\s+/g, ' ').toUpperCase();
}

function answersMatch(userRaw, correctRaw) {
  const user = normalizeText(String(userRaw));
  const correct = normalizeText(String(correctRaw));
  if (user === correct) return true;
  // Comparación numérica (acepta coma o punto decimal)
  const u = parseFloat(user.replace(',', '.'));
  const c = parseFloat(correct.replace(',', '.'));
  if (!isNaN(u) && !isNaN(c) && Math.abs(u - c) < 0.0001) return true;
  return false;
}

// ── Render del examen ─────────────────────────────────────────────────────────

function renderExam() {
  const container = document.getElementById('exam-content');
  container.innerHTML = '';
  document.getElementById('exam-mode-badge').textContent = currentMode;

  // Sección: Procedimientos de emergencia
  const epSection = el('div', 'exam-section');
  epSection.appendChild(sectionTitle('PROCEDIMIENTOS DE EMERGENCIA'));

  EXAM_DATA.emergencyProcedures
    .filter(p => p.modes.includes(currentMode))
    .forEach(proc => {
      const box = el('div', 'procedure');
      const title = el('h3', 'procedure-title');
      title.textContent = proc.title;
      box.appendChild(title);

      proc.steps.forEach((_, idx) => {
        const row = el('div', 'step-row');
        const num = el('span', 'step-num');
        num.textContent = idx + 1;
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `ep_${proc.id}_${idx}`;
        input.className = 'step-input';
        input.placeholder = `ACCIÓN ${idx + 1}`;
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'characters');
        row.append(num, input);
        box.appendChild(row);
      });

      epSection.appendChild(box);
    });

  container.appendChild(epSection);

  // Sección: Límites de sistemas
  const slSection = el('div', 'exam-section');
  slSection.appendChild(sectionTitle('LÍMITES DE SISTEMAS'));

  EXAM_DATA.systemLimits.forEach(cat => {
    const box = el('div', 'limit-category');
    const catTitle = el('h3', 'category-title');
    catTitle.textContent = cat.category;
    box.appendChild(catTitle);

    if (cat.subcategories) {
      cat.subcategories.forEach(sub => {
        const subDiv = el('div', 'subcategory');
        const subTitle = el('h4', 'subcategory-title');
        subTitle.textContent = sub.subcategory;
        subDiv.appendChild(subTitle);
        sub.parameters.forEach(p => subDiv.appendChild(renderParamRow(p)));
        box.appendChild(subDiv);
      });
    } else {
      cat.parameters.forEach(p => box.appendChild(renderParamRow(p)));
    }

    slSection.appendChild(box);
  });

  container.appendChild(slSection);
}

function renderParamRow(param) {
  const row = el('div', 'param-row');
  const label = el('span', 'param-label');
  label.textContent = param.label;
  const dash = el('span', 'param-dash');
  dash.textContent = '-';
  const inputs = el('span', 'param-inputs');

  param.inputs.forEach(item => {
    if (item.separator !== undefined) {
      const sep = el('span', 'separator');
      sep.textContent = item.separator;
      inputs.appendChild(sep);
    } else {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.id = item.id;
      inp.className = 'limit-input';
      inp.autocomplete = 'off';
      inp.spellcheck = false;
      inp.setAttribute('inputmode', 'decimal');
      inp.setAttribute('autocorrect', 'off');
      inputs.appendChild(inp);
    }
  });

  if (param.suffix) {
    const unit = el('span', 'unit');
    unit.textContent = param.suffix;
    inputs.appendChild(unit);
  }

  row.append(label, dash, inputs);
  return row;
}

function sectionTitle(text) {
  const h2 = el('h2', 'section-title');
  h2.textContent = text;
  return h2;
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

// ── Envío y corrección ────────────────────────────────────────────────────────

function submitExam() {
  const unanswered = countUnanswered();
  if (unanswered > 0) {
    if (!confirm(`Quedan ${unanswered} campos sin responder. ¿Deseas enviar igualmente?`)) return;
  }

  const elapsed = Math.floor((Date.now() - examStartTime) / 1000);
  let total = 0, correct = 0;
  const results = [];

  // Procedimientos de emergencia
  EXAM_DATA.emergencyProcedures
    .filter(p => p.modes.includes(currentMode))
    .forEach(proc => {
      const procResult = { type: 'procedure', title: proc.title, steps: [] };
      proc.steps.forEach((answer, idx) => {
        const inputEl = document.getElementById(`ep_${proc.id}_${idx}`);
        const userVal = inputEl ? inputEl.value : '';
        const ok = answersMatch(userVal, answer);
        total++; if (ok) correct++;
        procResult.steps.push({ idx: idx + 1, userAnswer: userVal, correctAnswer: answer, correct: ok });
      });
      results.push(procResult);
    });

  // Límites de sistemas
  function evalParams(parameters, dest) {
    parameters.forEach(param => {
      const pResult = { label: param.label, fields: [], allCorrect: true };
      param.inputs.forEach(item => {
        if (item.separator !== undefined) return;
        const inputEl = document.getElementById(item.id);
        const userVal = inputEl ? inputEl.value : '';
        const ok = answersMatch(userVal, item.answer);
        total++; if (ok) correct++;
        if (!ok) pResult.allCorrect = false;
        pResult.fields.push({ userAnswer: userVal, correctAnswer: item.answer, correct: ok });
      });
      dest.push(pResult);
    });
  }

  EXAM_DATA.systemLimits.forEach(cat => {
    const catResult = { type: 'limits', category: cat.category, subcategories: [], parameters: [] };
    if (cat.subcategories) {
      cat.subcategories.forEach(sub => {
        const subResult = { subcategory: sub.subcategory, parameters: [] };
        evalParams(sub.parameters, subResult.parameters);
        catResult.subcategories.push(subResult);
      });
    } else {
      evalParams(cat.parameters, catResult.parameters);
    }
    results.push(catResult);
  });

  const score = Math.round((correct / total) * 100);
  const passed = score >= 80;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  hide('screen-exam');
  renderResults(results, score, correct, total, passed, mins, secs);
  show('screen-results');
  window.scrollTo(0, 0);
}

function countUnanswered() {
  let count = 0;
  document.querySelectorAll('#exam-content input').forEach(inp => {
    if (!inp.value.trim()) count++;
  });
  return count;
}

// ── Render de resultados ──────────────────────────────────────────────────────

function renderResults(results, score, correct, total, passed, mins, secs) {
  const scoreEl = document.getElementById('result-score');
  scoreEl.textContent = `${score}%`;
  scoreEl.className = `score-value ${passed ? 'passed' : 'failed'}`;

  const statusEl = document.getElementById('result-status');
  statusEl.textContent = passed ? 'APTO' : 'NO APTO';
  statusEl.className = `result-status ${passed ? 'passed' : 'failed'}`;

  document.getElementById('result-detail').textContent = `${correct} / ${total}`;
  document.getElementById('result-time').textContent =
    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  document.getElementById('result-mode').textContent = currentMode;

  const reviewEl = document.getElementById('result-review');
  reviewEl.innerHTML = '';

  results.forEach(result => {
    if (result.type === 'procedure') {
      const section = el('div', 'review-procedure');
      const title = el('h3', 'review-proc-title');
      title.textContent = result.title;
      section.appendChild(title);

      result.steps.forEach(step => {
        const row = el('div', `review-step ${step.correct ? 'correct' : 'incorrect'}`);
        const num = el('span', 'step-num');
        num.textContent = step.idx;
        const icon = el('span', 'check-icon');
        icon.textContent = step.correct ? '✓' : '✗';

        if (step.correct) {
          const ans = el('span', 'correct-answer');
          ans.textContent = step.correctAnswer;
          row.append(num, ans, icon);
        } else {
          const cmp = el('div', 'answer-comparison');
          const user = el('span', 'user-answer');
          user.textContent = step.userAnswer || '(vacío)';
          const correct = el('span', 'correct-label');
          correct.textContent = `→ ${step.correctAnswer}`;
          cmp.append(user, correct);
          row.append(num, cmp, icon);
        }
        section.appendChild(row);
      });
      reviewEl.appendChild(section);

    } else if (result.type === 'limits') {
      const section = el('div', 'review-category');
      const catTitle = el('h3', 'review-cat-title');
      catTitle.textContent = result.category;
      section.appendChild(catTitle);

      if (result.subcategories.length > 0) {
        result.subcategories.forEach(sub => {
          const subDiv = el('div', 'review-subcategory');
          const subTitle = el('h4', 'review-sub-title');
          subTitle.textContent = sub.subcategory;
          subDiv.appendChild(subTitle);
          renderParamResults(sub.parameters, subDiv);
          section.appendChild(subDiv);
        });
      } else {
        renderParamResults(result.parameters, section);
      }
      reviewEl.appendChild(section);
    }
  });
}

function renderParamResults(parameters, container) {
  parameters.forEach(param => {
    const row = el('div', `review-param-row ${param.allCorrect ? 'correct' : 'incorrect'}`);
    const label = el('span', 'param-label');
    label.textContent = param.label;
    const icon = el('span', 'check-icon');
    icon.textContent = param.allCorrect ? '✓' : '✗';

    if (param.allCorrect) {
      const ans = el('span', 'correct-answer');
      ans.textContent = param.fields.map(f => f.correctAnswer).join(' / ');
      row.append(label, ans, icon);
    } else {
      const cmp = el('div', 'answer-comparison');
      const user = el('span', 'user-answer');
      user.textContent = param.fields.map(f => f.userAnswer || '—').join(' / ');
      const correct = el('span', 'correct-label');
      correct.textContent = `→ ${param.fields.map(f => f.correctAnswer).join(' / ')}`;
      cmp.append(user, correct);
      row.append(label, cmp, icon);
    }
    container.appendChild(row);
  });
}
