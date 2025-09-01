
"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

type ChartNote = { t: number; lane: number; type: "tap" };
type Chart = { title: string; bpm: number; offsetMs: number; keys: number; notes: ChartNote[] };

const WINDOWS = { perfect: 30, great: 60, good: 90 }; // ms
const MAX_SCORE = 1000000;

const KEYMAP: Record<string, number> = {
  "KeyD": 0,
  "KeyF": 1,
  "KeyJ": 2,
  "KeyK": 3,
};

export default function GameCanvas({ chart, onFinish }:{ chart: Chart, onFinish: (r: any)=>void }){
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;
    const app = new PIXI.Application();
    app.init({ background: "#0a0b0f", resizeTo: containerRef.current }).then(() => {
      if (destroyed) return;
      containerRef.current?.appendChild(app.canvas);

      const width = () => app.renderer.width;
      const height = () => app.renderer.height;

      // Lanes
      const laneG = new PIXI.Graphics();
      app.stage.addChild(laneG);
      const lanes = chart.keys;

      const JUDGE_Y = () => height() - 140; // judgement line

      function drawLanes(){
        laneG.clear();
        const w = width(), h = height();
        for (let i=0;i<lanes;i++){
          const x0 = Math.floor(i/lanes*w);
          const x1 = Math.floor((i+1)/lanes*w);
          laneG.rect(x0, 0, x1 - x0 - 2, h).fill({ color: 0x121420 });
        }
        // Judge line
        laneG.rect(0, JUDGE_Y(), w, 4).fill({ color: 0x2a2e42 });
      }
      drawLanes();
      app.renderer.on("resize", drawLanes);

      // Notes
      type NoteSprite = { g: PIXI.Graphics, t: number, lane: number, judged: boolean };
      const sprites: NoteSprite[] = chart.notes.map(n => {
        const g = new PIXI.Graphics();
        const w = width()/lanes;
        const x0 = n.lane * w + w*0.15;
        const noteWidth = w*0.7;
        g.roundRect(0,0,noteWidth,16,6).fill({ color: 0x36a2ff });
        g.x = x0; g.y = -100;
        app.stage.addChild(g);
        return { g, t: n.t + chart.offsetMs, lane: n.lane, judged: false };
      });

      // Scoring
      let idxPerLane = new Array(lanes).fill(0);
      const perNote = Math.floor(MAX_SCORE / sprites.length);
      let score = 0, combo = 0, maxCombo = 0;
      let perfect=0, great=0, good=0, miss=0;

      function judge(deltaMs: number){
        const a = Math.abs(deltaMs);
        if (a <= WINDOWS.perfect) { perfect++; combo++; score += perNote; return "PERFECT"; }
        if (a <= WINDOWS.great)   { great++; combo++; score += Math.floor(perNote*0.9); return "GREAT"; }
        if (a <= WINDOWS.good)    { good++; combo++; score += Math.floor(perNote*0.5); return "GOOD"; }
        miss++; combo = 0; return "MISS";
      }

      // Audio
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      let buffer: AudioBuffer | null = null;
      let source: AudioBufferSourceNode | null = null;
      let startAt = 0; // ctx.currentTime when playback starts
      let duration = 0;

      async function loadAudio(){
        try {
          const res = await fetch(`/songs/tutorial/audio.wav`);
          const arr = await res.arrayBuffer();
          buffer = await ctx.decodeAudioData(arr);
        } catch (e) {
          // Fallback: 10s 440Hz tone via Oscillator captured to buffer (simplified)
          const sr = ctx.sampleRate, seconds = 10;
          buffer = ctx.createBuffer(1, sr*seconds, sr);
          const ch = buffer.getChannelData(0);
          for (let i=0;i<ch.length;i++) ch[i] = Math.sin(2*Math.PI*440*(i/sr))*0.2;
        }
        duration = buffer!.duration;
      }

      function play(){
        if (!buffer) return;
        source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        startAt = ctx.currentTime + 0.1;
        source.start(startAt);
        source.onended = () => { finish(); };
      }

      function nowMs(){ return (ctx.currentTime - startAt) * 1000; }

      function finish(){
        if (destroyed) return;
        onFinish({ score, perfect, great, good, miss, maxCombo });
      }

      function keyHandler(ev: KeyboardEvent){
        const lane = KEYMAP[ev.code];
        if (lane === undefined) return;
        // Find nearest unjudged note in lane close to now
        const i0 = idxPerLane[lane];
        let targetIndex = -1;
        // Scan forward a few notes
        for (let i=i0; i<sprites.length; i++){
          const s = sprites[i];
          if (s.lane !== lane || s.judged) continue;
          targetIndex = i; break;
        }
        if (targetIndex === -1) return;
        const s = sprites[targetIndex];
        const delta = (s.t) - nowMs();
        const res = judge(delta);
        s.judged = true;
        idxPerLane[lane] = targetIndex + 1;
        maxCombo = Math.max(maxCombo, combo);
        // Simple hit flash
        s.g.tint = res === "MISS" ? 0xff3b3b : 0x7fff7f;
        setTimeout(()=>{ s.g.tint = 0xffffff; }, 60);
      }

      window.addEventListener("keydown", keyHandler);

      // Main loop
      const speedPxPerSec = 600; // scroll speed
      const noteHeight = 16;
      const ticker = app.ticker;
      ticker.add(() => {
        const tMs = nowMs();
        for (const s of sprites){
          if (s.judged) { s.g.visible = false; continue; }
          const dt = (s.t - tMs) / 1000; // seconds until hit time
          const y = JUDGE_Y() - dt * speedPxPerSec - noteHeight/2;
          s.g.y = y;
          s.g.visible = y > -50 && y < (height()+50);
          // Auto miss if passed window
          if (tMs - s.t > WINDOWS.good){
            s.judged = true; miss++; combo = 0;
          }
        }
        maxCombo = Math.max(maxCombo, combo);
        // End condition: all judged or time over
        const allDone = sprites.every(s => s.judged);
        if (allDone && (ctx.currentTime - startAt) > duration) {
          finish();
        }
      });

      // Start sequence
      loadAudio().then(async () => {
        await ctx.resume();
        play();
      });

      // Cleanup
      return () => {
        destroyed = true;
        window.removeEventListener("keydown", keyHandler);
        try { source?.stop(); } catch {}
        source?.disconnect();
        app.destroy(true);
      };
    });

    return () => { destroyed = true; };
  }, [chart]);

  return <div ref={containerRef} style={{ width: "100%", height: "70vh", borderRadius: 16, overflow: "hidden" }} />;
}
