// Content skins (`cskin`). The look itself is CSS keyed on <html data-skin>
// (src/styles/skins.css + Tailwind's `dark:` variant); the pre-paint script in
// src/build/templates.js applies the saved one before the page is drawn.
const KEY = 'wtss-skin';
export const SKINS = ['dark', 'sunny'];

export const currentSkin = () => document.documentElement.dataset.skin;

export function wearSkin(name) {
  if (!SKINS.includes(name)) throw new Error(`Skin not found: ${name}`);
  document.documentElement.dataset.skin = name;
  try {
    localStorage.setItem(KEY, name);
  } catch {}
  labelSkinToggles();
}

export function cycleSkin() {
  wearSkin(SKINS[(SKINS.indexOf(currentSkin()) + 1) % SKINS.length]);
}

export function labelSkinToggles() {
  for (const b of document.querySelectorAll('.skin-toggle')) {
    b.setAttribute('aria-label', `Switch skin (current: ${currentSkin()})`);
  }
}
