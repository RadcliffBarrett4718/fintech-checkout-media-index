import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

const capability = "infrai.image.metadata";

export const checkoutAsset = z.object({ image: z.string().min(1), filename: z.string().min(1), payment_event_id: z.string().min(1) });
export type CheckoutAsset = z.infer<typeof checkoutAsset>;

export function decideAsset(meta: { width?: number; height?: number; format?: string }) {
  const width = meta.width ?? 0; const height = meta.height ?? 0; const format = (meta.format ?? "").toLowerCase();
  return width >= 1200 && height >= 628 && ["jpg", "jpeg", "png", "webp"].includes(format) ? "approved" : "review";
}

export async function indexCheckoutAsset(input: CheckoutAsset, client = new InfraiClient()) {
  const asset = checkoutAsset.parse(input);
  const uploaded = await client.upload(asset.image, asset.filename);
  const metadata = await client.metadata(uploaded.image_id);
  const decision = decideAsset(metadata);
  await client.createBucket("checkout-media-index");
  const listing = await client.listObjects("checkout-media-index");
  const key = `${asset.payment_event_id}.json`;
  const signed = await client.presign("checkout-media-index", key);
  return { payment_event_id: asset.payment_event_id, image_id: uploaded.image_id, metadata, decision, existing_items: listing.items.length, index_url: signed.url };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const raw = process.argv[2] ? JSON.parse(process.argv[2]) : { image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", filename: "checkout-banner.png", payment_event_id: "pay_demo_001" };
  indexCheckoutAsset(raw).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
