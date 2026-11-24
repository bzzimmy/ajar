//
//  join-button.js
//  ajar
//
//  Created by bzzimmy on 03/11/2026.
//

(() => {
  "use strict";

  const gameId = location.pathname.match(/\/games\/(\d+)/)?.[1];
  const profileId = location.pathname.match(/\/users\/(\d+)\/profile/)?.[1];
  const isHome = /\/home(?:\/|$)/.test(location.pathname);
  if (!gameId && !profileId && !isHome) return;

  const globe = `url(${chrome.runtime.getURL("icons/globe.svg")})`;
  const presence = new Map();
  let lastUserId = null;
  let joinId = null;

  const webPlayUrl = (placeId, userId) =>
    `https://play.roblox.com/games/start?placeId=${placeId}` +
    (joinId ? `&wasmJoinId=${joinId}` : "") +
    (userId ? `#followUserId=${userId}` : "");

  // Web Play redirects back to www without this
  async function getJoinId() {
    const userId =
      document.querySelector('meta[name="user-data"]')?.dataset.userid ||
      (await fetch("https://users.roblox.com/v1/users/authenticated", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => data?.id)
        .catch(() => null));
    if (!userId) return null;

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`wasm-hash-v1:${userId}`),
    );
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `3f${hex.slice(0, 16)}`;
  }

  function getPlaceId(userId) {
    if (!presence.has(userId)) {
      presence.set(
        userId,
        fetch("https://presence.roblox.com/v1/presence/users", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: [Number(userId)] }),
        })
          .then((res) => res.json())
          .then(
            (data) => data?.userPresences?.[0]?.placeId || data?.userPresences?.[0]?.rootPlaceId,
          )
          .catch(() => null),
      );
    }
    return presence.get(userId);
  }

  function findTarget() {
    if (gameId) {
      const btn = document.querySelector(
        "#game-details-play-button-container button:not(#ajar-web-join)",
      );
      return btn && { btn, placeId: gameId };
    }

    const joins = [
      ...document.querySelectorAll("button:not(#ajar-web-join), a:not(#ajar-web-join)"),
    ].filter((el) => /^join$/i.test(el.textContent?.trim() ?? "") && el.offsetHeight > 0);

    if (profileId) {
      const btn = joins.find((el) => !el.closest('[class*="group"], [class*="communit"]'));
      return btn && { btn, userId: profileId };
    }

    for (const btn of joins) {
      for (let el = btn.parentElement, i = 0; i < 8 && el; i++, el = el.parentElement) {
        const text = el.textContent ?? "";
        if (text.length < 1500 && /view profile/i.test(text) && /chat/i.test(text)) {
          const userId =
            el.querySelector('a[href*="/users/"]')?.href.match(/\/users\/(\d+)/)?.[1] ?? lastUserId;
          const placeId = el.querySelector('a[href*="/games/"]')?.href.match(/\/games\/(\d+)/)?.[1];
          if (userId) return { btn, placeId, userId };
        }
      }
    }
    return null;
  }

  function placeButton() {
    const target = findTarget();
    if (!target) return;

    const { btn: playButton, placeId, userId } = target;
    const row = playButton.parentElement;
    const webJoin = row.querySelector(":scope > #ajar-web-join") ?? createButton(playButton);
    const siblings = [...row.children].filter((el) => el !== playButton && el !== webJoin);

    if (siblings.length === 0) {
      Object.assign(row.style, { display: "flex", flexDirection: "row", gap: "8px" });
      playButton.style.flex = "1";
      if (row.lastElementChild !== webJoin) row.append(webJoin);
    } else {
      Object.assign(row.style, { display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" });
      playButton.style.width = "100%";
      for (const sibling of siblings) sibling.style.gridColumn = "1 / -1";
      if (playButton.nextElementSibling !== webJoin) playButton.after(webJoin);
    }

    if (!userId) {
      webJoin.href = webPlayUrl(placeId);
    } else if (webJoin.dataset.ajarUserId !== userId) {
      webJoin.dataset.ajarUserId = userId;
      if (placeId) webJoin.href = webPlayUrl(placeId, userId);
      else webJoin.removeAttribute("href");
      getPlaceId(userId).then((id) => {
        if (webJoin.dataset.ajarUserId === userId && id) webJoin.href = webPlayUrl(id, userId);
      });
    }
  }

  function createButton(playButton) {
    const webJoin = document.createElement("a");
    webJoin.id = "ajar-web-join";
    webJoin.className = playButton.className;
    webJoin.target = "_blank";
    webJoin.title = "Play in browser";
    webJoin.setAttribute("aria-label", "Play in browser");
    const height = playButton.offsetHeight;
    Object.assign(webJoin.style, {
      flex: "none",
      width: "auto",
      minWidth: "0",
      ...(height ? { height: `${height}px` } : {}),
      aspectRatio: "1",
      margin: "0",
      padding: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });

    const iconSize = height > 0 && height < 48 ? 20 : 28;
    const icon = document.createElement("span");
    Object.assign(icon.style, {
      width: `${iconSize}px`,
      height: `${iconSize}px`,
      backgroundColor: "currentColor",
      mask: `${globe} center / contain no-repeat`,
    });

    webJoin.append(icon);
    return webJoin;
  }

  if (isHome) {
    document.addEventListener(
      "pointerdown",
      ({ target }) => {
        const link =
          target.closest?.('a[href*="/users/"]') ??
          target
            .closest?.('li, [class*="friend"], [class*="Friend"]')
            ?.querySelector('a[href*="/users/"]');
        lastUserId = link?.href.match(/\/users\/(\d+)/)?.[1] ?? lastUserId;
      },
      true,
    );
  }

  getJoinId()
    .catch(() => null)
    .then((id) => {
      joinId = id;
      new MutationObserver(placeButton).observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
      placeButton();
    });
})();
