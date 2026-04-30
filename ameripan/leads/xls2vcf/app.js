// ============================================
// VCF CONVERT - Application Logic
// ============================================

// --- Constants ---
const PHONE_KW = ['celular','telefone','tel','phone','mobile','cell','fone'];
const NAME_KW = ['fn','nome','name','titulo','nome completo','full name'];
const EMAIL_KW = ['email','e-mail','mail'];
const COMPANY_KW = ['empresa','company','org','razão social','razao social','cliente'];
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
  {v:'description',l:'Descrição'},
  {v:'address',l:'Endereço'},
  {v:'group',l:'Grupo (Android)'},
];

// --- State ---
let state = {headers:[], rows:[], mode:'easy', nameCol:null, phoneCol:null, vcfBlob:null, vcfFileName:'contatos.vcf'};

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
  state = {headers:[], rows:[], mode:'easy', nameCol:null, phoneCol:null, vcfBlob:null, vcfFileName:'contatos.vcf'};
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
    html += `<th><span class="col-letter">Coluna ${String.fromCharCode(65+i)}</span>${h}</th>`;
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
  state.headers.forEach((h, i) => {
    const hl = h.toLowerCase();
    if (state.phoneCol === null && PHONE_KW.some(k => hl.includes(k))) state.phoneCol = i;
    if (state.nameCol === null && NAME_KW.some(k => hl.includes(k))) state.nameCol = i;
  });
  renderEasyMode();
  renderAdvancedMappings();
}

// --- Easy Mode ---
function renderEasyMode() {
  const nc = $('detect-name'), pc = $('detect-phone');
  const nv = $('detect-name-value'), pv = $('detect-phone-value');
  const ns = $('detect-name-status'), ps = $('detect-phone-status');

  if (state.nameCol !== null) {
    nc.className = 'detect-card detected';
    nv.textContent = `Coluna ${String.fromCharCode(65+state.nameCol)}: "${state.headers[state.nameCol]}"`;
    ns.className = 'detect-status ok'; ns.textContent = '✓';
  } else {
    nc.className = 'detect-card not-detected';
    nv.textContent = 'Não detectado automaticamente';
    ns.className = 'detect-status warn'; ns.textContent = '!';
  }
  if (state.phoneCol !== null) {
    pc.className = 'detect-card detected';
    pv.textContent = `Coluna ${String.fromCharCode(65+state.phoneCol)}: "${state.headers[state.phoneCol]}"`;
    ps.className = 'detect-status ok'; ps.textContent = '✓';
  } else {
    pc.className = 'detect-card not-detected';
    pv.textContent = 'Não detectado automaticamente';
    ps.className = 'detect-status warn'; ps.textContent = '!';
  }

  $('btn-easy-generate').disabled = (state.nameCol === null || state.phoneCol === null);
}

// --- Advanced Mode Mappings ---
function renderAdvancedMappings() {
  const container = $('column-mappings');
  let html = '';
  state.headers.forEach((h, i) => {
    const letter = String.fromCharCode(65 + i);
    // Auto-suggest field
    let suggested = '';
    const hl = h.toLowerCase();
    if (PHONE_KW.some(k => hl.includes(k))) suggested = 'cell';
    else if (NAME_KW.some(k => hl.includes(k))) suggested = 'fn';
    else if (EMAIL_KW.some(k => hl.includes(k))) suggested = 'email';
    else if (COMPANY_KW.some(k => hl.includes(k))) suggested = 'company';

    const mapped = suggested ? ' mapped' : '';
    html += `<div class="mapping-row${mapped}" id="map-row-${i}">
      <div class="mapping-row-top">
        <span class="mapping-col-name"><span class="mapping-col-letter">${letter}</span>${escHtml(h)}</span>
        <select class="mapping-select" data-col="${i}" onchange="onMappingChange(this)">
          ${VCF_FIELDS.map(f => `<option value="${f.v}"${f.v===suggested?' selected':''}>${f.l}</option>`).join('')}
        </select>
      </div>
      <div class="mapping-extras">
        <div class="extra-group"><label>Prefixo</label><input type="text" placeholder="Ex: Gabi - " data-col="${i}" data-type="prefix" oninput="updateAdvPreview()"></div>
        <div class="extra-group"><label>Sufixo</label><input type="text" placeholder="Ex:  - Cliente" data-col="${i}" data-type="suffix" oninput="updateAdvPreview()"></div>
      </div>
    </div>`;
  });
  container.innerHTML = html;
  updateAdvPreview();
}

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
  const row = state.rows[0];
  if (!row || !mappings.length) {
    $('preview-name').textContent = '—';
    $('preview-avatar').textContent = '?';
    $('preview-fields').innerHTML = '<p class="preview-empty">Mapeie pelo menos um campo para ver a pré-visualização</p>';
    $('vcf-raw-output').textContent = 'BEGIN:VCARD\nVERSION:3.0\n...\nEND:VCARD';
    return;
  }
  const contact = buildContact(row, mappings, true);
  const name = contact.fn || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '—';
  $('preview-name').textContent = name;
  $('preview-avatar').textContent = name.replace(/^[\d\s]+/,'').charAt(0).toUpperCase() || '?';

  let fieldsHtml = '';
  const fieldLabels = {cell:'📱 Celular',workPhone:'☎️ Tel. Comercial',homePhone:'🏠 Tel. Residencial',fax:'📠 Fax',email:'📧 Email',company:'🏢 Empresa',site:'🌐 Site',description:'📝 Descrição',address:'📍 Endereço',group:'📁 Grupo'};
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
  });
});

