// EMERLIMITATOR — Lógica de la aplicación

let currentMode     = null;
let examStartTime   = null;
let lastExamResult  = null;
let lastExamResults = null;

// ── Datos dinámicos (admin override via localStorage) ─────────────────────────

const ADMIN_USER_DEFAULT = 'Ala23RPAS';
const ADMIN_PASS_DEFAULT = 'AdelanteRPAS';
const STORAGE_KEY    = 'emerlimitator_data';
const CREDS_KEY      = 'emerlimitator_creds';
const PERSONNEL_KEY  = 'emerlimitator_personnel';
const RESULTS_KEY    = 'emerlimitator_results_v1';

const RANK_ORDER = ['Comandante','Capitán','Teniente','Subteniente','Brigada','Sargento Primero','Sargento'];

function getExamData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  return EXAM_DATA;
}

function getCredentials() {
  try {
    const s = localStorage.getItem(CREDS_KEY);
    if (s) return JSON.parse(s);
  } catch (e) {}
  return { user: ADMIN_USER_DEFAULT, pass: ADMIN_PASS_DEFAULT };
}

function getPersonnel() {
  try {
    const s = localStorage.getItem(PERSONNEL_KEY);
    if (s) {
      const d = JSON.parse(s);
      ['LRE','MCE'].forEach(m => {
        if (d[m]) d[m] = d[m].map(e => typeof e === 'string' ? { name: e, rank: '' } : e);
      });
      return d;
    }
  } catch (e) {}
  return { LRE: [], MCE: [] };
}

function getExamResults() {
  try {
    const s = localStorage.getItem(RESULTS_KEY);
    if (s) return JSON.parse(s);
  } catch(e) {}
  return [];
}

function saveExamResult(r) {
  const all = getExamResults();
  const now = new Date();
  all.push({
    id:           Date.now(),
    date:         now.toISOString().split('T')[0],
    month:        r.studentMonth,
    year:         now.getFullYear(),
    studentName:  r.studentName,
    rank:         r.studentRank || '',
    mode:         currentMode,
    capsScore:    r.capsScore,
    limitsScore:  r.limitsScore,
    globalScore:  r.globalScore,
    overallPassed: r.overallPassed,
    capsOnly:     r.capsOnly
  });
  localStorage.setItem(RESULTS_KEY, JSON.stringify(all));
}

// ── Calendario bienvenida ─────────────────────────────────────────────────────

function buildCalendar() {
  const cal = document.getElementById('welcome-calendar');
  if (!cal) return;
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const DAYS_ES   = ['L','M','X','J','V','S','D'];

  const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
  const startCol = (firstDay + 6) % 7; // convert to Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayNames = DAYS_ES.map(d =>
    `<div class="cal-day-name">${d}</div>`).join('');

  let cells = Array(startCol).fill('<div class="cal-day empty">·</div>');
  for (let d = 1; d <= daysInMonth; d++) {
    const cls = d === today ? 'cal-day today' : 'cal-day';
    cells.push(`<div class="${cls}">${d}</div>`);
  }

  cal.innerHTML = `
    <div class="cal-header">${MONTHS_ES[month]} ${year}</div>
    <div class="cal-grid">${dayNames}${cells.join('')}</div>`;
}

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

  const autofillBtn = document.getElementById('btn-autofill');
  if (currentMode === 'LRE') autofillBtn.classList.remove('hidden');
  else autofillBtn.classList.add('hidden');

  // Poblar desplegable de alumnos
  const nameSelect = document.getElementById('exam-user-name');
  nameSelect.innerHTML = '<option value="">— Seleccionar alumno —</option>';
  (getPersonnel()[currentMode] || []).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.name;
    opt.textContent = p.rank ? `${p.rank} — ${p.name}` : p.name;
    nameSelect.appendChild(opt);
  });
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('exam-month').value = MONTHS[new Date().getMonth()];

  // Sección: Procedimientos de emergencia
  const epSection = el('div', 'exam-section');
  epSection.id = 'caps-section';
  epSection.appendChild(sectionTitle('PROCEDIMIENTOS DE EMERGENCIA'));

  getExamData().emergencyProcedures
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

  // Botón de entrega parcial — solo CAPs
  const capsOnlyWrap = el('div', 'caps-submit-wrap');
  const capsOnlyBtn  = document.createElement('button');
  capsOnlyBtn.className = 'btn-caps-submit';
  capsOnlyBtn.textContent = 'EVALUAR SOLO CAPs';
  capsOnlyBtn.onclick = () => submitExam(true);
  const capsOnlyNote = el('p', 'caps-submit-note');
  capsOnlyNote.textContent = 'Solo se evaluarán los procedimientos de emergencia. Los límites de sistemas quedarán sin evaluar.';
  capsOnlyWrap.append(capsOnlyBtn, capsOnlyNote);
  container.appendChild(capsOnlyWrap);

  // Sección: Límites de sistemas
  const slSection = el('div', 'exam-section');
  slSection.id = 'limits-section';
  slSection.appendChild(sectionTitle('LÍMITES DE SISTEMAS'));

  getExamData().systemLimits.forEach(cat => {
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
  setupEnterNavigation();
  container.addEventListener('input', updateProgressBar);
  updateProgressBar();
}

function updateProgressBar() {
  const pct = inputs => {
    if (!inputs.length) return 0;
    const filled = Array.from(inputs).filter(i => i.value.trim()).length;
    return (filled / inputs.length * 100).toFixed(1);
  };
  const capsFill   = document.getElementById('exam-progress-caps-fill');
  const limitsFill = document.getElementById('exam-progress-limits-fill');
  if (capsFill)   capsFill.style.width   = pct(document.querySelectorAll('#caps-section input'))   + '%';
  if (limitsFill) limitsFill.style.width = pct(document.querySelectorAll('#limits-section input')) + '%';
}

function autoFillExam() {
  const data = getExamData();
  data.emergencyProcedures
    .filter(p => p.modes.includes(currentMode))
    .forEach(proc => {
      proc.steps.forEach((step, idx) => {
        const inp = document.getElementById(`ep_${proc.id}_${idx}`);
        if (inp) inp.value = step;
      });
    });
  const fillParams = params => params.forEach(param => {
    param.inputs.forEach(item => {
      if (item.separator === undefined && item.id) {
        const inp = document.getElementById(item.id);
        if (inp) inp.value = item.answer;
      }
    });
  });
  data.systemLimits.forEach(cat => {
    if (cat.subcategories) cat.subcategories.forEach(sub => fillParams(sub.parameters));
    else fillParams(cat.parameters);
  });
}

function setupEnterNavigation() {
  const inputs = Array.from(document.querySelectorAll('#exam-content input'));
  inputs.forEach((inp, i) => {
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const next = inputs[i + 1];
      if (next) next.focus();
    });
  });
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

