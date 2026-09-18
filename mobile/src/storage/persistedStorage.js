/** Shared MoeAI storage namespace with one-time migration from earlier builds. */
import AsyncStorage from '@react-native-async-storage/async-storage';

export { AsyncStorage };

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

