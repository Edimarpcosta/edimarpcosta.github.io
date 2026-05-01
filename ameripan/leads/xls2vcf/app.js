// ============================================
// VCF CONVERT - Application Logic
// ============================================

// --- Constants ---
const PHONE_KW = ['celular','telefone','tel','phone','mobile','cell','fone','whatsapp','whats','wpp'];
const NAME_KW = ['fn','nome','name','titulo','nome completo','full name'];
const EMAIL_KW = ['email','e-mail','mail'];
const COMPANY_KW = ['empresa','company','org','razão social','razao social','razao','razão','fantasia','cliente'];
const ADR_KW = ['endereço','endereco','rua','logradouro','address'];
const GEO_KW = ['lat','long','gps','coordenada','latitude','longitude'];
const NOTE_KW = ['ramo','horário','horario','abre as','entrega','visita','observação','observacao','obs','nota','description'];
const BDAY_KW = ['aniversário','aniversario','nascimento','data de nascimento','bday','birthday'];
const VCF_FIELDS = [
  {v:'',l:'— Ignorar —'},
  {v:'fn',l:'Nome Completo'},
  {v:'firstName',l:'Primeiro Nome'},
  {v:'lastName',l:'Sobrenome'},
  {v:'cell',l:'Celular'},
  {v:'workPhone',l:'Tel. Comercial'},
  {v:'homePhone',l:'Tel. Residencial'},
  {v:'fax',l:'Fax'},
  {v:'company',l:'Empresa'},
  {v:'email',l:'Email'},
  {v:'site',l:'Site'},
  {v:'address',l:'Endereço'},
  {v:'geo',l:'Coordenadas GPS'},
  {v:'lat',l:'Latitude'},
  {v:'long',l:'Longitude'},
  {v:'description',l:'Anotações (NOTE)'},
  {v:'bday',l:'Data de Nasc. (BDAY)'},
  {v:'group',l:'Grupo (Android)'},
];

// --- State ---
let state = {headers:[], rows:[], mode:'easy', nameCol:null, phoneCol:null, companyCol:null, emailCol:null, addressCol:null, phoneCols:[], vcfBlob:null, vcfFileName:'contatos.vcf'};

// --- DOM refs ---
const $ = id => document.getElementById(id);

// --- Theme ---
$('theme-toggle').addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  localStorage.setItem('vcf-theme', t);
});
if (localStorage.getItem('vcf-theme') === 'dark') document.documentElement.dataset.theme = 'dark';

// --- File Upload ---
const uploadZone = $('upload-zone');
const fileInput = $('file-input');

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });

$('btn-remove-file').addEventListener('click', () => {
  state = {headers:[], rows:[], mode:'easy', nameCol:null, phoneCol:null, companyCol:null, emailCol:null, addressCol:null, phoneCols:[], vcfBlob:null, vcfFileName:'contatos.vcf'};
  fileInput.value = '';
  $('file-section').classList.add('hidden');
  $('mapping-section').classList.add('hidden');
  $('export-section').classList.add('hidden');
});

