#!/bin/bash
#
# proxy-manager.sh - Quản lý proxy hệ thống Ubuntu qua /etc/environment
# Cách dùng:  sudo proxy-manager.sh
#

ENV_FILE="/etc/environment"
PROXY_KEYS="http_proxy|https_proxy|ftp_proxy|all_proxy|no_proxy"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ------------------------------------------------------------
# Kiểm tra quyền root
# ------------------------------------------------------------
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}Script cần quyền root. Hãy chạy:${NC}  sudo $0"
        exit 1
    fi
}

# ------------------------------------------------------------
# Kiểm tra /etc/environment đã có proxy chưa
# ------------------------------------------------------------
proxy_exists() {
    grep -qE "^(${PROXY_KEYS})=" "$ENV_FILE" 2>/dev/null
}

# ------------------------------------------------------------
# Hiển thị trạng thái hiện tại
# ------------------------------------------------------------
show_status() {
    echo ""
    echo -e "${CYAN}===== Cấu hình trong $ENV_FILE =====${NC}"
    if proxy_exists; then
        grep -E "^(${PROXY_KEYS})=" "$ENV_FILE" | sed 's/^/  /'
    else
        echo "  (Chưa có cấu hình proxy)"
    fi
    echo ""
    echo -e "${CYAN}===== Biến môi trường trong shell hiện tại =====${NC}"
    local vars
    vars=$(env | grep -iE "proxy" 2>/dev/null)
    if [[ -n "$vars" ]]; then
        echo "$vars" | sed 's/^/  /'
    else
        echo "  (Không có)"
    fi
    echo ""
}

# ------------------------------------------------------------
# Thêm cấu hình proxy (nhập từng field)
# ------------------------------------------------------------
add_proxy() {
    echo ""
    echo -e "${BOLD}=== THÊM CẤU HÌNH PROXY ===${NC}"
    echo ""

    if proxy_exists; then
        echo -e "${YELLOW}Cảnh báo: $ENV_FILE đã có cấu hình proxy.${NC}"
        read -rp "Bạn có muốn GHI ĐÈ cấu hình cũ? (y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            echo "Đã hủy."
            return
        fi
    fi

    echo -e "${CYAN}Nhập (hoặc paste) từng giá trị, rồi nhấn ENTER:${NC}"
    echo ""

    # Loại proxy
    read -rp "Loại proxy (socks5 / http / https) [mặc định: socks5]: " proxy_type
    proxy_type=$(echo "${proxy_type:-socks5}" | tr '[:upper:]' '[:lower:]')
    if [[ ! "$proxy_type" =~ ^(socks5|http|https)$ ]]; then
        echo -e "${RED}Loại proxy không hợp lệ. Chỉ hỗ trợ socks5, http, https.${NC}"
        return
    fi

    # Host
    read -rp "Host / IP proxy: " proxy_host
    if [[ -z "$proxy_host" ]]; then
        echo -e "${RED}Host không được để trống.${NC}"
        return
    fi

    # Port
    while true; do
        read -rp "Port proxy: " proxy_port
        if [[ "$proxy_port" =~ ^[0-9]+$ ]] && (( proxy_port >= 1 && proxy_port <= 65535 )); then
            break
        fi
        echo -e "${RED}Port phải là số từ 1 đến 65535. Nhập lại.${NC}"
    done

    # Username / Password (tùy chọn)
    read -rp "Username (để trống nếu không cần): " proxy_user
    read -rsp "Password (để trống nếu không cần): " proxy_pass
    echo ""

    # Xây dựng auth
    local auth=""
    if [[ -n "$proxy_user" && -n "$proxy_pass" ]]; then
        auth="${proxy_user}:${proxy_pass}@"
    elif [[ -n "$proxy_user" ]]; then
        auth="${proxy_user}@"
    fi

    # Cảnh báo ký tự đặc biệt
    if [[ "$proxy_user" =~ [@:/] ]] || [[ "$proxy_pass" =~ [@:/] ]]; then
        echo -e "${YELLOW}Cảnh báo: username/password chứa ký tự đặc biệt (@ : /).${NC}"
        echo "URL proxy có thể bị lỗi khi parse. Hãy URL-encode các ký tự này nếu gặp sự cố."
        echo ""
    fi

    local proxy_url="${proxy_type}://${auth}${proxy_host}:${proxy_port}"

    # Sao lưu
    cp -a "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"

    # Xóa dòng proxy cũ nếu có (để ghi đè)
    if proxy_exists; then
        sed -i -E "/^(${PROXY_KEYS})=/d" "$ENV_FILE"
        sed -i '/^# --- Proxy ---$/d' "$ENV_FILE"
    fi

    # Thêm cấu hình mới
    {
        echo "# --- Proxy ---"
        echo "http_proxy=\"${proxy_url}\""
        echo "https_proxy=\"${proxy_url}\""
        echo "ftp_proxy=\"${proxy_url}\""
        echo "all_proxy=\"${proxy_url}\""
        echo "no_proxy=\"localhost,127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16\""
    } >> "$ENV_FILE"

    echo ""
    echo -e "${GREEN}✓ Đã ghi cấu hình proxy vào $ENV_FILE${NC}"
    echo ""
    echo -e "${YELLOW}Lưu ý:${NC}"
    echo "  • Ứng dụng đang chạy KHÔNG tự nhận proxy mới."
    echo "  • ĐĂNG XUẤT rồi ĐĂNG NHẬP LẠI (hoặc reboot) để áp dụng toàn hệ thống."
    echo ""
    echo -e "${CYAN}Áp dụng ngay cho terminal hiện tại (copy 4 dòng sau và chạy):${NC}"
    echo "  export http_proxy='${proxy_url}'"
    echo "  export https_proxy='${proxy_url}'"
    echo "  export ftp_proxy='${proxy_url}'"
    echo "  export all_proxy='${proxy_url}'"
    echo "  export no_proxy='localhost,127.0.0.1,::1'"
    echo ""
    echo -e "${CYAN}Kiểm tra:${NC}  curl -s ifconfig.me"
}

