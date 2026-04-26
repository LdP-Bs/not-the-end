/**
 * Not the End — Modulo Foundry VTT v13
 */

import { NTEActorSheet } from "./sheets/actor-sheet.js";
import { NTELezioneSheet } from "./sheets/lezione-sheet.js";
import { registerColorSettings, applyColors, NTEColorDialog } from "./color-settings.js";

const MODULE = "not-the-end";

Hooks.once("init", () => {
  console.log("Not the End | Inizializzazione modulo");

  // Helper Handlebars registrati una volta sola
  Handlebars.registerHelper("nte_eq",          (a, b) => a === b);
  Handlebars.registerHelper("nte_add",         (a, b) => a + b);
  Handlebars.registerHelper("nte_type",        type => ({ a: "ABILITÀ", q: "QUALITÀ", arc: "ARCHETIPO" }[type] ?? type.toUpperCase()));
  Handlebars.registerHelper("nte_placeholder", type => ({ a: "Abilità", q: "Qualità", arc: "Archetipo" }[type] ?? type));

  // Registra le game settings per i colori
  registerColorSettings();

  // Le lezioni usano il tipo 'item' di SWB con flag not-the-end.isLezione = true

  // Registra la sheet actor
  foundry.documents.collections.Actors.registerSheet(
    MODULE,
    NTEActorSheet,
    {
      types:       ["character"],
      makeDefault: true,
      label:       "Not the End — Scheda Personaggio",
    }
  );
});

// Aggiunge pulsante "Crea Lezione" nella sidebar Items
Hooks.on("renderItemDirectory", (app, html) => {
  const root = html instanceof HTMLElement ? html : html[0];
  if (!root) return;
  if (root.querySelector(".nte-create-lezione")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nte-create-lezione";
  btn.innerHTML = `<i class="fas fa-scroll"></i> Crea Lezione`;
  btn.style.cssText = "width:100%;margin-bottom:4px;background:#8a6a00;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;";

  btn.addEventListener("click", async () => {
    const item = await Item.create({
      name:  "Nuova Lezione",
      type:  "item",
      img:   `modules/${MODULE}/assets/lezione-default.png`,
      flags: { "not-the-end": { isLezione: true, testo: "" } },
    });
    if (item) new NTELezioneSheet(item).render(true);
  });

  // Inserisce prima del footer o in cima alla lista
  const footer = root.querySelector(".directory-footer") ?? root.querySelector(".directory-list");
  if (footer) footer.parentElement.insertBefore(btn, footer);
  else root.prepend(btn);
});

// Intercetta doppio click sulla sidebar — apre sheet NTE per le lezioni
// Usa capture=true e delega sull'intera lista per non toccare il drag
Hooks.on("renderItemDirectory", (app, html) => {
  const root = html instanceof HTMLElement ? html : html[0];
  if (!root) return;
  const list = root.querySelector(".directory-list") ?? root;
  // Rimuovi listener precedente se esiste
  if (list._nteListener) list.removeEventListener("dblclick", list._nteListener, true);
  list._nteListener = async (ev) => {
    const entry = ev.target.closest("[data-document-id], [data-entry-id]");
    if (!entry) return;
    const itemId = entry.dataset.documentId ?? entry.dataset.entryId;
    if (!itemId) return;
    const item = game.items.get(itemId);
    if (!item?.flags?.["not-the-end"]?.isLezione) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    new NTELezioneSheet(item).render(true);
  };
  list.addEventListener("dblclick", list._nteListener, true);
});

Hooks.once("ready", async () => {
  console.log("Not the End | Modulo pronto.");

  // Applica i colori salvati
  applyColors();

  // Reset sheetClass per actor esistenti con SWB
  for (const actor of game.actors.contents) {
    const current = actor.getFlag("core", "sheetClass");
    if (!current || current === `${MODULE}.NTEActorSheet`) continue;
    await actor.unsetFlag("core", "sheetClass");
  }

  // Aggiunge voce "Colori NTE" nel menu impostazioni
  game.settings.registerMenu(MODULE, "colorMenu", {
    name:  "Personalizza colori",
    label: "Apri editor colori",
    hint:  "Cambia i colori della scheda Not the End",
    icon:  "fas fa-palette",
    type:  NTEColorDialog,
    restricted: false,
  });
});

globalThis.NTEActorSheet    = NTEActorSheet;
globalThis.NTEColorDialog   = NTEColorDialog;
