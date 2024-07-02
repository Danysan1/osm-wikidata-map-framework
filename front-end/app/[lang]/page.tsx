import { OwmfMapIfSupported } from "@/src/components/map/OwmfMapIfSupported";
import { LANGUAGES } from "@/src/i18n/common";
import { loadServerI18n } from "@/src/i18n/server";
import type { Metadata } from "next";
import { Languages } from "next/dist/lib/metadata/types/alternative-urls-types";
import styles from "./page.module.css";

// https://nextjs.org/docs/app/building-your-application/routing/internationalization#static-generation
export function generateStaticParams() {
  return LANGUAGES.map((lang) => ({ lang }));
}

interface LanguageHomeProps {
  params: { lang?: string };
}

export async function generateMetadata({ params: { lang } }: LanguageHomeProps): Promise<Metadata> {
  const { t, i18nInstance } = await loadServerI18n(lang);
  return {
    title: t("title"),
    applicationName: t("title"),
    description: t("description"),
    alternates: {
      canonical: process.env.owmf_home_url,
      languages: i18nInstance.languages?.reduce((acc: Languages<string>, lang) => {
        acc[lang as keyof Languages<string>] = `${process.env.owmf_home_url}?lang=${lang}`;
        return acc;
      }, {}),
    },
    openGraph: {
      siteName: t("title"),
      title: t("title"),
      description: t("description"),
      type: 'website',
      locale: i18nInstance.language,
    },
    icons: {
      icon: ["favicon.svg", "favicon.ico"],
      apple: "apple-touch-icon.png"
    },
    authors: [{ name: "Daniele Santini", url: "https://www.dsantini.it" }],
    keywords: process.env.owmf_keywords,
    robots: "index, follow",
  }
}

export default function LanguageHome() {
  return (
    <main className={styles.main}>
      <OwmfMapIfSupported />
    </main>
  );
}
