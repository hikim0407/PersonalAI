"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href) => pathname === href;

  const linkStyle = (href) => ({
    padding: "8px 12px",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    color: isActive(href) ? "#111" : "#444",
    background: isActive(href) ? "#e8eefc" : "transparent",
    border: isActive(href) ? "1px solid #cfd9ff" : "1px solid transparent",
    transition: "all .15s ease",
  });

  return (
    <header style={{ borderBottom: "1px solid #eee", background: "#fff" }}>
      <nav
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ fontSize: 18, fontWeight: 800, letterSpacing: ".2px", color: "#111", textDecoration: "none" }}>
          Do it! AI 에이전트
        </Link>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/chat" style={linkStyle("/chat")}>챗봇</Link>
          <Link href="/summarize" style={linkStyle("/summarize")}>문서 요약</Link>
          <a
            href="https://ai.google.com/gemini"
            target="_blank"
            rel="noreferrer"
            style={{ padding: "8px 12px", borderRadius: 8, color: "#666", textDecoration: "none", border: "1px solid #eee" }}
          >
            Gemini
          </a>
        </div>
      </nav>
    </header>
  );
}
