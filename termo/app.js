/* ==========================================================================
   Termo de Equipamento - Amalfis
   app.js  (depende de logo.js, supabase-config.js, supabase-js, html2canvas e jsPDF)
   ========================================================================== */

const $ = id => document.getElementById(id);
const brDate = () => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/* --------------------------------------------------------------------------
   Logo: injetada por JS para manter o HTML limpo
   -------------------------------------------------------------------------- */
document.querySelectorAll('img[data-logo]').forEach(img => { img.src = LOGO_AMALFIS; });

/* --------------------------------------------------------------------------
   Conexao com o Supabase
   As credenciais vem de supabase-config.js (SUPABASE_URL / SUPABASE_ANON_KEY).
   -------------------------------------------------------------------------- */
const SUPABASE_CONFIGURADO =
  typeof SUPABASE_URL === 'string' && typeof SUPABASE_ANON_KEY === 'string' &&
  !SUPABASE_URL.includes('COLE_AQUI') && !SUPABASE_ANON_KEY.includes('COLE_AQUI') &&
  SUPABASE_URL.startsWith('http');

const db = SUPABASE_CONFIGURADO
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function mostrarStatusConexao() {
  const el = $('connStatus');
  if (!el) return;
  el.innerHTML = SUPABASE_CONFIGURADO
    ? ''
    : '⚠️ Supabase não configurado. Edite <code>supabase-config.js</code> com a URL e a chave do seu ' +
      'projeto e rode o script <code>supabase-setup.sql</code> no SQL Editor do Supabase.';
}

/* --------------------------------------------------------------------------
   Conversao entre o formato do banco (snake_case) e o formato usado no app
   -------------------------------------------------------------------------- */
function rowToTermo(row) {
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    tipo: row.tipo,
    aparelho: row.aparelho,
    modelo: row.modelo,
    imei: row.imei,
    patrimonio: row.patrimonio,
    email: row.email,
    celular: row.celular,
    incluidos: row.incluidos || [],
    fotos: row.fotos || [],
    pdfUrl: row.pdf_url || null,
    dataCriacao: row.data_criacao,
    status: row.status,
    dataDevolucao: row.data_devolucao,
    origem: row.origem
  };
}

function termoToRow(t) {
  return {
    nome: t.nome,
    cpf: t.cpf,
    tipo: t.tipo,
    aparelho: t.aparelho,
    modelo: t.modelo,
    imei: t.imei,
    patrimonio: t.patrimonio,
    email: t.email,
    celular: t.celular,
    incluidos: t.incluidos,
    fotos: t.fotos || [],
    pdf_url: t.pdfUrl || null,
    data_criacao: t.dataCriacao,
    status: t.status,
    data_devolucao: t.dataDevolucao,
    origem: t.origem
  };
}

/* --------------------------------------------------------------------------
   Operacoes no Supabase (todas assincronas)
   -------------------------------------------------------------------------- */
async function getTermos() {
  if (!db) return [];
  const { data, error } = await db
    .from('termos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar termos:', error);
    throw new Error('Não foi possível carregar os termos do Supabase.');
  }
  return data.map(rowToTermo);
}

async function addTermo(termo) {
  if (!db) throw new Error('Supabase não configurado.');
  const { data, error } = await db.from('termos').insert([termoToRow(termo)]).select().single();
  if (error) {
    console.error('Erro ao cadastrar termo:', error);
    throw new Error('Não foi possível salvar o termo no Supabase.');
  }
  return rowToTermo(data);
}

async function updateTermo(id, patch) {
  if (!db) throw new Error('Supabase não configurado.');
  const row = {};
  if ('status' in patch) row.status = patch.status;
  if ('dataDevolucao' in patch) row.data_devolucao = patch.dataDevolucao;
  if ('fotos' in patch) row.fotos = patch.fotos;
  if ('pdfUrl' in patch) row.pdf_url = patch.pdfUrl;
  if ('nome' in patch) row.nome = patch.nome;
  if ('cpf' in patch) row.cpf = patch.cpf;
  if ('tipo' in patch) row.tipo = patch.tipo;
  if ('aparelho' in patch) row.aparelho = patch.aparelho;
  if ('modelo' in patch) row.modelo = patch.modelo;
  if ('imei' in patch) row.imei = patch.imei;
  if ('patrimonio' in patch) row.patrimonio = patch.patrimonio;
  if ('email' in patch) row.email = patch.email;
  if ('celular' in patch) row.celular = patch.celular;
  if ('incluidos' in patch) row.incluidos = patch.incluidos;

  const { error } = await db.from('termos').update(row).eq('id', id);
  if (error) {
    console.error('Erro ao atualizar termo:', error);
    throw new Error('Não foi possível atualizar o termo no Supabase.');
  }
}