# ------------------------------------------------------------
# Xóa hoàn toàn cấu hình proxy (tắt)
# ------------------------------------------------------------
remove_proxy() {
    echo ""
    echo -e "${BOLD}=== XÓA CẤU HÌNH PROXY (TẮT PROXY) ===${NC}"
    echo ""

    if ! proxy_exists; then
        echo -e "${YELLOW}Không có cấu hình proxy nào trong $ENV_FILE để xóa.${NC}"
        return
    fi

    echo -e "${YELLOW}Cấu hình hiện tại sẽ bị xóa:${NC}"
    grep -E "^(${PROXY_KEYS})=" "$ENV_FILE" | sed 's/^/  /'
    echo ""

    read -rp "XÁC NHẬN xóa hoàn toàn cấu hình proxy? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Đã hủy."
        return
    fi

    # Sao lưu trước khi xóa
    cp -a "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"

    # Xóa các dòng proxy và marker
    sed -i -E "/^(${PROXY_KEYS})=/d" "$ENV_FILE"
    sed -i '/^# --- Proxy ---$/d' "$ENV_FILE"

    echo ""
    echo -e "${GREEN}✓ Đã xóa hoàn toàn cấu hình proxy khỏi $ENV_FILE${NC}"
    echo ""
    echo -e "${YELLOW}Lưu ý:${NC}"
    echo "  • Biến môi trường trong shell HIỆN TẠI vẫn còn — chạy lệnh sau để xóa ngay:"
    echo -e "${CYAN}    unset http_proxy https_proxy ftp_proxy all_proxy no_proxy${NC}"
    echo -e "${CYAN}    unset HTTP_PROXY HTTPS_PROXY FTP_PROXY ALL_PROXY NO_PROXY${NC}"
    echo "  • App GUI và terminal mới nhận thay đổi sau khi ĐĂNG XUẤT/ĐĂNG NHẬP lại."
    echo ""

    # Cảnh báo nếu redsocks đang bật
    if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet redsocks 2>/dev/null; then
        echo -e "${YELLOW}Phát hiện redsocks đang chạy (nếu bạn đã cài trước đó, hãy tắt luôn):${NC}"
        echo "  sudo systemctl stop redsocks"
        echo "  sudo iptables -t nat -F REDSOCKS 2>/dev/null"
        echo "  sudo iptables -t nat -X REDSOCKS 2>/dev/null"
        echo ""
    fi
}

# ------------------------------------------------------------
# Menu chính
# ------------------------------------------------------------
main_menu() {
    while true; do
        clear
        echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║      QUẢN LÝ PROXY HỆ THỐNG UBUNTU           ║${NC}"
        echo -e "${CYAN}╠══════════════════════════════════════════════╣${NC}"
        echo -e "${CYAN}║${NC}  1) Thêm cấu hình proxy                     ${CYAN}║${NC}"
        echo -e "${CYAN}║${NC}  2) Xóa hoàn toàn cấu hình proxy (tắt)      ${CYAN}║${NC}"
        echo -e "${CYAN}║${NC}  3) Xem trạng thái proxy hiện tại           ${CYAN}║${NC}"
        echo -e "${CYAN}║${NC}  4) Thoát                                   ${CYAN}║${NC}"
        echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"

        # Trạng thái nhanh
        if proxy_exists; then
            echo -e "  Trạng thái: ${GREEN}● ĐANG BẬT${NC}"
        else
            echo -e "  Trạng thái: ${RED}○ ĐANG TẮT${NC}"
        fi
        echo ""

        read -rp "Chọn [1-4]: " choice
        case "$choice" in
            1) add_proxy ;;
            2) remove_proxy ;;
            3) show_status ;;
            4) echo "Tạm biệt!"; exit 0 ;;
            *) echo -e "${RED}Lựa chọn không hợp lệ.${NC}" ;;
        esac
        echo ""
        read -rp "Nhấn ENTER để quay lại menu..." _
    done
}

# ------------------------------------------------------------
check_root
main_menu