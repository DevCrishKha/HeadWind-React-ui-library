# @devcrish/headwind: Documentation Index

This folder documents the whole library as it exists today (version 0.1.0). It is written so that a developer or an AI agent who has never seen the project can understand it, extend it, and avoid breaking it.

> **AI agents: read `DEVELOPMENT_RULES.md` FIRST.** It contains the rules about what you may and may not change. The existing behaviour of the library is frozen. You build on top of it.

## Reading order

| # | File | Answers |
|---|------|---------|
| 0 | [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) | What may be edited, what is frozen, how to add features safely. **Mandatory for agents.** |
| 1 | [01-capabilities.md](./01-capabilities.md) | What can a developer do with this library? Full feature and API reference. |
| 2 | [02-requirements-and-architecture.md](./02-requirements-and-architecture.md) | What were the original requirements, what is built vs. not built, and how the whole thing fits together. |
| 3 | [03-adding-a-builtin-widget.md](./03-adding-a-builtin-widget.md) | Step-by-step: add a new widget to the library itself (`UI.Heading`, etc.). |
| 4 | [04-custom-widgets-with-createWidget.md](./04-custom-widgets-with-createWidget.md) | How an application developer turns their own React component into a layout-aware widget. |
| 5 | [05-code-map-and-defaults.md](./05-code-map-and-defaults.md) | File-by-file, function-by-function map. Where every default and non-default behaviour comes from. |
| 6 | [06-how-features-work.md](./06-how-features-work.md) | Internal mechanics of each feature (auto placement, drag, resize, deploy, export, hooks, ...). |
| 7 | [07-pitfalls-and-gotchas.md](./07-pitfalls-and-gotchas.md) | What breaks if used wrong, verified edge cases, and known limitations. |
| 8 | [08-jsx-to-socket-payload-guide.md](./08-jsx-to-socket-payload-guide.md) | Guide for converting JSX definitions to real-time Socket.IO and MQTT payloads and handling property updates. |


The project's requirements and the architecture so far is summarised in file 02.

## The library in one paragraph

You write ordinary React with `<UI.Canvas>` and widgets such as `<UI.Text />` and `<UI.Button />`. Each widget gets a sensible default size and an automatically chosen position. In the browser you drag and resize widgets, read their exact pixel geometry (overlay, hooks, JSON/JSX export), paste the numbers back into your JSX as `position` and `size`, and finally add `deploy` to a widget (or `<UI.Canvas deploy>` for the page) to remove all editing tools while keeping the layout and the widget's normal behaviour.

## Conventions used in these docs

- **Layout props**: the shared props every widget accepts: `id`, `position`, `size`, `isDraggable`, `isResizable`, `deploy`, `hidden`, `solid`, `onPositionChange`, `onSizeChange`, `onLayoutChange`.
- **Content props**: widget-specific props such as `text`, `color`, `variant`. They never affect layout.
- **Store**: the layout store created by `createLayoutStore()` in `src/store.js`. One store per `UIProvider`.
- **Edit mode**: the page is not deployed and the widget is not deployed. Tools (overlay, handles, drag) are available.
- **Deployed**: editing tools are removed. The widget keeps its geometry, content and behaviour.
- Line references like `createWidget.jsx` describe the file as of version 0.1.0. Search by function or variable name if line numbers drift.

## Commands

```bash
npm install
npm run dev          # example app (Vite, root = example/)
npm test             # vitest, 68 tests (35 original + 33 for hidden/solid), jsdom
npm run build:lib    # library build into dist/ (ES + CJS, React is external)
npm run build:example
```

Note: `npm test` and `npm run dev` import the library from `src/` through an alias (`@devcrish/headwind` -> `src/index.js`). They do **not** exercise the built `dist/`. If you change packaging, also run `npm run build:lib` yourself.
