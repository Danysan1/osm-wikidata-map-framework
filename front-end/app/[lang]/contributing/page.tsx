import { LANGUAGES } from "@/src/i18n/common";
import styles from "../../page.module.css";
import { ContributingIndex } from "@/src/components/Contributing/ContributingIndex";

// https://nextjs.org/docs/app/building-your-application/routing/internationalization#static-generation
export function generateStaticParams() {
    return Object.keys(LANGUAGES).map((lang) => ({ lang }));
}

interface LanguageContributingProps {
    params: Promise<{ lang: string; }>
}

export default async function LanguageContributing(props: LanguageContributingProps) {
    const params = await props.params;

    const {
        lang
    } = params;

    return (
        <main className={`${styles.main} ${styles.text}`}>
            <ContributingIndex lang={lang} />
        </main>
    );
}
