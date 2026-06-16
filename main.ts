import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

interface FixCalloutEditModeSettings {
	/**
	 * Toggle for enabling the callout click guard globally.
	 */
	enabled: boolean;
}

const DEFAULT_SETTINGS: FixCalloutEditModeSettings = {
	enabled: true,
};

const INTERACTIVE_ANCESTOR_SELECTORS = [
	"a[href]",
	"button",
	"input",
	"select",
	"textarea",
	"label",
	"summary",
	"[role='button']",
	"[role='checkbox']",
	"[contenteditable='true']",
	".task-list-item-checkbox",
	".checkbox-container",
];

// These are the most stable selectors currently seen for the callout edit control.
// Keep this list in one place to make future Obsidian DOM updates easy to handle.
const CALL_OUT_EDIT_BUTTON_SELECTORS = [
	".edit-block-button",
	"button[data-action='edit-block']",
	"button[data-action='open-source']",
	"[data-tooltip='Edit']",
	"[aria-label='Edit block']",
	"[aria-label='Edit']",
];

export default class FixCalloutEditModePlugin extends Plugin {
	settings: FixCalloutEditModeSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addSettingTab(new FixCalloutEditModeSettingTab(this.app, this));

		// Capture-phase listeners keep us before Obsidian's editor handlers.
		// - mousedown: catches early activation paths.
		// - click: catches cases where the edit action is triggered later.
		// - pointerdown: keeps behavior predictable across pointer/mouse input.
		// Both are scoped inside .markdown-source-view.mod-cm6 + .callout.
		this.registerDomEvent(document, "pointerdown", this.onPointerEventCapture, true);
		this.registerDomEvent(document, "mousedown", this.onPointerEventCapture, true);
		this.registerDomEvent(document, "click", this.onPointerEventCapture, true);
	}

	onunload(): void {
		// registerDomEvent cleanup is automatic, no manual unhooking needed.
	}

	private onPointerEventCapture = (event: PointerEvent | MouseEvent): void => {
		if (!this.settings.enabled) {
			return;
		}

		if (!(event.target instanceof HTMLElement)) {
			return;
		}

		// Preserve right-click context menus and non-mouse-button pointer interactions.
		if (("button" in event && event.button !== 0) || event.type === "contextmenu") {
			return;
		}

		// Only in Live Preview source view (CM6), never in Reading view.
		const sourceViewRoot = event.target.closest(".markdown-source-view.mod-cm6");
		if (!sourceViewRoot) {
			return;
		}

		if (!event.target.closest(".callout")) {
			return;
		}

		// Ignore normal interactive areas inside the callout.
		// This keeps links, form controls, checkboxes, buttons, and other controls working.
		if (this.isInsideInteractiveElement(event.target)) {
			return;
		}

		// Explicitly allow the callout edit button so users can still open source/edit mode
		// in the way Obsidian intends.
		if (this.isCalloutEditButton(event.target)) {
			return;
		}

		// This is a callout-body click in live preview: block only the edit-mode activation path.
		event.stopImmediatePropagation();
	};

	private isInsideInteractiveElement(target: HTMLElement): boolean {
		return INTERACTIVE_ANCESTOR_SELECTORS.some((selector) => target.closest(selector) !== null);
	}

	private isCalloutEditButton(target: HTMLElement): boolean {
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

	private async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

class FixCalloutEditModeSettingTab extends PluginSettingTab {
	plugin: FixCalloutEditModePlugin;

	constructor(app: App, plugin: FixCalloutEditModePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();

		new Setting(this.containerEl)
			.setName("Enable callout edit guard")
			.setDesc(
				"In Live Preview, clicking inside a rendered callout will no longer switch it into edit/source mode. Use the callout edit button to open editing."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enabled)
					.onChange(async (value) => {
						this.plugin.settings.enabled = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
