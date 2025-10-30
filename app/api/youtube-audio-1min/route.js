export const runtime = "nodejs";

import { NextResponse } from "next/server";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { PassThrough } from "stream";

ffmpeg.setFfmpegPath(ffmpegStatic);

export async function POST(req) {
  try {
    const { url, start = 0, secs = 60 } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "유효한 YouTube URL을 전달해 주세요." }, { status: 400 });
    }
    if (!ytdl.validateURL(url)) {
      return NextResponse.json({ error: "올바른 YouTube URL이 아닙니다." }, { status: 400 });
    }
    const clipSecs = Math.max(1, Math.min(300, Number(secs) || 60));
    const startAt = Math.max(0, Number(start) || 0);

    const ytAudio = ytdl(url, { quality: "highestaudio", filter: "audioonly" });
    const pass = new PassThrough();

    // ffmpeg로 처음부터(또는 startAt) clipSecs 길이만 추출하여 mp3로 변환
    const command = ffmpeg(ytAudio)
      .format("mp3")
      .audioBitrate(128)
      .seekInput(startAt)
      .duration(clipSecs)
      .on("error", (err) => {
        pass.destroy(err);
      })
      .on("end", () => {
        // PassThrough는 응답이 끝나면 자동 종료
      })
      .pipe(pass, { end: true });

    const filename = `youtube-clip-${Date.now()}.mp3`;
    return new Response(pass, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `inline; filename=${filename}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[/api/youtube-audio-1min]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "youtube-audio-1min" });
}

