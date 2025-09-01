
# Next Rhythm MVP

4レーン／キーボード（D F J K）／難易度1の**最小テンプレ**です。
PixiJSでレーン＆ノーツ描画、Web Audio API で音源再生、JSON譜面読み込み、簡易判定を持っています。

## セットアップ
```bash
pnpm i   # もしくは npm i / yarn
pnpm dev # http://localhost:3000
```

## ファイル構成
- `app/page.tsx` … 画面遷移（Ready→Playing→Result）
- `components/GameCanvas.tsx` … Pixi + WebAudio のゲーム本体
- `public/songs/tutorial/` … サンプル曲（10秒のトーン）と譜面
- `styles/globals.css` … 簡単なスタイル

## 操作
- キー: **D F J K**
- スクロール速度: 600px/s（`GameCanvas.tsx` の `speedPxPerSec`）
- 判定窓: PERFECT 30ms / GREAT 60ms / GOOD 90ms

## 追加のTODO
- ホールド、エフェクト、判定パーティクル
- 判定オフセット調整UI
- リザルト送信API（DynamoDBランキング）
- S3/CloudFrontへの譜面・音源配置（現在はローカル`public/`）

Enjoy!
