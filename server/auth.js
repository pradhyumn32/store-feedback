const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'development-secret';


function sign(user) { return jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: '8h' }); }
function authenticate(req, res, next) {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); next(); }
  catch { res.status(401).json({ error: 'Sign in required.' }); }
}


function allow(...roles) { return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Not permitted.' }); }
module.exports = { sign, authenticate, allow };
