// Some browsers include trailing spaces when selecting a word on double-click.
export function trimDoubleClickSelection(event) {
  const textarea = event.currentTarget;
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const match = selected.match(/^\S+([ \t]+)$/);
  if (match) textarea.setSelectionRange(selectionStart, selectionEnd - match[1].length);
}
