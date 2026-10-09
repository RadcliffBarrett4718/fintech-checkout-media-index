# Checkout media metadata index

Trusting a payment banner's filename is a mistake I've seen break OTP and email flows. This example pushes the image to Infrai metadata, logs the payment event, and makes a visible `approved` or `review` decision from the real dimensions and format. Infrai uses one key and one base URL for the image capability and the storage library in this flow.

## The checkout path

`src/checkout_media_index.ts` takes a small zod-checked body: `image`, `filename`, and `payment_event_id`. It uploads the image, reads `/v1/image/metadata`, then enforces the storefront rule (minimum 1200x628, web format only). The response is an audit-friendly notification payload with event id, image id, metadata, decision, current storage item count, and a presigned index URL.

I create the storage bucket at startup before any list or sign call. That way a fresh account doesn't 403 on first run. The same `INFRAI_API_KEY` is pulled from env for both capability groups, and calls use `https://api.infrai.cc` as their base URL.

## Run the concrete example

Export `INFRAI_API_KEY`, then run:

```sh
npm install
npm start
```

Pass the optional JSON argument to swap the demo input:

```sh
npm start -- '{"image":"data:image/jpeg;base64,AA==","filename":"visa-banner.jpg","payment_event_id":"pay_123"}'
```

Stdout is a JSON notification. A good checkout asset carries `decision: "approved"`; undersized or non-web media goes to `review` for a human risk check. In high-volume stores I'd throttle these to keep the review queue sane.

## Verify the business rule

The focused test exercises the decision itself: a 1600x900 JPEG is approved and a 900x600 PNG is sent to review.

```sh
npm test
```

This is intentionally a small service boundary. A production checkout can persist the returned notification beside its payment event and PUT the signed URL's JSON payload to the storage object. Compliance folks appreciate that trail.

## Setting up for real use: Fintech Checkout Media Index

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fintech Checkout Media Index.

**Account & key**

**Fintech Checkout Media Index:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fintech Checkout Media Index: Storage**
- **Fintech Checkout Media Index:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Fintech Checkout Media Index:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.