# Dropdown Component - Best Practices & Common Pitfalls

## Overview

This document outlines best practices and common issues when using the Dropdown component to help developers avoid positioning and rendering problems.

---

## Key Concepts

### 1. **Strategy Modes**

The Dropdown component supports two positioning strategies:

- **`fixed`** (default): Uses `position: fixed` with viewport coordinates. Content is rendered via React Portal to `document.body`.
- **`relative`**: Uses `position: absolute` relative to the trigger element. Content stays in the DOM hierarchy.

**Rule of Thumb**: Use `fixed` strategy for dropdowns that need to escape overflow containers (scrollable areas, modals, sidebars).

---

## Common Issues & Solutions

### Issue 1: Dropdown Appears Far Away From Trigger

**Symptoms:**

- Right-click menu appears at screen edge instead of near the clicked element
- Dropdown position doesn't match trigger location

**Root Causes:**

1. **Manual position override conflicts with automatic calculation**

   ```tsx
   // ❌ BAD: Passing mouse coordinates while Dropdown calculates from trigger rect
   <Dropdown position={{ top: e.clientY, left: e.clientX }}>
   ```

2. **Missing `asChild` prop on DropdownTrigger**

   ```tsx
   // ❌ BAD: Creates wrapper div, trigger rect calculated from div instead of button
   <DropdownTrigger>
     <button>Click me</button>
   </DropdownTrigger>

   // ✅ GOOD: Direct button reference for accurate positioning
   <DropdownTrigger asChild>
     <button>Click me</button>
   </DropdownTrigger>
   ```

**Solution:**

- Remove manual `position` prop unless you specifically need cursor-positioned menus
- Use `asChild` prop to avoid wrapper elements
- Let Dropdown calculate position from trigger element's bounding rect

---

### Issue 2: Dropdown Clipped by Overflow Container

**Symptoms:**

- Dropdown content appears cut off or hidden
- Content appears at container edge instead of overlaying
- Only partial dropdown menu visible

**Root Cause:**
Parent container has `overflow: auto`, `overflow: hidden`, or `overflow-y: auto`, which clips positioned descendants.

**Visual Example:**

```
┌─────────────────────────────┐
│ Container (overflow: auto)  │
│ ┌─────────────┐             │
│ │ Trigger     │             │
│ └─────────────┘             │
│ ┌─────────────┐             │ ← Dropdown clipped here!
│ │ Dropdown    │             │
└─────────────────────────────┘
  Content cut off ❌
```

**Solution:**
The component now uses React Portal with `strategy="fixed"` to render content outside the overflow container:

```tsx
// Dropdown content is automatically portaled to document.body
createPortal(
  <div className="fixed z-[9999]" style={{ top, left }}>
    {content}
  </div>,
  document.body,
);
```

**Why This Works:**

- Content is rendered as direct child of `document.body`
- No longer affected by parent's `overflow` or `z-index` stacking contexts
- Uses viewport-based coordinates with `position: fixed`

---

### Issue 3: Context Menu Implementation

**Pattern for Right-Click Menus:**

```tsx
// ✅ CORRECT: Controlled dropdown with context menu
const [openMenuId, setOpenMenuId] = useState<string | null>(null);

<Dropdown
  open={openMenuId === item.id}
  onOpenChange={(open) => setOpenMenuId(open ? item.id : null)}
  className="w-full"
>
  <DropdownTrigger asChild>
    <button
      onClick={() => handleSelect(item.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenMenuId(item.id);
      }}
    >
      {item.name}
    </button>
  </DropdownTrigger>
  <DropdownContent>
    <DropdownItem onClick={() => handleAction(item.id)}>Action</DropdownItem>
  </DropdownContent>
</Dropdown>;
```

**Key Points:**

- Use controlled `open` state, not internal state
- Handle `onContextMenu` on the button/trigger element
- Call `e.preventDefault()` to suppress native browser context menu
- Use `asChild` to avoid wrapper div
- No need for `trigger="contextmenu"` prop or manual position tracking

---

## API Reference Quick Guide

### Dropdown Props

