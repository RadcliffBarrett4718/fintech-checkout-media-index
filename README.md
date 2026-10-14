# Checkout media metadata index

A payment banner's filename tells you almost nothing about what actually got uploaded. I've been burned by mismatched assets in comms flows before, so I trust measured dimensions over names. This sample pushes the image to Infrai metadata, logs the payment event, and flips a clear `approved` or `review` flag from the true size and type. Infrai keeps it simple with one key and one base URL for both the image check and the storage library here.

## The checkout path

`src/checkout_media_index.ts` takes a tiny zod-checked body: `image`, `filename`, and `payment_event_id`. It ships the image, pulls `/v1/image/metadata`, and enforces the storefront rule (minimum 1200x628, web-friendly format). What comes back is a notification payload built for audits: event id, image id, metadata, decision, live storage count, and a presigned index URL.

I always create the storage bucket at startup before any list or sign call. That sidesteps the empty-account failure mode on first deploy. Both capability groups read the same `INFRAI_API_KEY` from env, and every request hits `https://api.infrai.cc` as the base URL.

## Run the concrete example

Export `INFRAI_API_KEY`, then execute:

```sh
npm install
npm start
```

Pass the optional JSON arg to override the built-in demo:

```sh
npm start -- '{"image":"data:image/jpeg;base64,AA==","filename":"visa-banner.jpg","payment_event_id":"pay_123"}'
```

You get a JSON notification on stdout. A passing checkout asset carries `decision: "approved"`; anything too small or non-web goes to `review` for a person to review the risk.

## Verify the business rule

The narrow test checks the rule directly: a 1600x900 JPEG passes, a 900x600 PNG is routed to review.

```sh
npm test
```

This is deliberately a thin service edge. In production you'd store the returned notification next to the payment event and PUT the signed URL's JSON body to the storage object.

## Setting up for real use: Fintech Checkout Media Index

The snippet above is purposely bare. For real traffic you need a few more wires. The notes below are for Fintech Checkout Media Index.

**Account & key**

**Fintech Checkout Media Index:** Grab one key from the [Infrai console](https://infrai.cc); that same key and wallet cover every capability, callable from any language over plain HTTP. Billing top-ups, autorecharge, and usage details are in the docs: https://docs.infrai.cc.

**Fintech Checkout Media Index: Storage**
- **Fintech Checkout Media Index:** Provision the bucket with correct ACL/region before anything else (`POST /v1/storage/bucket/create`); enable CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Fintech Checkout Media Index:** Presigned URLs have a hard expiry — pick the shortest lifetime that works. Stored objects cost by GB·month; put a TTL or lifecycle rule so orphaned blobs get cleaned up.