import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'La contrasena debe tener al menos 8 caracteres.';
  }

  return null;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);

  return `scrypt:${salt}:${Buffer.from(derivedKey).toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, salt, hashHex] = String(storedHash || '').split(':');

  if (algorithm !== 'scrypt' || !salt || !hashHex) {
    return false;
  }

  const storedBuffer = Buffer.from(hashHex, 'hex');
  const derivedKey = await scrypt(password, salt, storedBuffer.length);
  const derivedBuffer = Buffer.from(derivedKey);

  if (storedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedBuffer);
}
