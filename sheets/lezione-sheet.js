/**
 * Not the End — Lezione Item Sheet
 * Usa item type "item" di SWB + flags["not-the-end"].isLezione
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE = "not-the-end";

export class NTELezioneSheet extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(item, options = {}) {
    super(options);
    this._item = item;
  }

  static DEFAULT_OPTIONS = {
    classes:  ["nte-lezione-sheet"],
    position: { width: 420, height: 320 },
    window:   { resizable: true },
  };

  static PARTS = {
    sheet: { template: `modules/${MODULE}/templates/lezione-sheet.hbs` }
  };

  get title() { return this._item?.name ?? "Lezione"; }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    return {
      ...ctx,
      item:  this._item,
      testo: this._item?.flags?.[MODULE]?.testo ?? "",
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    this.element.querySelector(".nte-lz-name")
      ?.addEventListener("change", async ev => {
        await this._item.update({ name: ev.currentTarget.value });
      });

    this.element.querySelector("[data-field='testo']")
      ?.addEventListener("change", async ev => {
        await this._item.setFlag(MODULE, "testo", ev.currentTarget.value);
      });
  }
}
