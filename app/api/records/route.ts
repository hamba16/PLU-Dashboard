import { withActor } from "@/utils/auth";
import { listRecords, saveRecord, reviewRecord } from "@/utils/records";
import { audit } from "@/utils/db";
import { decryptNin } from "@/utils/crypto";
import { bodyOf, failure, json } from "@/utils/http";
import { requireRight, AppError } from "@/src/access";
export async function GET() {
  try {
    return json(await withActor(listRecords));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const body = await bodyOf(request);
    const result = await withActor(async (db, actor) => {
      if (body.action === "save") return saveRecord(db, actor, body);
      if (body.action === "review") return reviewRecord(db, actor, body);
      if (body.action === "unmask") {
        requireRight(actor.role === "admin-full");
        const row = (
          await db.query(
            "select nin_ciphertext from plu_private.registrants where id=$1",
            [body.id],
          )
        ).rows[0];
        if (!row) throw new AppError("Record not found.", 404);
        await audit(db, actor.id, "record.nin_unmasked", body.id, null);
        return {
          nin: row.nin_ciphertext
            ? decryptNin(row.nin_ciphertext, body.id)
            : "",
        };
      }
      throw new AppError("Unknown action.");
    });
    return json(result);
  } catch (error) {
    return failure(error);
  }
}
