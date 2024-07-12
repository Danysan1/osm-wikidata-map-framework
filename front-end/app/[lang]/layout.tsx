import { GoogleTagManager } from "@next/third-parties/google";
import { dir } from "i18next";
import "../globals.css";

interface LanguageLayoutProps {
  children: React.ReactNode;
  params: { lang: string };
}

export default function LanguageLayout({ children, params: { lang } }: LanguageLayoutProps) {
  return (
    <html lang={lang} dir={dir(lang)}>
      {process.env.owmf_google_analytics_id && <GoogleTagManager gtmId={process.env.owmf_google_analytics_id} />}
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
