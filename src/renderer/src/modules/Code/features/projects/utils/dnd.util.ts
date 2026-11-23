import type { DragEvent as ReactDragEvent } from 'react';

export const clearDragMarks = () =>
  document.querySelectorAll('.pp-dragover').forEach((el) => {
    el.classList.remove('pp-dragover');
    delete (el as HTMLElement).dataset.dropPos;
  });

export function attachProjectDragImage(el: HTMLElement, e: ReactDragEvent) {
  const row = el.querySelector('[data-drag-row]') as HTMLElement | null;
  if (!row) return;
  const ghost = row.cloneNode(true) as HTMLElement;
  ghost.querySelectorAll('[data-drag-hide]').forEach((n) => n.remove());
  ghost.className =
    'flex items-center gap-2 px-3 py-2 rounded-none bg-card-background border-y border-border text-text-primary';
  Object.assign(ghost.style, {
    position: 'fixed',
    top: '-1000px',
    left: '-1000px',
    width: `${el.offsetWidth}px`,
    borderRadius: '0',
    boxSizing: 'border-box',
  });
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 16, 16);
  setTimeout(() => ghost.remove(), 0);
}

export function attachGroupDragGhost(el: HTMLElement, e: ReactDragEvent) {
  const ghost = document.createElement('div');
  ghost.textContent = el.querySelector('span')?.textContent ?? '';
  ghost.className =
    'px-3 py-[7px] bg-card-background text-text-primary font-mono text-[14px] font-semibold truncate';
  // Native drag image bị OS vẽ viền trắng → ẩn nó và tự vẽ ghost bám theo con trỏ
  const blank = document.createElement('canvas');
  blank.width = 1;
  blank.height = 1;
  e.dataTransfer.setDragImage(blank, 0, 0);
  Object.assign(ghost.style, {
    position: 'fixed',
    zIndex: '9999',
    pointerEvents: 'none',
    opacity: '0.9',
    width: `${el.offsetWidth}px`,
    boxSizing: 'border-box',
    left: `${e.clientX + 12}px`,
    top: `${e.clientY + 8}px`,
  });
  document.body.appendChild(ghost);
  const move = (ev: DragEvent) => {
    ghost.style.left = `${ev.clientX + 12}px`;
    ghost.style.top = `${ev.clientY + 8}px`;
  };
  const cleanup = () => {
    ghost.remove();
    document.removeEventListener('dragover', move);
    document.removeEventListener('dragend', cleanup);
    document.removeEventListener('drop', cleanup);
  };
  document.addEventListener('dragover', move);
  document.addEventListener('dragend', cleanup);
  document.addEventListener('drop', cleanup);
}