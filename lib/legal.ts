/**
 * Version of the Terms + Privacy Policy. Bump this whenever either document
 * changes materially — it is stored on the user (User.termsVersion) at sign-up
 * so you can tell who agreed to which version.
 */
export const LEGAL_VERSION = "2026-11-draft-1";

/** Contact shown in the legal pages. Replace before launch. */
export const LEGAL_CONTACT_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? "privacy@getplanned.app";
export const LEGAL_COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "[Company legal name]";
