// src/telegram/commands.js

export function parseCommand(text) {
  if (
    typeof text !== "string" ||
    !text.startsWith("/")
  ) {
    return null;
  }

  const parts =
    text.trim().split(/\s+/);

  const command =
    parts.shift()
      .split("@")[0]
      .toLowerCase();

  return {
    command,
    args: parts
  };
}
