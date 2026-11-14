// A lightweight shared store for widgets selected (ticked) in the WidgetListPanel for AI interaction.
let tickedIds = new Set();
let cachedTickedIds = [];
const listeners = new Set();

const emit = () => {
  cachedTickedIds = Array.from(tickedIds);
  listeners.forEach((l) => l());
};

export const aiSelectionStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getTickedIds() {
    return cachedTickedIds;
  },
  isTicked(id) {
    return tickedIds.has(id);
  },
  toggle(id) {
    if (tickedIds.has(id)) {
      tickedIds.delete(id);
    } else {
      tickedIds.add(id);
    }
    emit();
  },
  setTicked(id, ticked) {
    if (ticked) {
      tickedIds.add(id);
    } else {
      tickedIds.delete(id);
    }
    emit();
  },
  selectAll(ids) {
    tickedIds = new Set(ids);
    emit();
  },
  clear() {
    tickedIds.clear();
    emit();
  },
};
