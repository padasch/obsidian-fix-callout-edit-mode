# Fix Callout Edit Mode

Obsidian community plugin that prevents accidental callout edit activation in Live Preview (CM6).

## Goal

When a note is in **Live Preview**, clicking in a rendered callout currently opens the callout/block in source/edit mode.
This plugin keeps that behavior restricted to the callout edit control, while still allowing normal click behavior for
links, checkboxes, inputs, and fold buttons.

## Files

- `manifest.json`
- `main.ts`
- `package.json`
- `tsconfig.json`
- `esbuild.config.mjs`
- `README.md`

## Installation / build

1. Copy this folder into your vault plugin directory:
   - `.obsidian/plugins/obsidian-fix-callout-edit-mode/`
2. In the plugin folder, run:
   - `npm install`
   - `npm run build`
3. In Obsidian, open **Settings → Community plugins** and enable **Fix Callout Edit Mode**.

## Behavior

- Only applies in Live Preview / CM6 source view (`.markdown-source-view.mod-cm6`).
- Only applies when the event target is inside `.callout`.
- Preserves interactions with links, form controls, buttons, checkboxes, and other interactive elements.
- Keeps the callout edit button working.
- Does not touch reading view or regular markdown outside callouts.

## Settings

- **Enable callout edit guard** (on by default)
  - Turn this off to restore Obsidian's default callout body click behavior.

## Selector notes (DOM robustness)

The edit-button selectors are grouped in one constant at the top of `main.ts`:
- `CALL_OUT_EDIT_BUTTON_SELECTORS`

If Obsidian changes the edit button markup, you can edit this list and rebuild.

## Testing notes

1. Open a note in **Live Preview**.
2. Create a callout in the note.
3. Click the callout body (not the edit button).
4. Confirm it does **not** enter callout/edit mode.
5. Click the callout edit button.
6. Confirm editing still works normally.
7. Verify that links, callout folding, checkboxes/buttons/inputs, and context menus still work inside the callout.
