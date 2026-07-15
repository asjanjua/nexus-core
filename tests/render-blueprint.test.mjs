import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const blueprint = readFileSync(new URL("../render.yaml", import.meta.url), "utf8");
const services = blueprint
  .split(/(?=^  - type: )/m)
  .filter((block) => block.startsWith("  - type: "));

test("Render Blueprint keeps the web service on Node 24", () => {
  const web = services.find((service) => /^  - type: web$/m.test(service));

  assert.ok(web, "expected one Render web service");
  assert.match(web, /^    name: nexus-mission-control$/m);
  assert.match(web, /^      - key: NODE_VERSION\n        value: 24$/m);
});

test("Render cron services use a supported plan and Node 24", () => {
  const crons = services.filter((service) => /^  - type: cron$/m.test(service));

  assert.equal(crons.length, 4, "expected all four production cron services");
  for (const cron of crons) {
    assert.doesNotMatch(cron, /^    plan: free$/m);
    assert.match(cron, /^    plan: starter$/m);
    assert.match(cron, /^      - key: NODE_VERSION\n        value: 24$/m);
  }
});
