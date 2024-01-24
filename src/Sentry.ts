/*
 * This file allows dynamic Sentry import without sacrificing tree shaking.
 * See https://medium.com/@christiango/the-unexpected-impact-of-dynamic-imports-on-tree-shaking-ddadeb135dd7 .
 */

export { init, captureException, captureMessage } from "@sentry/browser";
