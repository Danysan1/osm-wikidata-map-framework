/**
 * Get the value for a configuration key
 */
export function getConfig(key: string): string | null {
    const configElement = document.head.querySelector(`meta[name="config_${key}"]`) as HTMLMetaElement | null;
    return configElement ? configElement.content : null;
}