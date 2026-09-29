import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import mysql from 'mysql2/promise';

const app = express();
const port = Number(process.env.PORT || 3001);
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'bd_ventas',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? {} : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
});

app.use(express.json());
app.use(session({
  name: 'ventas.sid',
  secret: process.env.SESSION_SECRET || 'solo-desarrollo-cambia-este-secreto',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 8 * 60 * 60 * 1000 },
}));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const requireLogin = (req, res, next) => {
  if (!req.session.employee) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  next();
};

app.get('/api/session', (req, res) => res.json({ employee: req.session.employee || null }));

app.post('/api/login', asyncRoute(async (req, res) => {
  const user = String(req.body.user || '').trim();
  const dni = String(req.body.password || '').trim();
  if (!user || !dni) return res.status(400).json({ error: 'Completa usuario y contraseña.' });
  const [rows] = await pool.execute(
    "SELECT IdEmpleado AS id, Nombres AS name, User AS username FROM empleado WHERE User = ? AND Dni = ? AND Estado = '1' LIMIT 1",
    [user, dni],
  );
  if (!rows.length) return res.status(401).json({ error: 'Usuario o DNI incorrectos.' });
  req.session.employee = rows[0];
  res.json({ employee: rows[0] });
}));

app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/employees', requireLogin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT IdEmpleado AS id, Dni AS dni, Nombres AS name, Telefono AS phone, Estado AS state, User AS username FROM empleado ORDER BY IdEmpleado');
  res.json(rows);
}));

app.post('/api/employees', requireLogin, asyncRoute(async (req, res) => {
  const employee = readEmployee(req.body);
  const [result] = await pool.execute(
    'INSERT INTO empleado (Dni, Nombres, Telefono, Estado, User) VALUES (?, ?, ?, ?, ?)',
    employee,
  );
  res.status(201).json({ id: result.insertId });
}));

app.put('/api/employees/:id', requireLogin, asyncRoute(async (req, res) => {
  const employee = readEmployee(req.body);
  const [result] = await pool.execute(
    'UPDATE empleado SET Dni = ?, Nombres = ?, Telefono = ?, Estado = ?, User = ? WHERE IdEmpleado = ?',
    [...employee, Number(req.params.id)],
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'No se encontró el empleado.' });
  res.json({ ok: true });
}));

app.delete('/api/employees/:id', requireLogin, asyncRoute(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM empleado WHERE IdEmpleado = ?', [Number(req.params.id)]);
  if (!result.affectedRows) return res.status(404).json({ error: 'No se encontró el empleado.' });
  res.json({ ok: true });
}));

app.get('/api/clients/:dni', requireLogin, asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT IdCliente AS id, Dni AS dni, Nombres AS name FROM cliente WHERE Dni = ? AND Estado = '1' LIMIT 1",
    [req.params.dni],
  );
  if (!rows.length) return res.status(404).json({ error: 'No se encontró un cliente activo con ese DNI.' });
  res.json(rows[0]);
}));

app.get('/api/products/:id', requireLogin, asyncRoute(async (req, res) => {
  const [rows] = await pool.execute(
    "SELECT IdProducto AS id, Nombres AS name, Precio AS price, Stock AS stock FROM producto WHERE IdProducto = ? AND Estado = '1' LIMIT 1",
    [Number(req.params.id)],
  );
  if (!rows.length) return res.status(404).json({ error: 'No se encontró un producto activo con ese código.' });
  res.json(rows[0]);
}));

app.get('/api/sales/next-number', requireLogin, asyncRoute(async (_req, res) => {
  res.json({ number: await nextSaleNumber(pool) });
}));

app.post('/api/sales', requireLogin, asyncRoute(async (req, res) => {
  const clientId = Number(req.body.clientId);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!Number.isInteger(clientId) || !items.length) {
    return res.status(400).json({ error: 'Selecciona un cliente y agrega al menos un producto.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [clients] = await connection.execute(
      "SELECT IdCliente FROM cliente WHERE IdCliente = ? AND Estado = '1' FOR UPDATE",
      [clientId],
    );
    if (!clients.length) throw httpError(400, 'El cliente ya no está disponible.');

    const normalizedItems = items.map((item) => ({ id: Number(item.id), quantity: Number(item.quantity) }));
    if (normalizedItems.some((item) => !Number.isInteger(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      throw httpError(400, 'Revisa los productos y sus cantidades.');
    }
    const quantities = new Map();
    for (const item of normalizedItems) quantities.set(item.id, (quantities.get(item.id) || 0) + item.quantity);

    let total = 0;
    const details = [];
    for (const [productId, quantity] of quantities) {
      const [products] = await connection.execute(
        "SELECT IdProducto AS id, Precio AS price, Stock AS stock FROM producto WHERE IdProducto = ? AND Estado = '1' FOR UPDATE",
        [productId],
      );
      if (!products.length) throw httpError(400, `El producto ${productId} no está disponible.`);
      const product = products[0];
      if (product.stock < quantity) throw httpError(400, `Stock insuficiente para el producto ${productId}.`);
      total += product.price * quantity;
      details.push({ id: productId, quantity, price: product.price });
      await connection.execute('UPDATE producto SET Stock = Stock - ? WHERE IdProducto = ?', [quantity, productId]);
    }

    const number = await nextSaleNumber(connection);
    const [sale] = await connection.execute(
      "INSERT INTO ventas (IdCliente, IdEmpleado, NumeroSerie, FechaVentas, Monto, Estado) VALUES (?, ?, ?, CURDATE(), ?, '1')",
      [clientId, req.session.employee.id, number, total],
    );
    for (const detail of details) {
      await connection.execute(
        'INSERT INTO detalle_ventas (IdVentas, IdProducto, Cantidad, PrecioVenta) VALUES (?, ?, ?, ?)',
        [sale.insertId, detail.id, detail.quantity, detail.price],
      );
    }
    await connection.commit();
    res.status(201).json({ number, total });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Ocurrió un error al procesar la solicitud.' });
});

app.listen(port, () => console.log(`API de ventas disponible en http://localhost:${port}`));

function readEmployee(body) {
  const employee = [
    String(body.dni || '').trim(),
    String(body.name || '').trim(),
    String(body.phone || '').trim(),
    body.state === '0' ? '0' : '1',
    String(body.username || '').trim(),
  ];
  if (!employee[0] || !employee[1] || !employee[4] || employee[0].length > 8 || employee[4].length > 8 || employee[2].length > 9) {
    throw httpError(400, 'Completa los campos obligatorios respetando sus longitudes.');
  }
  return employee;
}

async function nextSaleNumber(database) {
  const [rows] = await database.query('SELECT NumeroSerie FROM ventas ORDER BY IdVentas DESC LIMIT 1');
  const previous = Number.parseInt(rows[0]?.NumeroSerie || '0', 10);
  return String((Number.isFinite(previous) ? previous : 0) + 1).padStart(8, '0');
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}