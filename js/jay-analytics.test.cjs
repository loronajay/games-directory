const test = require("node:test");
const assert = require("node:assert/strict");

const JayAnalytics = require("./jay-analytics.js");

test("normalizePagePath strips the GitHub Pages repo prefix", () => {
  assert.equal(JayAnalytics.normalizePagePath("/games-directory/grid.html"), "/grid.html");
});

test("normalizePagePath collapses trailing index.html routes", () => {
  assert.equal(JayAnalytics.normalizePagePath("/turbowarp-game-factory/index.html"), "/turbowarp-game-factory/");
  assert.equal(JayAnalytics.normalizePagePath("/index.html"), "/");
});

test("buildDetailString produces a stable analytics referrer payload", () => {
  assert.equal(
    JayAnalytics.buildDetailString({
      input: "gamepad",
      page: 2,
      source: "grid"
    }),
    "input=gamepad;page=2;source=grid"
  );
});

test("buildEventPayload removes leading slashes from event names", () => {
  assert.deepEqual(
    JayAnalytics.buildEventPayload("/game-launch/grid/apple-catcher", "Launch Apple Catcher", {
      input: "mouse"
    }),
    {
      path: "game-launch/grid/apple-catcher",
      title: "Launch Apple Catcher",
      event: true,
      referrer: "input=mouse"
    }
  );
});
