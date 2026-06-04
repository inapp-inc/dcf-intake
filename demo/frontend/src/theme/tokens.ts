/** Light UI palette — preferred for Western demo teams. */
export const C = {
  navy: "#1B3054",
  navyDeep: "#152A47",
  teal: "#0A8A85",
  tealBright: "#0DAAAA",
  tealPale: "#E8F6F5",
  coral: "#C43A2E",
  coralPale: "#FDF0EE",
  amber: "#B45309",
  amberPale: "#FFFBEB",
  green: "#0A7A55",
  greenPale: "#ECFDF5",
  bg: "#F7F9FC",
  surface: "#FFFFFF",
  white: "#FFFFFF",
  textDark: "#1B3054",
  textMid: "#4C607A",
  textLight: "#7A8FA8",
  border: "#E2E8F0",
  sidebarBg: "#FFFFFF",
  sidebarBorder: "#E2E8F0",
  sidebarText: "#4C607A",
  sidebarTextActive: "#1B3054",
  sidebarHover: "#F1F5F9",
  inappRed: "#A31F24",
  purple: "#6C3FBF",
  purplePale: "#F5F3FF",
} as const;

export const riskColor = (score: number) =>
  score >= 13 ? C.coral : score >= 8 ? C.amber : C.green;
export const riskPale = (score: number) =>
  score >= 13 ? C.coralPale : score >= 8 ? C.amberPale : C.greenPale;
export const riskLabel = (score: number) =>
  score >= 13 ? "High Risk" : score >= 8 ? "Moderate Risk" : "Lower Risk";
