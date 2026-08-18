import assert from "node:assert/strict";
import test from "node:test";
import { isTrackingOrPlaceholderImage, stockImageIdentity } from "../src/lib/stock-images";

test("stock image identity ignores transformation query strings", () => {
  assert.equal(
    stockImageIdentity("https://images.pexels.com/photos/123/photo.jpeg?auto=compress&w=900"),
    stockImageIdentity("https://images.pexels.com/photos/123/photo.jpeg?auto=compress&w=1400")
  );
  assert.notEqual(
    stockImageIdentity("/api/og?title=First+story&category=Pakistan"),
    stockImageIdentity("/api/og?title=Second+story&category=Pakistan")
  );
});

test("tracking and one-pixel image URLs are rejected", () => {
  assert.equal(isTrackingOrPlaceholderImage("https://media.npr.org/include/images/tracking/npr-rss-pixel.png"), true);
  assert.equal(isTrackingOrPlaceholderImage("https://example.com/image.jpg?width=1&height=1"), true);
  assert.equal(isTrackingOrPlaceholderImage("https://images.pexels.com/photos/123/photo.jpeg?w=1600"), false);
  assert.equal(isTrackingOrPlaceholderImage("https://www.novexa.news/api/og?title=Google+Pixel+launch"), false);
  assert.equal(isTrackingOrPlaceholderImage("/api/og?title=Clear+weather&category=World"), false);
});
