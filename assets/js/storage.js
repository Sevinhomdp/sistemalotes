(function (window) {
  const KEYS = {
    users: 'users',
    clientes: 'clientes',
    lotes: 'lotes',
    ligas: 'ligas',
    fechamentos: 'fechamentos',
    session: 'session',
    counters: 'counters'
  };

  const DEFAULT_COUNTERS = { cliente: 1, lote: 1, liga: 1, fechamento: 1 };

  function read(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_err) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ensureBootstrap() {
    if (!localStorage.getItem(KEYS.users)) {
      write(KEYS.users, [
        { id: 1, username: 'admin', password: 'admin123', profile: 'administrador', name: 'Administrador' },
        { id: 2, username: 'classificacao', password: 'class123', profile: 'classificacao', name: 'Classificação' },
        { id: 3, username: 'vendas', password: 'vendas123', profile: 'vendas', name: 'Vendas' }
      ]);
    }

    ['clientes', 'lotes', 'ligas', 'fechamentos'].forEach((k) => {
      if (!localStorage.getItem(KEYS[k])) write(KEYS[k], []);
    });

    if (!localStorage.getItem(KEYS.counters)) write(KEYS.counters, DEFAULT_COUNTERS);
  }

  function nextCode(type) {
    const counters = read(KEYS.counters, DEFAULT_COUNTERS);
    const year = String(new Date().getFullYear()).slice(-2);
    let code;

    if (type === 'cliente') {
      code = String(counters.cliente).padStart(4, '0');
      counters.cliente += 1;
    }
    if (type === 'lote') {
      code = `${String(counters.lote).padStart(2, '0')}.${String(500 + counters.lote).padStart(3, '0')}/${year}`;
      counters.lote += 1;
    }
    if (type === 'liga') {
      code = `EC${new Date().getFullYear()}/${String(counters.liga).padStart(2, '0')}`;
      counters.liga += 1;
    }
    if (type === 'fechamento') {
      code = String(counters.fechamento).padStart(6, '0');
      counters.fechamento += 1;
    }

    write(KEYS.counters, counters);
    return code;
  }

  window.StorageDB = {
    KEYS,
    ensureBootstrap,
    read,
    write,
    nextCode,
    get users() { return read(KEYS.users, []); },
    get clientes() { return read(KEYS.clientes, []); },
    get lotes() { return read(KEYS.lotes, []); },
    get ligas() { return read(KEYS.ligas, []); },
    get fechamentos() { return read(KEYS.fechamentos, []); },
    setSession(session) { write(KEYS.session, session); },
    getSession() { return read(KEYS.session, null); },
    clearSession() { localStorage.removeItem(KEYS.session); }
  };
})(window);
