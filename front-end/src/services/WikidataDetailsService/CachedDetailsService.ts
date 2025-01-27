import { DetailsDatabase } from "@/src/db/DetailsDatabase";
import { WikidataDetailsService } from "./WikidataDetailsService";

export class CachedDetailsService extends WikidataDetailsService {
    public constructor(language: string) {
        const db = new DetailsDatabase();
        const maxHours = parseInt(process.env.owmf_cache_timeout_hours ?? "24");
        setTimeout(() => void db.clearDetails(maxHours), 10_000);
        super(language, db);
    }
}