import OwmfMap from "@/src/components/OwmfMap/OwmfMap";
import { loadServerI18n } from "@/src/i18n/server";
import { Metadata } from "next";
import { Languages } from "next/dist/lib/metadata/types/alternative-urls-types";
import Head from "next/head";
import Script from "next/script";
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
      <Head>
        {process.env.owmf_google_analytics_id && <Script defer src={`https://www.googletagmanager.com/gtag/js?id=${process.env.owmf_google_analytics_id}`} />}
        {process.env.owmf_default_language && <link rel="preload" href={`locales/${process.env.owmf_default_language}/common.json`} as="fetch" crossOrigin="anonymous" />}
        {process.env.owmf_pmtiles_base_url && <link rel="preload" href={`${process.env.owmf_pmtiles_base_url}/date.txt`} as="fetch" crossOrigin="anonymous" />}
        {process.env.owmf_default_background_style === "stadia_alidade" && <link rel="preload" href="https://tiles.stadiamaps.com/styles/alidade_smooth.json" as="fetch" crossOrigin="anonymous" />}
        {process.env.owmf_default_background_style?.startsWith("stadia_") && <link rel="preload" href="https://tiles.stadiamaps.com/data/openmaptiles.json" as="fetch" crossOrigin="anonymous" />}
        {process.env.owmf_default_background_style === "stamen_toner_lite" && <link rel="preload" href="https://tiles.stadiamaps.com/styles/stamen_toner_lite.json" as="fetch" crossOrigin="anonymous" />}
        {process.env.owmf_default_background_style === "stamen_toner" && <link rel="preload" href="https://tiles.stadiamaps.com/styles/stamen_toner.json" as="fetch" crossOrigin="anonymous" />}
        {process.env.owmf_default_background_style?.startsWith("stamen_") && <link rel="preload" href="https://tiles.stadiamaps.com/data/stamen-omt.json" as="fetch" crossOrigin="anonymous" />}
      </Head>
      <OwmfMap />
    </main>
  );
}
