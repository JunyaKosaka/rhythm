
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GameCanvas from "./GameCanvas";

type ChartNote = { t: number; lane: number; type: "tap" };
type Chart = { title: string; bpm: number; offsetMs: number; keys: number; notes: ChartNote[] };

type Result = {
  score: number;
  perfect: number; great: number; good: number; miss: number;
  maxCombo: number;
};

const SONG_ID = "tutorial";

export default function Game() {
  const [chart, setChart] = useState<Chart | null>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "result">("ready");
  const resultRef = useRef<Result | null>(null);

  useEffect(() => {
    // Load chart JSON
    fetch(`/songs/${SONG_ID}/chart.json`, { cache: "no-store" }).then(r => r.json()).then(setChart);
  }, []);

  return (
    <div className="container">
      <h1>Next Rhythm MVP</h1>
      <p className="legend">4レーン / キーボード（<kbd>D</kbd><kbd>F</kbd><kbd>J</kbd><kbd>K</kbd>）/ 難易度1</p>

      {phase === "ready" && (
        <div className="card">
          <p>サンプル曲 <b>{chart?.title ?? "読み込み中..."}</b></p>
          <button onClick={() => setPhase("playing")} disabled={!chart}>Start</button>
        </div>
      )}

      {phase === "playing" && chart && (
        <GameCanvas
          chart={chart}
          onFinish={(r) => { resultRef.current = r; setPhase("result"); }}
        />
      )}

      {phase === "result" && resultRef.current && (
        <div className="card">
          <h2>Result</h2>
          <ul>
            <li>Score: {resultRef.current.score.toLocaleString()}</li>
            <li>Max Combo: {resultRef.current.maxCombo}</li>
            <li>PERFECT: {resultRef.current.perfect}</li>
            <li>GREAT: {resultRef.current.great}</li>
            <li>GOOD: {resultRef.current.good}</li>
            <li>MISS: {resultRef.current.miss}</li>
          </ul>
          <button onClick={() => location.reload()}>Retry</button>
        </div>
      )}
    </div>
  );
}
