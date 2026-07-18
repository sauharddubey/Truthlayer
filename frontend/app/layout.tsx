import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TruthLayer",
  description: "AI trust, compliance & media intelligence for video.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered:', reg.scope);
                  }).catch(function(err) {
                    console.log('SW failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
