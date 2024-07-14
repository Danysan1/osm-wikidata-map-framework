import { Metadata } from "next";
import { Languages } from "next/dist/lib/metadata/types/alternative-urls-types";
import { loadServerI18n } from "./i18n/server";

export async function generateOwmfMetadata(lang?: string): Promise<Metadata> {
  const { t, i18n } = await loadServerI18n(lang);
  return {
    title: t("title"),
    applicationName: t("title"),
    description: t("description"),
    alternates: {
      canonical: process.env.owmf_home_url,
      languages: i18n.languages?.reduce((acc: Languages<string>, lang) => {
        acc[lang as keyof Languages<string>] = `${process.env.owmf_home_url}/map/${lang}${process.env.owmf_static_export ? ".html" : ""}`;
        return acc;
      }, {}),
    },
    openGraph: {
      siteName: t("title"),
      title: t("title"),
      description: t("description"),
      type: 'website',
      locale: i18n.language,
    },
    icons: {
      icon: [
        `${process.env.owmf_base_path ?? ""}/favicon.svg`,
        `${process.env.owmf_base_path ?? ""}/favicon.ico`
      ],
      apple: `${process.env.owmf_base_path ?? ""}/apple-touch-icon.png`,
    },
    authors: [{ name: "Daniele Santini", url: "https://www.dsantini.it" }],
    keywords: process.env.owmf_keywords,
    robots: "index, follow",
  }
}