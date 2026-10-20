Đây là module hợp lý và đủ tầm — khác hẳn nghiệp vụ của Code/Emulate/Recon, có bộ công cụ và UI riêng.

#	Task	Mô tả
1	Decompile APK	Giải nén, decompile (jadx), xem lại source Java/Kotlin, đọc AndroidManifest, tìm hardcoded secret/API key/endpoint
2	Phân tích EXE/native (PE/ELF)	Xem header, import/export table, string extraction, nhận diện packer/obfuscator, disassembly cơ bản
3	Patch/Repack	Sửa smali, patch bytecode, ký lại APK để test (ví dụ bypass SSL pinning, bật debug)
4	Dynamic instrumentation	Tích hợp Frida: hook hàm, dump traffic đã bị mã hoá ở tầng app, bypass root/jailbreak detection
5	Phân tích game client	Đọc packet structure, tìm offset/memory (Cheat Engine style), phân tích protocol giao tiếp client-server, phát hiện cơ chế anti-cheat
6	String/Resource scanner	Quét toàn bộ string, tài nguyên, endpoint ẩn trong binary để hỗ trợ Recon/Emulate
