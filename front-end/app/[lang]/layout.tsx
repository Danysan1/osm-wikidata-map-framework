import { GoogleTagManager } from "@next/third-parties/google";
import { dir } from "i18next";

interface LanguageLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function LanguageLayout(props: LanguageLayoutProps) {
  const params = await props.params;

  const {
    lang
  } = params;

  const {
    children
  } = props;

  return (
    <html lang={lang} dir={dir(lang)}>
      {process.env.NEXT_PUBLIC_OWMF_google_analytics_id && <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_OWMF_google_analytics_id} />}
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
