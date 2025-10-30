import Link from "next/link";
import styles from "./page.module.css";

export default function Page() {
  return (
    <main className={styles.main}>
      <section style={{ marginBottom: 24 }}>
        <h1 className={styles.h1}>AI 에이전트 허브</h1>
        <p className={styles.pMuted}>
          원하는 도구로 바로 이동하세요. 챗봇은 대화/질의응답, 문서 요약은 PDF 정리에 최적화되어 있어요.
        </p>
      </section>

      <section className={styles.grid}>
        <Link href="/chat" className={styles.card}>
          <h2 style={{ fontSize: 20, margin: "0 0 6px" }}>챗봇으로 가기 →</h2>
          <p className={styles.pMuted}>실시간 대화, 코드/설계 Q&A, 간단 요약/번역 등.</p>
        </Link>

        <Link href="/summarize" className={styles.card}>
          <h2 style={{ fontSize: 20, margin: "0 0 6px" }}>문서 요약으로 가기 →</h2>
          <p className={styles.pMuted}>브라우저에서 PDF 텍스트 추출 후 서버에서 요약.</p>
        </Link>

        <Link href="/meeting-notes" className={styles.card}>
          <h2 style={{ fontSize: 20, margin: "0 0 6px" }}>회의록 정리 AI 사용하기 →</h2>
          <p className={styles.pMuted}>
            회의/상담 기록을 붙여넣으면 핵심 의사결정과 후속 액션을 구조화해 드려요.
          </p>
        </Link>
      </section>
    </main>
  );
}
