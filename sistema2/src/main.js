import './style.css';

const app = document.querySelector('#app');
const state = { employee: null, page: 'home', employees: [], editing: null, client: null, clientDni: '', product: null, cart: [], saleNumber: '' };

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (response.status === 401 && state.employee) {
      state.employee = null;
      render();
    }
    throw new Error(result?.error || 'No se pudo completar la solicitud.');
  }
  return result;
}

function render() {
  app.innerHTML = state.employee ? renderWorkspace() : renderLogin();
}

function renderLogin() {
  const hasError = new URLSearchParams(location.search).has('error');
  return `<main class="login-shell"><section class="card login-card"><div class="card-body">
    <h3 class="text-center">Ingreso al Sistema</h3><div class="login-mark"><img src="/img/java.png" alt="Logo del sistema"></div>
    ${hasError ? '<div class="alert alert-danger">Usuario o DNI incorrectos.</div>' : ''}<div id="notice"></div>
    <form id="login-form"><div class="form-group"><label for="username">Usuario</label><input id="username" required class="form-control" name="user" maxlength="8" autocomplete="username"></div>
    <div class="form-group"><label for="password">Contraseña</label><div class="input-group"><input id="password" required class="form-control" type="password" name="password" maxlength="8" autocomplete="current-password"><div class="input-group-append"><button class="btn btn-primary password-toggle" type="button" aria-label="Mostrar contraseña" title="Mostrar contraseña"><img src="/img/eye-slash-solid.svg" alt=""></button></div></div></div>
    <button class="btn btn-primary btn-block" type="submit">Ingresar</button></form></div></section></main>`;
}

function renderNavbar(active = '') {
  return `<nav class="navbar navbar-expand-lg navbar-dark bg-info"><a class="navbar-brand" href="#home" data-page="home">Sistema de Ventas</a><button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#main-nav" aria-controls="main-nav" aria-expanded="false" aria-label="Abrir navegación"><span class="navbar-toggler-icon"></span></button><div class="collapse navbar-collapse" id="main-nav"><div class="navbar-nav mr-auto">
    <a class="nav-link ${active === 'home' ? 'active' : ''}" href="#home" data-page="home">Inicio</a><a class="nav-link ${active === 'employees' ? 'active' : ''}" href="#employees" data-page="employees">Empleado</a><a class="nav-link ${active === 'sale' ? 'active' : ''}" href="#sale" data-page="sale">Nueva Venta</a></div><span class="navbar-text mr-lg-3">${escapeHtml(state.employee.name)}</span><button id="logout" class="btn btn-outline-light btn-sm">Salir</button></div></nav>`;
}

function renderWorkspace() {
  const content = state.page === 'employees' ? renderEmployees() : state.page === 'sale' ? renderSale() : renderHome();
  return `${renderNavbar(state.page)}<main class="container-fluid workspace">${content}</main><div id="toast-area" class="toast-area" aria-live="polite"></div>`;
}

function renderHome() {
  return `<section class="jumbotron home-panel"><div class="home-copy"><p class="eyebrow">PANEL PRINCIPAL</p><h1 class="display-5">Bienvenido al Sistema de Ventas</h1><p class="lead">Seleccione un módulo para continuar.</p><div class="home-actions"><button class="btn btn-primary" data-page="employees">Administrar empleados</button><button class="btn btn-success" data-page="sale">Registrar venta</button></div></div><div class="home-stamp"><img src="/img/java.png" alt=""><span>VENTAS<br>WEB</span></div></section>`;
}

