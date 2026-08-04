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


đây là 2 folder src/renderer/src/components/RightPanel/Agent/feature/Chat và temp/Zen-webview-ui/src/features/chat. với folder temp/Zen-webview-ui/src/features/chat là folder chuẩn, còn folder src/renderer/src/components/RightPanel/Agent/feature/Chat cần bắt chước theo. tức là folder src/renderer/src/components/RightPanel/Agent/feature/Chat có thiếu gì thì thêm, thừa thì xóa, sai thì chỉnh sửa cho đúng với bản gốc là temp/Zen-webview-ui/src/features/chat. với folder temp/Zen-webview-ui/src/features/chat. nhưng ko phải là giống hoàn toàn 100%, vì 2 folder là 2 dự án có frameworkCSS khác nhau, 1 cái là style CSS và dùng --vscode-var (webview VSCode), 1 cái là electron với tailwind có các biến theme custom ở tailwind.config.js. vì vậy ở UX, logic, hook, utils... ko liên quan tới UI thì sẽ giống nhau, còn về UI thì đôi khi sẽ có chút khác biệt. cũng có thể khác biệt về cấu trúc folder structure như ở folder gốc có temp/Zen-webview-ui/src/features/chat/components/ChatBody/AIMessageBox/blocks/code/CodeBlock.tsx nhưng ở folder electron thì CodeBlock sẽ không nằm ở trong src/renderer/src/components/RightPanel/Agent/feature/Chat/components/ChatBody/AIMessageBox/blocks mà nằm ở ngoài src/renderer/src/components/common/CodeBlock vì nó dùng nhiều nơi trong dự án electron

lưu ý: ngoại trừ folder prompts sẽ ko cần so sánh

ta sẽ bắt đầu so sánh toàn bộ file trong folder src/renderer/src/components/RightPanel/Agent/feature/Chat/hooks với folder temp/Zen-webview-ui/src/features/chat/hooks xem có khác nhau về UI. ngoài so sánh UI thì so sánh logic, cấu trúc code, các hàm... thiếu gì, thừa gì, sai gì... thì đều liệt kê 

trong code của các file trong folder src/renderer/src/components/RightPanel/Agent/feature/Chat thì đôi khi sẽ có style, CSS và --vscode... đó là bởi vì tôi đã copy toàn bộ nội dung của code trong temp/Zen-webview-ui/src/features/chat. vì vậy, bạn cần đọc file .styling-rules.md, tailwind.config.js và src/renderer/src/theme/themes/MidnightBlue.ts để hiễu rõ theme và color đang dùng của electron để sửa cùng lúc

