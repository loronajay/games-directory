(function (root, factory) {
  var api = factory(root);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.JayAnalytics = api;
  }
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  var GOATCOUNTER_ENDPOINT = "https://loronajay.goatcounter.com/count";

  function stripQueryAndHash(value) {
    return String(value || "").split("#")[0].split("?")[0];
  }

  function normalizePagePath(path) {
    var normalized = stripQueryAndHash(path || "/") || "/";

    normalized = normalized.replace(/^\/games-directory(?=\/|$)/, "");

    if (!normalized.startsWith("/")) {
      normalized = "/" + normalized;
    }

    normalized = normalized.replace(/\/index\.html$/, "/");

    if (!normalized) {
      return "/";
    }

    return normalized === "" ? "/" : normalized;
  }

  function buildDetailString(details) {
    if (!details || typeof details !== "object") {
      return "";
    }

    return Object.keys(details)
      .sort()
      .filter(function (key) {
        return details[key] !== undefined && details[key] !== null && details[key] !== "";
      })
      .map(function (key) {
        return key + "=" + String(details[key]);
      })
      .join(";");
  }

  function configureGoatCounter() {
    if (!root) return;

    var existing = root.goatcounter || {};
    root.goatcounter = existing;
    root.goatcounter.path = function (path) {
      return normalizePagePath(path || (root.location && root.location.pathname) || "/");
    };
  }

  function buildEventPayload(path, title, details) {
    var payload = {
      path: String(path || "").replace(/^\/+/, ""),
      title: title || (root && root.document ? root.document.title : ""),
      event: true
    };
    var referrer = buildDetailString(details);

    if (referrer) {
      payload.referrer = referrer;
    }

    return payload;
  }

  function sendViaGoatCounter(payload) {
    if (!root || !root.goatcounter || typeof root.goatcounter.count !== "function") {
      return false;
    }

    try {
      root.goatcounter.count(payload);
      return true;
    } catch (error) {
      return false;
    }
  }

  function sendViaFetch(payload) {
    if (!root || typeof root.fetch !== "function" || !root.URLSearchParams) {
      return false;
    }

    try {
      var params = new root.URLSearchParams();
      params.set("p", payload.path);
      params.set("t", payload.title || "");
      params.set("e", "true");

      if (payload.referrer) {
        params.set("r", payload.referrer);
      }

      root.fetch(GOATCOUNTER_ENDPOINT + "?" + params.toString(), {
        method: "GET",
        mode: "no-cors",
        credentials: "omit",
        keepalive: true
      }).catch(function () {});

      return true;
    } catch (error) {
      return false;
    }
  }

  function sendViaImage(payload) {
    if (!root || typeof root.Image === "undefined") {
      return false;
    }

    try {
      var img = new root.Image();
      var params = [];

      params.push("p=" + encodeURIComponent(payload.path));
      params.push("t=" + encodeURIComponent(payload.title || ""));
      params.push("e=true");

      if (payload.referrer) {
        params.push("r=" + encodeURIComponent(payload.referrer));
      }

      img.src = GOATCOUNTER_ENDPOINT + "?" + params.join("&");
      return true;
    } catch (error) {
      return false;
    }
  }

  function trackEvent(path, title, details) {
    var payload = buildEventPayload(path, title, details);

    if (!payload.path) {
      return false;
    }

    return sendViaGoatCounter(payload) || sendViaFetch(payload) || sendViaImage(payload);
  }

  configureGoatCounter();

  return {
    buildDetailString: buildDetailString,
    buildEventPayload: buildEventPayload,
    normalizePagePath: normalizePagePath,
    trackEvent: trackEvent
  };
});
