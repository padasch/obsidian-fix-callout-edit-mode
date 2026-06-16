"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FixCalloutEditModePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  enabled: true
};
var INTERACTIVE_ANCESTOR_SELECTORS = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "[role='button']",
  "[role='checkbox']",
  ".task-list-item-checkbox",
  ".checkbox-container"
];
var CALL_OUT_EDIT_BUTTON_SELECTORS = [
  ".edit-block-button",
  "button[data-action='edit-block']",
  "button[data-action='open-source']",
  "[data-tooltip='Edit']",
  "[aria-label='Edit block']",
  "[aria-label='Edit']"
];
var FixCalloutEditModePlugin = class extends import_obsidian.Plugin {
  settings = DEFAULT_SETTINGS;
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new FixCalloutEditModeSettingTab(this.app, this));
    this.registerDomEvent(document, "pointerdown", this.onPointerEventCapture, true);
    this.registerDomEvent(document, "mousedown", this.onPointerEventCapture, true);
    this.registerDomEvent(document, "click", this.onPointerEventCapture, true);
  }
  onunload() {
  }
  onPointerEventCapture = (event) => {
    if (!this.settings.enabled) {
      return;
    }
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    if ("button" in event && event.button !== 0 || event.type === "contextmenu") {
      return;
    }
    const sourceViewRoot = event.target.closest(".markdown-source-view.mod-cm6");
    if (!sourceViewRoot) {
      return;
    }
    if (!event.target.closest(".callout")) {
      return;
    }
    if (this.isInsideInteractiveElement(event.target)) {
      return;
    }
    if (this.isCalloutEditButton(event.target)) {
      return;
    }
    event.stopImmediatePropagation();
  };
  isInsideInteractiveElement(target) {
    return INTERACTIVE_ANCESTOR_SELECTORS.some((selector) => target.closest(selector) !== null);
  }
  isCalloutEditButton(target) {
    if (CALL_OUT_EDIT_BUTTON_SELECTORS.some((selector) => target.closest(selector) !== null)) {
      return true;
    }
    const buttonLike = target.closest("button, [role='button']");
    if (!buttonLike) {
      return false;
    }
    const ariaLabel = buttonLike.getAttribute("aria-label")?.toLowerCase() ?? "";
    if (ariaLabel.includes("edit")) {
      return true;
    }
    return false;
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var FixCalloutEditModeSettingTab = class extends import_obsidian.PluginSettingTab {
  plugin;
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    new import_obsidian.Setting(this.containerEl).setName("Enable callout edit guard").setDesc(
      "In Live Preview, clicking inside a rendered callout will no longer switch it into edit/source mode. Use the callout edit button to open editing."
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
        this.plugin.settings.enabled = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
//# sourceMappingURL=main.js.map
