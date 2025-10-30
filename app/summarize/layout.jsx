// ✅ app/summarize/layout.jsx (예시)
export const metadata = { title: "문서 요약" };

export default function SummarizeLayout({ children }) {
  return <section style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</section>;
}
