import { OwmfMapIfSupported } from "@/src/components/map/OwmfMapIfSupported";
import { LANGUAGES } from "@/src/i18n/common";
import { generateOwmfMetadata } from "@/src/metadata";
import type { Metadata } from "next";
import styles from "./page.module.css";

// https://nextjs.org/docs/app/building-your-application/routing/internationalization#static-generation
export function generateStaticParams() {
  return LANGUAGES.map((lang) => ({ lang }));
}

interface LanguageHomeProps {
  params: { lang?: string };
}

export async function generateMetadata({ params: { lang } }: LanguageHomeProps): Promise<Metadata> {
  return generateOwmfMetadata(lang);
}

export default function LanguageHome() {
  return (
    <main className={styles.main}>
      <OwmfMapIfSupported />
    </main>
  );
}
