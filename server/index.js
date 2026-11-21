const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { validateUser, PASSWORD } = require('./validation');
const { sign, authenticate, allow } = require('./auth');
const app = express();

app.use(cors()); app.use(express.json());


const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sort = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
const direction = value => value === 'desc' ? 'DESC' : 'ASC';

//routes...
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const errors = validateUser(req.body); if (Object.keys(errors).length) return res.status(400).json({ errors });
  const { name, email, address, password } = req.body;
  try {
    const result = await db.query('INSERT INTO users (name,email,address,password_hash) VALUES ($1,$2,$3,$4) RETURNING id,name,email,address,role', [name.trim(), email.toLowerCase(), address, await bcrypt.hash(password, 12)]);
    res.status(201).json({ token: sign(result.rows[0]), user: result.rows[0] });
  } catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'That email is already registered.' }); throw e; }
}));


app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const result = await db.query('SELECT * FROM users WHERE email=$1', [(req.body.email || '').toLowerCase()]);
  const user = result.rows[0]; if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) return res.status(401).json({ error: 'Invalid email or password.' });
  res.json({ token: sign(user), user: { id:user.id, name:user.name, email:user.email, address:user.address, role:user.role } });
}));


app.get('/api/me', authenticate, asyncRoute(async (req, res) => { const { rows } = await db.query('SELECT id,name,email,address,role FROM users WHERE id=$1', [req.user.id]); res.json(rows[0]); }));


app.put('/api/me/password', authenticate, asyncRoute(async (req, res) => {
  if (!PASSWORD.test(req.body.password || '')) return res.status(400).json({ error: 'Password must be 8–16 characters and include an uppercase letter and special character.' });
  await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(req.body.password, 12), req.user.id]); res.status(204).end();
}));


app.get('/api/stores', authenticate, asyncRoute(async (req, res) => {
  const q = `%${req.query.q || ''}%`; const key = sort(req.query.sort, ['name','email','address','rating'], 'name');
  const { rows } = await db.query(`SELECT s.id,s.name,s.email,s.address,COALESCE(ROUND(AVG(r.score)::numeric,2),0) AS rating, MAX(r.score) FILTER (WHERE r.user_id=$1) AS user_rating FROM stores s LEFT JOIN ratings r ON r.store_id=s.id WHERE s.name ILIKE $2 OR s.address ILIKE $2 GROUP BY s.id ORDER BY ${key === 'rating' ? 'rating' : 's.' + key} ${direction(req.query.dir)}`, [req.user.id, q]); res.json(rows);
}));


app.put('/api/stores/:id/rating', authenticate, allow('USER'), asyncRoute(async (req, res) => {
  const score = Number(req.body.score); if (!Number.isInteger(score) || score < 1 || score > 5) return res.status(400).json({ error: 'Rating must be an integer from 1 to 5.' });
  const result = await db.query('INSERT INTO ratings (user_id,store_id,score) VALUES ($1,$2,$3) ON CONFLICT (user_id,store_id) DO UPDATE SET score=EXCLUDED.score, updated_at=now() RETURNING score', [req.user.id, req.params.id, score]);
  res.json(result.rows[0]);
}));

app.get('/api/admin/summary', authenticate, allow('ADMIN'), asyncRoute(async (_, res) => { const { rows } = await db.query("SELECT (SELECT count(*) FROM users) users, (SELECT count(*) FROM stores) stores, (SELECT count(*) FROM ratings) ratings"); res.json(rows[0]); }));


app.get('/api/admin/users', authenticate, allow('ADMIN'), asyncRoute(async (req, res) => {
  const q=`%${req.query.q || ''}%`, role=req.query.role || '%', key=sort(req.query.sort,['name','email','address','role'],'name');
  const { rows }=await db.query(`SELECT u.id,u.name,u.email,u.address,u.role,COALESCE(ROUND(AVG(r.score)::numeric,2),0) AS rating FROM users u LEFT JOIN stores s ON s.owner_id=u.id LEFT JOIN ratings r ON r.store_id=s.id WHERE (u.name ILIKE $1 OR u.email ILIKE $1 OR u.address ILIKE $1) AND u.role LIKE $2 GROUP BY u.id ORDER BY u.${key} ${direction(req.query.dir)}`,[q,role]); res.json(rows);
}));


app.post('/api/admin/users', authenticate, allow('ADMIN'), asyncRoute(async (req,res) => { const errors=validateUser(req.body); if(Object.keys(errors).length) return res.status(400).json({errors}); const role=['ADMIN','USER','OWNER'].includes(req.body.role)?req.body.role:'USER'; try { const {rows}=await db.query('INSERT INTO users(name,email,address,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,address,role',[req.body.name.trim(),req.body.email.toLowerCase(),req.body.address,await bcrypt.hash(req.body.password,12),role]); res.status(201).json(rows[0]); } catch(e) {if(e.code==='23505') return res.status(409).json({error:'That email is already registered.'});throw e;} }));

app.post('/api/admin/stores', authenticate, allow('ADMIN'), asyncRoute(async (req,res) => { const {name,email,address,ownerId}=req.body; if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||'')||!address||address.length>400) return res.status(400).json({error:'Enter a name, valid email, and address up to 400 characters.'}); const {rows}=await db.query('INSERT INTO stores(name,email,address,owner_id) VALUES($1,$2,$3,$4) RETURNING *',[name,email.toLowerCase(),address,ownerId||null]); res.status(201).json(rows[0]); }));


app.get('/api/owner/dashboard', authenticate, allow('OWNER'), asyncRoute(async (req,res) => { const {rows}=await db.query('SELECT s.name, COALESCE(ROUND(AVG(r.score)::numeric,2),0) rating, json_agg(json_build_object(\'name\',u.name,\'email\',u.email,\'score\',r.score)) FILTER (WHERE u.id IS NOT NULL) raters FROM stores s LEFT JOIN ratings r ON r.store_id=s.id LEFT JOIN users u ON u.id=r.user_id WHERE s.owner_id=$1 GROUP BY s.id',[req.user.id]); res.json(rows); }));

app.use((err, _, res, __) => { console.error(err); res.status(500).json({ error: 'Something went wrong.' }); });







app.listen(process.env.PORT || 3001, () => console.log('API listening'));
