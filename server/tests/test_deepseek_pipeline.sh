#!/bin/bash

# Test pipeline quét chat.deepseek.com
# Sử dụng RustScan, Nmap, Nuclei, Nikto

TARGET="chat.deepseek.com"
RESULTS_DIR="./results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Tạo thư mục kết quả trên host
mkdir -p "$RESULTS_DIR"

# Tạo thư mục kết quả trong container nuclei (nếu cần)
docker exec nuclei mkdir -p /app/results 2>/dev/null || true

echo "========================================="
echo "BẮT ĐẦU QUÉT PIPELINE 4 TẦNG"
echo "Target: $TARGET"
echo "Time: $(date)"
echo "========================================="

# Tầng 1: RustScan (phát hiện port nhanh) - dùng -g để chỉ in ports
echo ""
echo "[Tầng 1] RustScan - quét nhanh 65k ports..."
docker exec rustscan rustscan -g -a "$TARGET" --ulimit 5000 -b 1500 -t 2000 | tee "$RESULTS_DIR/rustscan_${TIMESTAMP}.log"

# Trích xuất các port mở từ RustScan (dùng -g, output dạng "IP -> [port1,port2]")
RAW_OUTPUT=$(docker exec rustscan rustscan -g -a "$TARGET" --ulimit 5000 2>/dev/null)
OPEN_PORTS=$(echo "$RAW_OUTPUT" | grep -oP '\[\K[0-9,]+(?=\])' | head -1)
if [ -z "$OPEN_PORTS" ]; then
    echo "Không tìm thấy port mở nào từ RustScan. Thử quét thủ công 80,443..."
    OPEN_PORTS="80,443"
fi
echo "Ports mở: $OPEN_PORTS"

# Tầng 2: Nmap (quét sâu service/version/OS)
echo ""
echo "[Tầng 2] Nmap - quét service, version, OS, script..."
docker exec nmap nmap -sV -sC -O -p "$OPEN_PORTS" "$TARGET" | tee "$RESULTS_DIR/nmap_${TIMESTAMP}.log"

# Tầng 4: Nuclei (CVE template scanner)
echo ""
echo "[Tầng 4] Nuclei - quét CVE templates..."
# Tạo output file trong container và copy ra host
docker exec nuclei nuclei -u "https://$TARGET" -severity low,medium,high,critical -o "/app/results/nuclei_${TIMESTAMP}.txt" 2>&1 | tee "$RESULTS_DIR/nuclei_${TIMESTAMP}.log"
# Copy kết quả từ container ra host (nếu file tồn tại)
docker cp nuclei:/app/results/nuclei_${TIMESTAMP}.txt "$RESULTS_DIR/" 2>/dev/null || echo "Không có kết quả nuclei"

# Tầng 4: Nikto (web vulnerability scanner) - tìm đúng executable
echo ""
echo "[Tầng 4] Nikto - quét web vulnerabilities..."
# Thử các đường dẫn nikto khả dĩ
if docker exec nikto which nikto 2>/dev/null; then
    NIKTO_CMD="nikto"
elif docker exec nikto ls /nikto/nikto.pl 2>/dev/null; then
    NIKTO_CMD="perl /nikto/nikto.pl"
elif docker exec nikto ls /opt/nikto/nikto.pl 2>/dev/null; then
    NIKTO_CMD="perl /opt/nikto/nikto.pl"
else
    echo "Không tìm thấy nikto executable trong container. Bỏ qua nikto."
    NIKTO_CMD=""
fi

if [ -n "$NIKTO_CMD" ]; then
    docker exec nikto $NIKTO_CMD -h "https://$TARGET" -Format html -o "$RESULTS_DIR/nikto_${TIMESTAMP}.html" 2>&1 | tee "$RESULTS_DIR/nikto_${TIMESTAMP}.log"
else
    echo "Nikto không khả dụng" | tee "$RESULTS_DIR/nikto_${TIMESTAMP}.log"
fi

echo ""
echo "========================================="
echo "KẾT THÚC QUÉT"
echo "Kết quả được lưu trong: $RESULTS_DIR/"
echo "Files:"
ls -la "$RESULTS_DIR/" | grep "$TIMESTAMP"
echo "========================================="