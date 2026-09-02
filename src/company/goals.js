// src/company/goals.js

export const COMPANY_GOALS = {
  primary:
    "Build DPDPReady into a reliable and commercially successful DPDP compliance platform.",

  priorities: [
    "Product reliability",
    "Customer acquisition",
    "Customer retention",
    "Regulatory accuracy",
    "Revenue growth",
    "Security"
  ]
};

export function getCompanyGoals() {
  return structuredClone(
    COMPANY_GOALS
  );
}
