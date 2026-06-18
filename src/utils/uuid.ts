import crypto from "crypto";

export function toPgId(id: string): string {
    // If it's already a valid UUID, return it
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        return id;
    }
    // Otherwise, hash the legacy Mongo ID into the Postgres UUID
    const hash = crypto.createHash("md5").update(id).digest("hex");
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}