async function deleteTermo(id) {
  if (!db) throw new Error('Supabase não configurado.');
  const { error } = await db.from('termos').delete().eq('id', id);
  if (error) {
    console.error('Erro ao excluir termo:', error);
    throw new Error('Não foi possível excluir o termo no Supabase.');
  }
}

/* --------------------------------------------------------------------------
   Upload das fotos para o Supabase Storage (bucket "termos-fotos")
   -------------------------------------------------------------------------- */
function dataURLtoBlob(dataURL) {
  const [header, base64] = dataURL.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

async function uploadFotos(imgs, termoId) {
  const urls = [];
  for (let i = 0; i < imgs.length; i++) {
    $('status').textContent = `Enviando foto ${i + 1} de ${imgs.length}...`;
    const blob = dataURLtoBlob(imgs[i]);
    const path = `${termoId}/${Date.now()}_${i}.jpg`;

    const { error } = await db.storage.from('termos-fotos').upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false
    });
    if (error) {
      console.error('Erro ao enviar foto:', error);
      throw new Error('Não foi possível enviar uma das fotos: ' + error.message);
    }

    const { data } = db.storage.from('termos-fotos').getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

async function uploadPdf(blob, termoId) {
  const path = `${termoId}/termo.pdf`;
  const { error } = await db.storage.from('termos-fotos').upload(path, blob, {
    contentType: 'application/pdf',
    upsert: true
  });
  if (error) {
    console.error('Erro ao enviar PDF:', error);
    throw new Error('Não foi possível enviar o PDF para o Supabase: ' + error.message);
  }
  const { data } = db.storage.from('termos-fotos').getPublicUrl(path);
  return data.publicUrl;
}

/* Converte 'YYYY-MM-DD' (input type=date) para 'DD/MM/YYYY'. */
function isoToBr(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/* --------------------------------------------------------------------------
   Navegacao entre telas
   -------------------------------------------------------------------------- */
const views = { home: $('view-home'), form: $('view-form'), list: $('view-list') };

async function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  views[name].classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  if (name === 'home') await renderHomeSummary();
  if (name === 'list') await renderList();
}

document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => showView('home'));
});

/* --------------------------------------------------------------------------
   Resumo na tela inicial
   -------------------------------------------------------------------------- */
async function renderHomeSummary() {
  mostrarStatusConexao();
  if (!SUPABASE_CONFIGURADO) {
    $('homeSummary').textContent = '';
    return;
  }
  $('homeSummary').textContent = 'Carregando resumo...';
  try {
    const list = await getTermos();
    const ativos = list.filter(t => t.status === 'ativo').length;
    const encerrados = list.filter(t => t.status === 'encerrado').length;
    $('homeSummary').innerHTML = list.length
      ? `<b>${list.length}</b> termo(s) cadastrado(s) &middot; <span class="dot dot-ativo"></span> ${ativos} ativo(s) &middot; <span class="dot dot-encerrado"></span> ${encerrados} encerrado(s)`
      : 'Nenhum termo cadastrado ainda.';
  } catch (err) {
    $('homeSummary').textContent = err.message;
  }
}

/* --------------------------------------------------------------------------
   Modo do formulario: "criar" (gera PDF) ou "inserir" (apenas cadastra)
   -------------------------------------------------------------------------- */
let formMode = 'criar';

