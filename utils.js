(function (window) {
  function byId(id) { return document.getElementById(id); }
  function fmtDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  }
  function csvDownload(filename, rows) {
    const csv = rows.map((row) => row.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
  function htmlDownload(filename, html) {
    const blob = new Blob([html], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  function toDataUrl(file, cb) {
    const reader = new FileReader();
    reader.onload = () => cb(reader.result);
    reader.readAsDataURL(file);
  }

  function requireAuth() {
    const session = StorageDB.getSession();
    if (!session && !location.pathname.endsWith('login.html') && !location.pathname.endsWith('index.html')) {
      location.href = 'login.html';
    }
    return session;
  }

  window.AppUtils = { byId, fmtDate, csvDownload, htmlDownload, toDataUrl, requireAuth };
})(window);
