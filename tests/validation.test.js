const test = require('node:test'); const assert = require('node:assert/strict'); const { validateUser, PASSWORD } = require('../server/validation');
test('accepts a valid registration payload', () => assert.deepEqual(validateUser({name:'A Valid Customer Name Here',email:'a@example.com',address:'A road',password:'Password!1'}), {}));
test('rejects invalid registration fields', () => assert.equal(Object.keys(validateUser({name:'short',email:'bad',address:'x'.repeat(401),password:'lowercase1'})).length, 4));
test('password policy has its required parts', () => { assert(PASSWORD.test('Password!1')); assert(!PASSWORD.test('password!1')); assert(!PASSWORD.test('Password11')); });
