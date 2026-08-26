// ==============================================
// CONFIGURAÇÃO DO SUPABASE
// ==============================================

const SUPABASE_URL = 'https://hwvtsnjzrajsgqbajguq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dBJ9knotTwXTaTsN2bWtEw_R3u2H5r5';
const TABELA_EQUIP = 'equipamentos';
const TABELA_PERIF = 'perifericos';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Elementos ----
const formEquip = document.getElementById('formEquipamento');
const formPerif = document.getElementById('formPeriferico');
const mensagem = document.getElementById('mensagem');
const btnEquip = document.getElementById('btnEnviar');
const btnPerif = document.getElementById('btnEnviarPeriferico');
const btnToggle = document.getElementById('btnTogglePerifericos');
const containerPerif = document.getElementById('formPerifericosContainer');
const editBanner = document.getElementById('editBanner');
const editBannerTexto = document.getElementById('editBannerTexto');
const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');

// ---- Elementos do seletor de tipo de equipamento ----
const tipoEquipGroup = document.getElementById('tipoEquipGroup');
const tipoEquipamentoInput = document.getElementById('tipoEquipamento');
const camposPC = document.querySelectorAll('.campo-pc');
const camposMobile = document.querySelectorAll('.campo-mobile');
const TIPOS_PC = ['Desktop', 'Notebook'];
const TIPOS_MOBILE = ['Celular', 'Tablet'];

const TEXTO_BTN_EQUIP = '📤 Enviar para o Banco de Dados';
const TEXTO_BTN_PERIF = '📤 Enviar Periférico';

let editEquipId = null;
let editPerifId = null;

// ---- Alterna os campos do formulário conforme o tipo de equipamento ----
function selecionarTipoEquipamento(tipo) {
    tipoEquipamentoInput.value = tipo;
    tipoEquipGroup.querySelectorAll('.tipo-equip-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tipo === tipo);
    });

    const isPC = TIPOS_PC.includes(tipo);

    camposPC.forEach(c => { c.style.display = isPC ? '' : 'none'; });
    camposMobile.forEach(c => { c.style.display = isPC ? 'none' : ''; });

    document.getElementById('numeroSerie').required = isPC;
    document.getElementById('ramInstalada').required = isPC;
    document.getElementById('armazenamento').required = isPC;
    document.getElementById('sistemaOperacional').required = isPC;
    document.getElementById('imei').required = !isPC;

    // Periféricos só fazem sentido para Desktop/Notebook
    if (isPC) {
        btnToggle.style.display = '';
    } else {
        btnToggle.style.display = 'none';
        if (containerPerif.style.display !== 'none') {
            containerPerif.style.display = 'none';
            btnToggle.textContent = '➕ Adicionar Periféricos';
        }
    }
}

tipoEquipGroup.querySelectorAll('.tipo-equip-btn').forEach(btn => {
    btn.addEventListener('click', () => selecionarTipoEquipamento(btn.dataset.tipo));
});

// Estado inicial do formulário
selecionarTipoEquipamento('Notebook');

// ---- Elementos da Consulta ----
const filtroBusca = document.getElementById('filtroBusca');
const filtroSituacao = document.getElementById('filtroSituacao');
const btnAtualizarLista = document.getElementById('btnAtualizarLista');
const listaResumo = document.getElementById('listaResumo');
const listaContainer = document.getElementById('listaContainer');
const listaEmpty = document.getElementById('listaEmpty');
const statsBar = document.getElementById('statsBar');
const statAtivos = document.getElementById('statAtivos');
const statDisponiveis = document.getElementById('statDisponiveis');

let cacheEquip = [];
let cachePerif = [];
let tipoAtual = 'Notebook';
let statusExpandidoId = null;

const SITUACOES = ['Em uso', 'Disponível', 'Em manutenção', 'Descartado', 'Extraviado', 'Outro'];