function renderEmployees() {
  const employee = state.editing || { dni: '', name: '', phone: '', state: '1', username: '' };
  const rows = state.employees.map((item) => `<tr><td>${item.id}</td><td>${escapeHtml(item.dni)}</td><td>${escapeHtml(item.name || '')}</td><td>${escapeHtml(item.phone || '')}</td><td><span class="status ${item.state === '1' ? 'is-active' : ''}">${item.state === '1' ? 'Activo' : 'Inactivo'}</span></td><td>${escapeHtml(item.username || '')}</td><td class="actions-cell"><button class="btn btn-warning btn-sm" data-edit="${item.id}">Editar</button><button class="btn btn-danger btn-sm" data-delete="${item.id}">Eliminar</button></td></tr>`).join('');
  return `<div class="employee-layout"><section class="card employee-form"><div class="card-body"><div class="section-heading"><p class="eyebrow">GESTIÓN</p><h4>${state.editing ? 'Editar empleado' : 'Agregar empleado'}</h4></div><div id="notice"></div>
    <form id="employee-form" data-id="${state.editing?.id || ''}"><div class="form-group"><label for="dni">DNI</label><input id="dni" name="dni" required maxlength="8" class="form-control" value="${escapeAttr(employee.dni)}"></div><div class="form-group"><label for="name">Nombres</label><input id="name" name="name" required maxlength="255" class="form-control" value="${escapeAttr(employee.name)}"></div><div class="form-group"><label for="phone">Teléfono</label><input id="phone" name="phone" maxlength="9" class="form-control" value="${escapeAttr(employee.phone)}"></div><div class="form-group"><label for="employee-state">Estado</label><select id="employee-state" name="state" class="form-control"><option value="1" ${employee.state === '1' ? 'selected' : ''}>Activo</option><option value="0" ${employee.state === '0' ? 'selected' : ''}>Inactivo</option></select></div><div class="form-group"><label for="employee-user">Usuario</label><input id="employee-user" name="username" required maxlength="8" class="form-control" value="${escapeAttr(employee.username)}"></div><div class="form-actions"><button type="submit" class="btn ${state.editing ? 'btn-success' : 'btn-primary'}">${state.editing ? 'Actualizar' : 'Agregar'}</button>${state.editing ? '<button id="cancel-edit" type="button" class="btn btn-secondary">Cancelar</button>' : ''}</div></form></div></section>
    <section class="employee-list"><div class="list-heading"><div><p class="eyebrow">DIRECTORIO</p><h4>Lista de empleados</h4></div><span class="record-count">${state.employees.length} registros</span></div><div class="table-responsive"><table class="table table-bordered table-hover bg-white employee-table"><thead class="thead-dark"><tr><th>ID</th><th>DNI</th><th>Nombres</th><th>Teléfono</th><th>Estado</th><th>Usuario</th><th>Acciones</th></tr></thead><tbody>${rows || '<tr><td colspan="7" class="empty-state">No hay empleados registrados.</td></tr>'}</tbody></table></div></section></div>`;
}

function renderSale() {
  const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const lines = state.cart.map((item, index) => `<tr><td>${index + 1}</td><td>${item.id}</td><td>${escapeHtml(item.name)}</td><td>${money(item.price)}</td><td>${item.quantity}</td><td>${money(item.price * item.quantity)}</td><td class="parte02"><button class="btn btn-danger btn-sm" data-remove="${item.id}" aria-label="Quitar ${escapeAttr(item.name)}">Quitar</button></td></tr>`).join('');
  return `<div class="sale-layout"><section class="card sale-entry parte01"><div class="card-body"><p class="eyebrow">NUEVA OPERACIÓN</p><h4>Registrar venta</h4><div id="notice"></div><form id="client-form" class="sale-group"><label for="client-dni">Datos del Cliente</label><div class="input-group"><input id="client-dni" class="form-control" placeholder="DNI" maxlength="8" value="${escapeAttr(state.clientDni)}"><div class="input-group-append"><button class="btn btn-outline-info" type="submit">Buscar</button></div></div><input class="form-control client-name" value="${state.client ? escapeAttr(state.client.name) : ''}" placeholder="Datos del cliente" readonly></form>
    <form id="product-form" class="sale-group"><label for="product-code">Datos del Producto</label><div class="input-group"><input id="product-code" class="form-control" placeholder="Código" value="${state.product ? state.product.id : ''}"><div class="input-group-append"><button class="btn btn-outline-info" type="submit">Buscar</button></div></div><input class="form-control product-name" value="${state.product ? escapeAttr(state.product.name) : ''}" placeholder="Datos del producto" readonly><div class="product-meta"><span>Precio <strong>${state.product ? money(state.product.price) : 'S/. 0.00'}</strong></span><span>Stock <strong>${state.product ? state.product.stock : '—'}</strong></span></div><label for="quantity">Cantidad</label><input id="quantity" type="number" min="1" step="1" value="1" class="form-control quantity-input" ${state.product ? '' : 'disabled'}><button class="btn btn-outline-primary" type="button" id="add-product" ${state.product ? '' : 'disabled'}>Agregar Producto</button></form></div></section>
    <section class="card sale-summary"><div class="card-body"><div class="sale-number"><label for="sale-number">Nro. Serie:</label><input id="sale-number" class="form-control" value="${escapeAttr(state.saleNumber)}" readonly></div><div class="table-responsive"><table class="table table-hover sale-table"><thead><tr><th>Nro</th><th>Código</th><th>Descripción</th><th>Precio</th><th>Cantidad</th><th>SubTotal</th><th class="parte02">Acciones</th></tr></thead><tbody>${lines || '<tr><td colspan="7" class="empty-state">Agrega productos para iniciar la venta.</td></tr>'}</tbody></table></div></div><footer class="card-footer sale-footer parte01"><div class="sale-buttons"><button id="generate-sale" class="btn btn-success" ${state.cart.length && state.client ? '' : 'disabled'}>Generar Venta</button><button id="cancel-sale" class="btn btn-danger">Cancelar</button></div><div class="total-field"><label for="total">Total</label><input id="total" class="form-control text-center" value="${money(total)}" readonly></div></footer></section></div>`;
}

async function loadEmployees() {
  state.employees = await api('/employees');
  state.editing = null;
  render();
}

