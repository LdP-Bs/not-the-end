/**
 * Not the End — Actor Sheet (DocumentSheetV2, Foundry v13)
 */

const { DocumentSheetV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE = "not-the-end";

// Struttura alveare 3-4-5-4-3 = 19 esagoni
// Ogni riga: array di tipi ('a'=abilità, 'q'=qualità, 'arc'=archetipo)
const HIVE_ROWS = [
  ['a','q','a'],
  ['a','q','q','a'],
  ['a','q','arc','q','a'],
  ['a','q','q','a'],
  ['a','q','a'],
];

function defaultFlags() {
  return {
    concetto:        "",
    rischio:         "",
    appunti:         "",
    equip:           "",
    tokens:   { speranza: 0, dolore: 0, paura: 0 },
    sventure: Array.from({length: 4}, () => ({ testo: "", checked: false })),
    confusione: [false],
    adrenalina: [false],
    lezioni:    [{},{},{},{}],  // {id, nome, testo} oppure {} se vuoto
    hive_0_0_testo:   "",
    hive_0_0_checked: false,
    hive_0_1_testo:   "",
    hive_0_1_checked: false,
    hive_0_2_testo:   "",
    hive_0_2_checked: false,
    hive_1_0_testo:   "",
    hive_1_0_checked: false,
    hive_1_1_testo:   "",
    hive_1_1_checked: false,
    hive_1_2_testo:   "",
    hive_1_2_checked: false,
    hive_1_3_testo:   "",
    hive_1_3_checked: false,
    hive_2_0_testo:   "",
    hive_2_0_checked: false,
    hive_2_1_testo:   "",
    hive_2_1_checked: false,
    hive_2_2_testo:   "",
    hive_2_2_checked: false,
    hive_2_3_testo:   "",
    hive_2_3_checked: false,
    hive_2_4_testo:   "",
    hive_2_4_checked: false,
    hive_3_0_testo:   "",
    hive_3_0_checked: false,
    hive_3_1_testo:   "",
    hive_3_1_checked: false,
    hive_3_2_testo:   "",
    hive_3_2_checked: false,
    hive_3_3_testo:   "",
    hive_3_3_checked: false,
    hive_4_0_testo:   "",
    hive_4_0_checked: false,
    hive_4_1_testo:   "",
    hive_4_1_checked: false,
    hive_4_2_testo:   "",
    hive_4_2_checked: false,
  };
}

export class NTEActorSheet extends HandlebarsApplicationMixin(DocumentSheetV2) {

  static DEFAULT_OPTIONS = {
    classes:  ["nte-sheet-window"],
    position: { width: 780, height: 920 },
    window:   { resizable: true },
    actions:  {},
  };

  static PARTS = {
    sheet: { template: `modules/${MODULE}/templates/actor-sheet.hbs` }
  };

  get title() { return this.document?.name ?? "Not the End"; }

  _f() {
    return foundry.utils.mergeObject(
      defaultFlags(),
      this.document?.flags?.[MODULE] ?? {},
      { inplace: false }
    );
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const flags = this._f();
    return { ...ctx, actor: this.document, flags };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this._activateListeners();
  }

  _activateListeners() {
    // Nome actor
    this.element.querySelector(".nte-name")
      ?.addEventListener("change", async ev => {
        await this.document.update({ name: ev.currentTarget.value });
      });

    // Avatar — apre il file picker di Foundry
    this.element.querySelector(".nte-avatar")
      ?.addEventListener("click", async ev => {
        const fp = new FilePicker({
          type:     "image",
          current:  this.document.img,
          callback: async path => {
            await this.document.update({ img: path });
            ev.currentTarget.src = path;
          },
        });
        fp.browse();
      });

    // Tutti i campi text/textarea con data-flag (notazione puntata)
    this.element.querySelectorAll("input[data-flag]:not([type=checkbox]), textarea[data-flag]").forEach(el => {
      el.addEventListener("change", async ev => {
        await this._setFlag(ev.currentTarget.dataset.flag, ev.currentTarget.value);
      });
    });

    // Checkbox con data-flag (sventure, confusione, adrenalina) — niente re-render
    this.element.querySelectorAll("input[type=checkbox][data-flag]").forEach(el => {
      el.addEventListener("change", async ev => {
        await this._setFlag(ev.currentTarget.dataset.flag, ev.currentTarget.checked);
      });
    });

    // Esagoni testo (textarea multiriga)
    this.element.querySelectorAll(".nte-hex-text[data-ri][data-ci]").forEach(el => {
      // Auto-resize
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 72) + "px";
      el.addEventListener("input", ev => {
        ev.currentTarget.style.height = "auto";
        ev.currentTarget.style.height = Math.min(ev.currentTarget.scrollHeight, 72) + "px";
      });
      el.addEventListener("change", async ev => {
        const ri = ev.currentTarget.dataset.ri;
        const ci = ev.currentTarget.dataset.ci;
        await this.document.setFlag(MODULE, `hive_${ri}_${ci}_testo`, ev.currentTarget.value);
      });
    });

    // Esagoni dot (span visivo) — toggle checked sul click
    this.element.querySelectorAll(".nte-dot").forEach(dot => {
      dot.addEventListener("click", async ev => {
        const hex = ev.currentTarget.closest(".nte-hex");
        const hidden = hex.querySelector(".nte-hex-check-hidden");
        if (!hidden) return;
        const ri = hidden.dataset.ri;
        const ci = hidden.dataset.ci;
        const newVal = !hidden.checked;
        hidden.checked = newVal;
        ev.currentTarget.classList.toggle("nte-dot-checked", newVal);
        await this.document.setFlag(MODULE, `hive_${ri}_${ci}_checked`, newVal);
      });
    });

    // Lezioni — drop di item tipo lezione sugli slot
    this.element.querySelectorAll(".nte-lezione-slot").forEach(slot => {
      slot.addEventListener("dragover", ev => {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "copy";
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
      slot.addEventListener("drop", async ev => {
        ev.preventDefault();
        slot.classList.remove("drag-over");
        let data;
        try { data = JSON.parse(ev.dataTransfer.getData("text/plain")); } catch { return; }
        if (data.type !== "Item") return;
        const item = await fromUuid(data.uuid);
        const isLezione = item?.flags?.["not-the-end"]?.isLezione === true;
        if (!item || !isLezione) {
          ui.notifications.warn("Puoi trascinare solo lezioni in questo slot.");
          return;
        }
        const idx   = Number(slot.dataset.slot);
        const lezioni = foundry.utils.deepClone(this._f().lezioni ?? [{},{},{},{}]);
        lezioni[idx] = {
          id:    item.id,
          nome:  item.name,
          testo: item.flags?.["not-the-end"]?.testo ?? "",
        };
        await this.document.setFlag(MODULE, "lezioni", lezioni);
        this.render();
      });
    });

    // Rimuovi lezione dallo slot
    this.element.querySelectorAll(".nte-lz-remove").forEach(btn => {
      btn.addEventListener("click", async ev => {
        const idx = Number(ev.currentTarget.dataset.slot);
        const lezioni = foundry.utils.deepClone(this._f().lezioni ?? [{},{},{},{}]);
        lezioni[idx] = {};
        await this.document.setFlag(MODULE, "lezioni", lezioni);
        this.render();
      });
    });

    // Aggiungi slot lezione
    this.element.querySelector("[data-action='addLezioneSlot']")?.addEventListener("click", async () => {
      const lezioni = foundry.utils.deepClone(this._f().lezioni ?? []);
      lezioni.push({});
      await this.document.setFlag(MODULE, "lezioni", lezioni);
      this.render();
    });
  }

  async _setFlag(key, value) {
    const parts = key.split(".");
    if (parts.length === 1) {
      await this.document.setFlag(MODULE, key, value);
    } else if (parts.length === 2) {
      const arr = foundry.utils.deepClone(this._f()[parts[0]] ?? []);
      arr[Number(parts[1])] = value;
      await this.document.setFlag(MODULE, parts[0], arr);
    } else if (parts.length === 3) {
      const arr = foundry.utils.deepClone(this._f()[parts[0]] ?? []);
      const idx = Number(parts[1]);
      if (!arr[idx]) arr[idx] = {};
      arr[idx][parts[2]] = value;
      await this.document.setFlag(MODULE, parts[0], arr);
    }
  }
}

// ====================================================================
// TOKEN BAG
// ====================================================================

const { ApplicationV2 } = foundry.applications.api;

export class NTETokenBagApp extends ApplicationV2 {
  constructor(actor, options = {}) { super(options); this._actor = actor; }

  static DEFAULT_OPTIONS = {
    classes:  ["nte-token-bag-window"],
    window:   { title: "Sacchetto Token", resizable: false },
    position: { width: 360, height: "auto" },
  };

  _tokens() {
    const t = this._actor.flags?.[MODULE]?.tokens ?? {};
    return { speranza: t.speranza ?? 0, dolore: t.dolore ?? 0, paura: t.paura ?? 0 };
  }

  async _renderHTML(context, options) {
    const tk = this._tokens();
    const total = tk.speranza + tk.dolore + tk.paura;
    return `<div class="nte-tokenbag">
      <div class="nte-tb-counts">
        ${["speranza","dolore","paura"].map(tipo => `
        <div class="nte-tb-count ${tipo}">
          <span class="nte-tb-label">✦ ${this._label(tipo)}</span>
          <div class="nte-tb-controls">
            <button type="button" class="nte-tb-btn" data-action="remove" data-type="${tipo}">−</button>
            <span class="nte-tb-num">${tk[tipo]}</span>
            <button type="button" class="nte-tb-btn" data-action="add" data-type="${tipo}">+</button>
          </div>
        </div>`).join("")}
      </div>
      <div class="nte-tb-total">Totale: <strong>${total}</strong></div>
      <div class="nte-tb-draw-area">
        <button type="button" class="nte-tb-draw-btn" ${total===0?"disabled":""} data-action="draw">🎲 Estrai Token</button>
        <div class="nte-tb-result" id="nte-tb-result"></div>
      </div>
    </div>`;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll(".nte-tb-btn").forEach(b => b.addEventListener("click", this._onAdjust.bind(this)));
    this.element.querySelector("[data-action='draw']")?.addEventListener("click", this._onDraw.bind(this));
  }

  async _onDraw() {
    const tk = this._tokens();
    const bag = this._buildBag(tk);
    if (!bag.length) return;
    const drawn = bag[0];
    await this._actor.setFlag(MODULE, "tokens", { ...tk, [drawn]: Math.max(0, tk[drawn]-1) });
    const el = this.element.querySelector("#nte-tb-result");
    if (el) { el.textContent = `Estratto: ${this._label(drawn)}`; el.className = `nte-tb-result ${drawn}`; }
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this._actor }),
      content: `<div class="nte-chat-draw"><b>${this._actor.name}</b> estrae:<br><span class="nte-chat-token ${drawn}">✦ ${this._label(drawn)}</span></div>`,
    });
    this.render();
  }

  async _onAdjust(ev) {
    const tipo = ev.currentTarget.dataset.type, action = ev.currentTarget.dataset.action;
    const tk = this._tokens();
    await this._actor.setFlag(MODULE, "tokens", { ...tk, [tipo]: action==="add" ? tk[tipo]+1 : Math.max(0,tk[tipo]-1) });
    this.render();
  }

  _buildBag(tk) {
    const bag = [...Array(tk.speranza).fill("speranza"), ...Array(tk.dolore).fill("dolore"), ...Array(tk.paura).fill("paura")];
    for (let i=bag.length-1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [bag[i],bag[j]]=[bag[j],bag[i]]; }
    return bag;
  }
  _label(t) { return {speranza:"Speranza",dolore:"Dolore",paura:"Paura"}[t]??t; }
}
