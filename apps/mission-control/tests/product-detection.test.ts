import { afterEach, describe, expect, it } from "vitest";
import {
  productDomains,
  productFromHost,
  productOrigins,
  productRoutePrefix,
  productSignInRedirect,
  PRODUCT_META,
  type ProductKey,
} from "@/lib/product-detection";

const ORIGINAL_PRODUCT_DOMAINS = process.env.NEXUS_PRODUCT_DOMAINS;

afterEach(() => {
  if (ORIGINAL_PRODUCT_DOMAINS === undefined) {
    delete process.env.NEXUS_PRODUCT_DOMAINS;
  } else {
    process.env.NEXUS_PRODUCT_DOMAINS = ORIGINAL_PRODUCT_DOMAINS;
  }
});

describe("productFromHost", () => {
  it("returns nexusai for localhost", () => {
    expect(productFromHost("localhost:3000")).toBe("nexusai");
    expect(productFromHost("127.0.0.1:3000")).toBe("nexusai");
    expect(productFromHost("192.168.1.1:3000")).toBe("nexusai");
  });

  it("maps default Pinavia subdomains to products without hardcoding the current app host", () => {
    expect(productFromHost("app.pinavia.co")).toBe("nexusai");
    expect(productFromHost("nexus.pinavia.io")).toBe("nexusai");
    expect(productFromHost("nexusai.pinavia.io")).toBe("nexusai");
    expect(productFromHost("app.pinavia.io")).toBe("nexusai");
    expect(productFromHost("quorum.pinavia.io")).toBe("quorum");
    expect(productFromHost("meridian.pinavia.io")).toBe("meridian");
    expect(productFromHost("vantage.pinavia.io")).toBe("vantage");
    expect(productFromHost("nucleus.pinavia.io")).toBe("nucleus");
  });

  it("handles port numbers", () => {
    expect(productFromHost("app.pinavia.co:443")).toBe("nexusai");
    expect(productFromHost("quorum.pinavia.io:443")).toBe("quorum");
    expect(productFromHost("localhost:3000")).toBe("nexusai");
  });

  it("allows later product-domain changes through NEXUS_PRODUCT_DOMAINS", () => {
    process.env.NEXUS_PRODUCT_DOMAINS = "example.app,pinavia.test";

    expect(productDomains()).toEqual(["example.app", "pinavia.test"]);
    expect(productFromHost("app.example.app")).toBe("nexusai");
    expect(productFromHost("quorum.pinavia.test")).toBe("quorum");
    expect(productFromHost("quorum.pinavia.co")).toBe("nexusai");
  });

  it("falls back to nexusai for unrecognized hosts", () => {
    expect(productFromHost("example.com")).toBe("nexusai");
    expect(productFromHost("")).toBe("nexusai");
  });
});

describe("productRoutePrefix", () => {
  it("returns the correct route prefix per product", () => {
    expect(productRoutePrefix("nexusai")).toBe("/dashboard");
    expect(productRoutePrefix("quorum")).toBe("/board");
    expect(productRoutePrefix("meridian")).toBe("/meridian");
    expect(productRoutePrefix("vantage")).toBe("/vantage");
    expect(productRoutePrefix("nucleus")).toBe("/nucleus");
  });
});

describe("productSignInRedirect", () => {
  it("only redirects to routes that exist today", () => {
    expect(productSignInRedirect("nexusai")).toBe("/dashboard/ceo");
    expect(productSignInRedirect("quorum")).toBe("/board");
    expect(productSignInRedirect("meridian")).toBe("/dashboard/ceo");
    expect(productSignInRedirect("vantage")).toBe("/dashboard/ceo");
    expect(productSignInRedirect("nucleus")).toBe("/dashboard/ceo");
  });
});

describe("productOrigins", () => {
  it("includes all pivot subdomains", () => {
    const origins = productOrigins();
    expect(origins).toContain("app.pinavia.co");
    expect(origins).toContain("app.pinavia.io");
    expect(origins).toContain("nexus.pinavia.io");
    expect(origins).toContain("quorum.pinavia.io");
    expect(origins).toContain("meridian.pinavia.io");
    expect(origins).toContain("vantage.pinavia.io");
    expect(origins).toContain("nucleus.pinavia.io");
  });

  it("derives origins from configured product domains", () => {
    process.env.NEXUS_PRODUCT_DOMAINS = "example.app";

    expect(productOrigins()).toEqual([
      "app.example.app",
      "nexus.example.app",
      "quorum.example.app",
      "meridian.example.app",
      "vantage.example.app",
      "nucleus.example.app",
    ]);
  });
});

describe("PRODUCT_META", () => {
  const expectedProducts: ProductKey[] = ["nexusai", "quorum", "meridian", "vantage", "nucleus"];

  it("has metadata for every expected product", () => {
    expect(Object.keys(PRODUCT_META).sort()).toEqual(expectedProducts.sort());
  });

  it("every product carries the Pinavia lockup", () => {
    for (const key of expectedProducts) {
      expect(PRODUCT_META[key].subtitle).toBe("a Pinavia product");
      expect(PRODUCT_META[key].name.length).toBeGreaterThan(0);
      expect(PRODUCT_META[key].title.length).toBeGreaterThan(0);
      expect(PRODUCT_META[key].description.length).toBeGreaterThan(0);
    }
  });
});