// ---- Utilitário para escapar texto exibido no HTML ----
function esc(s) {
    return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ==============================================
// NAVEGAÇÃO: Cadastrar / Consultar
// ==============================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        ativarView(btn.dataset.view);
        if (btn.dataset.view === 'consulta') carregarConsulta();
    });
});

function ativarView(view) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
}

// ==============================================
// EDIÇÃO: preenche o formulário de cadastro com os dados existentes
// ==============================================
function preencherFormEquip(item) {
    selecionarTipoEquipamento(item.tipo_equipamento || 'Notebook');
    document.getElementById('marca').value = item.marca || '';
    document.getElementById('modelo').value = item.modelo || '';
    document.getElementById('patrimonio').value = item.patrimonio || '';
    document.getElementById('numeroSerie').value = item.numero_serie || '';
    document.getElementById('imei').value = item.imei || '';
    document.getElementById('setorResponsavel').value = item.setor_responsavel || '';
    document.getElementById('pessoaResponsavel').value = item.pessoa_responsavel || '';
    document.getElementById('email').value = item.email || '';
    document.getElementById('processador').value = item.processador || '';
    document.getElementById('ramInstalada').value = item.ram_instalada ?? '';
    document.getElementById('slotsRamLivres').value = item.slots_ram_livres ?? '';
    document.getElementById('armazenamento').value = item.armazenamento ?? '';
    document.getElementById('tipoArmazenamento').value = item.tipo_armazenamento || '';
    document.getElementById('placaVideo').value = item.placa_video || '';
    document.getElementById('sistemaOperacional').value = item.sistema_operacional || '';
    document.getElementById('versaoWindows').value = item.versao_windows || '';
    document.getElementById('situacao').value = item.situacao || '';
    document.getElementById('observacoes').value = item.observacoes || '';
}

function preencherFormPerif(item) {
    document.getElementById('marcaPeriferico').value = item.marca || '';
    document.getElementById('modeloPeriferico').value = item.modelo || '';
    document.getElementById('patrimonioPeriferico').value = item.patrimonio || '';
    document.getElementById('tipoCabo').value = item.tipo_cabo || '';
    document.getElementById('situacaoPeriferico').value = item.situacao || '';
    document.getElementById('observacoesPeriferico').value = item.observacoes || '';
}