function openForm(mode) {
  formMode = mode;
  $('form').reset();
  $('preview').innerHTML = '';
  images = [];
  $('status').textContent = SUPABASE_CONFIGURADO ? '' : 'Supabase não configurado — veja a tela inicial.';

  const isInsert = mode === 'inserir';
  document.body.classList.toggle('mode-inserir', isInsert);

  $('formTitle').textContent = isInsert ? 'Inserir Termo' : 'Criar Termo';
  $('formSub').textContent = isInsert
    ? 'Cadastre um termo já existente em papel, informando a situação atual do equipamento.'
    : 'Preencha os dados, adicione as fotos e gere o PDF automaticamente.';
  $('submitBtn').textContent = isInsert ? 'Salvar Termo' : 'Gerar PDF';

  if (isInsert) {
    const today = new Date();
    $('dataEntrega').value = today.toISOString().slice(0, 10);
    $('aparelho').required = false;
    $('modelo').required = false;
    $('patrimonio').required = false;
    $('fotosHint').textContent = 'Opcional: adicione fotos do estado atual do equipamento.';
  } else {
    $('aparelho').required = true;
    $('modelo').required = true;
    $('patrimonio').required = true;
    $('fotosHint').textContent = 'Você pode selecionar várias fotos. Elas serão usadas no PDF e salvas no cadastro.';
  }

  showView('form');
}

document.querySelectorAll('.menu-card').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'consultar') { showView('list'); return; }
    openForm(action);
  });
});

$('statusInicial').addEventListener('change', e => {
  $('dataDevolucaoWrap').hidden = e.target.value !== 'encerrado';
});

/* --------------------------------------------------------------------------
   Mascara de CPF
   -------------------------------------------------------------------------- */
$('cpf').addEventListener('input', e => {
  const v = e.target.value.replace(/\D/g, '').slice(0, 11);
  e.target.value = v
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
});

/* --------------------------------------------------------------------------
   Mascara de celular
   -------------------------------------------------------------------------- */
$('celular').addEventListener('input', e => {
  const v = e.target.value.replace(/\D/g, '').slice(0, 11);
  e.target.value = v
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
});

/* --------------------------------------------------------------------------
   Fotos: compressao e pre-visualizacao (usadas no modo "Criar Termo")
   -------------------------------------------------------------------------- */
let images = [];

async function compressImage(file) {
  const original = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = original;
  });

  const max = 3840;
  let w = img.naturalWidth, h = img.naturalHeight;
  if (w > max || h > max) {
    const r = Math.min(max / w, max / h);
    w = Math.round(w * r);
    h = Math.round(h * r);
  }

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.95);
}

$('fotos').addEventListener('change', async e => {
  images = [];
  $('preview').innerHTML = '';
  $('status').textContent = 'Preparando fotos...';
  try {
    for (const file of e.target.files) {
      const data = await compressImage(file);
      images.push(data);
      const img = document.createElement('img');
      img.src = data;
      $('preview').appendChild(img);
    }
    $('status').textContent = '';
  } catch (err) {
    console.error(err);
    $('status').textContent = 'Não foi possível preparar uma das fotos.';
  }
});

$('form').addEventListener('reset', () => {
  setTimeout(() => { $('preview').innerHTML = ''; images = []; }, 0);
});

/* --------------------------------------------------------------------------
   Preenchimento das paginas do PDF (modo "Criar Termo")
   -------------------------------------------------------------------------- */
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function fill() {
  const nome = $('nome').value.trim(),
        cpf = $('cpf').value.trim(),
        tipo = $('tipo').value,
        ap = $('aparelho').value.trim(),
        modelo = $('modelo').value.trim(),
        imei = $('imei').value.trim() || 'N/A',
        pat = $('patrimonio').value.trim();

  $('termo').innerHTML =
    `Eu, <b>${esc(nome)}</b>, registrado(a) com o CPF: <b>${esc(cpf)}</b>, declaro ser de minha ` +
    `responsabilidade o aparelho <b>(${esc(tipo)}) ${esc(ap)}</b> do modelo <b>${esc(modelo)}</b>, ` +
    `IMEI: <b>${esc(imei)}</b>, Patrimônio: <b>${esc(pat)}</b>, bem como mantê-lo(s) em perfeito ` +
    `estado de uso e conservação.`;

  const inc = [];
  if ($('carregador').checked) inc.push('Carregador');
  if ($('capinha').checked) inc.push('Capinha');
  if ($('pelicula').checked) inc.push('Película');

  $('incluidos').innerHTML = '<b>Equipamentos incluídos:</b><br>' +
    (inc.length ? inc.map(x => '☒ ' + x).join('&nbsp;&nbsp;&nbsp;') : 'N/A');

  $('data').textContent = 'Mogi das Cruzes, ' + brDate();
  $('nome2').textContent = nome;

  $('photosPdf').innerHTML = '';
  if (images.length) {
    images.forEach(src => {
      const b = document.createElement('div');
      b.className = 'photo-box';
      const im = document.createElement('img');
      im.src = src;
      b.appendChild(im);
      $('photosPdf').appendChild(b);
    });
  } else {
    $('photosPdf').innerHTML = '<div style="font-size:16px">Nenhuma imagem inserida.</div>';
  }
}

