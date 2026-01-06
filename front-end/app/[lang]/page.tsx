import { OwmfMapIfSupported } from "@/src/components/map/OwmfMapIfSupported";
import { LANGUAGES } from "@/src/i18n/common";
import { generateOwmfMetadata } from "@/src/metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "../page.module.css";

// https://nextjs.org/docs/app/building-your-application/routing/internationalization#static-generation
export function generateStaticParams() {
  return Object.keys(LANGUAGES).map((lang) => ({ lang }));
}

interface LanguageHomeProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata(props: LanguageHomeProps): Promise<Metadata> {
  const params = await props.params;

  const {
    lang
  } = params;

  if (!!lang && !Object.keys(LANGUAGES).includes(lang)) return notFound();

  return generateOwmfMetadata(lang);
}

export default function LanguageHome() {
  return (
    <main className={`${styles.main} ${styles.map}`}>
      <OwmfMapIfSupported />
    </main>
  );
}
