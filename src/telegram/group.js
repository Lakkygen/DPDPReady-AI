// src/telegram/group.js

export function isAllowedGroup(
  chatId,
  env
) {
  const configured =
    String(
      env.TELEGRAM_GROUP_ID ?? ""
    );

  return (
    configured &&
    String(chatId) === configured
  );
}
