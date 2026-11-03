//
//  join-button.js
//  ajar
//
//  Created by bzzimmy on 03/11/2026.
//

(() => {
  "use strict";

  const placeId = location.pathname.match(/\/games\/(\d+)/)?.[1];
  if (!placeId) return;

  const globe = `url(${chrome.runtime.getURL("icons/globe.svg")})`;

  function placeButton() {
    const playButton = document.querySelector(
      "#game-details-play-button-container button:not(#ajar-web-join)",
    );
    if (!playButton) return;

    const row = playButton.parentElement;
    Object.assign(row.style, { display: "flex", flexDirection: "row", gap: "8px" });
    playButton.style.flex = "1";

    const webJoin = document.getElementById("ajar-web-join") ?? createButton(playButton);
    if (row.lastElementChild !== webJoin) row.append(webJoin);
  }

  function createButton(playButton) {
    const webJoin = document.createElement("a");
    webJoin.id = "ajar-web-join";
    webJoin.className = playButton.className;
    webJoin.href = `https://play.roblox.com/games/start?placeId=${placeId}`;
    webJoin.target = "_blank";
    webJoin.title = "Play in browser";
    webJoin.setAttribute("aria-label", "Play in browser");
    Object.assign(webJoin.style, {
      flex: "none",
      width: "auto",
      minWidth: "0",
      aspectRatio: "1",
      margin: "0",
      padding: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });

    const icon = document.createElement("span");
    Object.assign(icon.style, {
      width: "28px",
      height: "28px",
      backgroundColor: "currentColor",
      mask: `${globe} center / contain no-repeat`,
    });

    webJoin.append(icon);
    return webJoin;
  }

  new MutationObserver(placeButton).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  placeButton();
})();
