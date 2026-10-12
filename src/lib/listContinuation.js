const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])(\s+)(\[[ xX]?\]\s+)?(.*)$/;

/**
 * Enter-key handler for markdown textareas: continues bulleted and numbered
 * lists, and ends the list when Enter is pressed on an empty item.
 * `setValue(next)` must update the controlled value.
 */
export function continueListOnEnter(event, setValue) {
  if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.nativeEvent?.isComposing) return;

  const el = event.target;
  const { selectionStart, selectionEnd, value } = el;
  if (selectionStart !== selectionEnd) return;

  // Don't touch code inside fenced blocks
  const before = value.slice(0, selectionStart);
  if ((before.match(/^\s*```/gm) || []).length % 2 === 1) return;

  const lineStart = before.lastIndexOf("\n") + 1;
  const match = before.slice(lineStart).match(LIST_ITEM);
  if (!match) return;

  const [, indent, marker, space, checkbox, content] = match;
  event.preventDefault();

  let next;
  let caret;
  if (!content.trim()) {
    // Empty item: remove the marker to end the list
    next = value.slice(0, lineStart) + value.slice(selectionStart);
    caret = lineStart;
  } else {
    const numbered = marker.match(/^(\d+)([.)])$/);
    const nextMarker = numbered ? `${Number(numbered[1]) + 1}${numbered[2]}` : marker;
    const insert = `\n${indent}${nextMarker}${space}`;
    next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
    caret = selectionStart + insert.length;
  }

  setValue(next);
  requestAnimationFrame(() => el.setSelectionRange(caret, caret));
}