async function openSale() {
  state.page = 'sale';
  state.product = null;
  try { state.saleNumber = (await api('/sales/next-number')).number; } catch (error) { showNotice(error.message, 'danger'); }
  render();
}

function showNotice(message, type = 'danger') {
  const target = document.querySelector('#notice');
  if (target) target.innerHTML = `<div class="alert alert-${type}" role="alert">${escapeHtml(message)}</div>`;
}

function notify(message) {
  const area = document.querySelector('#toast-area');
  if (area) area.innerHTML = `<div class="toast-message">${escapeHtml(message)}</div>`;
}

function money(value) {
  return `S/. ${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function escapeAttr(value) { return escapeHtml(value); }

app.addEventListener('click', async (event) => {
  const pageLink = event.target.closest('[data-page]');
  if (pageLink) {
    event.preventDefault();
    state.page = pageLink.dataset.page;
    if (state.page === 'employees') return loadEmployees().catch((error) => showNotice(error.message));
    if (state.page === 'sale') return openSale();
    return render();
  }
  if (event.target.closest('#logout')) {
    await api('/logout', { method: 'POST' });
    Object.assign(state, { employee: null, page: 'home', cart: [], client: null });
    return render();
  }
  if (event.target.closest('.password-toggle')) {
    const input = document.querySelector('#password');
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    event.target.closest('button').setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    event.target.closest('button').title = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
    event.target.closest('button').querySelector('img').src = visible ? '/img/eye-solid.svg' : '/img/eye-slash-solid.svg';
  }
  const navToggle = event.target.closest('.navbar-toggler');
  if (navToggle) {
    const navigation = document.querySelector('#main-nav');
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navigation.classList.toggle('show', !expanded);
  }
  const edit = event.target.closest('[data-edit]');
  if (edit) {
    state.editing = state.employees.find((employee) => employee.id === Number(edit.dataset.edit));
    render();
  }
  const remove = event.target.closest('[data-delete]');
  if (remove && confirm('¿Eliminar este empleado?')) {
    try { await api(`/employees/${remove.dataset.delete}`, { method: 'DELETE' }); await loadEmployees(); }
    catch (error) { showNotice(error.message); }
  }
  if (event.target.closest('#cancel-edit')) { state.editing = null; render(); }
  const removeProduct = event.target.closest('[data-remove]');
  if (removeProduct) { state.cart = state.cart.filter((item) => item.id !== Number(removeProduct.dataset.remove)); render(); }
  if (event.target.closest('#add-product')) {
    const quantity = Number(document.querySelector('#quantity').value);
    if (!Number.isInteger(quantity) || quantity < 1) return showNotice('La cantidad debe ser un número entero mayor que cero.');
    if (quantity > state.product.stock) return showNotice('La cantidad supera el stock disponible.');
    const existing = state.cart.find((item) => item.id === state.product.id);
    if (existing) {
      if (existing.quantity + quantity > state.product.stock) return showNotice('La cantidad supera el stock disponible.');
      existing.quantity += quantity;
    } else state.cart.push({ ...state.product, quantity });
    state.product = null;
    render();
  }
  if (event.target.closest('#cancel-sale')) {
    state.cart = []; state.client = null; state.clientDni = ''; state.product = null;
    return openSale();
  }
  if (event.target.closest('#generate-sale')) {
    try {
      const result = await api('/sales', { method: 'POST', body: { clientId: state.client.id, items: state.cart.map(({ id, quantity }) => ({ id, quantity })) } });
      state.cart = []; state.client = null; state.clientDni = ''; state.product = null;
      await openSale();
      notify(`Venta ${result.number} generada. Total: ${money(result.total)}`);
    } catch (error) { showNotice(error.message); }
  }
});

app.addEventListener('submit', async (event) => {
  if (event.target.id === 'login-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const result = await api('/login', { method: 'POST', body: { user: form.get('user'), password: form.get('password') } });
      state.employee = result.employee; state.page = 'home'; history.replaceState(null, '', '/'); render();
    } catch (error) { showNotice(error.message); }
  }
  if (event.target.id === 'employee-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const body = Object.fromEntries(form.entries());
    const id = event.target.dataset.id;
    try {
      await api(id ? `/employees/${id}` : '/employees', { method: id ? 'PUT' : 'POST', body });
      await loadEmployees();
    } catch (error) { showNotice(error.message); }
  }
  if (event.target.id === 'client-form') {
    event.preventDefault();
    state.clientDni = document.querySelector('#client-dni').value.trim();
    try { state.client = await api(`/clients/${encodeURIComponent(state.clientDni)}`); render(); }
    catch (error) { showNotice(error.message); }
  }
  if (event.target.id === 'product-form') {
    event.preventDefault();
    const id = document.querySelector('#product-code').value.trim();
    try { state.product = await api(`/products/${encodeURIComponent(id)}`); render(); }
    catch (error) { showNotice(error.message); }
  }
});

async function start() {
  try { state.employee = (await api('/session')).employee; }
  catch { state.employee = null; }
  render();
}

start();