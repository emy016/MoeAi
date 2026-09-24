/** Shared MoeAI storage namespace with one-time migration from earlier builds. */
import RawAsyncStorage from '@react-native-async-storage/async-storage';

const writeListeners = new Set();

/**
 * Every store reads and writes through this, so cloud sync can hear each
 * write without any store knowing sync exists. Same API as AsyncStorage.
 */
export const AsyncStorage = {
  ...RawAsyncStorage,
  getItem: (key) => RawAsyncStorage.getItem(key),
  getAllKeys: () => RawAsyncStorage.getAllKeys(),
  removeItem: (key) => RawAsyncStorage.removeItem(key),
  async setItem(key, value) {
    await RawAsyncStorage.setItem(key, value);
    writeListeners.forEach((listener) => { try { listener(key, value); } catch (_) {} });
  },
};

/** `listener(key, value)` after every write; returns an unsubscribe function. */
export function onStorageWrite(listener) {
  writeListeners.add(listener);
  return () => writeListeners.delete(listener);
}

/** Writes that must not be heard by sync (applying data that came from the cloud). */
export const writeQuietly = (key, value) => RawAsyncStorage.setItem(key, value);

export const storageKey = (name) => `@moeai/${name}`;

export async function readStoredValue(key) {
  const current = await AsyncStorage.getItem(key);
  if (current != null) return current;

  const separator = key.indexOf('/');
  const suffix = separator >= 0 ? key.slice(separator) : key;
  const previousKey = (await AsyncStorage.getAllKeys()).find((candidate) => candidate !== key && candidate.startsWith('@') && candidate.endsWith(suffix));
  if (!previousKey) return null;

  const previousValue = await AsyncStorage.getItem(previousKey);
  if (previousValue != null) await AsyncStorage.setItem(key, previousValue);
  return previousValue;
}