/* --------------------------------------------------------------------------
   Geracao do PDF (uma pagina por vez)
   -------------------------------------------------------------------------- */
function waitForImages(element) {
  return Promise.all([...element.querySelectorAll('img')].map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Tempo esgotado ao carregar imagem.')), 12000);
      img.onload = () => { clearTimeout(timer); resolve(); };
      img.onerror = () => { clearTimeout(timer); reject(new Error('Falha ao carregar imagem.')); };
    });
  }));
}

async function gerarPdf() {
  fill();

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
  const pages = [$('page1'), $('page2'), $('page3')];

  for (let i = 0; i < pages.length; i++) {
    $('status').textContent = `Gerando página ${i + 1} de ${pages.length}...`;

    await waitForImages(pages[i]);
    await new Promise(r => setTimeout(r, 80));

    const canvas = await html2canvas(pages[i], {
      scale: 4,
      backgroundColor: '#ffffff',
      imageTimeout: 20000,
      logging: false
    });

    const img = canvas.toDataURL('image/jpeg', 0.97);
    if (i) pdf.addPage();
    pdf.addImage(img, 'JPEG', 0, 0, 595.28, 841.89, undefined, 'NONE');

    canvas.width = 1;
    canvas.height = 1;
  }

  const safe = $('nome').value.trim().replace(/[^\wÀ-ÿ -]/g, '').replace(/\s+/g, '_') || 'termo';
  pdf.save('Termo_' + safe + '.pdf');

  return pdf.output('blob');
}

/* --------------------------------------------------------------------------
   Envio do formulario: gera PDF (Criar) ou apenas cadastra (Inserir)
   -------------------------------------------------------------------------- */
function coletarIncluidos() {
  const inc = [];
  if ($('carregador').checked) inc.push('Carregador');
  if ($('capinha').checked) inc.push('Capinha');
  if ($('pelicula').checked) inc.push('Película');
  return inc;
}

$('form').addEventListener('submit', async e => {
  e.preventDefault();

  if (!SUPABASE_CONFIGURADO) {
    $('status').textContent = 'Configure o Supabase em supabase-config.js antes de continuar.';
    return;
  }

  const btn = e.submitter;

  if (formMode === 'inserir') {
    if (btn) btn.disabled = true;
    try {
      const status = $('statusInicial').value;
      const dataDevolucaoIso = $('dataDevolucaoInicial').value;
      if (status === 'encerrado' && !dataDevolucaoIso) {
        $('status').textContent = 'Informe a data da devolução para cadastrar como encerrado.';
        return;
      }

      const termo = {
        nome: $('nome').value.trim(),
        cpf: $('cpf').value.trim(),
        tipo: $('tipo').value,
        aparelho: $('aparelho').value.trim(),
        modelo: $('modelo').value.trim(),
        imei: $('imei').value.trim() || 'N/A',
        patrimonio: $('patrimonio').value.trim(),
        email: $('email').value.trim(),
        celular: $('celular').value.trim(),
        incluidos: coletarIncluidos(),
        fotos: [],
        dataCriacao: isoToBr($('dataEntrega').value) || brDate(),
        status,
        dataDevolucao: status === 'encerrado' ? isoToBr(dataDevolucaoIso) : null,
        origem: 'inserir'
      };

      $('status').textContent = 'Salvando no Supabase...';
      const inserted = await addTermo(termo);

      if (images.length) {
        const urls = await uploadFotos(images, inserted.id);
        await updateTermo(inserted.id, { fotos: urls });
      }

      $('status').textContent = 'Termo cadastrado com sucesso!';
      setTimeout(() => showView('list'), 500);
    } catch (err) {
      console.error(err);
      $('status').textContent = err.message || 'Erro ao cadastrar o termo.';
    } finally {
      if (btn) btn.disabled = false;
    }
    return;
  }

  /* modo "criar": exige confirmacao se nao houver fotos, gera PDF e cadastra */
  if (!images.length && !confirm('Nenhuma foto foi adicionada. Deseja gerar o PDF mesmo assim?')) return;

  if (btn) btn.disabled = true;
  try {
    const pdfBlob = await gerarPdf();

    const termo = {
      nome: $('nome').value.trim(),
      cpf: $('cpf').value.trim(),
      tipo: $('tipo').value,
      aparelho: $('aparelho').value.trim(),
      modelo: $('modelo').value.trim(),
      imei: $('imei').value.trim() || 'N/A',
      patrimonio: $('patrimonio').value.trim(),
      email: $('email').value.trim(),
      celular: $('celular').value.trim(),
      incluidos: coletarIncluidos(),
      fotos: [],
      pdfUrl: null,
      dataCriacao: brDate(),
      status: 'ativo',
      dataDevolucao: null,
      origem: 'criar'
    };

    $('status').textContent = 'PDF gerado. Salvando no Supabase...';
    const inserted = await addTermo(termo);

    if (images.length) {
      const urls = await uploadFotos(images, inserted.id);
      await updateTermo(inserted.id, { fotos: urls });
    }

    $('status').textContent = 'Enviando PDF para o Supabase...';
    const pdfUrl = await uploadPdf(pdfBlob, inserted.id);
    await updateTermo(inserted.id, { pdfUrl });

    $('status').textContent = 'PDF gerado e termo cadastrado com sucesso!';
  } catch (err) {
    console.error(err);
    $('status').textContent = err.message || 'Erro ao gerar o PDF.';
  } finally {
    if (btn) btn.disabled = false;
  }
});

