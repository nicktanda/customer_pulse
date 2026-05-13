import type { Metadata } from "next";
import "./globals.css";
import "./accent-colour.css";
import AccentColourProvider from "./components/AccentColourProvider";

export const metadata: Metadata = {
  title: "CustomerPulse",
  description: "Customer feedback, simplified.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Inline script to restore accent colour before hydration, preventing FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var accent = localStorage.getItem('accentColour');
    var valid = ['indigo','violet','sky','teal','emerald','amber','rose','slate'];
    if (accent && valid.indexOf(accent) !== -1) {
      document.documentElement.setAttribute('data-accent', accent);
    } else {
      document.documentElement.setAttribute('data-accent', 'indigo');
    }
  } catch(e) {
    document.documentElement.setAttribute('data-accent', 'indigo');
  }
})();
            `.trim(),
          }}
        />
      </head>
      <body>
        <AccentColourProvider>{children}</AccentColourProvider>
      </body>
    </html>
  );
}