function submitExam(forceCapsOnly) {
  const data = getExamData();
  const capProcs = data.emergencyProcedures.filter(p => p.modes.includes(currentMode));

  // Contar CAPs rellenos / vacíos
  let capsFilledCount = 0, capsEmptyCount = 0;
  capProcs.forEach(proc => {
    proc.steps.forEach((_, idx) => {
      const inp = document.getElementById(`ep_${proc.id}_${idx}`);
      if (inp && inp.value.trim()) capsFilledCount++;
      else capsEmptyCount++;
    });
  });

  if (capsFilledCount === 0) {
    alert('Los procedimientos de emergencia (CAPs) son obligatorios. Rellena al menos un campo antes de enviar.');
    return;
  }
  if (capsEmptyCount > 0) {
    if (!confirm(`Quedan ${capsEmptyCount} procedimientos sin responder. ¿Deseas enviar igualmente?`)) return;
  }

  // Contar límites rellenos / vacíos (omitir si forceCapsOnly)
  let limitsFilledCount = 0, limitsEmptyCount = 0;
  if (!forceCapsOnly) {
    data.systemLimits.forEach(cat => {
      const countP = params => params.forEach(param => param.inputs.forEach(item => {
        if (item.separator !== undefined) return;
        const inp = document.getElementById(item.id);
        if (inp && inp.value.trim()) limitsFilledCount++;
        else limitsEmptyCount++;
      }));
      if (cat.subcategories) cat.subcategories.forEach(sub => countP(sub.parameters));
      else countP(cat.parameters);
    });
  }

  const capsOnly = forceCapsOnly || limitsFilledCount === 0;

  if (!capsOnly && limitsEmptyCount > 0) {
    if (!confirm(`Quedan ${limitsEmptyCount} límites sin responder. ¿Deseas enviar igualmente?`)) return;
  }

  const elapsed = Math.floor((Date.now() - examStartTime) / 1000);
  let capsTotal = 0, capsCorrect = 0;
  let limitsTotal = 0, limitsCorrect = 0;
  const results = [];

  // Corregir CAPs
  capProcs.forEach(proc => {
    const procResult = { type: 'procedure', title: proc.title, steps: [] };
    proc.steps.forEach((answer, idx) => {
      const inputEl = document.getElementById(`ep_${proc.id}_${idx}`);
      const userVal = inputEl ? inputEl.value : '';
      const ok = answersMatch(userVal, answer);
      capsTotal++; if (ok) capsCorrect++;
      procResult.steps.push({ idx: idx + 1, userAnswer: userVal, correctAnswer: answer, correct: ok });
    });
    results.push(procResult);
  });

  // Corregir límites (solo si se rellenó algo)
  if (!capsOnly) {
    const evalParams = (parameters, dest) => {
      parameters.forEach(param => {
        const pResult = { label: param.label, fields: [], allCorrect: true };
        param.inputs.forEach(item => {
          if (item.separator !== undefined) return;
          const inputEl = document.getElementById(item.id);
          const userVal = inputEl ? inputEl.value : '';
          const ok = answersMatch(userVal, item.answer);
          limitsTotal++; if (ok) limitsCorrect++;
          if (!ok) pResult.allCorrect = false;
          pResult.fields.push({ userAnswer: userVal, correctAnswer: item.answer, correct: ok });
        });
        dest.push(pResult);
      });
    };
    data.systemLimits.forEach(cat => {
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
  }

  const capsScore    = Math.round((capsCorrect / capsTotal) * 100);
  const capsPassed   = capsScore === 100;
  const limitsScore  = capsOnly ? null : (limitsTotal ? Math.round((limitsCorrect / limitsTotal) * 100) : 0);
  const limitsPassed = capsOnly ? null : limitsScore >= 80;
  const globalTotal   = capsTotal + (capsOnly ? 0 : limitsTotal);
  const globalCorrect = capsCorrect + (capsOnly ? 0 : limitsCorrect);
  const globalScore   = Math.round((globalCorrect / globalTotal) * 100);
  const overallPassed = capsOnly ? capsPassed : (capsPassed && limitsPassed);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const studentName  = document.getElementById('exam-user-name').value;
  const studentMonth = document.getElementById('exam-month').value;
  const pEntry       = (getPersonnel()[currentMode] || []).find(p => p.name === studentName);
  const studentRank  = pEntry ? (pEntry.rank || '') : '';

  lastExamResult  = { studentName, studentRank, studentMonth, capsScore, capsPassed, capsCorrect, capsTotal, limitsScore, limitsPassed, limitsCorrect, limitsTotal, globalScore, overallPassed, globalCorrect, globalTotal, capsOnly };
  lastExamResults = results;
  if (studentName) saveExamResult(lastExamResult);

  hide('screen-exam');
  renderResults(results, {
    capsScore, capsPassed, capsCorrect, capsTotal,
    limitsScore, limitsPassed, limitsCorrect, limitsTotal,
    globalScore, overallPassed, globalCorrect, globalTotal,
    capsOnly, mins, secs, studentName, studentMonth
  });
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

function renderResults(results, scores) {
  const {
    capsScore, capsPassed, capsCorrect, capsTotal,
    limitsScore, limitsPassed, limitsCorrect, limitsTotal,
    globalScore, overallPassed, globalCorrect, globalTotal,
    capsOnly, mins, secs, studentName, studentMonth
  } = scores;

  document.getElementById('result-mode-badge').textContent = currentMode;
  document.getElementById('result-time').textContent =
    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Ficha del alumno
  const infoEl = document.getElementById('result-student-info');
  const modeEl = document.getElementById('result-mode');
  if (modeEl) modeEl.textContent = currentMode;
  if (studentName || studentMonth) {
    document.getElementById('result-student-name').textContent  = studentName  || '—';
    document.getElementById('result-student-month').textContent = studentMonth || '—';
    infoEl.classList.remove('hidden');
  } else {
    infoEl.classList.add('hidden');
  }

  // Paneles de puntuación
  const panelsEl = document.getElementById('score-panels');
  panelsEl.innerHTML = '';

  panelsEl.appendChild(buildScorePanel(
    'PROCEDIMIENTOS (CAPs)', capsScore, capsPassed,
    `${capsCorrect} / ${capsTotal}`, 'mín. 100%', false
  ));

  if (!capsOnly) {
    panelsEl.appendChild(buildScorePanel(
      'LÍMITES DE SISTEMAS', limitsScore, limitsPassed,
      `${limitsCorrect} / ${limitsTotal}`, 'mín. 80%', false
    ));
  }

  panelsEl.appendChild(buildScorePanel(
    'GLOBAL', globalScore, overallPassed,
    `${globalCorrect} / ${globalTotal}`,
    capsOnly ? 'solo CAPs evaluadas' : 'CAPs + Límites', true
  ));

  // Revisión de respuestas
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
          const corr = el('span', 'correct-label');
          corr.textContent = `→ ${step.correctAnswer}`;
          cmp.append(user, corr);
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

function buildScorePanel(label, score, passed, detail, note, isGlobal) {
  const panel = el('div', `score-panel-item${isGlobal ? ' panel-global' : ''}${passed ? ' panel-pass' : ' panel-fail'}`);

  const lbl = el('div', 'score-panel-label');
  lbl.textContent = label;

  const val = el('div', `score-panel-value ${passed ? 'passed' : 'failed'}`);
  val.textContent = `${score}%`;

  const status = el('div', `score-panel-status ${passed ? 'passed' : 'failed'}`);
  status.textContent = passed ? 'APTO' : 'NO APTO';

  const det = el('div', 'score-panel-detail');
  det.textContent = detail;

  const noteEl = el('div', 'score-panel-note');
  noteEl.textContent = note;

  panel.append(lbl, val, status, det, noteEl);
  return panel;
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

// ── Administrador ─────────────────────────────────────────────────────────────

function showAdmin() {
  hide('screen-welcome');
  show('screen-admin');
  setTimeout(() => document.getElementById('admin-username').focus(), 50);
}

function hideAdmin() {
  hide('screen-admin');
  show('screen-welcome');
  show('admin-login-wrap');
  hide('admin-editor');
  document.getElementById('admin-username').value = '';
  document.getElementById('admin-password').value = '';
  document.getElementById('admin-login-error').textContent = '';
  window.scrollTo(0, 0);
}

function adminLogin() {
  const user = document.getElementById('admin-username').value;
  const pass = document.getElementById('admin-password').value;
  const creds = getCredentials();
  if (user === creds.user && pass === creds.pass) {
    hide('admin-login-wrap');
    show('admin-editor');
    renderAdminEditor();
    window.scrollTo(0, 0);
  } else {
    const errEl = document.getElementById('admin-login-error');
    errEl.textContent = 'Credenciales incorrectas. Inténtalo de nuevo.';
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-password').focus();
  }
}

function renderAdminEditor() {
  const data = getExamData();
  const container = document.getElementById('admin-content');
  container.innerHTML = '';

  // Sección de credenciales
  container.appendChild(renderCredentialSection());

  // Procedimientos de emergencia
  const epSection = el('div', 'exam-section');
  epSection.appendChild(sectionTitle('PROCEDIMIENTOS DE EMERGENCIA'));

  data.emergencyProcedures.forEach(proc => {
    const box = el('div', 'procedure');
    const hdr = el('div', 'admin-proc-header');
    const title = el('h3', 'procedure-title');
    title.textContent = proc.title;
    const tag = el('span', 'admin-mode-tag');
    tag.textContent = proc.modes.join(' · ');
    hdr.append(title, tag);
    box.appendChild(hdr);

    proc.steps.forEach((step, idx) => {
      const row = el('div', 'step-row');
      const num = el('span', 'step-num');
      num.textContent = idx + 1;
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `adm_ep_${proc.id}_${idx}`;
      input.className = 'step-input';
      input.value = step;
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

  // Límites de sistemas
  const slSection = el('div', 'exam-section');
  slSection.appendChild(sectionTitle('LÍMITES DE SISTEMAS'));

  data.systemLimits.forEach(cat => {
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
        sub.parameters.forEach(p => subDiv.appendChild(renderAdminParamRow(p)));
        box.appendChild(subDiv);
      });
    } else {
      cat.parameters.forEach(p => box.appendChild(renderAdminParamRow(p)));
    }

    slSection.appendChild(box);
  });

  container.appendChild(slSection);
}

function renderAdminParamRow(param) {
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
      inp.id = `adm_${item.id}`;
      inp.className = 'limit-input';
      inp.value = item.answer;
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

function collectAdminData() {
  const data = JSON.parse(JSON.stringify(getExamData()));

  data.emergencyProcedures.forEach(proc => {
    proc.steps = proc.steps.map((original, idx) => {
      const inp = document.getElementById(`adm_ep_${proc.id}_${idx}`);
      return (inp && inp.value.trim()) ? inp.value.trim() : original;
    });
  });

  const processParams = params => {
    params.forEach(param => {
      param.inputs.forEach(item => {
        if (item.separator !== undefined) return;
        const inp = document.getElementById(`adm_${item.id}`);
        if (inp && inp.value.trim()) item.answer = inp.value.trim();
      });
    });
  };

  data.systemLimits.forEach(cat => {
    if (cat.subcategories) {
      cat.subcategories.forEach(sub => processParams(sub.parameters));
    } else {
      processParams(cat.parameters);
    }
  });

  return data;
}

function saveAdminData() {
  // Gestión de credenciales
  const newUser    = document.getElementById('adm_new_user').value.trim();
  const newPass    = document.getElementById('adm_new_pass').value;
  const confirmPass = document.getElementById('adm_confirm_pass').value;
  const credsErrEl = document.getElementById('adm_creds_error');
  credsErrEl.textContent = '';

  if (newUser || newPass || confirmPass) {
    if (newPass !== confirmPass) {
      credsErrEl.textContent = 'Las contraseñas no coinciden.';
      document.getElementById('adm_confirm_pass').focus();
      return;
    }
    const current = getCredentials();
    localStorage.setItem(CREDS_KEY, JSON.stringify({
      user: newUser || current.user,
      pass: newPass || current.pass
    }));
    document.getElementById('adm_new_user').value = '';
    document.getElementById('adm_new_pass').value = '';
    document.getElementById('adm_confirm_pass').value = '';
    // Update displayed username
    const userDisplay = document.getElementById('adm_current_user');
    if (userDisplay) userDisplay.textContent = newUser || current.user;
  }

  // Guardar datos del examen
  const data = collectAdminData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  showAdminMsg('✓ Cambios guardados correctamente');
}

function resetAdminData() {
  if (!confirm('¿Restaurar todos los valores originales? Se perderán los cambios guardados.')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderAdminEditor();
  showAdminMsg('✓ Valores restaurados a los originales');
}

function showAdminMsg(text) {
  const msg = document.getElementById('admin-save-msg');
  msg.textContent = text;
  msg.classList.remove('hidden');
  clearTimeout(msg._t);
  msg._t = setTimeout(() => msg.classList.add('hidden'), 3000);
}

function renderCredentialSection() {
  const { user } = getCredentials();
  const wrap = el('div', 'admin-creds-section');

  const title = el('h2', 'section-title');
  title.textContent = 'ACCESO DE ADMINISTRADOR';
  wrap.appendChild(title);

  const card = el('div', 'admin-creds-card');

  const current = el('div', 'admin-creds-current');
  current.innerHTML = `Usuario activo: <strong id="adm_current_user">${user}</strong>`;
  card.appendChild(current);

  const fields = el('div', 'admin-creds-fields');

  [
    { id: 'adm_new_user',    label: 'NUEVO USUARIO',         type: 'text',     placeholder: 'Dejar vacío para no cambiar' },
    { id: 'adm_new_pass',    label: 'NUEVA CONTRASEÑA',      type: 'password', placeholder: '' },
    { id: 'adm_confirm_pass',label: 'CONFIRMAR CONTRASEÑA',  type: 'password', placeholder: '' }
  ].forEach(cfg => {
    const f = el('div', 'admin-field');
    const lbl = el('label', 'admin-label');
    lbl.textContent = cfg.label;
    const inp = document.createElement('input');
    inp.type = cfg.type;
    inp.id = cfg.id;
    inp.className = 'admin-input';
    inp.placeholder = cfg.placeholder;
    inp.autocomplete = 'off';
    f.append(lbl, inp);
    fields.appendChild(f);
  });

  card.appendChild(fields);

  const errEl = el('div', 'admin-error');
  errEl.id = 'adm_creds_error';
  card.appendChild(errEl);

  wrap.appendChild(card);
  return wrap;
}

// ── Utilidad: eliminar fondo blanco de imágenes ───────────────────────────────

function removeWhiteBackground(img, threshold) {
  if (img.dataset.processed) return;
  img.dataset.processed = '1';
  const t = threshold !== undefined ? threshold : 230;
  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  try {
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d  = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > t && d[i+1] > t && d[i+2] > t) d[i+3] = 0;
    }
    ctx.putImageData(id, 0, 0);
    img.src = canvas.toDataURL('image/png');
  } catch (e) {
    img.style.mixBlendMode = 'multiply';
  }
}

// ── Gestión de personal ───────────────────────────────────────────────────────

function showPersonnel() {
  hide('screen-admin');
  show('screen-personnel');
  renderPersonnelScreen();
  window.scrollTo(0, 0);
}

function hidePersonnel() {
  hide('screen-personnel');
  show('screen-admin');
  window.scrollTo(0, 0);
}

function renderPersonnelScreen() {
  ['LRE', 'MCE'].forEach(mode => {
    const listEl = document.getElementById(`personnel-${mode.toLowerCase()}-list`);
    const names  = getPersonnel()[mode] || [];
    listEl.innerHTML = '';

    if (names.length === 0) {
      const empty = el('div', 'personnel-empty');
      empty.textContent = 'Sin personal registrado';
      listEl.appendChild(empty);
      return;
    }

    names.forEach((entry, idx) => {
      const { name, rank } = entry;
      const row    = el('div', 'personnel-row');
      const nameEl = el('span', 'personnel-name');
      if (rank) {
        const rankSpan = el('span', 'history-rank');
        rankSpan.textContent = rank + ' ';
        nameEl.appendChild(rankSpan);
        nameEl.appendChild(document.createTextNode(name));
      } else {
        nameEl.textContent = name;
      }

      const moveWrap = el('span', 'personnel-move-btns');
      const upBtn  = document.createElement('button');
      upBtn.className  = 'btn-personnel-move';
      upBtn.textContent = '↑';
      upBtn.title      = 'Subir';
      upBtn.disabled   = idx === 0;
      upBtn.onclick    = () => movePersonnel(mode, idx, -1);
      const downBtn = document.createElement('button');
      downBtn.className  = 'btn-personnel-move';
      downBtn.textContent = '↓';
      downBtn.title      = 'Bajar';
      downBtn.disabled   = idx === names.length - 1;
      downBtn.onclick    = () => movePersonnel(mode, idx, 1);
      moveWrap.append(upBtn, downBtn);

      const delBtn = document.createElement('button');
      delBtn.className  = 'btn-personnel-del';
      delBtn.textContent = '×';
      delBtn.title      = 'Eliminar';
      delBtn.onclick    = () => removePersonnel(mode, idx);

      row.append(nameEl, moveWrap, delBtn);
      listEl.appendChild(row);
    });
  });
}

function movePersonnel(mode, idx, dir) {
  const data = getPersonnel();
  if (!data[mode]) return;
  const arr = data[mode];
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  localStorage.setItem(PERSONNEL_KEY, JSON.stringify(data));
  renderPersonnelScreen();
}

function addPersonnel(mode) {
  const input   = document.getElementById(`personnel-${mode.toLowerCase()}-input`);
  const rankSel = document.getElementById(`personnel-${mode.toLowerCase()}-rank`);
  const name    = input.value.trim();
  if (!name) return;

  const data = getPersonnel();
  if (!data[mode]) data[mode] = [];
  if (data[mode].map(p => p.name.toUpperCase()).includes(name.toUpperCase())) {
    alert('Ese nombre ya figura en la lista.');
    return;
  }
  const rank = rankSel ? rankSel.value : '';
  data[mode].push({ name, rank });
  data[mode].sort((a, b) => {
    const ai = RANK_ORDER.indexOf(a.rank), bi = RANK_ORDER.indexOf(b.rank);
    const ar = ai === -1 ? 999 : ai,       br = bi === -1 ? 999 : bi;
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name, 'es');
  });
  localStorage.setItem(PERSONNEL_KEY, JSON.stringify(data));
  input.value = '';
  if (rankSel) rankSel.value = '';
  input.focus();
  renderPersonnelScreen();
}

function removePersonnel(mode, idx) {
  const data = getPersonnel();
  if (!data[mode]) return;
  data[mode].splice(idx, 1);
  localStorage.setItem(PERSONNEL_KEY, JSON.stringify(data));
  renderPersonnelScreen();
}

// ── Historial / Clasificación mensual ────────────────────────────────────────

function showHistory() {
  const yearSel = document.getElementById('history-year');
  yearSel.innerHTML = '';
  const cy = new Date().getFullYear();
  for (let y = cy; y >= cy - 3; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    yearSel.appendChild(opt);
  }
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('history-month').value = MONTHS[new Date().getMonth()];
  hide('screen-welcome');
  show('screen-history');
  renderHistory();
  window.scrollTo(0, 0);
}

function hideHistory() {
  hide('screen-history');
  show('screen-welcome');
  window.scrollTo(0, 0);
}

function sortedByRank(arr) {
  return [...arr].sort((a, b) => {
    const ai = RANK_ORDER.indexOf(a.rank), bi = RANK_ORDER.indexOf(b.rank);
    const ar = ai === -1 ? 999 : ai,       br = bi === -1 ? 999 : bi;
    if (ar !== br) return ar - br;
    return (a.studentName || '').localeCompare(b.studentName || '', 'es');
  });
}

function renderHistory() {
  const month = document.getElementById('history-month').value;
  const year  = parseInt(document.getElementById('history-year').value);
  const all   = sortedByRank(getExamResults().filter(r => r.month === month && r.year === year));
  const wrap  = document.getElementById('history-content');
  wrap.innerHTML = '';

  if (all.length === 0) {
    const empty = el('div', 'history-empty');
    empty.textContent = `Sin resultados registrados para ${month} de ${year}.`;
    wrap.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'history-table';
  table.innerHTML = `<thead><tr>
    <th class="th-center">#</th>
    <th>RANGO</th><th>NOMBRE</th><th>MODO</th>
    <th class="th-center">CAPs</th><th class="th-center">LÍMITES</th>
    <th class="th-center">GLOBAL</th><th>RESULTADO</th>
  </tr></thead>`;

  const tbody = document.createElement('tbody');
  all.forEach((r, i) => {
    const tr = document.createElement('tr');
    const limTxt = r.limitsScore != null && !r.capsOnly ? r.limitsScore + '%' : 'N/A';
    tr.innerHTML = `
      <td class="td-center history-pos">${i + 1}</td>
      <td><span class="history-rank">${r.rank || '—'}</span></td>
      <td>${r.studentName || '—'}</td>
      <td>${r.mode}</td>
      <td class="td-center">${r.capsScore != null ? r.capsScore + '%' : '—'}</td>
      <td class="td-center">${limTxt}</td>
      <td class="td-center">${r.globalScore != null ? r.globalScore + '%' : '—'}</td>
      <td class="${r.overallPassed ? 'history-result-apto' : 'history-result-noapto'}">${r.overallPassed ? 'APTO' : 'NO APTO'}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
}

function exportHistoryPDF() {
  const month = document.getElementById('history-month').value;
  const year  = parseInt(document.getElementById('history-year').value);
  const all   = sortedByRank(getExamResults().filter(r => r.month === month && r.year === year));

  const BLUE = '#2F5496', GOLD = '#FFD966', GREY = '#6B7280', LGREY = '#E5E7EB';
  const DGRN = '#15803d', RED = '#dc2626';
  const base = window.location.href.replace(/[^/]*$/, '');

  let rows = '';
  all.forEach((r, i) => {
    const limTxt = r.limitsScore != null && !r.capsOnly ? r.limitsScore + '%' : 'N/A';
    const resClr = r.overallPassed ? DGRN : RED;
    const bg     = i % 2 === 0 ? '#ffffff' : '#F9FAFB';
    rows += `<tr style="background:${bg}">
      <td style="padding:5px 8px;text-align:center;font-size:11px;color:${GREY};border-bottom:1px solid ${LGREY};">${i + 1}</td>
      <td style="padding:5px 8px;font-size:10px;font-weight:700;color:${BLUE};border-bottom:1px solid ${LGREY};">${r.rank || '—'}</td>
      <td style="padding:5px 8px;font-size:11px;border-bottom:1px solid ${LGREY};">${r.studentName || '—'}</td>
      <td style="padding:5px 8px;font-size:10px;color:${GREY};border-bottom:1px solid ${LGREY};">${r.mode}</td>
      <td style="padding:5px 8px;text-align:center;font-size:11px;font-weight:600;color:${r.capsScore===100?DGRN:RED};border-bottom:1px solid ${LGREY};">${r.capsScore != null ? r.capsScore+'%' : '—'}</td>
      <td style="padding:5px 8px;text-align:center;font-size:11px;font-weight:600;color:${GREY};border-bottom:1px solid ${LGREY};">${limTxt}</td>
      <td style="padding:5px 8px;text-align:center;font-size:11px;font-weight:600;color:${r.globalScore>=80?DGRN:RED};border-bottom:1px solid ${LGREY};">${r.globalScore != null ? r.globalScore+'%' : '—'}</td>
      <td style="padding:5px 8px;font-size:10px;font-weight:700;color:${resClr};border-bottom:1px solid ${LGREY};">${r.overallPassed ? 'APTO' : 'NO APTO'}</td>
    </tr>`;
  });

  if (!rows) rows = `<tr><td colspan="8" style="padding:24px;text-align:center;color:${GREY};font-size:12px;">Sin resultados para este período</td></tr>`;

  const thStyle = `padding:7px 8px;font-size:9px;font-weight:700;letter-spacing:1.5px;color:${GREY};text-transform:uppercase;border-bottom:2px solid ${LGREY};background:#F3F4F6;`;
  const html = `<div style="font-family:Arial,sans-serif;background:#fff;color:${BLUE};width:794px;padding:44px 48px 52px;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;">
      <img src="${base}assets/Logo%20EA%20azul%20version%202.png" style="height:44px;width:auto;">
      <div style="text-align:right;font-size:8px;color:${GREY};letter-spacing:1px;text-transform:uppercase;line-height:1.8;">
        EMERLIMITATOR<br>Ejército del Aire y del Espacio de España
      </div>
    </div>
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:22px;font-weight:800;color:${GOLD};letter-spacing:6px;text-transform:uppercase;margin-bottom:6px;">CLASIFICACIÓN MENSUAL</div>
      <div style="font-size:14px;font-weight:600;color:${BLUE};">${month} ${year}</div>
    </div>
    <div style="height:4px;background:linear-gradient(90deg,#ad2e1c 25%,${GOLD} 25%,${GOLD} 75%,#ad2e1c 75%);border-radius:2px;margin-bottom:24px;"></div>
    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
      <thead><tr>
        <th style="${thStyle}text-align:center;">#</th>
        <th style="${thStyle}">RANGO</th><th style="${thStyle}">NOMBRE</th>
        <th style="${thStyle}">MODO</th><th style="${thStyle}text-align:center;">CAPs</th>
        <th style="${thStyle}text-align:center;">LÍMITES</th><th style="${thStyle}text-align:center;">GLOBAL</th>
        <th style="${thStyle}">RESULTADO</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:28px;padding-top:10px;border-top:1px solid ${LGREY};display:flex;justify-content:space-between;">
      <span style="font-size:8px;color:${GREY};letter-spacing:1px;">Ejército del Aire y del Espacio de España</span>
      <span style="font-size:8px;color:${GREY};">EMERLIMITATOR</span>
    </div>
  </div>`;

  const printWin = window.open('', '_blank');
  printWin.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8"><title>CLASIFICACION_${month}_${year}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#fff}
    @page{size:A4 portrait;margin:0}
    @media print{html,body{width:210mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>${html}</body></html>`);
  printWin.document.close();
  printWin.addEventListener('load', () => setTimeout(() => printWin.print(), 400));
}

// ── Exportación PDF ───────────────────────────────────────────────────────────

function exportCertificatePDF() {
  const r       = lastExamResult  || {};
  const results = lastExamResults || [];

  const clean = s => (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const globalResult = r.overallPassed != null ? (r.overallPassed ? 'APTO' : 'NOAPTO') : null;
  const parts = [r.studentName, r.studentMonth, currentMode, globalResult]
    .filter(Boolean).map(clean).filter(Boolean);
  const filename = (parts.join('_') || 'EMERLIMITATOR_resultado') + '.pdf';

  // Colores del documento Word de referencia
  const BLUE  = '#2F5496';
  const GOLD  = '#FFD966';
  const GREEN = '#92D050';
  const DGRN  = '#15803d';
  const RED   = '#dc2626';
  const GREY  = '#6B7280';
  const LGREY = '#E5E7EB';
  const W = 794; // A4 portrait a 96 dpi

  const panel = (label, score, passed, detail, note, big) => {
    const fg = passed ? DGRN : RED;
    const bg = passed ? '#f0fdf4' : '#fef2f2';
    const bd = passed ? '#86efac' : '#fca5a5';
    return `<div style="flex:1;text-align:center;padding:14px 8px;border:${big?2:1}px solid ${bd};background:${bg};border-radius:4px;">
      <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:${GREY};text-transform:uppercase;margin-bottom:8px;">${label}</div>
      <div style="font-size:${big?36:28}px;font-weight:800;line-height:1;color:${fg};">${score}%</div>
      <div style="font-size:10px;font-weight:700;letter-spacing:2px;margin-top:6px;color:${fg};">${passed?'APTO':'NO APTO'}</div>
      <div style="font-size:9px;color:${GREY};margin-top:5px;">${detail}</div>
      <div style="font-size:8px;color:${GREY};letter-spacing:1px;text-transform:uppercase;">${note}</div>
    </div>`;
  };

  let panelsHtml = panel('PROCEDIMIENTOS (CAPs)', r.capsScore, r.capsPassed, `${r.capsCorrect}/${r.capsTotal} correctas`, 'mín. 100%', false);
  if (!r.capsOnly && r.limitsScore != null)
    panelsHtml += panel('LÍMITES DE SISTEMAS', r.limitsScore, r.limitsPassed, `${r.limitsCorrect}/${r.limitsTotal} correctas`, 'mín. 80%', false);
  panelsHtml += panel('GLOBAL', r.globalScore, r.overallPassed, `${r.globalCorrect}/${r.globalTotal} correctas`, r.capsOnly ? 'solo CAPs' : 'CAPs + Límites', true);

  let errRows = '', hasErrors = false;
  results.forEach(res => {
    if (res.type === 'procedure') {
      res.steps.filter(s => !s.correct).forEach(step => {
        hasErrors = true;
        errRows += `<tr>
          <td style="padding:5px 8px;font-size:10px;color:${GREY};border-bottom:1px solid ${LGREY};">Paso ${step.idx}</td>
          <td style="padding:5px 8px;font-size:10px;color:${RED};border-bottom:1px solid ${LGREY};">${step.userAnswer||'(vacío)'}</td>
          <td style="padding:5px 8px;font-size:10px;color:${GREY};border-bottom:1px solid ${LGREY};text-align:center;">→</td>
          <td style="padding:5px 8px;font-size:10px;color:${DGRN};border-bottom:1px solid ${LGREY};">${step.correctAnswer}</td>
        </tr>`;
      });
    } else if (res.type === 'limits') {
      const pp = (params, prefix) => params.filter(p => !p.allCorrect).forEach(param => {
        hasErrors = true;
        errRows += `<tr>
          <td style="padding:5px 8px;font-size:10px;color:${BLUE};border-bottom:1px solid ${LGREY};">${prefix}${param.label}</td>
          <td style="padding:5px 8px;font-size:10px;color:${RED};border-bottom:1px solid ${LGREY};">${param.fields.map(f=>f.userAnswer||'—').join(' / ')}</td>
          <td style="padding:5px 8px;font-size:10px;color:${GREY};border-bottom:1px solid ${LGREY};text-align:center;">→</td>
          <td style="padding:5px 8px;font-size:10px;color:${DGRN};border-bottom:1px solid ${LGREY};">${param.fields.map(f=>f.correctAnswer).join(' / ')}</td>
        </tr>`;
      });
      if (res.subcategories && res.subcategories.length) res.subcategories.forEach(sub => pp(sub.parameters, `${res.category} / `));
      else pp(res.parameters, '');
    }
  });

  const errSection = hasErrors
    ? `<div style="margin-top:28px;">
        <div style="font-size:9px;font-weight:700;letter-spacing:3px;color:${GREY};text-transform:uppercase;border-bottom:2px solid ${LGREY};padding-bottom:6px;margin-bottom:10px;">ERRORES COMETIDOS</div>
        <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
          <thead><tr style="background:#F9FAFB;">
            <th style="padding:5px 8px;font-size:9px;font-weight:600;color:${GREY};text-align:left;border-bottom:1px solid ${LGREY};">REFERENCIA</th>
            <th style="padding:5px 8px;font-size:9px;font-weight:600;color:${RED};text-align:left;border-bottom:1px solid ${LGREY};">RESPUESTA</th>
            <th style="padding:5px 8px;border-bottom:1px solid ${LGREY};width:24px;"></th>
            <th style="padding:5px 8px;font-size:9px;font-weight:600;color:${DGRN};text-align:left;border-bottom:1px solid ${LGREY};">CORRECTA</th>
          </tr></thead>
          <tbody>${errRows}</tbody>
        </table>
      </div>`
    : `<div style="margin-top:28px;text-align:center;color:${DGRN};font-size:13px;font-weight:600;letter-spacing:1px;">Sin errores — resultado perfecto ✓</div>`;

  const overallColor = r.overallPassed ? DGRN  : RED;
  const overallText  = r.overallPassed ? 'APTO' : 'NO APTO';
  const scopeText    = r.capsOnly ? 'CAPs' : 'CAPs y Límites';
  const modeLabel    = r.capsOnly ? `${currentMode} — Solo CAPs` : currentMode;
  const base = window.location.href.replace(/[^/]*$/, '');

  const html = `<div id="pdf-cert" style="font-family:Arial,sans-serif;background:#ffffff;color:${BLUE};width:${W}px;padding:48px 56px 56px;box-sizing:border-box;">

    <div style="margin-bottom:40px;">
      <img src="${base}assets/Logo%20EA%20azul%20version%202.png" style="height:52px;width:auto;">
    </div>

    <div style="text-align:center;margin-bottom:22px;">
      <div style="font-size:40px;font-weight:800;color:${GOLD};letter-spacing:16px;text-transform:uppercase;margin-bottom:10px;">EMERLIMITATOR</div>
      <div style="font-size:10px;color:${BLUE};letter-spacing:3px;text-transform:uppercase;line-height:1.8;">SISTEMA DE EVALUACIÓN DE PROCEDIMIENTOS DE EMERGENCIA</div>
      <div style="font-size:10px;color:${BLUE};letter-spacing:3px;text-transform:uppercase;">Y LÍMITES DE SISTEMAS AERONÁUTICOS</div>
    </div>

    <div style="height:5px;background:linear-gradient(90deg,#ad2e1c 25%,${GOLD} 25%,${GOLD} 75%,#ad2e1c 75%);border-radius:2px;margin-bottom:32px;"></div>

    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:3px;color:${GREY};text-transform:uppercase;margin-bottom:8px;">ALUMNO</div>
      <div style="font-size:24px;font-weight:700;color:${BLUE};margin-bottom:16px;">${r.studentName||'—'}</div>
      <table style="margin:0 auto;border-collapse:collapse;">
        <tr>
          <td style="padding:0 24px;text-align:center;border-right:1px solid ${LGREY};">
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:${GREY};text-transform:uppercase;margin-bottom:4px;">MES</div>
            <div style="font-size:14px;font-weight:600;color:${BLUE};">${r.studentMonth||'—'}</div>
          </td>
          <td style="padding:0 24px;text-align:center;">
            <div style="font-size:9px;font-weight:700;letter-spacing:2px;color:${GREY};text-transform:uppercase;margin-bottom:4px;">MODO</div>
            <div style="font-size:14px;font-weight:600;color:${BLUE};">${modeLabel}</div>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;font-weight:800;color:${overallColor};margin-bottom:4px;">${overallText}</div>
      <div style="font-size:13px;color:${BLUE};margin:4px 0;">en</div>
      <div style="font-size:20px;font-weight:700;color:${BLUE};margin-bottom:12px;">${scopeText}</div>
      <div style="font-size:64px;font-weight:800;color:${GOLD};line-height:1;">${r.globalScore != null ? r.globalScore : '—'}%</div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:8px;">${panelsHtml}</div>

    ${errSection}

    <div style="margin-top:36px;padding-top:12px;border-top:1px solid ${LGREY};display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:8px;color:${GREY};letter-spacing:1px;text-transform:uppercase;">Ejército del Aire y del Espacio de España</div>
      <div style="font-size:8px;color:${GREY};">EMERLIMITATOR</div>
    </div>

  </div>`;

  const printWin = window.open('', '_blank');
  printWin.document.write(`<!DOCTYPE html>
<html lang="es"><head>
  <meta charset="UTF-8">
  <title>${filename.replace('.pdf','')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      html, body { width: 210mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head><body>${html}</body></html>`);
  printWin.document.close();
  printWin.addEventListener('load', () => {
    setTimeout(() => { printWin.print(); }, 400);
  });
}

// ── (obsoleto — mantenido por compatibilidad) ─────────────────────────────────

function exportToPDF() {
  const r = lastExamResult || {};
  const results = lastExamResults || [];

  const clean = s => (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const globalResult = r.overallPassed != null ? (r.overallPassed ? 'APTO' : 'NOAPTO') : null;
  const parts = [r.studentName, r.studentMonth, currentMode, globalResult]
    .filter(Boolean).map(clean).filter(Boolean);
  const filename = (parts.join('_') || 'EMERLIMITATOR_resultado') + '.pdf';

  const G = '#2ecc71', R = '#ad2e1c', BD = '#4e738a', DIM = '#b7c7d3';

  function panelHtml(label, score, passed, detail, note, isGlobal) {
    const c  = passed ? G : R;
    const bg = passed ? '#061a0e' : '#1a0505';
    const bd = passed ? '#0d3d1c' : '#4a1010';
    return `<div style="flex:1;min-width:110px;text-align:center;padding:12px 8px;border:${isGlobal ? 2 : 1}px solid ${bd};background:${bg};border-radius:2px;">
      <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:${DIM};text-transform:uppercase;margin-bottom:5px;">${label}</div>
      <div style="font-size:34px;font-weight:800;line-height:1;color:${c};">${score}%</div>
      <div style="font-size:11px;font-weight:700;letter-spacing:3px;margin-top:4px;color:${c};">${passed ? 'APTO' : 'NO APTO'}</div>
      <div style="font-size:9px;color:${DIM};margin-top:5px;">${detail}</div>
      <div style="font-size:8px;color:${BD};letter-spacing:1px;text-transform:uppercase;">${note}</div>
    </div>`;
  }

  let panelsHtml = panelHtml('PROCEDIMIENTOS (CAPs)', r.capsScore, r.capsPassed,
    `${r.capsCorrect} / ${r.capsTotal} correctas`, 'mín. 100%', false);
  if (!r.capsOnly && r.limitsScore != null) {
    panelsHtml += panelHtml('LÍMITES DE SISTEMAS', r.limitsScore, r.limitsPassed,
      `${r.limitsCorrect} / ${r.limitsTotal} correctas`, 'mín. 80%', false);
  }
  panelsHtml += panelHtml('GLOBAL', r.globalScore, r.overallPassed,
    `${r.globalCorrect} / ${r.globalTotal} correctas`,
    r.capsOnly ? 'solo CAPs evaluadas' : 'CAPs + Límites', true);

  let errorsHtml = '';
  let hasErrors = false;

  results.forEach(result => {
    if (result.type === 'procedure') {
      result.steps.filter(s => !s.correct).forEach(step => {
        hasErrors = true;
        errorsHtml += `<div style="display:flex;align-items:center;gap:8px;padding:4px 8px;background:#1a0505;border:1px solid #4a1010;border-radius:2px;margin-bottom:3px;">
          <span style="background:${BD};color:#fff;width:18px;height:18px;border-radius:2px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;">${step.idx}</span>
          <span style="color:${R};font-weight:700;text-transform:uppercase;flex:1;font-size:11px;">${step.userAnswer || '(vacío)'}</span>
          <span style="color:${DIM};padding:0 4px;font-size:11px;">→</span>
          <span style="color:${G};font-weight:700;text-transform:uppercase;flex:1;font-size:11px;">${step.correctAnswer}</span>
        </div>`;
      });
    } else if (result.type === 'limits') {
      const processParams = (params, prefix) => {
        params.filter(p => !p.allCorrect).forEach(param => {
          hasErrors = true;
          const user = param.fields.map(f => f.userAnswer || '—').join(' / ');
          const corr = param.fields.map(f => f.correctAnswer).join(' / ');
          errorsHtml += `<div style="display:flex;align-items:center;gap:8px;padding:4px 8px;background:#1a0505;border:1px solid #4a1010;border-radius:2px;margin-bottom:3px;">
            <span style="color:${DIM};flex:1;min-width:120px;font-size:11px;">${prefix}${param.label}</span>
            <span style="color:${R};font-weight:700;font-size:11px;">${user}</span>
            <span style="color:${DIM};padding:0 4px;font-size:11px;">→</span>
            <span style="color:${G};font-weight:700;font-size:11px;">${corr}</span>
          </div>`;
        });
      };
      if (result.subcategories && result.subcategories.length > 0) {
        result.subcategories.forEach(sub => processParams(sub.parameters, `${result.category} / `));
      } else {
        processParams(result.parameters, '');
      }
    }
  });

  if (!hasErrors) {
    errorsHtml = `<div style="color:${G};text-align:center;padding:14px;font-size:12px;letter-spacing:1px;">Sin errores — resultado perfecto ✓</div>`;
  }

  const html = `<div id="pdf-root" style="font-family:Arial,sans-serif;background:#001c36;color:#ffffff;padding:24px;width:794px;box-sizing:border-box;">
    <div style="display:flex;align-items:center;gap:16px;border-bottom:2px solid ${BD};padding-bottom:12px;margin-bottom:14px;">
      <div style="flex:1;">
        <div style="font-size:19px;font-weight:800;letter-spacing:5px;">EMERLIMITATOR</div>
        <div style="font-size:9px;color:${DIM};letter-spacing:2px;text-transform:uppercase;margin-top:2px;">Ejército del Aire y del Espacio de España</div>
      </div>
      <div style="font-size:12px;font-weight:700;color:#fac200;border:1px solid #fac200;padding:4px 12px;border-radius:2px;letter-spacing:3px;">${currentMode}</div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;">
      <div style="flex:2;background:#003764;border:1px solid ${BD};padding:9px 12px;border-radius:2px;">
        <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:${DIM};text-transform:uppercase;margin-bottom:3px;">ALUMNO</div>
        <div style="font-size:13px;font-weight:700;">${r.studentName || '—'}</div>
      </div>
      <div style="flex:1;background:#003764;border:1px solid ${BD};padding:9px 12px;border-radius:2px;">
        <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:${DIM};text-transform:uppercase;margin-bottom:3px;">MES</div>
        <div style="font-size:13px;font-weight:700;">${r.studentMonth || '—'}</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;">${panelsHtml}</div>
    <div>
      <div style="font-size:8px;font-weight:700;letter-spacing:3px;color:${DIM};text-transform:uppercase;border-bottom:2px solid ${BD};padding-bottom:5px;margin-bottom:8px;">ERRORES COMETIDOS</div>
      ${errorsHtml}
    </div>
  </div>`;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  const target = wrapper.querySelector('#pdf-root');
  const margin = 8;
  const pageInnerWidthMm = 210 - margin * 2;
  const heightMm = Math.ceil(target.scrollHeight * pageInnerWidthMm / target.scrollWidth) + margin * 2;

  html2pdf().set({
    margin:      [margin, margin, margin, margin],
    filename,
    image:       { type: 'jpeg', quality: 0.95 },
    html2canvas: {
      scale:           2,
      useCORS:         true,
      backgroundColor: '#001c36',
      logging:         false,
      scrollX:         0,
      scrollY:         0,
      windowWidth:     target.scrollWidth,
      windowHeight:    target.scrollHeight
    },
    jsPDF: { unit: 'mm', format: [210, heightMm], orientation: 'portrait' }
  }).from(target).save().then(() => {
    document.body.removeChild(wrapper);
  });
}

// ── Inicialización ────────────────────────────────────────────────────────────

buildCalendar();
