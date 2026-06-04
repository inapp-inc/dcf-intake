export const C = {
  navy: "#1B3054",
  navyDeep: "#0F1F38",
  teal: "#0A8A85",
  tealBright: "#0DAAAA",
  tealPale: "#E4F7F6",
  coral: "#D44530",
  coralPale: "#FEE9E5",
  amber: "#C97500",
  amberPale: "#FEF3C7",
  green: "#0A7A55",
  greenPale: "#D1FAE5",
  bg: "#EEF1F8",
  white: "#FFFFFF",
  textDark: "#1B3054",
  textMid: "#4C607A",
  textLight: "#8A9BB8",
  border: "#DDE5F1",
  purple: "#6C3FBF",
  purplePale: "#EDE9FF",
} as const;

export const riskColor = (score: number) =>
  score >= 13 ? C.coral : score >= 8 ? C.amber : C.green;
export const riskPale = (score: number) =>
  score >= 13 ? C.coralPale : score >= 8 ? C.amberPale : C.greenPale;
export const riskLabel = (score: number) =>
  score >= 13 ? "High Risk" : score >= 8 ? "Moderate Risk" : "Lower Risk";