/* --------------------------------------------------------------------------
   Consulta de termos: listagem, filtros e controle de status
   -------------------------------------------------------------------------- */
let expandedId = null;
let editingId = null;
let cacheTermos = [];

/* Mascaras reaproveitadas para os campos de edicao inline */
function maskCpf(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function maskCelular(v) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

function statusLabel(t) {
  return t.status === 'ativo' ? 'Ativo' : 'Encerrado';
}

async function renderList() {
  mostrarStatusConexao();

  if (!SUPABASE_CONFIGURADO) {
    $('termosList').innerHTML = '';
    $('listEmpty').hidden = false;
    $('listEmpty').textContent = 'Configure o Supabase (veja a tela inicial) para consultar os termos.';
    return;
  }

  $('termosList').innerHTML = '<div class="empty-state">Carregando termos...</div>';
  $('listEmpty').hidden = true;

  try {
    cacheTermos = await getTermos();
    filtrarERenderizar();
  } catch (err) {
    $('termosList').innerHTML = '';
    $('listEmpty').hidden = false;
    $('listEmpty').textContent = err.message;
  }
}

function filtrarERenderizar() {
  const busca = $('filtroBusca').value.trim().toLowerCase();
  const filtroStatus = $('filtroStatus').value;

  const list = cacheTermos.filter(t => {
    if (filtroStatus !== 'todos' && t.status !== filtroStatus) return false;
    if (!busca) return true;
    return [t.nome, t.cpf, t.patrimonio, t.aparelho, t.modelo, t.email, t.celular]
      .some(v => (v || '').toLowerCase().includes(busca));
  });

  $('listEmpty').textContent = 'Nenhum termo encontrado.';
  $('listEmpty').hidden = list.length !== 0;
  $('termosList').innerHTML = list.map(t => renderItem(t)).join('');
}

function renderItem(t) {
  const isEncerrado = t.status === 'encerrado';
  const isExpanded = expandedId === t.id;
  const isEditing = editingId === t.id;

  return `
    <div class="termo-item ${isEditing ? 'is-editing' : ''}" data-id="${t.id}">
      <div class="termo-main">
        <div class="termo-info">
          <strong>${esc(t.nome || '(sem nome)')}</strong>
          <span>${esc(t.tipo || '')} ${t.aparelho ? '· ' + esc(t.aparelho) : ''} ${t.modelo ? esc(t.modelo) : ''}</span>
          <span>CPF: ${esc(t.cpf || 'N/A')} ${t.patrimonio ? '· Patrimônio: ' + esc(t.patrimonio) : ''}</span>
          <span>IMEI: ${esc(t.imei || 'N/A')}</span>
          <span class="${(t.email || t.celular) ? '' : 'termo-missing'}">
            ${t.email ? '✉️ ' + esc(t.email) : '✉️ e-mail não informado'}${(t.email || t.celular) ? ' · ' : ' · '}${t.celular ? '📱 ' + esc(t.celular) : '📱 celular não informado'}
          </span>
          ${t.incluidos && t.incluidos.length ? `<span>Itens: ${t.incluidos.map(esc).join(', ')}</span>` : ''}
          <span class="termo-date">Entregue em ${esc(t.dataCriacao || 'N/A')}${isEncerrado ? ' · Devolvido em ' + esc(t.dataDevolucao || 'N/A') : ''}</span>
          ${t.fotos && t.fotos.length ? `
            <div class="termo-fotos">
              ${t.fotos.map(url => `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="Foto do equipamento"></a>`).join('')}
            </div>
          ` : ''}
        </div>
        <span class="badge ${isEncerrado ? 'badge-encerrado' : 'badge-ativo'}">${statusLabel(t)}</span>
      </div>

      <div class="termo-actions">
        ${t.pdfUrl ? `<a class="btn-link" href="${esc(t.pdfUrl)}" target="_blank" rel="noopener">📄 Ver PDF do termo</a>` : ''}
        <button class="btn-link" data-editar="${t.id}">${isEditing ? 'Cancelar edição' : '✏️ Editar'}</button>
        ${isEncerrado
          ? `<button class="btn-link" data-reabrir="${t.id}">Reabrir (marcar como ativo)</button>`
          : `<button class="btn-link" data-encerrar="${t.id}">${isExpanded ? 'Cancelar' : 'Marcar como devolvido'}</button>`
        }
        <button class="btn-link btn-link-danger" data-excluir="${t.id}">Excluir</button>
      </div>

      ${(!isEncerrado && isExpanded) ? `
        <div class="termo-encerrar-form">
          <label>Data da devolução</label>
          <input type="date" id="dataDevolucao_${t.id}" value="${new Date().toISOString().slice(0, 10)}">
          <button class="btn primary" data-confirmar-devolucao="${t.id}">Confirmar devolução</button>
        </div>
      ` : ''}

      ${isEditing ? renderEditForm(t) : ''}
    </div>
  `;
}

function renderEditForm(t) {
  const tipos = ['Notebook/Desktop', 'Celular', 'Tablet'];
  const inc = t.incluidos || [];
  return `
    <div class="termo-editar-form">
      <div class="termo-editar-grid">
        <div>
          <label>Nome completo</label>
          <input id="edit_nome_${t.id}" value="${esc(t.nome || '')}">
        </div>
        <div>
          <label>CPF</label>
          <input id="edit_cpf_${t.id}" value="${esc(t.cpf || '')}" maxlength="14">
        </div>
        <div>
          <label>E-mail</label>
          <input id="edit_email_${t.id}" type="email" value="${esc(t.email || '')}" placeholder="nome@empresa.com">
        </div>
        <div>
          <label>Celular</label>
          <input id="edit_celular_${t.id}" value="${esc(t.celular || '')}" maxlength="15" placeholder="(00) 00000-0000">
        </div>
        <div>
          <label>Tipo de equipamento</label>
          <select id="edit_tipo_${t.id}">
            <option value="">Selecione</option>
            ${tipos.map(op => `<option ${t.tipo === op ? 'selected' : ''}>${op}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Aparelho</label>
          <input id="edit_aparelho_${t.id}" value="${esc(t.aparelho || '')}">
        </div>
        <div>
          <label>Modelo</label>
          <input id="edit_modelo_${t.id}" value="${esc(t.modelo || '')}">
        </div>
        <div>
          <label>IMEI</label>
          <input id="edit_imei_${t.id}" value="${esc(t.imei || '')}">
        </div>
        <div>
          <label>Patrimônio</label>
          <input id="edit_patrimonio_${t.id}" value="${esc(t.patrimonio || '')}">
        </div>
        <div class="termo-editar-checks">
          <label class="check-label"><input type="checkbox" id="edit_carregador_${t.id}" ${inc.includes('Carregador') ? 'checked' : ''}> Carregador</label>
          <label class="check-label"><input type="checkbox" id="edit_capinha_${t.id}" ${inc.includes('Capinha') ? 'checked' : ''}> Capinha</label>
          <label class="check-label"><input type="checkbox" id="edit_pelicula_${t.id}" ${inc.includes('Película') ? 'checked' : ''}> Película</label>
        </div>
      </div>
      <div class="termo-editar-actions">
        <span class="termo-editar-status" id="edit_status_${t.id}"></span>
        <button class="btn secondary" type="button" data-cancelar-edicao="${t.id}">Cancelar</button>
        <button class="btn primary" type="button" data-salvar-edicao="${t.id}">Salvar alterações</button>
      </div>
    </div>
  `;
}

$('filtroBusca').addEventListener('input', filtrarERenderizar);
$('filtroStatus').addEventListener('change', filtrarERenderizar);

/* Mascaras de CPF/celular nos campos de edicao inline (criados dinamicamente) */
$('termosList').addEventListener('input', e => {
  if (e.target.id.startsWith('edit_cpf_')) {
    e.target.value = maskCpf(e.target.value);
  }
  if (e.target.id.startsWith('edit_celular_')) {
    e.target.value = maskCelular(e.target.value);
  }
});

$('termosList').addEventListener('click', async e => {
  const encerrarId = e.target.dataset.encerrar;
  const confirmarId = e.target.dataset.confirmarDevolucao;
  const reabrirId = e.target.dataset.reabrir;
  const excluirId = e.target.dataset.excluir;
  const editarId = e.target.dataset.editar;
  const cancelarEdicaoId = e.target.dataset.cancelarEdicao;
  const salvarEdicaoId = e.target.dataset.salvarEdicao;

  if (editarId) {
    editingId = editingId === editarId ? null : editarId;
    expandedId = null;
    filtrarERenderizar();
    return;
  }

  if (cancelarEdicaoId) {
    editingId = null;
    filtrarERenderizar();
    return;
  }

  if (salvarEdicaoId) {
    const id = salvarEdicaoId;
    const nome = $('edit_nome_' + id).value.trim();
    const cpf = $('edit_cpf_' + id).value.trim();
    const email = $('edit_email_' + id).value.trim();
    const celular = $('edit_celular_' + id).value.trim();

    if (!nome || !cpf) {
      $('edit_status_' + id).textContent = 'Nome e CPF são obrigatórios.';
      return;
    }

    const incluidos = [];
    if ($('edit_carregador_' + id).checked) incluidos.push('Carregador');
    if ($('edit_capinha_' + id).checked) incluidos.push('Capinha');
    if ($('edit_pelicula_' + id).checked) incluidos.push('Película');

    const patch = {
      nome,
      cpf,
      email,
      celular,
      tipo: $('edit_tipo_' + id).value,
      aparelho: $('edit_aparelho_' + id).value.trim(),
      modelo: $('edit_modelo_' + id).value.trim(),
      imei: $('edit_imei_' + id).value.trim() || 'N/A',
      patrimonio: $('edit_patrimonio_' + id).value.trim(),
      incluidos
    };

    e.target.disabled = true;
    $('edit_status_' + id).textContent = 'Salvando...';
    try {
      await updateTermo(id, patch);
      editingId = null;
      await renderList();
    } catch (err) {
      $('edit_status_' + id).textContent = err.message;
      e.target.disabled = false;
    }
    return;
  }

  if (encerrarId) {
    expandedId = expandedId === encerrarId ? null : encerrarId;
    filtrarERenderizar();
    return;
  }

  if (confirmarId) {
    const iso = $('dataDevolucao_' + confirmarId).value;
    if (!iso) { alert('Informe a data da devolução.'); return; }
    e.target.disabled = true;
    try {
      await updateTermo(confirmarId, { status: 'encerrado', dataDevolucao: isoToBr(iso) });
      expandedId = null;
      await renderList();
    } catch (err) {
      alert(err.message);
      e.target.disabled = false;
    }
    return;
  }

  if (reabrirId) {
    if (confirm('Reabrir este termo e marcar o equipamento como ativo novamente?')) {
      try {
        await updateTermo(reabrirId, { status: 'ativo', dataDevolucao: null });
        await renderList();
      } catch (err) {
        alert(err.message);
      }
    }
    return;
  }

  if (excluirId) {
    if (confirm('Excluir este termo definitivamente? Esta ação não pode ser desfeita.')) {
      try {
        await deleteTermo(excluirId);
        await renderList();
      } catch (err) {
        alert(err.message);
      }
    }
  }
});

/* --------------------------------------------------------------------------
   Estado inicial
   -------------------------------------------------------------------------- */
renderHomeSummary();