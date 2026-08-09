# ContentPanel Re-render Optimization

## Vấn đề

Log cho thấy **ContentPanel render 8 lần** → gây **CodeBlock render 16 lần** (mỗi lần ContentPanel render → CodeBlock render 2 lần).

```
[ContentPanel] 🎬 RENDER (8 lần)
[CodeBlock] 🎬 RENDER #1 → #16 (16 lần)
```

## Root Cause

### 1. **Zustand Selector không tối ưu**

```typescript
// ❌ BEFORE: Re-render mỗi khi BẤT KỲ field nào trong project thay đổi
const project = useCodeStore((s) => s.projects.find((p) => p.id === currentProjectId));
const currentServiceId = project?.currentServiceId ?? null;
const openFiles = project?.openFiles ?? [];
const activeFileTabId = project?.activeFileTabId ?? null;
// ... nhiều fields khác

// Vấn đề: Nếu project.services thay đổi → project object reference thay đổi
// → Tất cả các biến extract từ project đều được tính toán lại
// → Component re-render ngay cả khi currentServiceId, openFiles, activeFileTabId không đổi
```

### 2. **Object re-creation trong render**

```typescript
// ❌ BEFORE: Mỗi render tạo object mới
const codeBlockProps = {
  code: loadedContent || '',
  language: fileNode ? getLanguage(fileNode.name) : 'plaintext',
  // ... các props khác
};

// CodeBlock nhận props object mới → re-render
```

## Giải pháp

### 1. **Tối ưu Zustand Selectors**

```typescript
// ✅ AFTER: Mỗi selector CHỈ subscribe vào field cụ thể
const currentServiceId = useCodeStore((s) => {
  const project = s.projects.find((p) => p.id === currentProjectId);
  return project?.currentServiceId ?? null;
});

const activeFileTabId = useCodeStore((s) => {
  const project = s.projects.find((p) => p.id === currentProjectId);
  return project?.activeFileTabId ?? null;
});

const openFiles = useCodeStore((s) => {
  const project = s.projects.find((p) => p.id === currentProjectId);
  return project?.openFiles ?? [];
});

// Bây giờ: Chỉ re-render khi currentServiceId, activeFileTabId, hoặc openFiles THỰC SỰ thay đổi
// Không re-render khi project.services, project.files, hoặc fields khác thay đổi
```

### 2. **Lazy lookup helpers**

```typescript
// ✅ Chỉ lookup khi cần, không subscribe vào store
const getDisplayName = (fileId: string) => {
  const project = useCodeStore.getState().projects.find((p) => p.id === currentProjectId);
  return project?.fileDisplayNames[fileId] || fileId;
};

const getFileNode = (fileId: string): FileNode | null => {
  const project = useCodeStore.getState().projects.find((p) => p.id === currentProjectId);
  if (!project) return null;
  return findFileById(project.files, fileId) || project.fileNodeMap[fileId] || null;
};
```

### 3. **Tối ưu useEffect dependencies**

```typescript
// ✅ AFTER: Chỉ depend on openFiles.length, không phải entire array
useEffect(() => {
  // ...
}, [showFile, activeFileTabId, openFiles.length]);

// openFiles array reference có thể thay đổi nhưng length không đổi
// → Không trigger useEffect không cần thiết
```

## Kết quả dự kiến

### Before
- ContentPanel render: **8 lần**
- CodeBlock render: **16 lần**
- Lý do: Mỗi thay đổi trong project object → re-render

### After  
- ContentPanel render: **2-3 lần** (chỉ khi thực sự cần)
- CodeBlock render: **4-6 lần** (giảm 60-70%)
- Lý do: Chỉ re-render khi fields được subscribe thực sự thay đổi

## Zustand Selector Best Practices

### ❌ Anti-pattern
```typescript
// Lấy toàn bộ object → re-render khi BẤT KỲ field nào thay đổi
const project = useCodeStore((s) => s.projects.find(...));
const field1 = project?.field1;
const field2 = project?.field2;
```

### ✅ Best practice
```typescript
// Mỗi selector CHỈ lấy field cần thiết
const field1 = useCodeStore((s) => {
  const project = s.projects.find(...);
  return project?.field1;
});

const field2 = useCodeStore((s) => {
  const project = s.projects.find(...);
  return project?.field2;
});
```

### 📚 Zustand Selector Rules

1. **Atomic selectors**: Mỗi `useCodeStore()` call chỉ nên return 1 giá trị primitive hoặc 1 array/object cụ thể
2. **Avoid object destructuring**: Đừng destructure từ selected object - nó vẫn tạo dependency vào toàn bộ object
3. **Use getState() for one-time reads**: Nếu chỉ cần đọc 1 lần (không subscribe), dùng `useCodeStore.getState()`

## Testing

Sau khi apply optimization, kiểm tra:

1. Mở file `.tsx`
2. Đếm số lần `[ContentPanel] 🎬 RENDER` trong console
3. Đếm số lần `[CodeBlock] 🎬 RENDER`

**Expected**:
- ContentPanel: 2-3 lần
- CodeBlock: 4-6 lần

**Before**:
- ContentPanel: 8 lần
- CodeBlock: 16 lần

## Related Files

- `/src/renderer/src/modules/Code/components/ContentPanel/index.tsx` - Optimized
- `/src/renderer/src/components/common/CodeBlock/index.tsx` - Already optimized
- `/src/renderer/src/modules/Code/services/lsp-manager.service.ts` - Already optimized
- `/src/renderer/src/modules/Code/services/lsp-client.service.ts` - Already optimized
