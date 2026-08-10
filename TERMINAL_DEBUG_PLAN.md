# Terminal Debug Plan

## Issues to Fix

### 1. Ctrl+Shift+` không tạo terminal mới
**Root cause**: Keyboard event listener có thể không nhận đúng key code cho backtick (`)
**Fix applied**: 
- Thêm debug logs để xem key events
- Check cả `e.key === '`'` và `e.code === 'Backquote'`
- Log tất cả key events khi nhấn phím bất kỳ

**Test**:
1. Nhấn Ctrl+Shift+`
2. Xem logs console (cả renderer và main)
3. Verify terminal mới được tạo

---

### 2. Terminal không hiển thị prompt
**Root cause**: Shell không được khởi động ở login mode → không load .bashrc/.zshrc
**Fix applied**:
- Thêm function `getShellArgs()` để return args phù hợp với từng shell:
  - bash: `-l` (login shell)
  - zsh: `-l` (login shell)
  - fish: `-l` (login shell)
  - powershell: `-NoLogo`
- Spawn shell với args thay vì empty array: `pty.spawn(shell, shellArgs, options)`
- cwd set to `process.env.HOME` để shell initialization files được load

**Test**:
1. Mở terminal mới
2. Verify prompt hiển thị đầy đủ: `(base) khanhromvn@UbuntuLTS:~/Documents/Coding/Phantoma$`
3. Check logs để xem shell args được pass vào

---

### 3. Vietnamese input với dấu xóa hết text trước đó
**Root cause**: xterm không handle IME composition events đúng
**Fix applied**:
- Đã có xterm options:
  - `disableStdin: false` 
  - `convertEol: false`
  - `windowsMode: false`
- Thêm debug logs để xem data flow

**Possible additional fixes nếu vẫn lỗi**:
- Cần check xem có cần xterm-addon-unicode11 không
- Có thể cần handle composition events manually

**Test**:
1. Nhập chữ không dấu: `hello` → should work
2. Nhập chữ có dấu: `xin chào` → dấu space sau "chào" không được xóa text trước
3. Nhập câu dài: `Đây là một câu tiếng Việt có dấu`
4. Check logs để xem character codes được gửi đi

---

## Debug Logs Added

### Renderer (Terminal.tsx)
- `[Terminal] 🆕` - Creating new terminal
- `[Terminal] ✅` - Terminal added to state  
- `[Terminal] 🔪` - Killing terminal
- `[Terminal] 📊` - Terminals count
- `[Terminal] 🔄` - Switching active terminal
- `[Terminal] 🎨` - Initializing xterm
- `[Terminal] 🚀` - Spawning shell
- `[Terminal] 📤` - Sending data to PTY
- `[Terminal] 📥` - Received data from PTY
- `[Terminal] 💀` - Shell exited
- `[Terminal] ⌨️` - Key pressed (keyboard shortcuts)
- `[Terminal] 🎯` - Ctrl+Shift+` detected

### Main (terminal.handlers.ts)
- `[Main] 🚀` - Setting up terminal handlers
- `[Main] 🆕` - terminal:spawn called
- `[Main] 🐚` - Shell detected
- `[Main] 📋` - Shell args
- `[Main] 🏠` - HOME directory
- `[Main] 📂` - cwd fallback
- `[Main] 🔪` - Killing existing PTY
- `[Main] ⚙️` - Spawn options
- `[Main] ✅` - PTY spawned
- `[Main] 📊` - Active PTYs count
- `[Main] 📥` - PTY data received
- `[Main] 📤` - terminal:write called
- `[Main] ✅` - Data written to PTY
- `[Main] ❌` - PTY not found
- `[Main] 💀` - PTY exited

---

## Test Steps

### 1. Rebuild app
```bash
npm run build
```

### 2. Run app in dev mode
```bash
npm run dev
```

### 3. Test keyboard shortcut
1. Open terminal panel
2. Press Ctrl+Shift+`
3. Check console logs for:
   - `[Terminal] ⌨️ Key pressed:` with key details
   - `[Terminal] 🎯 Ctrl+Shift+` detected`
   - `[Terminal] 🆕 Creating new terminal`
4. Verify new terminal appears in right panel

### 4. Test prompt display
1. Open terminal
2. Wait for shell to spawn
3. Check console logs for:
   - `[Main] 🐚 Shell detected: /bin/bash` (or your shell)
   - `[Main] 📋 Shell args: ['-l']`
   - `[Main] ✅ PTY spawned, PID: xxxx`
   - `[Main] 📥 PTY data:` with prompt text
4. Verify prompt shows: `(base) khanhromvn@UbuntuLTS:~/Documents/Coding/Phantoma$`

### 5. Test Vietnamese input
1. Type simple text: `hello world`
2. Type Vietnamese with tones: `xin chào`
3. Type longer sentence: `Đây là một câu tiếng Việt`
4. Check console logs for:
   - `[Terminal] 📤 Sending data to PTY:` with character codes
   - `[Main] 📤 terminal:write:` with character codes and preview
5. Verify text doesn't get cleared when typing diacritics

---

## Expected Behavior After Fix

1. **Ctrl+Shift+`**: Tạo terminal mới ngay lập tức, hiện trong right panel
2. **Prompt**: Hiển thị đầy đủ `(base) khanhromvn@UbuntuLTS:~/Documents/Coding/Phantoma$` 
3. **Vietnamese input**: Nhập được chữ có dấu mà không bị xóa text trước đó

---

## If Issues Persist

### Keyboard shortcut not working
- Check if event listener is registered: `[Terminal] ✅ Keyboard shortcut listener registered`
- Check if key events are logged when pressing Ctrl+Shift+`
- Try alternative: Add a button in UI to create terminal (temporary workaround)

### Prompt still not showing
- Check shell args in logs: `[Main] 📋 Shell args:`
- Try manually: Run `bash -l` in terminal and see if prompt appears
- Check if $PS1 env variable is set: `echo $PS1`

### Vietnamese input still broken
- May need to install xterm-addon-unicode11
- May need to handle compositionstart/compositionend events
- Check character codes in logs to see what's being sent

