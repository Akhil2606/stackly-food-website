// Browser-only demonstration accounts. This is not a trusted access-control system.
(() => {
  const key = 'stackly-demo-accounts-v1';
  const sessionKey = 'stackly-demo-session-v1';
  const iterations = 210000;
  const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  function read() {
    try {
      const accounts = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(accounts)) throw new Error();
      return accounts;
    } catch { throw new Error('Browser account storage is unavailable. Please enable site storage.'); }
  }
  function write(accounts) {
    try { localStorage.setItem(key, JSON.stringify(accounts)); }
    catch { throw new Error('Your browser could not save this account. Please enable site storage.'); }
  }
  function sha256Fallback(str) {
    function rightRotate(v, a) { return (v >>> a) | (v << (32 - a)); }
    const mathPow = Math.pow, maxWord = mathPow(2, 32);
    let i, j, result = '', words = [], asciiBitLength = str.length * 8;
    let hash = [], k = [], primeCounter = 0, isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    hash = hash.slice(0, 8);
    str += '\x80';
    while (str.length % 64 - 56) str += '\x00';
    for (i = 0; i < str.length; i++) {
      j = str.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;
    for (j = 0; j < words.length;) {
      const w = words.slice(j, j += 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
        const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
        const temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
        const temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
        hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (let b = 3; b >= 0; b--) {
        const byte = (hash[i] >> (8 * b)) & 255;
        result += (byte < 16 ? '0' : '') + byte.toString(16);
      }
    }
    return result;
  }
  async function derive(password, salt) {
    if (globalThis.crypto?.subtle) {
      try {
        const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: Uint8Array.from(salt.match(/.{2}/g), value => parseInt(value, 16)), iterations, hash: 'SHA-256' }, material, 256);
        return hex(new Uint8Array(bits));
      } catch {}
    }
    return sha256Fallback(salt + ':' + password);
  }
  function validate(data) {
    const raw = String(data.email || data.username || data.identifier || '').trim().toLowerCase();
    if (!raw || raw.length > 254) throw new Error('Invalid credentials. Enter an email address or username.');
    if (typeof data.password !== 'string' || data.password.length < 1 || data.password.length > 128) throw new Error('Invalid credentials. Enter your password.');
    return raw;
  }
  async function register(data) {
    const email = validate(data);
    const rawName = String(data.name || '').trim();
    const name = rawName.length >= 2 ? rawName.slice(0, 80) : (rawName || email);
    const accounts = read();
    if (accounts.some(account => account.email === email)) throw new Error('This email or username is already registered. Please log in.');
    const saltBytes = globalThis.crypto?.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(16))
      : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    const salt = hex(saltBytes);
    const passwordHash = await derive(data.password, salt);
    const idBytes = globalThis.crypto?.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(16))
      : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    const id = hex(idBytes);
    accounts.push({ id, name, email, salt, passwordHash });
    write(accounts);
    return { ok: true, user: { id, name, email } };
  }
  async function login(data) {
    const email = validate(data);
    const accounts = read();
    const account = accounts.find(account => account.email === email);
    if (!account) throw new Error('Invalid credentials. Account is not registered.');
    let passwordHash = await derive(data.password, account.salt);
    if (passwordHash !== account.passwordHash) {
      const fallback = sha256Fallback(account.salt + ':' + data.password);
      if (fallback === account.passwordHash) {
        passwordHash = fallback;
      }
    }
    if (passwordHash !== account.passwordHash) throw new Error('Invalid credentials. Password is incorrect.');
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ id: account.id, expires: Date.now() + 86400000 })); }
    catch { throw new Error('Your browser could not start a session. Please enable site storage.'); }
    return { user: { id: account.id, name: account.name, email: account.email } };
  }
  function current() {
    try {
      const session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
      if (!session || session.expires <= Date.now()) { sessionStorage.removeItem(sessionKey); return null; }
      const account = read().find(account => account.id === session.id);
      return account ? { id: account.id, name: account.name, email: account.email, phone: account.phone || '' } : null;
    } catch { return null; }
  }
  function logout() { sessionStorage.removeItem(sessionKey); return { ok: true }; }
  function storageKey(base) {
    const user = current();
    if (!user) return base;
    const scoped = `${base}:${user.id}`;
    // Bring selections made before login into this account once. Never read
    // another account's data, and clear guest data only after saving succeeds.
    if (['stackly-cart-v1', 'faaaahh-saved-dishes', 'faaaahh-saved-restaurants'].includes(base)) {
      try {
        const guest = JSON.parse(localStorage.getItem(base) || '[]');
        const existing = JSON.parse(localStorage.getItem(scoped) || '[]');
        if (Array.isArray(guest) && guest.length && Array.isArray(existing)) {
          let merged;
          if (base === 'stackly-cart-v1') {
            const items = new Map();
            [...existing, ...guest].forEach(item => {
              if (item && typeof item.id === 'string' && Number.isInteger(item.quantity) && item.quantity > 0)
                items.set(item.id, Math.min(20, (items.get(item.id) || 0) + item.quantity));
            });
            merged = [...items].map(([id, quantity]) => ({ id, quantity }));
          } else merged = [...new Set([...existing, ...guest].filter(id => typeof id === 'string'))];
          localStorage.setItem(scoped, JSON.stringify(merged));
          localStorage.removeItem(base);
        }
      } catch { /* Leave guest selections intact if storage is unavailable. */ }
    }
    return scoped;
  }
  function updateProfile({ name, phone = '' }) {
    const user = current();
    if (!user) throw new Error('Please log in to update your profile.');
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) throw new Error('Enter your name (2–80 characters).');
    if (phone && !/^[6-9][0-9]{9}$/.test(phone)) throw new Error('Enter a valid 10-digit Indian mobile number.');
    const accounts = read();
    const account = accounts.find(account => account.id === user.id);
    account.name = name.trim(); account.phone = phone;
    write(accounts);
    return current();
  }
  window.StacklyAccounts = { register, login, current, logout, storageKey, updateProfile };
})();
