const page = document.body.dataset.page;
const protectedPage = document.body.dataset.protected === 'true';
let expiryTimer;
function message(text, success = false) {
  const box = document.getElementById('message');
  box.textContent = text;
  box.classList.toggle('success', success);
  box.hidden = false;
}
async function logout() {
  clearTimeout(expiryTimer);
  sessionStorage.removeItem('token');
  try { await fetch('/api/auth/signOut', { method: 'POST' }); } finally { location.replace('/signIn'); }
}
function watchExpiry() {
  try {
    const token = sessionStorage.getItem('token');
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part));
    const remaining = payload.exp * 1000 - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) { void logout(); return false; }
    clearTimeout(expiryTimer);
    expiryTimer = setTimeout(watchExpiry, Math.min(remaining, 2147483647));
    return true;
  } catch { void logout(); return false; }
}
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: {
    'Content-Type': 'application/json', Authorization: 'Bearer ' + (sessionStorage.getItem('token') || ''), ...options.headers
  } });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && protectedPage) await logout();
    if (response.status === 403 && protectedPage) location.replace('/403');
    throw new Error(data.message || 'No se pudo completar la solicitud');
  }
  return data;
}
function showUser(user) {
  const target = document.getElementById('user-data');
  if (!target) return;
  const list = document.createElement('dl');
  for (const [label, value] of [ ['ID', user.id], ['Nombre', user.name], ['Apellidos', user.lastName], ['Correo', user.email],
    ['Teléfono', user.phoneNumber], ['Nacimiento', user.birthdate?.slice(0, 10)], ['Edad', user.age == null ? null : user.age + ' años'],
    ['Foto de perfil (URL)', user.url_profile], ['Dirección', user.adress], ['Roles', user.roles.join(', ')],
    ['Registro', user.createdAt && new Date(user.createdAt).toLocaleString('es-PE')], ['Última actualización', user.updatedAt && new Date(user.updatedAt).toLocaleString('es-PE')] ]) {
    const term = document.createElement('dt'); term.textContent = label;
    const detail = document.createElement('dd'); detail.textContent = value ?? 'Sin datos';
    if (value === '') detail.textContent = 'Sin datos';
    list.append(term, detail);
  }
  target.replaceChildren(list);
}
function fillProfile(user) {
  const form = document.getElementById('profile-form');
  if (!form) return;
  for (const name of ['name', 'lastName', 'phoneNumber', 'birthdate', 'email', 'url_profile', 'adress']) {
    form.elements[name].value = name === 'birthdate' ? user[name]?.slice(0, 10) || '' : user[name] || '';
  }
  window.M?.updateTextFields();
}
function bindForm(id, handler) {
  const form = document.getElementById(id);
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    try {
      const values = Object.fromEntries(new FormData(form));
      if (id !== 'signin-form' && values.password && !/^(?=.*[A-Z])(?=.*\d)(?=.*[#$%&*@]).{8,}$/.test(values.password)) throw new Error('La contraseña debe tener 8 caracteres, una mayúscula, un dígito y un símbolo # $ % & * @.');
      await handler(values);
    } catch (error) { message(error.message); } finally { button.disabled = false; }
  });
}
bindForm('signin-form', async values => {
  const data = await api('/api/auth/signIn', { method: 'POST', body: JSON.stringify(values) });
  sessionStorage.setItem('token', data.token);
  location.replace(data.roles.includes('admin') ? '/admin' : '/dashboard');
});
bindForm('signup-form', async values => {
  await api('/api/auth/signUp', { method: 'POST', body: JSON.stringify(values) });
  location.replace('/signIn?registered=1');
});
bindForm('profile-form', async values => {
  const user = await api('/api/users/me', { method: 'PATCH', body: JSON.stringify(values) });
  showUser(user); fillProfile(user);
  document.getElementById('password').value = '';
  message('Datos actualizados correctamente.', true);
});
document.getElementById('logout')?.addEventListener('click', logout);
if (page === 'signIn') {
  sessionStorage.removeItem('token');
  if (new URLSearchParams(location.search).has('registered')) message('Cuenta creada. Ya puedes iniciar sesión.', true);
}
async function init() {
  if (!protectedPage || !watchExpiry()) return;
  const current = await api('/api/users/me');
  document.getElementById('admin-link').hidden = !current.roles.includes('admin');
  if (page === 'profile' || page === 'dashboard') { showUser(current); fillProfile(current); }
  if (page === 'detail') showUser(await api('/api/users/' + encodeURIComponent(location.pathname.split('/').pop())));
  if (page === 'admin') {
    const users = await api('/api/users');
    const rows = users.map(user => {
      const row = document.createElement('tr');
      for (const value of [ [user.name, user.lastName].filter(Boolean).join(' '), user.email, user.roles.join(', '), new Date(user.createdAt).toLocaleDateString('es-PE') ]) {
        const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
      }
      const cell = document.createElement('td'); const link = document.createElement('a');
      link.href = '/admin/users/' + encodeURIComponent(user.id); link.textContent = 'Ver usuario'; cell.append(link); row.append(cell);
      return row;
    });
    const tbody = document.getElementById('users');
    tbody.replaceChildren(...rows);
    if (!rows.length) { const row = tbody.insertRow(); const cell = row.insertCell(); cell.colSpan = 5; cell.textContent = 'No hay usuarios registrados.'; }
  }
}
window.addEventListener('pageshow', () => { if (protectedPage) watchExpiry(); });
document.addEventListener('visibilitychange', () => { if (protectedPage && !document.hidden) watchExpiry(); });
init().catch(error => message(error.message));