function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx','xls','csv'].includes(ext)) { alert('Formato não suportado. Use .xlsx, .xls ou .csv'); return; }

  state.vcfFileName = file.name.replace(/\.[^.]+$/, '') + '.vcf';
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
      if (data.length < 2) { alert('Planilha vazia ou com apenas cabeçalho.'); return; }
      state.headers = data[0].map(h => String(h || '').trim());
      state.rows = data.slice(1).filter(r => r.some(c => c !== ''));
      renderFileInfo(file);
      renderPreview();
      detectColumns();
      $('file-section').classList.remove('hidden');
      $('mapping-section').classList.remove('hidden');
      $('export-section').classList.add('hidden');
      $('file-section').scrollIntoView({behavior:'smooth', block:'start'});
    } catch(err) { alert('Erro ao ler o arquivo: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

function renderFileInfo(file) {
  $('file-name').textContent = file.name;
  $('file-stats').textContent = `${state.rows.length} linhas • ${state.headers.length} colunas`;
}

function renderPreview() {
  const table = $('data-preview-table');
  const maxRows = Math.min(state.rows.length, 5);
  let html = '<thead><tr>';
  state.headers.forEach((h, i) => {
    let displayName = h;
    if (displayName.toUpperCase() === 'FN') displayName = 'Nome Completo';
    html += `<th><span class="col-letter">Coluna ${String.fromCharCode(65+i)}</span>${escHtml(displayName)}</th>`;
  });
  html += '</tr></thead><tbody>';
  for (let r = 0; r < maxRows; r++) {
    html += '<tr>';
    state.headers.forEach((_, i) => { html += `<td>${escHtml(String(state.rows[r][i] || ''))}</td>`; });
    html += '</tr>';
  }
  html += '</tbody>';
  table.innerHTML = html;
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// --- Column Detection ---
function detectColumns() {
  state.nameCol = null;
  state.phoneCol = null;
  state.companyCol = null;
  state.emailCol = null;
  state.addressCol = null;
  state.phoneCols = [];
  
  const sig = state.headers.join('|');
  const saved = localStorage.getItem('vcf_profile_' + sig);

  state.headers.forEach((h, i) => {
    const hl = h.toLowerCase();
    if (PHONE_KW.some(k => hl.includes(k))) state.phoneCols.push(i);
    if (state.nameCol === null && NAME_KW.some(k => hl.includes(k))) state.nameCol = i;
    if (state.companyCol === null && COMPANY_KW.some(k => hl.includes(k))) state.companyCol = i;
    if (state.emailCol === null && EMAIL_KW.some(k => hl.includes(k))) state.emailCol = i;
    if (state.addressCol === null && ADR_KW.some(k => hl.includes(k))) state.addressCol = i;
  });
  
  if (state.phoneCols.length > 0) state.phoneCol = state.phoneCols[0];
  
  renderEasyMode();
  
  if (saved) {
    try {
      const config = JSON.parse(saved);
      renderAdvancedMappings(config);
      return;
    } catch(e){}
  }

  renderAdvancedMappings(null);
}

// --- Easy Mode ---
function renderEasyMode() {
  const ns = $('easy-name-select');
  const ps = $('easy-phone-select');
  const ps2 = $('easy-phone2-select');
  const ps3 = $('easy-phone3-select');
  const es = $('easy-email-select');
  const as = $('easy-address-select');
  const cs = $('easy-company-select');
  
  if (!ns || !ps || !cs) return;

  let opts = '<option value="">— Selecione uma coluna —</option>';
  let optsOpt = '<option value="">— Opcional —</option>';
  
  state.headers.forEach((h, i) => {
    const letter = String.fromCharCode(65 + i);
    let displayName = h;
    if (displayName.toUpperCase() === 'FN') displayName = 'Nome Completo';
    const text = `[${letter}] ${escHtml(displayName)}`;
    opts += `<option value="${i}">${text}</option>`;
    optsOpt += `<option value="${i}">${text}</option>`;
  });
  
  ns.innerHTML = opts;
  ps.innerHTML = opts;
  if(ps2) ps2.innerHTML = optsOpt;
  if(ps3) ps3.innerHTML = optsOpt;
  if(es) es.innerHTML = optsOpt;
  if(as) as.innerHTML = optsOpt;
  cs.innerHTML = optsOpt;
  
  if (state.nameCol !== null) ns.value = state.nameCol;
  if (state.phoneCols.length > 0) ps.value = state.phoneCols[0];
  if (ps2 && state.phoneCols.length > 1) ps2.value = state.phoneCols[1];
  if (ps3 && state.phoneCols.length > 2) ps3.value = state.phoneCols[2];
  if (es && state.emailCol !== null) es.value = state.emailCol;
  if (as && state.addressCol !== null) as.value = state.addressCol;
  if (state.companyCol !== null) cs.value = state.companyCol;
  
  window.updateEasyPreview();
}

window.updateEasyPreview = function() {
  const ns = $('easy-name-select').value;
  const nPref = $('easy-name-prefix')?.value || '';
  const nSuff = $('easy-name-suffix')?.value || '';
  const ps = $('easy-phone-select').value;
  const ps2 = $('easy-phone2-select')?.value || '';
  const ps3 = $('easy-phone3-select')?.value || '';
  const es = $('easy-email-select')?.value || '';
  const as = $('easy-address-select')?.value || '';
  const cs = $('easy-company-select').value;
  
  const hasName = ns !== '';
  const hasPhone = ps !== '' || ps2 !== '' || ps3 !== '';
  
  $('btn-easy-generate').disabled = !(hasName && hasPhone);
  
  if (state.mode === 'easy') {
     const mappings = [];
     if (hasName) mappings.push({colIndex: parseInt(ns), field: 'fn', prefix: nPref, suffix: nSuff});
     if (ps !== '') mappings.push({colIndex: parseInt(ps), field: 'cell', prefix: '', suffix: ''});
     if (ps2 !== '') mappings.push({colIndex: parseInt(ps2), field: 'workPhone', prefix: '', suffix: ''});
     if (ps3 !== '') mappings.push({colIndex: parseInt(ps3), field: 'homePhone', prefix: '', suffix: ''});
     if (es !== '') mappings.push({colIndex: parseInt(es), field: 'email', prefix: '', suffix: ''});
     if (as !== '') mappings.push({colIndex: parseInt(as), field: 'address', prefix: '', suffix: ''});
     if (cs !== '') mappings.push({colIndex: parseInt(cs), field: 'company', prefix: '', suffix: ''});
     renderLivePreview(mappings, false);
  }
}


// --- Advanced Mode Mappings ---
function renderAdvancedMappings(config = null) {
  const container = $('column-mappings');
  const fnSelect = $('fn-part-select');
  let html = '';
  let fnSelectHtml = '<option value="">+ Adicionar coluna ao nome...</option>';
  
  state.headers.forEach((h, i) => {
    const letter = String.fromCharCode(65 + i);
    fnSelectHtml += `<option value="${i}">[${letter}] ${h}</option>`;
    
    let suggested = '';
    let confPrefix = '';
    let confSuffix = '';

    if (config && config.mappings) {
      const m = config.mappings.find(x => x.colIndex === i);
      if (m) {
        suggested = m.field;
        confPrefix = m.prefix;
        confSuffix = m.suffix;
      }
    } else {
      const hl = h.toLowerCase();
      if (PHONE_KW.some(k => hl.includes(k))) {
        const pIdx = state.phoneCols.indexOf(i);
        const pFields = ['cell', 'workPhone', 'homePhone'];
        suggested = pIdx !== -1 && pIdx < 3 ? pFields[pIdx] : 'cell';
      }
      else if (EMAIL_KW.some(k => hl.includes(k))) suggested = 'email';
      else if (COMPANY_KW.some(k => hl.includes(k))) suggested = 'company';
      else if (ADR_KW.some(k => hl.includes(k))) suggested = 'address';
      else if (GEO_KW.some(k => hl.includes(k))) suggested = 'geo';
      else if (NOTE_KW.some(k => hl.includes(k))) suggested = 'description';
      else if (BDAY_KW.some(k => hl.includes(k))) suggested = 'bday';
    }

    const mapped = suggested ? ' mapped' : '';
    let displayName = h;
    if (displayName.toUpperCase() === 'FN') displayName = 'Nome Completo';

    html += `<div class="mapping-row${mapped}" id="map-row-${i}">
      <div class="mapping-row-top">
        <span class="mapping-col-name"><span class="mapping-col-letter">${letter}</span>${escHtml(displayName)}</span>
        <select class="mapping-select" data-col="${i}" onchange="onMappingChange(this)">
          ${VCF_FIELDS.map(f => `<option value="${f.v}"${f.v===suggested?' selected':''}>${f.l}</option>`).join('')}
        </select>
      </div>
      <div class="mapping-extras">
        <div class="extra-group"><label>Prefixo</label><input type="text" placeholder="Ex: Gabi - " data-col="${i}" data-type="prefix" value="${escHtml(confPrefix)}" oninput="updateAdvPreview()"></div>
        <div class="extra-group"><label>Sufixo</label><input type="text" placeholder="Ex:  - Cliente" data-col="${i}" data-type="suffix" value="${escHtml(confSuffix)}" oninput="updateAdvPreview()"></div>
      </div>
    </div>`;
  });
  container.innerHTML = html;
  if(fnSelect) fnSelect.innerHTML = fnSelectHtml;
  $('fn-parts-container').innerHTML = ''; // reset fn parts on load
  window.fnPartsCount = 0;

  // Restore global FN Config
  if (config) {
    if ($('fn-global-prefix')) $('fn-global-prefix').value = config.globalPrefix || '';
    if ($('fn-global-suffix')) $('fn-global-suffix').value = config.globalSuffix || '';
    
    const sepSel = $('fn-global-sep-select');
    const sepInp = $('fn-global-sep');
    if (sepSel && sepInp) {
       const predefined = Array.from(sepSel.options).map(o => o.value);
       if (predefined.includes(config.globalSep) && config.globalSep !== 'other') {
           sepSel.value = config.globalSep;
           sepInp.style.display = 'none';
       } else {
           sepSel.value = 'other';
           sepInp.style.display = 'block';
           sepInp.value = config.globalSep;
       }
    }

    if (config.fnParts && config.fnParts.length) {
      config.fnParts.forEach(p => {
        window.addFnPart(p.col, p.prefix, p.suffix);
      });
    }
  } else {
    // Reset defaults
    if ($('fn-global-prefix')) $('fn-global-prefix').value = '';
    if ($('fn-global-suffix')) $('fn-global-suffix').value = '';
    if ($('fn-global-sep-select')) {
      $('fn-global-sep-select').value = ' - ';
      window.onSepChange();
    }
  }

  updateAdvPreview();
}

window.onSepChange = function() {
  const sel = $('fn-global-sep-select');
  const inp = $('fn-global-sep');
  if (!sel || !inp) return;
  if(sel.value === 'other') {
    inp.style.display = 'block';
    inp.focus();
  } else {
    inp.style.display = 'none';
  }
  updateAdvPreview();
};

window.clearSavedConfig = function() {
  if (!confirm("Isso irá apagar todas as configurações salvas para este arquivo e limpar a tela. Continuar?")) return;
  const sig = state.headers.join('|');
  localStorage.removeItem('vcf_profile_' + sig);
  renderAdvancedMappings(null);
};

window.addFnPart = function(index, prefix='', suffix='') {
  if (index === '' || index === null || index === undefined) return;
  const headerName = state.headers[index];
  const container = $('fn-parts-container');
  const id = `fn-part-${window.fnPartsCount++}`;
  
  const div = document.createElement('div');
  div.className = 'fn-part-item';
  div.id = id;
  div.innerHTML = `
    <div class="fn-part-drag">⋮⋮</div>
    <div class="fn-part-col" data-col="${index}">${headerName}</div>
    <div class="fn-part-inputs">
      <input type="text" class="part-prefix" placeholder="Prefixo" value="${escHtml(prefix)}" oninput="updateAdvPreview()">
      <input type="text" class="part-suffix" placeholder="Sufixo" value="${escHtml(suffix)}" oninput="updateAdvPreview()">
    </div>
    <button class="btn-remove-part" onclick="document.getElementById('${id}').remove(); updateAdvPreview()">✕</button>
  `;
  container.appendChild(div);
  updateAdvPreview();
};

function onMappingChange(sel) {
  const row = $('map-row-' + sel.dataset.col);
  if (sel.value) row.classList.add('mapped'); else row.classList.remove('mapped');
  updateAdvPreview();
}

function getAdvMappings() {
  const mappings = [];
  document.querySelectorAll('.mapping-select').forEach(sel => {
    if (!sel.value) return;
    const ci = parseInt(sel.dataset.col);
    const prefix = document.querySelector(`input[data-col="${ci}"][data-type="prefix"]`)?.value || '';
    const suffix = document.querySelector(`input[data-col="${ci}"][data-type="suffix"]`)?.value || '';
    mappings.push({colIndex: ci, field: sel.value, prefix, suffix});
  });
  return mappings;
}

function updateAdvPreview() {
  const mappings = getAdvMappings();
  
  const fnPartsCount = document.querySelectorAll('.fn-part-item').length;
  const hasName = fnPartsCount > 0 || mappings.some(m => ['fn', 'firstName', 'lastName'].includes(m.field));
  const hasPhone = mappings.some(m => ['cell', 'workPhone', 'homePhone', 'fax'].includes(m.field));
  
  const reqName = $('req-name');
  const reqPhone = $('req-phone');
  
  if (reqName && reqPhone) {
    if (hasName) { reqName.className = 'req-ok'; reqName.innerHTML = '✅ "Nome Completo" mapeado'; }
    else { reqName.className = 'req-missing'; reqName.innerHTML = '❌ Falta mapear "Nome Completo"'; }
    
    if (hasPhone) { reqPhone.className = 'req-ok'; reqPhone.innerHTML = '✅ Telefone mapeado'; }
    else { reqPhone.className = 'req-missing'; reqPhone.innerHTML = '❌ Falta mapear um Telefone'; }
  }

  $('btn-adv-generate').disabled = !(hasName && hasPhone);

  if (state.mode === 'advanced') {
     renderLivePreview(mappings, true);
  }
}

function renderLivePreview(mappings, useAdvOptions) {
  const row = state.rows[0];
  if (!row || !mappings.length) {
    $('preview-name').textContent = '—';
    $('preview-avatar').textContent = '?';
    $('preview-fields').innerHTML = '<p class="preview-empty">Selecione as colunas para ver a pré-visualização</p>';
    $('vcf-raw-output').textContent = 'BEGIN:VCARD\nVERSION:3.0\n...\nEND:VCARD';
    return;
  }
  const contact = buildContact(row, mappings, useAdvOptions);
  const name = contact.fn || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '—';
  $('preview-name').textContent = name;
  $('preview-avatar').textContent = name.replace(/^[\d\s]+/,'').charAt(0).toUpperCase() || '?';

  let fieldsHtml = '';
  const fieldLabels = {cell:'📱 Celular',workPhone:'☎️ Tel. Comercial',homePhone:'🏠 Tel. Residencial',fax:'📠 Fax',email:'📧 Email',company:'🏢 Empresa',site:'🌐 Site',address:'📍 Endereço',geo:'🗺️ GPS',description:'📝 Anotações',bday:'🎂 Aniversário',group:'📁 Grupo'};
  Object.keys(fieldLabels).forEach(k => {
    if (contact[k]) fieldsHtml += `<div class="contact-field-row"><span class="contact-field-label">${fieldLabels[k]}</span><span class="contact-field-value">${escHtml(contact[k])}</span></div>`;
  });
  $('preview-fields').innerHTML = fieldsHtml || '<p class="preview-empty">Nenhum campo adicional mapeado</p>';
  $('vcf-raw-output').textContent = generateVCard(contact);
}

// --- Mode Toggle ---
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.mode;
    state.mode = mode;
    $('mode-toggle').dataset.active = mode;
    $('easy-mode').classList.toggle('hidden', mode !== 'easy');
    $('advanced-mode').classList.toggle('hidden', mode !== 'advanced');
    if (mode === 'advanced') updateAdvPreview();
    else if (window.updateEasyPreview) window.updateEasyPreview();
  });
});

