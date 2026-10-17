export function screeningTermsAreApproved(
  approvalFlag: string | undefined,
  disclosureText: string | undefined,
  consentPeriod: string | undefined,
) {
  const text = disclosureText?.trim() || "";
  const period = consentPeriod?.trim() || "";
  return (
    approvalFlag === "true" &&
    !!text &&
    !!period &&
    text.toLowerCase().includes(period.toLowerCase())
  );
}
