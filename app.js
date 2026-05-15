// EMERLIMITATOR — Lógica de la aplicación

let currentMode     = null;
let examStartTime   = null;
let lastExamResult  = null;

// ── Datos dinámicos (admin override via localStorage) ─────────────────────────

const ADMIN_USER_DEFAULT = 'Ala23RPAS';
const ADMIN_PASS_DEFAULT = 'AdelanteRPAS';
const STORAGE_KEY    = 'emerlimitator_data';
const CREDS_KEY      = 'emerlimitator_creds';
const PERSONNEL_KEY  = 'emerlimitator_personnel';

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
    if (s) return JSON.parse(s);
  } catch (e) {}
  return { LRE: [], MCE: [] };
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

  // Poblar desplegable de alumnos
  const nameSelect = document.getElementById('exam-user-name');
  nameSelect.innerHTML = '<option value="">— Seleccionar alumno —</option>';
  const names = (getPersonnel()[currentMode] || []);
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    nameSelect.appendChild(opt);
  });
  document.getElementById('exam-month').value = '';

  // Sección: Procedimientos de emergencia
  const epSection = el('div', 'exam-section');
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

  // Sección: Límites de sistemas
  const slSection = el('div', 'exam-section');
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

  // Contar límites rellenos / vacíos
  let limitsFilledCount = 0, limitsEmptyCount = 0;
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

  const capsOnly = limitsFilledCount === 0;

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

  lastExamResult = { studentName, studentMonth, capsScore, capsPassed, limitsScore, limitsPassed, overallPassed, capsOnly };

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

    names.forEach((name, idx) => {
      const row    = el('div', 'personnel-row');
      const nameEl = el('span', 'personnel-name');
      nameEl.textContent = name;
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-personnel-del';
      delBtn.textContent = '×';
      delBtn.title = 'Eliminar';
      delBtn.onclick = () => removePersonnel(mode, idx);
      row.append(nameEl, delBtn);
      listEl.appendChild(row);
    });
  });
}

function addPersonnel(mode) {
  const input = document.getElementById(`personnel-${mode.toLowerCase()}-input`);
  const name  = input.value.trim();
  if (!name) return;

  const data = getPersonnel();
  if (!data[mode]) data[mode] = [];
  if (data[mode].map(n => n.toUpperCase()).includes(name.toUpperCase())) {
    alert('Ese nombre ya figura en la lista.');
    return;
  }
  data[mode].push(name);
  data[mode].sort((a, b) => a.localeCompare(b, 'es'));
  localStorage.setItem(PERSONNEL_KEY, JSON.stringify(data));
  input.value = '';
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

// ── Exportar PDF ──────────────────────────────────────────────────────────────

function exportToPDF() {
  const r = lastExamResult || {};

  const clean = s => (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const result = r.overallPassed != null ? (r.overallPassed ? 'APTO' : 'NOAPTO') : null;
  const parts = [r.studentName, r.studentMonth, currentMode, result]
    .filter(Boolean).map(clean).filter(Boolean);
  const filename = (parts.join('_') || 'EMERLIMITATOR_resultado') + '.pdf';

  const body    = document.querySelector('#screen-results .results-body');
  const actions = body.querySelector('.results-actions');
  if (actions) actions.style.display = 'none';

  html2pdf().set({
    margin:      [8, 8, 8, 8],
    filename,
    image:       { type: 'jpeg', quality: 0.95 },
    html2canvas: {
      scale:           2,
      useCORS:         true,
      backgroundColor: '#001c36',
      logging:         false,
      scrollX:         0,
      scrollY:         0,
      windowWidth:     body.scrollWidth,
      windowHeight:    body.scrollHeight
    },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:   { mode: 'avoid-all' }
  }).from(body).save().then(() => {
    if (actions) actions.style.display = '';
  });
}
