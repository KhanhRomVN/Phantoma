# Database Schema

**File:** `/home/khanhromvn/.phantoma/phantoma.sql`  

---

## Table: `emulate_targets`

Bảng lưu thông tin các target (mục tiêu) trong feature Emulate.

### Columns

- **`id`** (TEXT, PRIMARY KEY) — Mã định danh duy nhất của target
- **`title`** (TEXT, NOT NULL) — Tiêu đề/tên của target
- **`url`** (TEXT) — URL của target
- **`platform`** (TEXT) — Nền tảng (ví dụ: web, mobile, ...)
- **`status`** (TEXT, DEFAULT 'stored') — Trạng thái: stored, running, completed, ...
- **`last_used_at`** (INTEGER) — Thời gian sử dụng lần cuối (timestamp)
- **`executable_path`** (TEXT) — Đường dẫn đến executable
- **`startup_args`** (TEXT) — Tham số khởi chạy
- **`environment`** (TEXT) — Môi trường (development, production, ...)
- **`created_at`** (INTEGER, DEFAULT (strftime('%s', 'now'))) — Thời gian tạo (timestamp)
- **`updated_at`** (INTEGER, DEFAULT (strftime('%s', 'now'))) — Thời gian cập nhật lần cuối (timestamp)
- **`icon`** (TEXT) — Icon của target

### Indexes

- **`idx_emulate_targets_status`** — `status`
- **`idx_emulate_targets_platform`** — `platform`
- **`idx_emulate_targets_updated_at`** — `updated_at`
- **`idx_emulate_targets_last_used`** — `last_used_at`

---

## Table: `conversations`

Bảng lưu thông tin metadata của các cuộc hội thoại (conversation) của Agent.

### Columns

- **`id`** (TEXT, PRIMARY KEY) — Mã định danh duy nhất của conversation
- **`session_id`** (INTEGER) — ID của session chứa conversation
- **`folder_path`** (TEXT) — Đường dẫn workspace folder (có thể NULL)
- **`title`** (TEXT) — Tiêu đề của conversation
- **`backend_conversation_id`** (TEXT) — ID conversation từ backend (nếu có)
- **`message_count`** (INTEGER, DEFAULT 0) — Tổng số messages trong conversation
- **`total_requests`** (INTEGER, DEFAULT 0) — Tổng số requests đã gửi
- **`total_token_usage`** (INTEGER, DEFAULT 0) — Tổng số tokens đã sử dụng
- **`created_at`** (INTEGER, DEFAULT (strftime('%s', 'now'))) — Thời gian tạo (timestamp)
- **`last_modified`** (INTEGER, DEFAULT (strftime('%s', 'now'))) — Thời gian cập nhật lần cuối (timestamp)

### Indexes

- **`idx_conversations_session_id`** — `session_id`
- **`idx_conversations_folder_path`** — `folder_path`
- **`idx_conversations_last_modified`** — `last_modified`
- **`idx_conversations_created_at`** — `created_at`

---

## Table: `messages`

Bảng lưu từng message (request/response) trong conversation.

### Columns

- **`id`** (TEXT, PRIMARY KEY) — Mã định danh duy nhất của message
- **`conversation_id`** (TEXT, FOREIGN KEY → conversations.id) — ID của conversation chứa message
- **`role`** (TEXT) — Vai trò: 'user', 'assistant', 'system', 'tool'
- **`content`** (TEXT) — Nội dung của message
- **`token_usage`** (INTEGER, DEFAULT 0) — Số tokens sử dụng cho message này
- **`is_cancelled`** (INTEGER, DEFAULT 0) — Đánh dấu message bị hủy (0: false, 1: true)
- **`created_at`** (INTEGER, DEFAULT (strftime('%s', 'now'))) — Thời gian tạo (timestamp)
- **`order_index`** (INTEGER) — Thứ tự của message trong conversation

### Indexes

- **`idx_messages_conversation_id`** — `conversation_id`
- **`idx_messages_created_at`** — `created_at`
- **`idx_messages_order_index`** — `order_index`

---

## Table: `tool_outputs`

Bảng lưu output của các tool được gọi trong message.

### Columns

- **`id`** (TEXT, PRIMARY KEY) — Mã định danh duy nhất của tool output
- **`message_id`** (TEXT, FOREIGN KEY → messages.id) — ID của message chứa tool output
- **`tool_name`** (TEXT) — Tên của tool
- **`output`** (TEXT) — Nội dung output của tool
- **`is_error`** (INTEGER, DEFAULT 0) — Đánh dấu output có phải là lỗi không (0: false, 1: true)
- **`terminal_id`** (TEXT) — ID của terminal (nếu tool liên quan đến terminal)
- **`created_at`** (INTEGER, DEFAULT (strftime('%s', 'now'))) — Thời gian tạo (timestamp)

### Indexes

- **`idx_tool_outputs_message_id`** — `message_id`
- **`idx_tool_outputs_tool_name`** — `tool_name`
- **`idx_tool_outputs_created_at`** — `created_at`

---

## Table: `question_answers`

Bảng lưu câu trả lời cho các câu hỏi (question) trong message.

### Columns

- **`id`** (TEXT, PRIMARY KEY) — Mã định danh duy nhất của question answer
- **`message_id`** (TEXT, FOREIGN KEY → messages.id) — ID của message chứa question
- **`question_id`** (TEXT) — ID của question (từ hệ thống)
- **`answer`** (TEXT) — Câu trả lời cho question
- **`created_at`** (INTEGER, DEFAULT (strftime('%s', 'now'))) — Thời gian tạo (timestamp)

### Indexes

- **`idx_question_answers_message_id`** — `message_id`
- **`idx_question_answers_question_id`** — `question_id`

---

## Table: `single_line_review_actions`

Bảng lưu các action review (single line) liên quan đến message.

### Columns

- **`id`** (TEXT, PRIMARY KEY) — Mã định danh duy nhất của review action
- **`message_id`** (TEXT, FOREIGN KEY → messages.id) — ID của message chứa review action
- **`action_id`** (TEXT) — ID của action
- **`action_data`** (TEXT) — Dữ liệu action dạng JSON
- **`created_at`** (INTEGER, DEFAULT (strftime('%s', 'now'))) — Thời gian tạo (timestamp)

### Indexes

- **`idx_review_actions_message_id`** — `message_id`
- **`idx_review_actions_action_id`** — `action_id`

