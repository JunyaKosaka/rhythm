
export const metadata = {
  title: "Rhythm MVP (Next.js + Pixi + WebAudio)",
  description: "4 lanes, keyboard, single difficulty",
};

import "../../styles/globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
