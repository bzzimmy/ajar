(() => {
  "use strict";

  function install(scope) {
    const b64ToHex = (s) =>
      typeof s === "string" && !/^[0-9a-f]{32}$/i.test(s)
        ? [...atob(s)].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
        : s?.toLowerCase();

    const ipToHex = (ip) =>
      ip.split(".").map((n) => Number(n).toString(16).padStart(2, "0")).join("");

    function patchJoin(raw) {
      const data = JSON.parse(new TextDecoder().decode(raw));
      const js = data?.joinScript;
      if (!js) return raw;

      js.NetStackTokenValue = b64ToHex(js.NetStackTokenValue);
      js.TokenValue = b64ToHex(js.TokenValue);

      const ep = js.UdmuxEndpoints?.[0];
      if (ep?.Address) ep.Address = ep.Address.replace(/\.33$/, ".34");

      if (!js.gameFqdn && js.NetStackTokenValue && js.MachineAddress && js.NetStackPort && ep?.Address) {
        const portHex = Number(js.NetStackPort).toString(16).padStart(4, "0");
        js.gameFqdn = `${js.NetStackTokenValue}-${ipToHex(js.MachineAddress)}-${portHex}.${ipToHex(ep.Address)}.qdmux.roblox.com`;
      }

      return new TextEncoder().encode(JSON.stringify(data)).buffer;
    }

    if (scope.XMLHttpRequest) {
      const proto = scope.XMLHttpRequest.prototype;
      const open = proto.open;
      const resp = Object.getOwnPropertyDescriptor(proto, "response");

      proto.open = function (method, url, ...rest) {
        this.__ajar = String(url).includes("gamejoin.roblox.com/v1/join-game");
        return open.call(this, method, url, ...rest);
      };

      Object.defineProperty(proto, "response", {
        ...resp,
        get() {
          const raw = resp.get.call(this);
          if (!this.__ajar || this.readyState !== 4 || this.status !== 200 || !(raw instanceof ArrayBuffer)) {
            return raw;
          }
          if (this.__ajarRaw !== raw) {
            this.__ajarRaw = raw;
            try { this.__ajarPatched = patchJoin(raw); }
            catch { this.__ajarPatched = raw; }
          }
          return this.__ajarPatched;
        },
      });
    }

    if (scope.Worker) {
      const OrigWorker = scope.Worker;
      scope.Worker = class extends OrigWorker {
        constructor(url, opts) {
          const src = new URL(String(url), scope.location?.href).searchParams.get("src");
          if (src) {
            const code = `(${install})(self);\nimportScripts(${JSON.stringify(new URL(src).href)});`;
            url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
          }
          super(url, opts);
        }
      };
    }
  }

  install(globalThis);
})();
