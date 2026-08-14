# Design Feature

## Overview
Tính năng Design cho phép bạn tạo, quản lý và xem trước các thiết kế UI mockup bằng HTML trong Code module.

## Components

### 1. DesignPanel (`ActivityPanel/DesignPanel.tsx`)
- Hiển thị trong Activity Panel sidebar khi chọn tab Design
- Quản lý danh sách các design cards
- Cho phép tạo mới, chỉnh sửa, xóa và mở design

**Features:**
- Grid view với thumbnail preview
- Tạo design mới với các templates có sẵn (Default, Landing Page, Dashboard)
- Edit design với form editor
- Delete design với confirmation
- Click vào card để mở design trong ContentPanel

### 2. DesignViewer (`ContentPanel/DesignViewer.tsx`)
- Hiển thị trong ContentPanel khi design được chọn
- Render HTML content trong sandboxed iframe
- Responsive preview với các viewport presets

**Features:**
- Desktop/Tablet/Mobile/Full screen viewports
- Live HTML preview
- Toolbar với viewport controls
- Size indicator

## Data Flow

```
DesignPanel (Activity) 
  → Click design card
  → Store: openDesign(designId)
  → Store: Creates/opens service tab
  → ServiceTabBar: Shows design tab
  → ContentPanel: Detects design service
  → DesignViewer: Renders design HTML
```

## Store Integration

### Types (`types/design.ts`)
```typescript
interface Design {
  id: string;
  name: string;
  description?: string;
  html: string;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}
```

### Store Actions (`hooks/useCodeStore.ts`)
- `addDesign(projectId, design)` - Tạo design mới và auto-open
- `updateDesign(projectId, designId, updates)` - Cập nhật design
- `removeDesign(projectId, designId)` - Xóa design và service tab
- `openDesign(projectId, designId)` - Mở design trong ContentPanel

## Templates

### 1. Default Template
- Simple gradient hero section
- Card container với centered content
- CTA button

### 2. Landing Page Template
- Navigation bar
- Hero section với gradient background
- Features grid (3 columns)
- Responsive design

### 3. Dashboard Template
- Sidebar navigation
- Stats cards grid
- Chart placeholder
- Modern dark theme

## Usage

### Creating a Design

1. Click vào Design tab trong Activity Panel
2. Click nút "+" để tạo design mới
3. Nhập name và description (optional)
4. Chọn một template hoặc để mặc định
5. Edit HTML content nếu muốn
6. Click "Create" để lưu

### Editing a Design

1. Hover vào design card
2. Click icon Edit (✏️)
3. Chỉnh sửa name, description hoặc HTML
4. Click "Update" để lưu thay đổi

### Viewing a Design

1. Click vào design card
2. Design sẽ mở trong ContentPanel
3. Service tab sẽ xuất hiện ở ServiceTabBar
4. Dùng toolbar để switch viewport sizes

### Deleting a Design

1. Hover vào design card
2. Click icon Delete (🗑️)
3. Confirm deletion

## Implementation Details

### Service Integration
- Mỗi design tự động tạo một service với type='design'
- Service có `tabId` trỏ đến design ID
- Khi design được open, service tab được tạo/activated
- Xóa design sẽ xóa cả service tab

### Iframe Sandbox
- Design HTML được render trong sandboxed iframe
- Permissions: `allow-scripts allow-same-origin`
- Isolated từ main application để security

### State Management
- Designs được lưu trong project.designs array
- Persist trong localStorage qua Zustand persist middleware
- Migration tự động cho projects cũ (thêm designs: [])

## Future Enhancements

- [ ] Thumbnail generation tự động
- [ ] Export design to HTML file
- [ ] Import design from file
- [ ] More templates (Portfolio, Blog, E-commerce)
- [ ] Design tags và filtering
- [ ] Collaborative editing
- [ ] Version history
- [ ] Component library integration
- [ ] CSS preprocessor support (SCSS, Less)
- [ ] JavaScript/TypeScript support
- [ ] Live reload on edit
- [ ] Design system integration
