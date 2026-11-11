//
//  content.js
//  ajar
//
//  Created by bzzimmy on 03/11/2026.
//

(() => {
  "use strict";

  function install(scope) {
    const toHex = (number, width = 2) => number.toString(16).padStart(width, "0");

    const ipToHex = (ip) =>
      ip
        .split(".")
        .map((octet) => toHex(Number(octet)))
        .join("");

    function base64ToHex(token) {
      if (!token || typeof token !== "string") return token;
      if (/^[0-9a-f]{32}$/i.test(token)) return token.toLowerCase();
      const normalized = (token.includes("%") ? decodeURIComponent(token) : token)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        "=",
      );
      return [...atob(padded)].map((char) => toHex(char.charCodeAt(0))).join("");
    }

    const nextIp = (ip) => ip.replace(/\.(\d+)$/, (_, octet) => `.${Number(octet) + 1}`);

    function buildGameFqdn(joinScript, relay) {
      const { NetStackTokenValue: token, MachineAddress: machine, NetStackPort: port } = joinScript;
      if (!token || !machine || !port || !relay) return null;
      return `${token}-${ipToHex(machine)}-${toHex(Number(port), 4)}.${ipToHex(relay)}.qdmux.roblox.com`;
    }

    function patchJoin(buffer) {
      const data = JSON.parse(new TextDecoder().decode(buffer));
      const joinScript = data?.joinScript;
      if (!joinScript) return buffer;

      joinScript.NetStackTokenValue = base64ToHex(joinScript.NetStackTokenValue);
      joinScript.TokenValue = base64ToHex(joinScript.TokenValue);

      if (!joinScript.gameFqdn) {
        const endpoint = joinScript.UdmuxEndpoints?.[0];
        if (endpoint?.Address) endpoint.Address = nextIp(endpoint.Address);

        const gameFqdn = buildGameFqdn(joinScript, endpoint?.Address);
        if (gameFqdn) joinScript.gameFqdn = gameFqdn;
      }

      return new TextEncoder().encode(JSON.stringify(data)).buffer;
    }

    function wrapWorkerUrl(url) {
      const src = new URL(String(url), scope.location?.href).searchParams.get("src");
      if (!src) return url;
      const code = `(${install})(self);\nimportScripts(${JSON.stringify(new URL(src).href)});`;
      return URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    }

    if (scope.XMLHttpRequest) {
      const proto = scope.XMLHttpRequest.prototype;
      const { open } = proto;
      const response = Object.getOwnPropertyDescriptor(proto, "response");

      proto.open = function (method, url, ...rest) {
        this.__ajarIsJoin = String(url).includes("gamejoin.roblox.com/v1/join-game");
        return open.call(this, method, url, ...rest);
      };

      Object.defineProperty(proto, "response", {
        ...response,
        get() {
          const raw = response.get.call(this);
          const isDone = this.readyState === 4 && this.status === 200;
          if (!this.__ajarIsJoin || !isDone || !(raw instanceof ArrayBuffer)) return raw;

          if (this.__ajarRaw !== raw) {
            this.__ajarRaw = raw;
            try {
              this.__ajarPatched = patchJoin(raw);
            } catch {
              this.__ajarPatched = raw;
            }
          }
          return this.__ajarPatched;
        },
      });
    }

    if (scope.Worker) {
      const NativeWorker = scope.Worker;
      scope.Worker = class extends NativeWorker {
        constructor(url, options) {
          super(wrapWorkerUrl(url), options);
        }
      };
    }
  }

  install(globalThis);
})();