| Prop           | Type                                     | Default    | Description                              |
| -------------- | ---------------------------------------- | ---------- | ---------------------------------------- |
| `open`         | `boolean`                                | undefined  | Controlled open state                    |
| `onOpenChange` | `(open: boolean) => void`                | undefined  | Callback when open state changes         |
| `strategy`     | `'fixed' \| 'relative'`                  | `'fixed'`  | Positioning strategy                     |
| `side`         | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Which side of trigger to position        |
| `align`        | `'start' \| 'center' \| 'end'`           | `'center'` | Alignment relative to trigger            |
| `sideOffset`   | `number`                                 | `8`        | Distance from trigger (px)               |
| `className`    | `string`                                 | undefined  | Additional CSS classes                   |
| `position`     | `{ top: number; left: number }`          | undefined  | Manual position override (use sparingly) |

### DropdownTrigger Props

| Prop       | Type        | Default  | Description                                       |
| ---------- | ----------- | -------- | ------------------------------------------------- |
| `asChild`  | `boolean`   | `false`  | Merge props into child instead of wrapping in div |
| `children` | `ReactNode` | required | Trigger element                                   |

---

## Checklist for Dropdown Usage

- [ ] Using `strategy="fixed"` for dropdowns in scrollable containers
- [ ] Using `asChild` prop on `DropdownTrigger` to avoid wrapper elements
- [ ] Implementing controlled `open` state with `useState`
- [ ] Handling `onContextMenu` directly on trigger button (not via Dropdown prop)
- [ ] Not passing manual `position` unless specifically needed for cursor-positioned menus
- [ ] Calling `e.preventDefault()` and `e.stopPropagation()` in `onContextMenu` handler
- [ ] Using `className="w-full"` on Dropdown when trigger should be full-width

---

## Migration Guide

### Before (Problematic Pattern)

```tsx
const [contextMenuPos, setContextMenuPos] = useState<{ top: number; left: number } | null>(null);

<Dropdown trigger="contextmenu" position={contextMenuPos || undefined}>
  <DropdownTrigger>
    {' '}
    {/* ❌ Missing asChild */}
    <button
      onContextMenu={(e) => {
        setContextMenuPos({ top: e.clientY, left: e.clientX });
        {
          /* ❌ Manual position */
        }
      }}
    >
      Item
    </button>
  </DropdownTrigger>
</Dropdown>;
```

### After (Correct Pattern)

```tsx
const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

<Dropdown
  open={openDropdownId === item.id}
  onOpenChange={(open) => setOpenDropdownId(open ? item.id : null)}
  className="w-full"
>
  <DropdownTrigger asChild>
    {' '}
    {/* ✅ Direct button reference */}
    <button
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenDropdownId(item.id);
        {
          /* ✅ Let Dropdown calculate position */
        }
      }}
    >
      Item
    </button>
  </DropdownTrigger>
</Dropdown>;
```

---

## Technical Details

### How Fixed Strategy + Portal Works

1. **Trigger Measurement**: When dropdown opens, `getBoundingClientRect()` gets trigger's viewport coordinates
2. **Position Calculation**: Based on `side`, `align`, and `sideOffset`, calculate content position
3. **Portal Rendering**: Content is rendered to `document.body` using `ReactDOM.createPortal()`
4. **Position Application**: Calculated coordinates applied as inline styles with `position: fixed`
5. **Auto-updates**: Position recalculates on scroll, resize, or parent container scroll

### Why Portal is Essential

Without portal, dropdown content remains in the DOM hierarchy:

```
<LeftPanel>              ← overflow-y: auto clips content
  <Dropdown>
    <DropdownTrigger />
    <DropdownContent />  ← Clipped by parent overflow
  </Dropdown>
</LeftPanel>
```

With portal (current implementation):

```
<LeftPanel>              ← overflow-y: auto
  <Dropdown>
    <DropdownTrigger />
  </Dropdown>
</LeftPanel>

<body>
  <DropdownContent />    ← Rendered outside, not clipped
</body>
```

---

## Related Files

- `Dropdown.tsx` - Main dropdown component with portal logic
- `DropdownTrigger.tsx` - Trigger wrapper component
- `DropdownContent.tsx` - Content container component
- `DropdownItem.tsx` - Individual menu items
- `type.ts` - TypeScript definitions

---

## Questions or Issues?

If you encounter positioning issues not covered here:

1. Check if trigger element has proper bounding rect (inspect in DevTools)
2. Verify parent containers don't have `transform`, `will-change`, or `perspective` (creates new stacking context)
3. Ensure `z-index` is sufficient (`z-[9999]` should work in most cases)
4. Check browser console for React Portal warnings
5. Verify `document.body` is accessible (SSR considerations)

---

**Last Updated**: 2026-07-02  
**Component Version**: 2.0 (with Portal support)
