import { LANGUAGES } from "@/src/i18n/common";
import { GoogleTagManager } from "@next/third-parties/google";
import { dir } from "i18next";

// https://nextjs.org/docs/app/building-your-application/routing/internationalization#static-generation
export function generateStaticParams() {
  return LANGUAGES.map((lang) => ({ params: { lang } }));
}

interface LanguageLayoutProps {
  children: React.ReactNode;
  params: { lang?: string };
}

export default function LanguageLayout({ children, params: { lang } }: LanguageLayoutProps) {
  return (
    <html lang={lang} dir={dir(lang)}>
      {process.env.owmf_google_analytics_id && <GoogleTagManager gtmId={process.env.owmf_google_analytics_id} />}
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
