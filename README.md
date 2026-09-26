# Phantoma

![License](https://img.shields.io/github/license/KhanhRomVN/Phantoma)
![Version](https://img.shields.io/github/package-json/v/KhanhRomVN/Phantoma)

🚀 **Phantoma**: A comprehensive system management dashboard built with Electron, React, and TypeScript.

## 🌟 Features

-   **Dashboard**: Real-time traffic and system status monitoring.
-   **Resizable Panels**: Customizable layout for better workflow.
-   **Code Editor**: Integrated code block viewing and editing.
-   **Modern UI**: Sleek dark mode interface using Tailwind CSS and Radix UI.

## 🛠️ Tech Stack

-   **Runtime**: [Electron](https://www.electronjs.org/)
-   **Frontend**: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Build Tool**: [Electron Vite](https://electron-vite.org/)

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or higher recommended)
-   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/KhanhRomVN/Phantoma.git
    cd Phantoma
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

## 📜 Scripts

-   `npm run dev`: Start development server (Electron + Vite).
-   `npm run build`: Build for production.
-   `npm run lint`: Lint code with ESLint.
-   `npm run format`: Format code with Prettier.

## 🤝 Contributing

Contributions are always welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

-   **Author**: KhanhRomVN
-   **Email**: [khanhromvn@gmail.com](mailto:khanhromvn@gmail.com)
-   **GitHub**: [KhanhRomVN](https://github.com/KhanhRomVN)
-   **GitLab**: [KhanhRomVN](https://gitlab.com/KhanhRomVN)
-   **Facebook**: [KhanhRomVN](https://www.facebook.com/khanhromvn)
-   **Hugging Face**: [KhanhRomVN](https://huggingface.co/khanhromvn)


RULE:
1/ không tự ý chạy các lệnh terminal mà chưa được cho phép
2/ không tự ý tạo các file .md mà ko cho phép
3/ giao tiếp bằng tiếng việt
4/ code trực tiếp, không cần lập kế hoạch hay design task
5/ dùng tiếng việt để giao tiếp

tiến hành so sánh temp/Zen/src/webview-ui/src/features/chat với src/renderer/src/components/RightPanel/Agent/feature/Chat xem có gì khác nhau ko như thiếu gì, thừa gì, khác  gì về cấu trúc, hàm, biến... tất tần tật. với temp/Zen/src/webview-ui/src/features/chat làm gốc. lấy src/renderer/src/components/RightPanel/Agent/feature/Chat làm target. src/renderer/src/components/RightPanel/Agent/feature/Chat cần chỉnh UI, UX, logic cho giống với bản gốc. khác UI ở đây là khác về cách người dùng nhìn vào. ko phải khác về style code vì 1 bên là tailwind, 1 bên là css (ko framework)