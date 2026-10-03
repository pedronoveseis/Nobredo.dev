import { readFileSync } from "node:fs";
import { buildState, tokenOk } from "./lib.mjs";

const headers = {
  "content-type": "application/json",
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow, noarchive",
};

export default async (_req, context) => {
  if (!tokenOk(context.params.token, process.env.LINK_TOKEN)) {
    return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
  }
  const drops = JSON.parse(readFileSync(new URL("../../content/drops.json", import.meta.url), "utf8"));
  return new Response(JSON.stringify(buildState({ env: process.env, now: Date.now(), drops })), { headers });
};

export const config = { path: "/api/p/:token/state" };