function iniciarEdicaoEquip(id) {
    const item = cacheEquip.find(i => i.id === id);
    if (!item) return;

    cancelarEdicao();
    editEquipId = id;
    preencherFormEquip(item);
    btnEquip.textContent = '💾 Salvar Alterações';

    editBannerTexto.textContent = `Editando equipamento: ${item.marca} ${item.modelo} (patrimônio ${item.patrimonio}).`;
    editBanner.hidden = false;

    ativarView('cadastro');
    formEquip.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function iniciarEdicaoPerif(id) {
    const item = cachePerif.find(i => i.id === id);
    if (!item) return;

    cancelarEdicao();
    editPerifId = id;
    containerPerif.style.display = 'block';
    btnToggle.textContent = '➖ Ocultar Periféricos';
    preencherFormPerif(item);
    btnPerif.textContent = '💾 Salvar Alterações';

    editBannerTexto.textContent = `Editando periférico: ${item.marca} ${item.modelo} (patrimônio ${item.patrimonio}).`;
    editBanner.hidden = false;

    ativarView('cadastro');
    formPerif.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelarEdicao() {
    editEquipId = null;
    editPerifId = null;
    formEquip.reset();
    formPerif.reset();
    selecionarTipoEquipamento('Notebook');
    btnEquip.textContent = TEXTO_BTN_EQUIP;
    btnPerif.textContent = TEXTO_BTN_PERIF;
    editBanner.hidden = true;
}
btnCancelarEdicao.addEventListener('click', cancelarEdicao);

// ---- Alternar visibilidade do formulário de periféricos ----
function togglePerifericos() {
    if (containerPerif.style.display === 'none') {
        containerPerif.style.display = 'block';
        btnToggle.textContent = '➖ Ocultar Periféricos';
    } else {
        containerPerif.style.display = 'none';
        btnToggle.textContent = '➕ Adicionar Periféricos';
    }
}
btnToggle.addEventListener('click', togglePerifericos);

// ---- Função auxiliar para exibir mensagem ----
function exibirMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = tipo;
    mensagem.style.display = 'block';
    mensagem.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ==============================================
// FORMULÁRIO DE EQUIPAMENTOS
// ==============================================
formEquip.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipo = tipoEquipamentoInput.value;
    const isPC = TIPOS_PC.includes(tipo);

    const dados = {
        tipo_equipamento: tipo,
        marca: document.getElementById('marca').value.trim(),
        modelo: document.getElementById('modelo').value.trim(),
        patrimonio: document.getElementById('patrimonio').value.trim(),
        numero_serie: isPC ? document.getElementById('numeroSerie').value.trim() : null,
        imei: !isPC ? document.getElementById('imei').value.trim() : null,
        setor_responsavel: document.getElementById('setorResponsavel').value.trim(),
        pessoa_responsavel: document.getElementById('pessoaResponsavel').value.trim(),
        email: document.getElementById('email').value.trim() || null,
        processador: isPC ? (document.getElementById('processador').value.trim() || null) : null,
        ram_instalada: isPC ? parseFloat(document.getElementById('ramInstalada').value) : null,
        slots_ram_livres: isPC && document.getElementById('slotsRamLivres').value
            ? parseInt(document.getElementById('slotsRamLivres').value, 10)
            : null,
        armazenamento: isPC ? parseInt(document.getElementById('armazenamento').value, 10) : null,
        tipo_armazenamento: isPC ? (document.getElementById('tipoArmazenamento').value || null) : null,
        placa_video: isPC ? (document.getElementById('placaVideo').value.trim() || null) : null,
        sistema_operacional: isPC ? document.getElementById('sistemaOperacional').value : null,
        versao_windows: isPC ? (document.getElementById('versaoWindows').value.trim() || null) : null,
        situacao: document.getElementById('situacao').value,
        observacoes: document.getElementById('observacoes').value.trim() || null
    };

    // Validação rápida
    const obrigatorios = ['tipo_equipamento', 'marca', 'modelo', 'patrimonio', 'setor_responsavel', 'pessoa_responsavel', 'situacao'];
    if (isPC) {
        obrigatorios.push('numero_serie', 'ram_instalada', 'armazenamento', 'sistema_operacional');
    } else {
        obrigatorios.push('imei');
    }
    for (const campo of obrigatorios) {
        const valor = dados[campo];
        if (valor === '' || valor === null || (typeof valor === 'number' && Number.isNaN(valor))) {
            exibirMensagem(`Preencha o campo "${campo}" corretamente.`, 'erro');
            return;
        }
    }

    btnEquip.disabled = true;
    btnEquip.textContent = editEquipId ? 'Salvando...' : 'Enviando...';
    formEquip.classList.add('carregando');

    try {
        if (editEquipId) {
            const { error } = await supabaseClient.from(TABELA_EQUIP).update(dados).eq('id', editEquipId);
            if (error) throw error;
            exibirMensagem('✅ Equipamento atualizado com sucesso!', 'sucesso');
            cacheEquip = [];
            cancelarEdicao();
        } else {
            const { error } = await supabaseClient.from(TABELA_EQUIP).insert([dados]);
            if (error) throw error;
            exibirMensagem('✅ Equipamento cadastrado com sucesso!', 'sucesso');
            formEquip.reset();
            cacheEquip = [];
        }
    } catch (error) {
        console.error('Erro no envio do equipamento:', error);
        exibirMensagem(`❌ Erro ao enviar: ${error.message || 'verifique a configuração do Supabase.'}`, 'erro');
    } finally {
        btnEquip.disabled = false;
        if (!editEquipId) btnEquip.textContent = TEXTO_BTN_EQUIP;
        formEquip.classList.remove('carregando');
    }
});

