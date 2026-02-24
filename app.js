(function () {
  StorageDB.ensureBootstrap();

  const page = document.body.dataset.page;
  const session = AppUtils.requireAuth();

  function injectUserInfo() {
    const el = document.getElementById('sessionUser');
    if (el && session) {
      el.textContent = `${session.name} (${session.profile})`;
    }
  }

  function logoutBind() {
    const btn = document.getElementById('logoutBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        StorageDB.clearSession();
        location.href = 'index.html';
      });
    }
  }

  function setSelectOptions(select, items, getLabel, getValue) {
    if (!select) return;
    select.innerHTML = '<option value="">Selecione...</option>';
    items.forEach((item) => {
      const op = document.createElement('option');
      op.value = getValue(item);
      op.textContent = getLabel(item);
      select.appendChild(op);
    });
  }

  function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
      const user = StorageDB.users.find((u) => u.username === username && u.password === password);
      if (!user) return alert('Usuário ou senha inválidos');
      StorageDB.setSession({ id: user.id, name: user.name, profile: user.profile });
      location.href = 'dashboard.html';
    });
  }

  function initClientes() {
    const form = document.getElementById('clienteForm');
    if (!form) return;
    const idField = document.getElementById('clienteId');
    const codeField = document.getElementById('codigoCliente');

    function refreshTable(data = StorageDB.clientes) {
      const tbody = document.getElementById('clientesTableBody');
      tbody.innerHTML = '';
      data.forEach((c) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${c.codigo}</td><td>${c.razao}</td><td>${c.fantasia}</td><td>${c.cnpj}</td><td>${c.cidade}/${c.estado}</td><td><button class="btn btn-sm btn-outline-primary" data-id="${c.id}">Editar</button></td>`;
        tbody.appendChild(tr);
      });
      tbody.querySelectorAll('button').forEach((btn) => {
        btn.onclick = () => {
          const c = StorageDB.clientes.find((x) => String(x.id) === btn.dataset.id);
          Object.keys(c).forEach((k) => { const f = document.getElementById(k); if (f) f.value = c[k]; });
          idField.value = c.id;
        };
      });
    }

    document.getElementById('novoCliente').onclick = () => {
      form.reset();
      idField.value = '';
      codeField.value = StorageDB.nextCode('cliente');
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        id: idField.value || Date.now(),
        codigo: codeField.value.trim(),
        razao: document.getElementById('razao').value,
        fantasia: document.getElementById('fantasia').value,
        cnpj: document.getElementById('cnpj').value,
        endereco: document.getElementById('endereco').value,
        cidade: document.getElementById('cidade').value,
        estado: document.getElementById('estado').value,
        telefone: document.getElementById('telefone').value,
        email: document.getElementById('email').value,
        observacoes: document.getElementById('observacoes').value
      };
      const clientes = StorageDB.clientes;
      const duplicate = clientes.find((c) => c.codigo === payload.codigo && String(c.id) !== String(payload.id));
      if (duplicate) return alert('Código cliente já existe.');
      const idx = clientes.findIndex((c) => String(c.id) === String(payload.id));
      if (idx >= 0) clientes[idx] = payload; else clientes.push(payload);
      StorageDB.write(StorageDB.KEYS.clientes, clientes);
      refreshTable();
      alert('Cliente salvo.');
    });

    document.getElementById('buscaCliente').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = StorageDB.clientes.filter((c) => [c.codigo, c.razao, c.cnpj].some((v) => String(v).toLowerCase().includes(q)));
      refreshTable(filtered);
    });

    if (!codeField.value) codeField.value = StorageDB.nextCode('cliente');
    refreshTable();
  }

  function initLotes() {
    const form = document.getElementById('loteForm');
    const clienteSelect = document.getElementById('clienteId');
    const tableBody = document.getElementById('lotesTableBody');

    function safeVal(id, fallback = '') { const el = document.getElementById(id); return el ? el.value : fallback; }
    function safeSet(id, value) { const el = document.getElementById(id); if (el) el.value = value; }

    if (clienteSelect) {
      setSelectOptions(clienteSelect, StorageDB.clientes, (c) => `${c.codigo} - ${c.razao}`, (c) => c.id);
    }
    if (document.getElementById('filtroBaixaCliente')) {
      setSelectOptions(document.getElementById('filtroBaixaCliente'), StorageDB.clientes, (c) => `${c.codigo} - ${c.razao}`, (c) => c.id);
    }
    if (document.getElementById('codigoLote') && !document.getElementById('codigoLote').value) {
      document.getElementById('codigoLote').value = StorageDB.nextCode('lote');
    }

    function renderLotes(data = StorageDB.lotes.filter((l) => l.status === 'ativo')) {
      if (!tableBody) return;
      tableBody.innerHTML = '';
      data.forEach((l) => {
        const cli = StorageDB.clientes.find((c) => String(c.id) === String(l.clienteId));
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${l.codigo}</td><td>${cli?.codigo || '-'}</td><td>${l.numeroCliente || '-'}</td><td>${l.quantidadeSacas || 0}</td><td>${l.estado || '-'}</td><td>${l.status}</td><td>
          <button class='btn btn-sm btn-outline-primary edit' data-id='${l.id}'>Editar</button>
          <button class='btn btn-sm btn-outline-danger baixa' data-id='${l.id}'>Baixar</button>
        </td>`;
        tableBody.appendChild(tr);
      });
      tableBody.querySelectorAll('.edit').forEach((btn) => btn.onclick = () => loadLote(btn.dataset.id));
      tableBody.querySelectorAll('.baixa').forEach((btn) => btn.onclick = () => baixarLote(btn.dataset.id));
    }

    function loadLote(id) {
      const lote = StorageDB.lotes.find((l) => String(l.id) === String(id));
      if (!lote) return;
      const map = { clienteId: 'clienteId', numeroCliente: 'numeroCliente', cidade: 'cidadeLote', estado: 'estadoLote', armazenagem: 'armazenagem', safra: 'safra', quantidadeSacas: 'quantidadeSacas', pesoAmostra: 'pesoAmostra', tipoCafe: 'tipoCafe', peneira: 'peneira', mooca: 'mooca', bebida: 'bebida', pva: 'pva', broca: 'broca', defeitos: 'defeitos', observacoes: 'observacoesLote', dataEntrada: 'dataEntrada', codigo: 'codigoLote' };
      safeSet('loteId', lote.id);
      Object.entries(map).forEach(([k, idEl]) => safeSet(idEl, lote[k] || ''));
      const img = document.getElementById('previewCafe');
      if (img && lote.imagem) img.src = lote.imagem;
    }

    function baixarLote(id) {
      if (!confirm('Confirmar baixa do lote?')) return;
      const lotes = StorageDB.lotes;
      const idx = lotes.findIndex((l) => String(l.id) === String(id));
      if (idx < 0) return;
      lotes[idx].status = 'baixado';
      lotes[idx].dataBaixa = new Date().toISOString().slice(0, 10);
      StorageDB.write(StorageDB.KEYS.lotes, lotes);
      renderLotes();
    }

    function applyConsultaFiltros() {
      const q = safeVal('buscaCodigoCliente').toLowerCase();
      const safraFiltro = safeVal('filtroSafraConsulta').toLowerCase();
      const statusFiltro = safeVal('filtroStatusConsulta');
      const filtered = StorageDB.lotes.filter((l) => {
        const cli = StorageDB.clientes.find((c) => String(c.id) === String(l.clienteId));
        const byClient = (cli?.codigo || '').toLowerCase().includes(q);
        const bySafra = !safraFiltro || String(l.safra || '').toLowerCase().includes(safraFiltro);
        const byStatus = !statusFiltro || l.status === statusFiltro;
        return byClient && bySafra && byStatus;
      });
      renderLotes(filtered);
    }

    const busca = document.getElementById('buscaCodigoCliente');
    const filtroSafra = document.getElementById('filtroSafraConsulta');
    const filtroStatus = document.getElementById('filtroStatusConsulta');
    if (busca) busca.addEventListener('input', applyConsultaFiltros);
    if (filtroSafra) filtroSafra.addEventListener('input', applyConsultaFiltros);
    if (filtroStatus) filtroStatus.addEventListener('change', applyConsultaFiltros);

    const baixaColetivaBtn = document.getElementById('baixaColetiva');
    if (baixaColetivaBtn) {
      baixaColetivaBtn.onclick = () => {
        const cliente = safeVal('filtroBaixaCliente');
        const ini = safeVal('filtroDataIni');
        const fim = safeVal('filtroDataFim');
        const lotes = StorageDB.lotes;
        const affected = lotes.filter((l) => l.status === 'ativo' && String(l.clienteId) === cliente && (!ini || l.dataEntrada >= ini) && (!fim || l.dataEntrada <= fim));
        if (!affected.length) return alert('Nenhum lote encontrado.');
        if (!confirm(`Baixar ${affected.length} lotes?`)) return;
        affected.forEach((l) => { l.status = 'baixado'; l.dataBaixa = new Date().toISOString().slice(0, 10); });
        StorageDB.write(StorageDB.KEYS.lotes, lotes);
        renderLotes();
      };
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const save = (img) => {
          const lotes = StorageDB.lotes;
          const payload = {
            id: safeVal('loteId') || Date.now(),
            codigo: safeVal('codigoLote') || StorageDB.nextCode('lote'),
            clienteId: safeVal('clienteId'),
            numeroCliente: safeVal('numeroCliente'),
            cidade: safeVal('cidadeLote'),
            estado: safeVal('estadoLote'),
            armazenagem: safeVal('armazenagem'),
            safra: safeVal('safra'),
            quantidadeSacas: safeVal('quantidadeSacas'),
            pesoAmostra: safeVal('pesoAmostra'),
            tipoCafe: safeVal('tipoCafe'),
            peneira: safeVal('peneira'),
            mooca: safeVal('mooca'),
            bebida: safeVal('bebida'),
            pva: safeVal('pva'),
            broca: safeVal('broca'),
            defeitos: safeVal('defeitos'),
            observacoes: safeVal('observacoesLote'),
            dataEntrada: safeVal('dataEntrada'),
            imagem: img || (document.getElementById('previewCafe')?.src || ''),
            status: 'ativo'
          };
          const idx = lotes.findIndex((l) => String(l.id) === String(payload.id));
          if (idx >= 0) lotes[idx] = { ...lotes[idx], ...payload }; else lotes.push(payload);
          StorageDB.write(StorageDB.KEYS.lotes, lotes);
          alert('Lote salvo com sucesso.');
          renderLotes();
        };

        const file = document.getElementById('imagemCafe')?.files?.[0];
        if (file) AppUtils.toDataUrl(file, save); else save();
      });
    }

    renderLotes();
  }

  function initLigas() {
    const form = document.getElementById('ligaForm');
    if (!form) return;
    const ativos = StorageDB.lotes.filter((l) => l.status === 'ativo');
    const container = document.getElementById('lotesAtivosChecklist');
    container.innerHTML = '';
    ativos.forEach((l) => {
      const div = document.createElement('div');
      div.className = 'form-check';
      div.innerHTML = `<input class='form-check-input lote-check' type='checkbox' value='${l.id}' id='l${l.id}'><label class='form-check-label' for='l${l.id}'>${l.codigo} - ${l.quantidadeSacas} sacas</label>`;
      container.appendChild(div);
    });
    document.getElementById('codigoLiga').value = StorageDB.nextCode('liga');

    container.addEventListener('change', () => {
      const ids = Array.from(document.querySelectorAll('.lote-check:checked')).map((c) => c.value);
      const total = StorageDB.lotes.filter((l) => ids.includes(String(l.id))).reduce((acc, l) => acc + Number(l.quantidadeSacas || 0), 0);
      document.getElementById('totalSacasLiga').value = total;
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const ids = Array.from(document.querySelectorAll('.lote-check:checked')).map((c) => c.value);
      if (!ids.length) return alert('Selecione ao menos um lote ativo.');
      const invalid = StorageDB.lotes.some((l) => ids.includes(String(l.id)) && l.status !== 'ativo');
      if (invalid) return alert('Liga não pode usar lote baixado.');
      const ligas = StorageDB.ligas;
      ligas.push({
        id: Date.now(),
        codigo: document.getElementById('codigoLiga').value,
        lotesOrigem: ids,
        totalSacas: document.getElementById('totalSacasLiga').value,
        classificacaoNova: document.getElementById('classificacaoNova').value,
        status: 'ativo',
        createdAt: new Date().toISOString().slice(0, 10)
      });
      StorageDB.write(StorageDB.KEYS.ligas, ligas);
      alert('Liga salva.');
      location.reload();
    });

    const tbody = document.getElementById('ligasTableBody');
    StorageDB.ligas.forEach((l) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${l.codigo}</td><td>${l.totalSacas}</td><td>${l.classificacaoNova}</td><td>${l.status}</td>`;
      tbody.appendChild(tr);
    });
  }

  function initRelatorios() {
    const form = document.getElementById('filtroRelatorios');
    if (!form) return;
    setSelectOptions(document.getElementById('fCliente'), StorageDB.clientes, (c) => `${c.codigo} - ${c.razao}`, (c) => c.id);

    function generate() {
      const clienteId = document.getElementById('fCliente').value;
      const ano = document.getElementById('fAno').value;
      const ini = document.getElementById('fIni').value;
      const fim = document.getElementById('fFim').value;
      const content = document.getElementById('relatorioConteudo');

      const inRange = (d) => (!ini || d >= ini) && (!fim || d <= fim);
      const lotesAno = StorageDB.lotes.filter((l) => (!ano || l.dataEntrada.startsWith(ano)) && (!clienteId || String(l.clienteId) === clienteId) && inRange(l.dataEntrada));
      const baixasAno = StorageDB.lotes.filter((l) => l.status === 'baixado' && (!ano || (l.dataBaixa || '').startsWith(ano)) && (!clienteId || String(l.clienteId) === clienteId));
      const ligasCliente = StorageDB.ligas.filter((g) => (!ano || g.createdAt.startsWith(ano)) && (!clienteId || g.lotesOrigem.some((id) => String(StorageDB.lotes.find((l) => String(l.id) === id)?.clienteId) === clienteId)));

      content.innerHTML = `
        <div class='report-box'><h6>1. Lotes por ano</h6><p>${lotesAno.length} registros</p></div>
        <div class='report-box'><h6>2. Baixas por ano</h6><p>${baixasAno.length} registros</p></div>
        <div class='report-box'><h6>3. Entrada geral por data</h6><p>${lotesAno.reduce((a,l)=>a+Number(l.quantidadeSacas||0),0)} sacas</p></div>
        <div class='report-box'><h6>4. Ligas por cliente ano</h6><p>${ligasCliente.length} ligas</p></div>
        <div class='report-box'><h6>5. Ligas geral</h6><p>${StorageDB.ligas.length} ligas totais</p></div>`;

      window.__reportRows = [
        ['Relatório', 'Quantidade'],
        ['Lotes por ano', lotesAno.length],
        ['Baixas por ano', baixasAno.length],
        ['Entrada geral (sacas)', lotesAno.reduce((a,l)=>a+Number(l.quantidadeSacas||0),0)],
        ['Ligas por cliente ano', ligasCliente.length],
        ['Ligas geral', StorageDB.ligas.length]
      ];
    }

    form.addEventListener('submit', (e) => { e.preventDefault(); generate(); });
    document.getElementById('pdfBtn').onclick = () => window.print();
    document.getElementById('excelBtn').onclick = () => AppUtils.csvDownload('relatorio.csv', window.__reportRows || []);
    document.getElementById('wordBtn').onclick = () => AppUtils.htmlDownload('relatorio.doc', document.getElementById('relatorioConteudo').innerHTML);
    generate();
  }

  function initEtiquetas() {
    const form = document.getElementById('etiquetaForm');
    if (!form) return;
    document.getElementById('codigoBusca').addEventListener('input', (e) => {
      const q = e.target.value.trim();
      const lote = StorageDB.lotes.find((l) => l.codigo === q);
      const liga = StorageDB.ligas.find((l) => l.codigo === q);
      const out = document.getElementById('etiquetaPreview');
      if (lote) {
        const cli = StorageDB.clientes.find((c) => String(c.id) === String(lote.clienteId));
        out.innerHTML = `<div class='label-card'><h4>${lote.codigo}</h4><p>Cliente: ${cli?.codigo || '-'}</p><p>Sacas: ${lote.quantidadeSacas}</p><p>Estado: ${lote.estado}</p><p>Entrada: ${AppUtils.fmtDate(lote.dataEntrada)}</p></div>`;
      } else if (liga) {
        out.innerHTML = `<div class='label-card'><h4>${liga.codigo}</h4><p>Total sacas: ${liga.totalSacas}</p><p>Classif.: ${liga.classificacaoNova}</p></div>`;
      } else out.innerHTML = '<p>Nenhum lote/liga encontrado.</p>';
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); window.print(); });
  }

  function initArquivoMorto() {
    const box = document.getElementById('arquivoMorto');
    if (!box) return;
    const lotesBaixados = StorageDB.lotes.filter((l) => l.status === 'baixado');
    const ligasBaixadas = StorageDB.ligas.filter((l) => l.status === 'baixado');
    box.innerHTML = `<h6>Lotes baixados (${lotesBaixados.length})</h6><ul>${lotesBaixados.map((l) => `<li>${l.codigo} - baixa ${AppUtils.fmtDate(l.dataBaixa)}</li>`).join('')}</ul>
    <h6>Ligas baixadas (${ligasBaixadas.length})</h6><ul>${ligasBaixadas.map((l) => `<li>${l.codigo}</li>`).join('')}</ul>`;

    const btn = document.getElementById('eliminarBtn');
    if (btn && session?.profile !== 'administrador') {
      btn.disabled = true;
      btn.title = 'Somente administrador';
    }
    if (btn) btn.onclick = () => {
      if (session?.profile !== 'administrador') return;
      if (!confirm('Eliminar definitivamente lotes baixados?')) return;
      StorageDB.write(StorageDB.KEYS.lotes, StorageDB.lotes.filter((l) => l.status !== 'baixado'));
      StorageDB.write(StorageDB.KEYS.ligas, StorageDB.ligas.filter((l) => l.status !== 'baixado'));
      location.reload();
    };
  }

  function initFechamentos() {
    const form = document.getElementById('fechamentoForm');
    if (!form) return;
    const vendedor = document.getElementById('clienteVendedor');
    const comprador = document.getElementById('clienteComprador');
    setSelectOptions(vendedor, StorageDB.clientes, (c) => `${c.codigo} - ${c.razao}`, (c) => c.id);
    setSelectOptions(comprador, StorageDB.clientes, (c) => `${c.codigo} - ${c.razao}`, (c) => c.id);

    const item = document.getElementById('itemFechamento');
    const itens = [
      ...StorageDB.lotes.filter((l) => l.status === 'ativo').map((l) => ({ v: `lote:${l.id}`, label: `Lote ${l.codigo}` })),
      ...StorageDB.ligas.filter((l) => l.status === 'ativo').map((l) => ({ v: `liga:${l.id}`, label: `Liga ${l.codigo}` }))
    ];
    setSelectOptions(item, itens, (x) => x.label, (x) => x.v);

    document.getElementById('numeroFechamento').value = StorageDB.nextCode('fechamento');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!item.value) return alert('Selecione lote ou liga.');
      const [tipo, id] = item.value.split(':');
      if (tipo === 'lote') {
        const lote = StorageDB.lotes.find((l) => String(l.id) === id);
        if (lote?.status !== 'ativo') return alert('Lote baixado não pode ser usado em fechamento.');
      }

      const fechamentos = StorageDB.fechamentos;
      fechamentos.push({
        id: Date.now(),
        numero: document.getElementById('numeroFechamento').value,
        data: document.getElementById('dataFechamento').value,
        clienteVendedor: vendedor.value,
        clienteComprador: comprador.value,
        item: item.value,
        valor: document.getElementById('valorFechamento').value,
        tipoVenda: document.getElementById('tipoVenda').value,
        banco: document.getElementById('dadosBancarios').value,
        contato: document.getElementById('contatoPicote').value,
        seguro: document.getElementById('seguro').value,
        descricao: document.getElementById('descricaoLivre').value
      });
      StorageDB.write(StorageDB.KEYS.fechamentos, fechamentos);
      alert('Fechamento salvo.');
      location.reload();
    });

    const tbody = document.getElementById('fechamentosTableBody');
    StorageDB.fechamentos.forEach((f) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${f.numero}</td><td>${AppUtils.fmtDate(f.data)}</td><td>${f.item}</td><td>R$ ${f.valor}</td><td>
      <button class='btn btn-sm btn-outline-secondary print' data-id='${f.id}'>Imprimir</button>
      <button class='btn btn-sm btn-outline-info nota' data-id='${f.id}'>Nota corretagem</button></td>`;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.print').forEach((b) => b.onclick = () => window.print());
    tbody.querySelectorAll('.nota').forEach((b) => {
      b.onclick = () => {
        const f = StorageDB.fechamentos.find((x) => String(x.id) === b.dataset.id);
        const comissao = Number(f.valor || 0) * 0.005;
        document.getElementById('notaCorretagem').innerHTML = `<h5>Nota de Corretagem</h5><p>Fechamento ${f.numero}</p><p>Valor: R$ ${f.valor}</p><p>Comissão (0,5%): R$ ${comissao.toFixed(2)}</p>`;
      };
    });
  }

  function initDashboardKpis() {
    const ativos = StorageDB.lotes.filter((l) => l.status === 'ativo').length;
    const baixados = StorageDB.lotes.filter((l) => l.status === 'baixado').length;
    const ligasAtivas = StorageDB.ligas.filter((l) => l.status !== 'baixado').length;
    const fechRecentes = StorageDB.fechamentos.slice(-5).length;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('kpiLotesAtivos', ativos);
    set('kpiLotesBaixados', baixados);
    set('kpiLigasAtivas', ligasAtivas);
    set('kpiFechRecentes', fechRecentes);
  }

  function initBaixaIntervalo() {
    const btnPreview = document.getElementById('preverBaixa');
    const btnConfirm = document.getElementById('confirmarBaixaIntervalo');
    const list = document.getElementById('baixaPreviewList');
    if (!btnPreview || !btnConfirm || !list) return;

    function inRange() {
      const ini = (document.getElementById('baixaCodigoInicio')?.value || '').trim();
      const fim = (document.getElementById('baixaCodigoFim')?.value || '').trim();
      return StorageDB.lotes.filter((l) => l.status === 'ativo' && (!ini || l.codigo >= ini) && (!fim || l.codigo <= fim));
    }

    btnPreview.onclick = () => {
      const alvo = inRange();
      list.innerHTML = alvo.length ? alvo.map((l) => `<li>${l.codigo} • ${l.numeroCliente || '-'}</li>`).join('') : '<li>Nenhum lote encontrado no intervalo.</li>';
    };

    btnConfirm.onclick = () => {
      const alvo = inRange();
      if (!alvo.length) return alert('Nenhum lote para baixar neste intervalo.');
      if (!confirm(`Confirma baixa de ${alvo.length} lotes?`)) return;
      const lotes = StorageDB.lotes;
      alvo.forEach((item) => {
        const idx = lotes.findIndex((l) => String(l.id) === String(item.id));
        if (idx >= 0) {
          lotes[idx].status = 'baixado';
          lotes[idx].dataBaixa = new Date().toISOString().slice(0, 10);
        }
      });
      StorageDB.write(StorageDB.KEYS.lotes, lotes);
      alert('Baixa concluída.');
      btnPreview.click();
    };
  }

  injectUserInfo();
  logoutBind();
  initLogin();
  initClientes();
  initLotes();
  initLigas();
  initRelatorios();
  initEtiquetas();
  initArquivoMorto();
  initFechamentos();
  initDashboardKpis();
  initBaixaIntervalo();
})();