// --- Phone Cleaning ---
function cleanPhone(phone, doClean) {
  if (!phone) return '';
  let p = String(phone);
  if (doClean) p = p.replace(/[\s\-\(\)\.\+\*\#\/\\]/g, '');
  return p;
}

// --- Build Contact ---
function buildContact(row, mappings, useAdvOptions) {
  const c = {};
  const addCC = useAdvOptions ? $('adv-country-code').checked : $('opt-country-code').checked;
  const doClean = useAdvOptions ? $('adv-clean-phone').checked : $('opt-clean-phone').checked;

  mappings.forEach(m => {
    let val = String(row[m.colIndex] || '').trim();
    if (!val) return;
    val = (m.prefix || '') + val + (m.suffix || '');
    const isPhone = ['cell','workPhone','homePhone','fax'].includes(m.field);
    if (isPhone) {
      val = cleanPhone(val, doClean);
      if (addCC && val && !val.startsWith('55')) val = '55' + val;
      if (val) val = '+' + val;
    }
    // Concatenate if field already set (e.g., firstName from two columns)
    c[m.field] = c[m.field] ? c[m.field] + ' ' + val : val;
  });
  return c;
}

// --- VCard Generation ---
function generateVCard(c) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  const fn = c.fn || [c.firstName, c.lastName].filter(Boolean).join(' ');
  if (fn) { lines.push('FN:' + fn); lines.push('N:' + (c.lastName||fn) + ';' + (c.firstName||'') + ';;;'); }
  if (c.cell) lines.push('TEL;TYPE=CELL:' + c.cell);
  if (c.workPhone) lines.push('TEL;TYPE=WORK:' + c.workPhone);
  if (c.homePhone) lines.push('TEL;TYPE=HOME:' + c.homePhone);
  if (c.fax) lines.push('TEL;TYPE=FAX:' + c.fax);
  if (c.email) lines.push('EMAIL:' + c.email);
  if (c.company) lines.push('ORG:' + c.company);
  if (c.site) lines.push('URL:' + c.site);
  if (c.description) lines.push('NOTE:' + c.description);
  if (c.address) lines.push('ADR;TYPE=HOME:;;' + c.address + ';;;;');
  if (c.group) lines.push('X-ANDROID-CUSTOM:vnd.android.cursor.item/group_membership;' + c.group + ';;;;;;;;;;;;;');
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

// --- Generate VCF ---
function generateFullVCF(mappings, useAdvOptions) {
  const skipEmpty = useAdvOptions ? $('adv-skip-empty').checked : $('opt-skip-empty').checked;
  const vcards = [];
  state.rows.forEach(row => {
    const c = buildContact(row, mappings, useAdvOptions);
    const fn = c.fn || [c.firstName, c.lastName].filter(Boolean).join(' ');
    if (skipEmpty && (!fn && !c.cell)) return;
    if (fn || c.cell) vcards.push(generateVCard(c));
  });
  return vcards;
}

// --- Easy Generate ---
$('btn-easy-generate').addEventListener('click', () => {
  if (state.nameCol === null || state.phoneCol === null) return;
  const mappings = [
    {colIndex: state.nameCol, field: 'fn', prefix: '', suffix: ''},
    {colIndex: state.phoneCol, field: 'cell', prefix: '', suffix: ''}
  ];
  const vcards = generateFullVCF(mappings, false);
  finishExport(vcards);
});

// --- Advanced Generate ---
$('btn-adv-generate').addEventListener('click', () => {
  const mappings = getAdvMappings();
  if (!mappings.length) { alert('Mapeie pelo menos uma coluna.'); return; }
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