// ==============================================
// FORMULÁRIO DE PERIFÉRICOS (sem medida)
// ==============================================
formPerif.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dados = {
        marca: document.getElementById('marcaPeriferico').value.trim(),
        modelo: document.getElementById('modeloPeriferico').value.trim(),
        patrimonio: document.getElementById('patrimonioPeriferico').value.trim(),
        tipo_cabo: document.getElementById('tipoCabo').value || null,
        situacao: document.getElementById('situacaoPeriferico').value,
        observacoes: document.getElementById('observacoesPeriferico').value.trim() || null
    };

    // Validação campos obrigatórios
    const obrigatorios = ['marca', 'modelo', 'patrimonio', 'situacao'];
    for (const campo of obrigatorios) {
        if (dados[campo] === '' || dados[campo] === null) {
            exibirMensagem(`Preencha o campo "${campo}" corretamente.`, 'erro');
            return;
        }
    }

    btnPerif.disabled = true;
    btnPerif.textContent = editPerifId ? 'Salvando...' : 'Enviando...';
    formPerif.classList.add('carregando');

    try {
        if (editPerifId) {
            const { error } = await supabaseClient.from(TABELA_PERIF).update(dados).eq('id', editPerifId);
            if (error) throw error;
            exibirMensagem('✅ Periférico atualizado com sucesso!', 'sucesso');
            cachePerif = [];
            cancelarEdicao();
        } else {
            const { error } = await supabaseClient.from(TABELA_PERIF).insert([dados]);
            if (error) throw error;
            exibirMensagem('✅ Periférico cadastrado com sucesso!', 'sucesso');
            formPerif.reset();
            cachePerif = [];
        }
    } catch (error) {
        console.error('Erro no envio do periférico:', error);
        exibirMensagem(`❌ Erro ao enviar: ${error.message || 'verifique a configuração do Supabase.'}`, 'erro');
    } finally {
        btnPerif.disabled = false;
        if (!editPerifId) btnPerif.textContent = TEXTO_BTN_PERIF;
        formPerif.classList.remove('carregando');
    }
});

// ==============================================
// CONSULTA: sub-abas, busca, filtro e listagem
// ==============================================
const TABELAS = { equipamentos: TABELA_EQUIP, perifericos: TABELA_PERIF };

document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tipoAtual = btn.dataset.tipo;
        filtroSituacao.value = 'todos';
        filtroBusca.value = '';
        statusExpandidoId = null;
        filtrarERenderizarConsulta();
    });
});

filtroBusca.addEventListener('input', filtrarERenderizarConsulta);
filtroSituacao.addEventListener('change', filtrarERenderizarConsulta);
btnAtualizarLista.addEventListener('click', () => {
    cacheEquip = [];
    cachePerif = [];
    carregarConsulta();
});

async function getEquipamentos() {
    const { data, error } = await supabaseClient
        .from(TABELA_EQUIP)
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Erro ao buscar equipamentos:', error);
        throw new Error('Não foi possível carregar os equipamentos.');
    }
    return data;
}

async function getPerifericos() {
    const { data, error } = await supabaseClient
        .from(TABELA_PERIF)
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Erro ao buscar periféricos:', error);
        throw new Error('Não foi possível carregar os periféricos.');
    }
    return data;
}

async function carregarConsulta() {
    listaContainer.innerHTML = '';
    listaEmpty.hidden = true;
    listaResumo.textContent = 'Carregando...';

    try {
        if (cacheEquip.length === 0 && cachePerif.length === 0) {
            const [eq, pf] = await Promise.all([getEquipamentos(), getPerifericos()]);
            cacheEquip = eq;
            cachePerif = pf;
        }
        filtrarERenderizarConsulta();
    } catch (error) {
        listaResumo.textContent = '';
        listaEmpty.hidden = false;
        listaEmpty.textContent = error.message;
    }
}

function badgeClasse(situacao) {
    const mapa = {
        'Em uso': 'badge-em-uso',
        'Disponível': 'badge-disponivel',
        'Em manutenção': 'badge-manutencao',
        'Descartado': 'badge-descartado',
        'Extraviado': 'badge-extraviado'
    };
    return mapa[situacao] || 'badge-outro';
}

