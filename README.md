# Ajar

Ajar brings any public Roblox game into your web browser, no desktop app required. It hooks into Roblox's official Web Play client, a WebAssembly build that's normally locked down to creators playtesting their own experiences. Your existing Roblox session handles auth and nothing leaves your machine.

## Install

1. Download `ajar.zip` from the [latest release](../../releases/latest) and unzip it.
2. Open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
3. Select the unzipped folder. You'll see a "Play in browser" button on Roblox game pages.

## Development

```sh
npm install
npm run lint
npm run format
```

## License

[MIT](LICENSE)
