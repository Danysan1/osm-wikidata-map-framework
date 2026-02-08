import { FC } from "react";

interface TagLinkProps {
    tag: string;
}

export const TagLink: FC<TagLinkProps> = ({tag}) => {
    const baseTag = tag?.replace("=*",""),
        hasValue = baseTag.includes("="),
        url = `https://wiki.openstreetmap.org/wiki/${hasValue ? "Tag" : "Key"}:${baseTag}`,
        text = hasValue ? tag : `${baseTag}=*`;
    return <a href={url}><code>{text}</code></a>;
}