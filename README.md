# Anywhere LLM Translator

**LLM translation, polishing and replies — anywhere on your desktop, no copy-paste.**

Select text in any app (Teams, Slack, Mail, a browser, a PDF), press a hotkey, and read the translation in a small window. Then keep talking to the LLM right there: ask what a term means, or say in your own words how you want to reply, and get a ready-to-send message written in your voice — with the selected text as context. One more shortcut puts the reply back into the app you came from.

No switching to a chat app, no opening a new conversation, no copy-paste round trips.

> **This project is a modified version of [nextai-translator](https://github.com/nextai-translator/nextai-translator) by [yetone](https://github.com/yetone) and its contributors.**
> Almost all of the app — the desktop shell, hotkeys, text selection, translation engines and UI — is their work. This fork adds the features listed below. The original README is kept as [README-upstream.md](README-upstream.md).

## What this fork adds

- **Follow-up chat under every translation.** Type below the result (the prompt is currently tuned for Chinese speakers):
  - Describe what you want to say — `周五没空，下周一二都可以` — and get a first-person reply in the language of the original message, matching its tone (short chat reply, or a full email with greeting and sign-off).
  - Ask about the text — `SKU rollout 是啥意思` — and get a short answer in Chinese, using the text as context.
  - Revise the draft — `更正式一点`, `短一点`.
  - Each draft comes with a one-line Chinese gloss, so you can check the meaning before sending. Only the draft is copied or inserted.
- **Insert the reply into the previous app** with the button or `⇧⌘↩` (`Ctrl+Shift+Enter` on Windows/Linux).
- **Separate reasoning effort for the chat** (Settings → General → *Follow-up chat reasoning effort*). Translation stays fast; the chat can think harder. Applies to OpenAI-compatible providers.
- **Works with Chinese IMEs**: the Enter that commits a pinyin candidate does not send the message.
- **No telemetry.** The upstream analytics (Aptabase, Sentry, Google Analytics) are switched off.
- **Runs side by side with the official app.** It has its own app ID, settings folder and local IPC endpoints. On first launch it copies your settings from an installed NextAI Translator, if there is one, without changing them.

## Install

### macOS (Apple Silicon)

1. Download the `.dmg` from the [Releases](https://github.com/8haol/anywhere-llm-translator/releases) page.
2. Open it and drag **Anywhere LLM Translator** into Applications.
3. The app is not signed with an Apple Developer ID, so macOS blocks the first launch:
   1. Click **Done** (or **Cancel**) in the warning.
   2. Open **System Settings → Privacy & Security**.
   3. Scroll down and click **Open Anyway** next to the message about Anywhere LLM Translator.
4. Grant **Accessibility** permission when asked (System Settings → Privacy & Security → Accessibility). The hotkey cannot read selected text without it.
5. Open Settings from the menu bar icon, choose a provider and enter your own API key.

The app does not update itself. Check the Releases page for new versions.

### Build from source

Requirements: Node.js 20+, pnpm 9, Rust (stable), and Xcode Command Line Tools on macOS.

```bash
pnpm install
pnpm dev-tauri     # run in development mode
pnpm build-tauri   # build the app bundle
```

## Usage

1. Set a hotkey in **Settings → General → Hotkey**.
2. Select text in any app and press the hotkey.
3. Read the translation. Type in the box below it and press **Enter** (**Shift+Enter** for a new line).
4. Press **⇧⌘↩** to insert the latest reply into the app you came from, or use the copy button.

## License

[AGPL-3.0](LICENSE), the same license as the upstream project.

- Original work: Copyright © yetone and the nextai-translator contributors.
- Modifications in this repository: Copyright © 2026 8haol.

If you distribute this app, or a modified version of it, you must make the corresponding source code available under the AGPL-3.0. See the [git history](https://github.com/8haol/anywhere-llm-translator/commits) for every change made in this fork.

This project is not affiliated with or endorsed by the nextai-translator project or OpenAI.