function iconeTipo(tipo) {
    return { Notebook: '💻', Desktop: '🖥️', Celular: '📱', Tablet: '📱' }[tipo] || '📦';
}

function renderEquipamentoItem(e) {
    const chave = `equipamentos:${e.id}`;
    const isExpanded = statusExpandidoId === chave;
    const isPC = e.tipo_equipamento === 'Desktop' || e.tipo_equipamento === 'Notebook';
    return `
    <div class="item-card">
      <div class="item-main">
        <div class="item-info">
          <span class="item-tipo-tag">${esc(iconeTipo(e.tipo_equipamento))} ${esc(e.tipo_equipamento || '')}</span>
          <strong>${esc(e.marca)} ${esc(e.modelo)}</strong>
          <span>Patrimônio: ${esc(e.patrimonio)}${e.numero_serie ? ' &middot; S/N: ' + esc(e.numero_serie) : ''}${e.imei ? ' &middot; IMEI: ' + esc(e.imei) : ''}</span>
          <span>${esc(e.setor_responsavel)} &middot; ${esc(e.pessoa_responsavel)}${e.email ? ' &middot; ' + esc(e.email) : ''}</span>
          ${isPC ? `<span class="item-specs">${esc(e.processador || 'Processador N/A')} &middot; ${esc(e.ram_instalada)}GB RAM${e.slots_ram_livres != null ? ' (' + esc(e.slots_ram_livres) + ' slot(s) livre(s))' : ''}</span>` : ''}
          ${isPC ? `<span class="item-specs">${esc(e.armazenamento)}GB ${esc(e.tipo_armazenamento || '')} ${e.placa_video ? '&middot; ' + esc(e.placa_video) : ''}</span>` : ''}
          ${isPC ? `<span class="item-specs">${esc(e.sistema_operacional || '')}${e.versao_windows ? ' (' + esc(e.versao_windows) + ')' : ''}</span>` : ''}
          ${e.observacoes ? `<span class="item-obs">${esc(e.observacoes)}</span>` : ''}
        </div>
        <span class="badge ${badgeClasse(e.situacao)}">${esc(e.situacao)}</span>
      </div>
      <div class="item-actions">
        <button class="btn-link" data-editar="${chave}">✏️ Editar</button>
        <button class="btn-link" data-status="${chave}">${isExpanded ? 'Cancelar' : '🔄 Alterar status'}</button>
        <button class="btn-link btn-link-danger" data-excluir="${chave}">Excluir</button>
      </div>
      ${isExpanded ? renderStatusForm(chave, e.situacao) : ''}
    </div>`;
}

function renderPerifericoItem(p) {
    const chave = `perifericos:${p.id}`;
    const isExpanded = statusExpandidoId === chave;
    return `
    <div class="item-card">
      <div class="item-main">
        <div class="item-info">
          <strong>${esc(p.marca)} ${esc(p.modelo)}</strong>
          <span>Patrimônio: ${esc(p.patrimonio)}${p.tipo_cabo ? ' &middot; Cabo: ' + esc(p.tipo_cabo) : ''}</span>
          ${p.observacoes ? `<span class="item-obs">${esc(p.observacoes)}</span>` : ''}
        </div>
        <span class="badge ${badgeClasse(p.situacao)}">${esc(p.situacao)}</span>
      </div>
      <div class="item-actions">
        <button class="btn-link" data-editar="${chave}">✏️ Editar</button>
        <button class="btn-link" data-status="${chave}">${isExpanded ? 'Cancelar' : '🔄 Alterar status'}</button>
        <button class="btn-link btn-link-danger" data-excluir="${chave}">Excluir</button>
      </div>
      ${isExpanded ? renderStatusForm(chave, p.situacao) : ''}
    </div>`;
}

