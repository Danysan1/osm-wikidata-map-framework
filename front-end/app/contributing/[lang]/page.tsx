import { Contributing } from "@/src/components/Contributing/Contributing";
import { LANGUAGES } from "@/src/i18n/common";
import { loadServerI18n } from "@/src/i18n/server";
import { getActiveSourcePresetIDs } from "@/src/SourcePreset/common";
import { readSourcePreset } from "@/src/SourcePreset/server";
import Link from "next/link";
import styles from "../../page.module.css";
import { ContributingIndex } from "@/src/components/Contributing/ContributingIndex";

// https://nextjs.org/docs/app/building-your-application/routing/internationalization#static-generation
export function generateStaticParams() {
    return LANGUAGES.map((lang) => ({ lang }));
}

interface LanguageContributingProps {
    params: { lang: string; }
}

export default async function LanguageContributing({ params: { lang } }: LanguageContributingProps) {
    return (
        <main className={`${styles.main} ${styles.text}`}>
            <ContributingIndex lang={lang} />
        </main>
    );
}
