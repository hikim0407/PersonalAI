import Nav from "@/components/Nav";

export const metadata = {
  title: "AI 에이전트 허브",
  description: "챗봇 / 문서 요약 진입 허브",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Apple SD Gothic Neo, Arial" }}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