// --- Phone Cleaning ---
function cleanPhone(phone, doClean) {
  if (!phone) return '';
  let p = String(phone).trim();
  if (!isNaN(p) && p.toUpperCase().includes('E')) p = Number(p).toFixed(0);
  if (doClean) p = p.replace(/[\s\-\(\)\.\+\*\#\/\\]/g, '');
  return p;
}

// --- Excel Date Parser ---
function parseDate(val) {
  if (!val) return null;
  val = String(val).trim();
  if (isFinite(val) && val > 30000 && val < 100000) { 
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  let bFormat = val.replace(/[\/\.]/g, '-');
  if (bFormat.match(/^\d{2}-\d{2}-\d{4}$/)) {
    const parts = bFormat.split('-');
    bFormat = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return bFormat;
}

// --- Build Contact ---
function buildContact(row, mappings, useAdvOptions) {
  const c = {};
  const addCC = useAdvOptions ? $('adv-country-code').checked : $('opt-country-code').checked;
  const doClean = useAdvOptions ? $('adv-clean-phone').checked : $('opt-clean-phone').checked;

  if (useAdvOptions) {
    const globalPrefix = $('fn-global-prefix')?.value || '';
    const globalSuffix = $('fn-global-suffix')?.value || '';
    
    const sepSel = $('fn-global-sep-select');
    const sepInp = $('fn-global-sep');
    let globalSep = ' - ';
    if (sepSel && sepSel.value === 'other') globalSep = sepInp?.value || '';
    else if (sepSel) globalSep = sepSel.value;
    
    const fnParts = Array.from(document.querySelectorAll('.fn-part-item')).map(item => ({
      col: item.querySelector('.fn-part-col').getAttribute('data-col'),
      prefix: item.querySelector('.part-prefix').value,
      suffix: item.querySelector('.part-suffix').value
    }));

    if (fnParts.length > 0) {
      let partsVals = [];
      fnParts.forEach(p => {
        let val = String(row[parseInt(p.col)] || '').trim();
        if (val) partsVals.push((p.prefix || '') + val + (p.suffix || ''));
      });
      if (partsVals.length > 0) {
        c.fn = globalPrefix + partsVals.join(globalSep) + globalSuffix;
      }
    }
  }

  mappings.forEach(m => {
    let val = String(row[parseInt(m.colIndex)] || '').trim();
    if (!val) return;
    val = (m.prefix || '') + val + (m.suffix || '');
    
    if (m.field === 'bday') val = parseDate(val) || val;

    const isPhone = ['cell','workPhone','homePhone','fax'].includes(m.field);
    if (isPhone) {
      val = cleanPhone(val, doClean);
      if (addCC && val && !val.startsWith('55')) val = '55' + val;
      if (val) val = '+' + val;
    }
    // Concatenate if field already set
    if (c[m.field]) {
      if (m.field === 'description') {
        c[m.field] = c[m.field] + '\\n' + val; // vCard line break
      } else {
        c[m.field] = (c[m.field] + ' ' + val).replace(/\s+/g, ' ');
      }
    } else {
      c[m.field] = val;
    }
  });

  if (c.lat || c.long) {
    c.geo = (c.lat || '') + ';' + (c.long || '');
  }

  return c;
}

// --- VCard Generation ---
function vcfEscape(s) {
  if (!s) return '';
  return String(s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}

function generateVCard(c) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  const fnRaw = c.fn || [c.firstName, c.lastName].filter(Boolean).join(' ');
  const fn = vcfEscape(fnRaw);
  const nLastName = vcfEscape(c.lastName || fnRaw);
  const nFirstName = vcfEscape(c.firstName || '');
  if (fn) { lines.push('FN:' + fn); lines.push('N:' + nLastName + ';' + nFirstName + ';;;'); }
  if (c.cell) lines.push('TEL;TYPE=CELL:' + c.cell);
  if (c.workPhone) lines.push('TEL;TYPE=WORK:' + c.workPhone);
  if (c.homePhone) lines.push('TEL;TYPE=HOME:' + c.homePhone);
  if (c.fax) lines.push('TEL;TYPE=FAX:' + c.fax);
  if (c.email) lines.push('EMAIL:' + c.email);
  if (c.company) lines.push('ORG:' + vcfEscape(c.company));
  if (c.site) lines.push('URL:' + c.site);
  if (c.description) lines.push('NOTE:' + vcfEscape(c.description));
  if (c.address) lines.push('ADR;TYPE=HOME:;;' + vcfEscape(c.address) + ';;;;');
  if (c.geo) lines.push('GEO:' + c.geo.replace(/,/g, ';'));
  if (c.bday) lines.push('BDAY:' + c.bday);
  if (c.group) lines.push('X-ANDROID-CUSTOM:vnd.android.cursor.item/group_membership;' + vcfEscape(c.group) + ';;;;;;;;;;;;;');
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

// --- Generate VCF ---
function generateFullVCF(mappings, useAdvOptions) {
  const skipEmpty = useAdvOptions ? $('adv-skip-empty').checked : $('opt-skip-empty').checked;
  const vcards = [];
  const missingPhonesList = [];
  
  state.rows.forEach((row, idx) => {
    const c = buildContact(row, mappings, useAdvOptions);
    const fn = c.fn || [c.firstName, c.lastName].filter(Boolean).join(' ');
    const hasPhone = !!(c.cell || c.workPhone || c.homePhone || c.fax);
    
    if (!hasPhone) {
      missingPhonesList.push({ line: idx + 2, name: fn || 'Desconhecido' });
      if (skipEmpty) return;
    }
    if (fn || hasPhone) vcards.push(generateVCard(c));
  });
  
  const warnDiv = $('missing-phones-warning');
  const ul = $('missing-phones-list');
  if (missingPhonesList.length > 0 && !skipEmpty) {
    warnDiv.classList.remove('hidden');
    ul.innerHTML = missingPhonesList.map(m => `<li><strong>Linha ${m.line}:</strong> ${escHtml(m.name)}</li>`).join('');
  } else {
    warnDiv.classList.add('hidden');
    ul.innerHTML = '';
  }
  
  return vcards;
}

// --- Easy Generate ---
$('btn-easy-generate').addEventListener('click', () => {
  const ns = $('easy-name-select').value;
  const nPref = $('easy-name-prefix')?.value || '';
  const nSuff = $('easy-name-suffix')?.value || '';
  const ps = $('easy-phone-select').value;
  const ps2 = $('easy-phone2-select')?.value || '';
  const ps3 = $('easy-phone3-select')?.value || '';
  const es = $('easy-email-select')?.value || '';
  const as = $('easy-address-select')?.value || '';
  const cs = $('easy-company-select').value;
  
  if (ns === '' || (ps === '' && ps2 === '' && ps3 === '')) return;
  const mappings = [];
  if (ns !== '') mappings.push({colIndex: parseInt(ns), field: 'fn', prefix: nPref, suffix: nSuff});
  if (ps !== '') mappings.push({colIndex: parseInt(ps), field: 'cell', prefix: '', suffix: ''});
  if (ps2 !== '') mappings.push({colIndex: parseInt(ps2), field: 'workPhone', prefix: '', suffix: ''});
  if (ps3 !== '') mappings.push({colIndex: parseInt(ps3), field: 'homePhone', prefix: '', suffix: ''});
  if (es !== '') mappings.push({colIndex: parseInt(es), field: 'email', prefix: '', suffix: ''});
  if (as !== '') mappings.push({colIndex: parseInt(as), field: 'address', prefix: '', suffix: ''});
  if (cs !== '') mappings.push({colIndex: parseInt(cs), field: 'company', prefix: '', suffix: ''});
  
  const vcards = generateFullVCF(mappings, false);
  finishExport(vcards);
});

function saveConfig() {
  const sig = state.headers.join('|');
  if (!sig) return;

  const mappings = getAdvMappings();
  const globalPrefix = $('fn-global-prefix')?.value || '';
  const globalSuffix = $('fn-global-suffix')?.value || '';
  
  const sepSel = $('fn-global-sep-select');
  const sepInp = $('fn-global-sep');
  let globalSep = ' - ';
  if (sepSel && sepSel.value === 'other') globalSep = sepInp?.value || '';
  else if (sepSel) globalSep = sepSel.value;

  const fnParts = Array.from(document.querySelectorAll('.fn-part-item')).map(item => ({
    col: item.querySelector('.fn-part-col').getAttribute('data-col'),
    prefix: item.querySelector('.part-prefix').value,
    suffix: item.querySelector('.part-suffix').value
  }));

  const config = { mappings, globalPrefix, globalSuffix, globalSep, fnParts };
  localStorage.setItem('vcf_profile_' + sig, JSON.stringify(config));
}

// --- Advanced Generate ---
$('btn-adv-generate').addEventListener('click', () => {
  const mappings = getAdvMappings();
  if (!mappings.length) { alert('Mapeie pelo menos uma coluna.'); return; }
  saveConfig();
  const vcards = generateFullVCF(mappings, true);
  finishExport(vcards);
});

// --- Export ---
function finishExport(vcards) {
  if (!vcards.length) { alert('Nenhum contato válido encontrado.'); return; }
  const vcfContent = vcards.join('\r\n');
  state.vcfBlob = new Blob([vcfContent], {type: 'text/vcard;charset=utf-8'});
  $('export-stats').textContent = `${vcards.length} contato${vcards.length > 1 ? 's' : ''} pronto${vcards.length > 1 ? 's' : ''} para importar`;
  $('export-section').classList.remove('hidden');
  $('export-section').scrollIntoView({behavior:'smooth', block:'center'});
}

// --- Download ---
$('btn-download').addEventListener('click', () => {
  if (!state.vcfBlob) return;
  const url = URL.createObjectURL(state.vcfBlob);
  const a = document.createElement('a');
  a.href = url; a.download = state.vcfFileName;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// --- Share via Web Share API ---
function shareFile() {
  if (!state.vcfBlob || !navigator.canShare) { alert('Compartilhamento não suportado neste navegador. Use o botão de download.'); return; }
  const file = new File([state.vcfBlob], state.vcfFileName, {type:'text/vcard'});
  if (!navigator.canShare({files:[file]})) { alert('Seu navegador não suporta compartilhar este tipo de arquivo.'); return; }
  navigator.share({files:[file], title:'Contatos VCF', text:'Arquivo de contatos para importar'}).catch(()=>{});
}

$('btn-share-telegram').addEventListener('click', shareFile);
$('btn-share-email').addEventListener('click', shareFile);
$('btn-share-bluetooth').addEventListener('click', shareFile);
$('btn-share-native').addEventListener('click', shareFile);
