import { GoogleTagManager } from "@next/third-parties/google";
import { dir } from "i18next";

interface LanguageLayoutProps {
  children: React.ReactNode;
  params: { lang: string };
}

export default function LanguageLayout({ children, params: { lang } }: LanguageLayoutProps) {
  return (
    <html lang={lang} dir={dir(lang)}>
      {process.env.NEXT_PUBLIC_OWMF_google_analytics_id && <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_OWMF_google_analytics_id} />}
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
