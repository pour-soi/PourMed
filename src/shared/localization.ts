export type Language = "en" | "zh-CN";

export function notificationCopy(
  language: Language,
  test: boolean,
  previewText = "",
  medicationName?: string,
) {
  return {
    title: language === "zh-CN" ? "服药提醒" : "Medication reminder",
    body: test
      ? language === "zh-CN"
        ? "测试通知已正常送达。"
        : "Your test notification is working."
      : previewText ||
        (medicationName
          ? language === "zh-CN"
            ? `该吃「${medicationName}」了。`
            : `Time to take ${medicationName}.`
          : language === "zh-CN"
            ? "该吃今晚的药了。"
            : "It’s time to take your medication."),
  };
}
