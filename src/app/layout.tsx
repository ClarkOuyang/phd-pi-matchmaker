import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhD Cold-Email & PI Matchmaker",
  description:
    "Rank-ordered PI discovery with live OpenAlex metrics, funding signals, admission-capacity analysis and cold-email drafting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
