import OwmfMap from "@/src/components/OwmfMap/OwmfMap";
import { loadServerI18n } from "@/src/i18n/server";
import { GoogleTagManager } from '@next/third-parties/google';
import { Metadata } from "next";
import { Languages } from "next/dist/lib/metadata/types/alternative-urls-types";
import styles from "./page.module.css";

interface Props {
  searchParams: { lang?: string };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { t, i18nInstance } = await loadServerI18n(searchParams.lang);
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

export default function Home() {
  return (
    <main className={styles.main}>
      {process.env.owmf_google_analytics_id && <GoogleTagManager gtmId={process.env.owmf_google_analytics_id} />}
      <OwmfMap />
    </main>
  );
}