function renderStatusForm(chave, situacaoAtual) {
    return `
    <div class="item-status-form">
      <label>Nova situação</label>
      <select id="statusSelect_${chave}">
        ${SITUACOES.map(s => `<option value="${esc(s)}" ${s === situacaoAtual ? 'selected' : ''}>${esc(s)}</option>`).join('')}
      </select>
      <button class="btn-salvar-status" data-confirmar-status="${chave}">Salvar</button>
    </div>`;
}

function filtrarERenderizarConsulta() {
    const busca = filtroBusca.value.trim().toLowerCase();
    const situacao = filtroSituacao.value;
    const isPerif = tipoAtual === 'perifericos';
    const listaBase = isPerif
        ? cachePerif
        : cacheEquip.filter(item => item.tipo_equipamento === tipoAtual);

    const filtrada = listaBase.filter(item => {
        if (situacao !== 'todos' && item.situacao !== situacao) return false;
        if (!busca) return true;
        const campos = isPerif
            ? [item.marca, item.modelo, item.patrimonio, item.tipo_cabo]
            : [item.marca, item.modelo, item.patrimonio, item.numero_serie, item.imei, item.setor_responsavel, item.pessoa_responsavel];
        return campos.some(v => (v || '').toLowerCase().includes(busca));
    });

    listaResumo.textContent = `${filtrada.length} de ${listaBase.length} registro(s)`;

    if (isPerif) {
        statsBar.hidden = true;
    } else {
        statAtivos.textContent = listaBase.filter(i => i.situacao === 'Em uso').length;
        statDisponiveis.textContent = listaBase.filter(i => i.situacao === 'Disponível').length;
        statsBar.hidden = false;
    }

    listaEmpty.hidden = filtrada.length !== 0;
    listaEmpty.textContent = 'Nenhum registro encontrado.';
    listaContainer.innerHTML = filtrada
        .map(item => isPerif ? renderPerifericoItem(item) : renderEquipamentoItem(item))
        .join('');
}

listaContainer.addEventListener('click', async e => {
    const editarChave = e.target.dataset.editar;
    const statusChave = e.target.dataset.status;
    const confirmarChave = e.target.dataset.confirmarStatus;
    const excluirChave = e.target.dataset.excluir;

    if (editarChave) {
        const [tabela, id] = editarChave.split(':');
        if (tabela === 'equipamentos') iniciarEdicaoEquip(id);
        else iniciarEdicaoPerif(id);
        return;
    }

    if (statusChave) {
        statusExpandidoId = statusExpandidoId === statusChave ? null : statusChave;
        filtrarERenderizarConsulta();
        return;
    }

    if (confirmarChave) {
        const [tabela, id] = confirmarChave.split(':');
        const select = document.getElementById(`statusSelect_${confirmarChave}`);
        const novaSituacao = select.value;

        e.target.disabled = true;
        try {
            const { error } = await supabaseClient.from(TABELAS[tabela]).update({ situacao: novaSituacao }).eq('id', id);
            if (error) throw error;

            const cache = tabela === 'equipamentos' ? cacheEquip : cachePerif;
            const item = cache.find(i => i.id === id);
            if (item) item.situacao = novaSituacao;

            statusExpandidoId = null;
            filtrarERenderizarConsulta();
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            alert('Não foi possível alterar o status: ' + (error.message || 'erro desconhecido.'));
            e.target.disabled = false;
        }
        return;
    }

    if (excluirChave) {
        const [tabela, id] = excluirChave.split(':');
        if (!confirm('Excluir este registro definitivamente? Esta ação não pode ser desfeita.')) return;

        e.target.disabled = true;
        try {
            const { error } = await supabaseClient.from(TABELAS[tabela]).delete().eq('id', id);
            if (error) throw error;

            if (tabela === 'equipamentos') cacheEquip = cacheEquip.filter(item => item.id !== id);
            else cachePerif = cachePerif.filter(item => item.id !== id);

            filtrarERenderizarConsulta();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Não foi possível excluir: ' + (error.message || 'erro desconhecido.'));
            e.target.disabled = false;
        }
    }
});