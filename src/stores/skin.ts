import { writable } from 'svelte/store';
import type { Skin } from '../skins/types';
import { dark } from '../skins/dark';
import { sunny } from '../skins/sunny';

// Register available skins here.
const SKINS: Record<string, Skin> = {
  [dark.name]: dark,
  [sunny.name]: sunny
};

// Persist choice in localStorage so the user keeps their preference across refreshes.
const loadInitial = () => {
  if (typeof localStorage === 'undefined') return dark;
  const saved = localStorage.getItem('wtss-skin');
  return (saved && SKINS[saved]) ? SKINS[saved] : dark;
};

function applySkin(skin: Skin) {
  if (typeof document === 'undefined') return;
  const rootCls = `h-full bg-bg text-text ${skin.classes.body}`;
  document.documentElement.className = rootCls;
  document.body.className = rootCls;
  const rs = document.documentElement.style;
  Object.entries(skin.cssVars).forEach(([k,v]) => rs.setProperty(`--${k}`, v));
  if (skin.inlineStyles?.body) {
    Object.assign(document.body.style, skin.inlineStyles.body);
  }
}

export const currentSkin = writable<Skin>(loadInitial(), (set) => {
  const initial = loadInitial();
  applySkin(initial);
  set(initial);
  return () => {};
});

export function listSkins(): string[] {
  return Object.keys(SKINS);
}

export function wearSkin(name: string) {
  const skin = SKINS[name];
  if (!skin) throw new Error(`Skin not found: ${name}`);
  applySkin(skin);
  currentSkin.set(skin);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('wtss-skin', name);
  }
}
