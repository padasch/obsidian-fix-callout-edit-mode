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
	".task-list-item-checkbox",
	".checkbox-container",
];

// Obsidian renders callout title areas with these hooks. Treating the whole header
// as interactive preserves folding/unfolding when clicking anywhere on the title row.
const CALL_OUT_HEADER_SELECTORS = [
	".callout-title",
	".callout-title-inner",
	".callout-icon",
	"[data-callout-icon]",
	"[data-icon='caret-right']",
	"[data-icon='chevron-right']",
];

// Tasks plugin action controls in Live Preview are rendered as icon-only controls.
// They may not always be <button> elements, so this list keeps those controls interactive.
const TASKS_EMOJI_ACTION_SELECTORS = [
	".task-list-item",
	".task-list-item-checkbox",
	"[data-task-id]",
	"[data-task-action]",
	"[data-action^='task']",
	"[data-action^='tasks']",
	".tasks-edit",
	".tasks-postpone",
	".task-due",
	".task-scheduled",
	".task-start",
	".task-created",
	".task-done",
	".task-cancelled",
	".task-priority",
	".task-recurring",
	".task-id",
	".task-block",
	"[class*='tasks-']",
	"[class*='task-']",
	"[role='button'][aria-label*='due']",
	"[role='button'][aria-label*='schedule']",
	"[role='button'][title*='due']",
	"[role='button'][title*='schedule']",
	"button[data-action][aria-label*='task']",
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

		// Allow normal callout header interactions (fold/unfold), including clicks on
		// any part of the title row, not just the tiny arrow target.
		if (this.isCalloutHeaderLine(event.target)) {
			return;
		}

		// Ignore normal interactive areas inside the callout.
		// This keeps links, form controls, checkboxes, buttons, and other controls working.
		if (this.isInsideInteractiveElement(event.target)) {
			return;
		}

		if (this.isTasksEmojiAction(event.target)) {
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

	private isCalloutHeaderLine(target: HTMLElement): boolean {
		return CALL_OUT_HEADER_SELECTORS.some((selector) => target.closest(selector) !== null);
	}

	private isTasksEmojiAction(target: HTMLElement): boolean {
		// Tasks plugin action controls in Live Preview are often emoji-based and may be
		// non-standard elements (especially on mobile), so identify their nearest task
		// context and let those events through.
		const taskActionContext = target.closest(
			".tasks-edit, .tasks-postpone, .task-list-item, .task-list-item-checkbox, [data-task-id], [data-task-action], [data-action^='task'], [data-action^='tasks']"
		);
		if (taskActionContext) {
			return true;
		}

		if (TASKS_EMOJI_ACTION_SELECTORS.some((selector) => target.closest(selector) !== null)) {
			return true;
		}

		const actionLike = target.closest("button, [role='button'], [tabindex], a");
		if (!actionLike) {
			return false;
		}

		const actionContainer = actionLike.closest("[data-task-id], [data-task-action], [data-action^='task'], [data-action^='tasks'], [class*='tasks-'], [class*='task-']");
		if (!actionContainer) {
			return false;
		}

		const hint = `${actionLike.getAttribute("aria-label") ?? ""} ${actionLike.getAttribute("title") ?? ""} ${actionLike.textContent ?? ""}`.toLowerCase();
		return /task|calendar|due|schedule|recurr|memo|repeat|postpone|start date|due date|done|priority|cancel/.test(hint);
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
