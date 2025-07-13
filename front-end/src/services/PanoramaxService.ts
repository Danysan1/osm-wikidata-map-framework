import { Panoramax, PanoramaxXYZ } from "panoramax-js";

export class PanoramaxService {
    private readonly api: Panoramax;

    constructor(host?: string) {
        this.api = new PanoramaxXYZ(host);
    }

    /**
     * Fetch the attribution text for a Panoramax file (includes license and author)
     */
    async fetchAttribution(imgUUID: string, appendLicense?: boolean): Promise<string> {
        const metadata = (await this.api.imageInfo(imgUUID)).properties,
            artist = metadata.exif["Exif.Image.Artist"],
            producer = metadata["geovisio:producer"],
            license = (metadata as unknown as Record<string, string>).license ?? metadata["geovisio:license"];
        let attribution = "Panoramax";
        if (artist) attribution += ` - ${artist}`;
        if (producer) attribution += `, ${producer}`;
        if (appendLicense && license) attribution += ` - ${license}`;
        return attribution;
    }
}