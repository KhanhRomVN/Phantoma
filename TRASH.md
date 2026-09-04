### `POST` https://chat.deepseek.com/api/v0/chat/completion

**Headers:**
```http
x-client-locale: en_US
sec-ch-ua-platform: "Linux"
authorization: Bearer FfwUu0onAODSqzE9zaLXZDmSU/ceYiXW9HWydSJa2eQojJVNlNZNgBoR8eGr048w
x-client-bundle-id: com.deepseek.chat
Referer: https://chat.deepseek.com/a/chat/s/2b216a17-34c0-4726-bdd8-923eee70cefe
sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"
sec-ch-ua-mobile: ?0
x-ds-pow-response: eyJhbGdvcml0aG0iOiJEZWVwU2Vla0hhc2hWMSIsImNoYWxsZW5nZSI6IjliNzY4YmYyMTYzNDY5Y2YxYjRlMWY0MTFjZTQ5ZTk1ZGI0MWE2YjBkMGVhZDM2ZTY3OGY2Yzc3ZmFhOTQ2MDUiLCJzYWx0IjoiMjAyM2UyN2M1M2U0OGI0NTY3NDMiLCJhbnN3ZXIiOjEzMTYwOCwic2lnbmF0dXJlIjoiM2U2OTJiMjM3NzIxMTQ5ODg1OTJmNTZjYmMxZDRlMjM5YTgxN2FlNjA1OTAzYThiYTgxMDA4YzJjMTg4NWJmMCIsInRhcmdldF9wYXRoIjoiL2FwaS92MC9jaGF0L2NvbXBsZXRpb24ifQ==
x-hif-leim: Y6lUE6NTmmB2kRgYRMujUG+52XZJ6ir45/6aVU2wugOmtzFf2ecSg+I=.q+DdLx53vxlgmQJ7
x-client-timezone-offset: 25200
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
x-client-version: 2.4.0
accept: */*
content-type: application/json
x-client-platform: web
```

**Body:**
```json
{
  "chat_session_id": "2b216a17-34c0-4726-bdd8-923eee70cefe",
  "parent_message_id": null,
  "model_type": "vision",
  "prompt": "phân tích ảnh",
  "ref_file_ids": [
    "file-c2b378c5-b4c1-4446-b2a2-e218c13f53e6"
  ],
  "thinking_enabled": true,
  "search_enabled": true,
  "action": null,
  "preempt": false
}
```