// ✅ app/chat/layout.jsx (예시)
export const metadata = { title: "챗봇" };

export default function ChatLayout({ children }) {
  // 절대 <html>이나 <body> 쓰지 말 것!
  return <section style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</section>;
}
