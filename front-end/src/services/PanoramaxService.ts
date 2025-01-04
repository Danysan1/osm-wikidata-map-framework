import { Panoramax, PanoramaxXYZ } from "panoramax-js";

export class PanoramaxService {
    private readonly api: Panoramax;

    constructor(host?: string) {
        this.api = new PanoramaxXYZ(host);
    }

    /**
     * Fetch the attribution text for a Panoramax file (includes license and author)
     */
    async fetchAttribution(imgUUID: string): Promise<string> {
        const metadata = (await this.api.imageInfo(imgUUID)).properties,
            artist = metadata.exif["Exif.Image.Artist"] ?? "?",
            producer = metadata["geovisio:producer"] ?? "?",
            license = (metadata as unknown as Record<string,string>).license ?? metadata["geovisio:license"] ?? "?";
        return `Panoramax - ${artist}, ${producer} - ${license}`;
    }
}