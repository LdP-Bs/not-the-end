/**
 * Not the End — Personalizzazione colori
 * Salva i colori nelle game settings e li inietta come CSS vars
 */

const MODULE = "not-the-end";

export const COLOR_SETTINGS = [
  { key: "colorHexA",       name: "Sfondo Abilità",        default: "#ffffff" },
  { key: "colorHexQ",       name: "Sfondo Qualità",        default: "#d4ebd4" },
  { key: "colorHexArc",     name: "Sfondo Archetipo",      default: "#ebd4d4" },
  { key: "colorStrokeA",    name: "Bordo Abilità",         default: "#888888" },
  { key: "colorStrokeQ",    name: "Bordo Qualità",         default: "#559955" },
  { key: "colorStrokeArc",  name: "Bordo Archetipo",       default: "#aa5555" },
  { key: "colorBg",         name: "Sfondo scheda",         default: "#f4f0eb" },
  { key: "colorBgLight",    name: "Sfondo header/footer",  default: "#e8e2d9" },
  { key: "colorGold",       name: "Colore accento (oro)",  default: "#8a6a00" },
  { key: "colorText",       name: "Testo principale",      default: "#1a1a1a" },
];

// Mappa setting key → variabile CSS
const CSS_VAR_MAP = {
  colorHexA:      "--nte-hex-a",
  colorHexQ:      "--nte-hex-q",
  colorHexArc:    "--nte-hex-arc",
  colorStrokeA:   "--nte-hex-stroke",
  colorStrokeQ:   "--nte-hex-q-stroke",
  colorStrokeArc: "--nte-hex-arc-stroke",
  colorBg:        "--nte-bg",
  colorBgLight:   "--nte-bg-light",
  colorGold:      "--nte-gold",
  colorText:      "--nte-text",
};

export function registerColorSettings() {
  for (const s of COLOR_SETTINGS) {
    game.settings.register(MODULE, s.key, {
      name:    s.name,
      scope:   "world",
      config:  false,   // gestiamo noi la UI
      type:    String,
      default: s.default,
      onChange: () => applyColors(),
    });
  }
}

export function applyColors() {
  const root = document.documentElement;
  for (const s of COLOR_SETTINGS) {
    const val = game.settings.get(MODULE, s.key);
    const cssVar = CSS_VAR_MAP[s.key];
    if (cssVar) root.style.setProperty(cssVar, val);
  }
}

// ====================================================================
// Dialog personalizzazione colori — usa FormApplication (AppV1) per
// compatibilità con registerMenu in Foundry v13
// ====================================================================

export class NTEColorDialog extends foundry.appv1.api.FormApplication {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id:       "nte-color-dialog",
      classes:  ["nte-color-dialog"],
      title:    "Not the End — Colori scheda",
      template: null,
      width:    400,
      height:   "auto",
      resizable: false,
    });
  }

  async getData() {
    return { settings: COLOR_SETTINGS.map(s => ({
      ...s,
      value: game.settings.get(MODULE, s.key),
    }))};
  }

  async _renderInner(data) {
    const rows = data.settings.map(s => `
      <div class="nte-color-row">
        <label>${s.name}</label>
        <div class="nte-color-inputs">
          <input type="color" data-key="${s.key}" value="${s.value}" />
          <input type="text"  data-key="${s.key}" data-text value="${s.value}" maxlength="7" />
        </div>
      </div>`).join("");

    const html = `<form>
      <div class="nte-color-settings">
        <div class="nte-color-list">${rows}</div>
        <div class="nte-color-footer">
          <button type="button" id="nte-color-reset">Ripristina default</button>
          <button type="button" id="nte-color-save" class="nte-btn-primary">Salva</button>
        </div>
      </div>
    </form>`;

    const el = document.createElement("div");
    el.innerHTML = html;
    return $(el);
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html[0] ?? html;

    // Sync picker ↔ text + preview live
    root.querySelectorAll("input[type=color]").forEach(picker => {
      const key  = picker.dataset.key;
      const text = root.querySelector(`input[data-key="${key}"][data-text]`);
      picker.addEventListener("input", () => {
        if (text) text.value = picker.value;
        const cssVar = CSS_VAR_MAP[key];
        if (cssVar) document.documentElement.style.setProperty(cssVar, picker.value);
      });
      if (text) text.addEventListener("input", () => {
        if (/^#[0-9a-fA-F]{6}$/.test(text.value)) {
          picker.value = text.value;
          const cssVar = CSS_VAR_MAP[key];
          if (cssVar) document.documentElement.style.setProperty(cssVar, text.value);
        }
      });
    });

    // Salva
    root.querySelector("#nte-color-save")?.addEventListener("click", async () => {
      for (const s of COLOR_SETTINGS) {
        const picker = root.querySelector(`input[type=color][data-key="${s.key}"]`);
        if (picker) await game.settings.set(MODULE, s.key, picker.value);
      }
      ui.notifications.info("Not the End | Colori salvati.");
      this.close();
    });

    // Reset
    root.querySelector("#nte-color-reset")?.addEventListener("click", async () => {
      for (const s of COLOR_SETTINGS) {
        await game.settings.set(MODULE, s.key, s.default);
        const picker = root.querySelector(`input[type=color][data-key="${s.key}"]`);
        const text   = root.querySelector(`input[data-key="${s.key}"][data-text]`);
        if (picker) picker.value = s.default;
        if (text)   text.value   = s.default;
        const cssVar = CSS_VAR_MAP[s.key];
        if (cssVar) document.documentElement.style.setProperty(cssVar, s.default);
      }
      ui.notifications.info("Not the End | Colori ripristinati.");
    });
  }

  async _updateObject() {}
}
