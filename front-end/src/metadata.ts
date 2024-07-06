import { Metadata } from "next";
import { Languages } from "next/dist/lib/metadata/types/alternative-urls-types";
import { loadServerI18n } from "./i18n/server";

export async function generateOwmfMetadata(lang?: string): Promise<Metadata> {
  const { t, i18nInstance } = await loadServerI18n(lang);
  return {
    title: t("title"),
    applicationName: t("title"),
    description: t("description"),
    alternates: {
      canonical: process.env.owmf_home_url,
      languages: i18nInstance.languages?.reduce((acc: Languages<string>, lang) => {
        acc[lang as keyof Languages<string>] = `${process.env.owmf_home_url}/${lang}`;
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