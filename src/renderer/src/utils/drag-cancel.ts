export const DRAG_CANCEL_EVENT = 'phantoma-drag-cancel';

let installed = false;
let dragging = false;
let cancelled = false;

const cancel = () => {
  if (!dragging || cancelled) return;
  cancelled = true;
  document.dispatchEvent(new CustomEvent(DRAG_CANCEL_EVENT));
};

const blockDrop = (e: DragEvent) => {
  if ((e.buttons & 2) !== 0) cancel();
  if (!cancelled) return;
  e.stopPropagation();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
};

export const installRightClickDragCancel = (): void => {
  if (installed) return;
  installed = true;
  document.addEventListener(
    'dragstart',
    () => {
      dragging = true;
      cancelled = false;
    },
    true,
  );
  document.addEventListener(
    'dragend',
    () => {
      dragging = false;
      cancelled = false;
    },
    true,
  );
  document.addEventListener('dragenter', blockDrop, true);
  document.addEventListener('dragover', blockDrop, true);
  document.addEventListener('pointerdown', (e) => e.button === 2 && cancel(), true);
  document.addEventListener('contextmenu', cancel, true);
};