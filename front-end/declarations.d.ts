import { StaticImport } from "next/dist/shared/lib/get-img-props";

declare module '*.sparql' {
    const content: string;
    export default content;
}

declare module '*.sql' {
    const content: string;
    export default content;
}

declare module '*.svg' {
    const content: StaticImport;
    export default content;
}
