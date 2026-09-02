// src/telegram/formatting.js

export function formatAgentMessage(
  agent,
  content
) {
  return [
    `🤖 ${agent.name}`,
    `${agent.title}`,
    "",
    String(content ?? "")
  ].join("\n");
}

export function truncateTelegramText(
  text,
  max = 4000
) {
  const value =
    String(text ?? "");

  if (value.length <= max) {
    return value;
  }

  return (
    value.slice(0, max - 20) +
    "\n…message truncated"
  );
}
