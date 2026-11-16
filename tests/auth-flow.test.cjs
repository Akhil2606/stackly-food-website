const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const { webcrypto } = require('node:crypto');

const memory = () => {
  const map = new Map();
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    clear: () => map.clear()
  };
};

function createEnv(withSubtle = true) {
  const context = {
    crypto: withSubtle ? webcrypto : { getRandomValues: arr => arr },
    TextEncoder,
    localStorage: memory(),
    sessionStorage: memory(),
    window: { addEventListener() {}, dispatchEvent() {} },
    document: { querySelectorAll: () => [] }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'account-store.js'), 'utf8'), context);
  return context.window.StacklyAccounts;
}

(async () => {
  // Test with both WebCrypto (secure context) and Fallback (e.g. file:// protocol)
  for (const withSubtle of [true, false]) {
    const accounts = createEnv(withSubtle);

    // 1. Trying to login with unregistered dummy credentials must fail with 'Invalid credentials'
    await assert.rejects(
      async () => accounts.login({ email: 'dummy', password: '123' }),
      /Invalid credentials/
    );

    // 2. First any dummy credentials can be registered in signup
    const regResult = await accounts.register({ email: 'dummy', password: '123' });
    assert.equal(regResult.ok, true);

    // 3. Unregistered credentials should show invalid
    await assert.rejects(
      async () => accounts.login({ email: 'other_dummy', password: '123' }),
      /Invalid credentials/
    );

    // 4. Registered user with wrong password should show invalid
    await assert.rejects(
      async () => accounts.login({ email: 'dummy', password: 'wrong_password' }),
      /Invalid credentials/
    );

    // 5. The same registered credentials ONLY should have access to login
    const loginResult = await accounts.login({ email: 'dummy', password: '123' });
    assert.equal(loginResult.user.email, 'dummy');
    assert.equal(accounts.current().email, 'dummy');

    // Logout
    accounts.logout();
    assert.equal(accounts.current(), null);

    // 6. Another dummy account can register and log in
    await accounts.register({ name: 'Admin User', email: 'admin', password: 'admin_pass' });
    const adminLogin = await accounts.login({ email: 'admin', password: 'admin_pass' });
    assert.equal(adminLogin.user.name, 'Admin User');
    assert.equal(adminLogin.user.email, 'admin');

    // Admin password doesn't work for dummy
    await assert.rejects(
      async () => accounts.login({ email: 'dummy', password: 'admin_pass' }),
      /Invalid credentials/
    );
  }

  console.log('Passed all registered credentials & invalid login verification tests.');
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
