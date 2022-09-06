/**
 * Get the value for a configuration key
 * 
 * @param {string} key 
 * @return {?string}
 */
export function getConfig(key) {
    return document.head.querySelector(`meta[name="config_${key}"]`)?.content;
}