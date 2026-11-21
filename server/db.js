const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });



if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Copy .env.example to .env and set your PostgreSQL credentials.');
module.exports = new Pool({ connectionString: process.env.DATABASE_URL });