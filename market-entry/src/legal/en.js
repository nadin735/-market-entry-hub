export const EN = {
  title: "Legal", intro: "Imprint and privacy policy for {app}. Readable without signing in. The legal basis is shown right next to each statement.",
  toc: [["impressum", "Imprint"], ["datenschutz", "Privacy"]],
  back: "Back", lawLabel: "Legal basis",
  notice: "Orientation aid, not legal, tax or investment advice. Use at your own risk and without warranty. Results are non binding and you must check them yourself.",
  noticeMore: "More under Legal",
  sections: {
    datenschutz: { title: "Privacy policy", blocks: [
      ["h", "1. Controller"],
      ["p", "The controller is the operator named in the imprint. For privacy matters use the email address given there.", "Art. 4 no. 7, Art. 13(1)(a) GDPR"],
      ["p", "No data protection officer has been appointed. There is no obligation as long as fewer than 20 persons are constantly engaged in automated processing of personal data and no processing requires a data protection impact assessment.", "Art. 37 GDPR; § 38 BDSG"],
      ["h", "2. Data processed, purposes and legal bases"],
      ["ul", [
        ["Account and contract: email address, name, password (only as a hash at the authentication service), timestamps. With sign in via Google, Apple or GitHub also the identifier and email address sent by that provider. Purpose: provide the account and sign in.", "Art. 6(1)(b) GDPR"],
        ["Analyses: company details, figures, certifications, products and calculated results you enter. Purpose: store and display analyses. Without the account database (demo mode) they stay only in your browser.", "Art. 6(1)(b) GDPR"],
        ["Service emails (confirmation, password reset). Purpose: confirm and secure the account.", "Art. 6(1)(b) GDPR"],
        ["Server logs at the hosting provider (IP address, time, requested address, browser identifier). Purpose: secure, stable operation and defence against attacks. Legitimate interest: security and functionality.", "Art. 6(1)(f) GDPR"],
        ["Security and abuse prevention: limiting failed sign in attempts, automatic sign out on inactivity, rate limiting by the authentication service.", "Art. 6(1)(f) GDPR; Art. 32 GDPR"],
        ["Consent: where optional features need consent in future, it will be requested separately and voluntarily beforehand. You can withdraw it at any time with effect for the future. The tick at registration only confirms that you have read this policy and is not consent.", "Art. 6(1)(a), Art. 7 GDPR"],
        ["PDF and CSV import: files are read only in your browser and are not uploaded. Only the fields you adopt into an analysis are stored.", "Art. 5(1)(c) GDPR"]
      ]],
      ["h", "3. Third party data, employee data and special categories"],
      ["ul", [
        ["The application only needs company figures. Please do not enter personal data of third parties (e.g. names of employees or customers). If you do, you are responsible for lawfulness.", "Art. 6(1), Art. 5(1)(c) GDPR"],
        ["Employee data is not intended. If you enter it anyway, the special requirements for employees apply.", "§ 26 BDSG"],
        ["Special categories of personal data (e.g. health, religion, political opinion) are excluded. Please do not enter them. There is no processing purpose for them.", "Art. 9 GDPR"]
      ]],
      ["h", "4. Recipients and processors"],
      ["ul", [
        ["Supabase (Supabase, Inc., USA): authentication and database. Storage region: {region}. A data processing agreement is in place with the provider.", "Art. 28 GDPR"],
        ["Hosting and delivery of the website: {hosting}. The provider processes technical access data (server logs) on behalf of the operator.", "Art. 28 GDPR"],
        ["Sign in providers (Google, Apple, GitHub) only if you choose them. They are independent controllers with their own privacy policies.", "Art. 6(1)(b) GDPR"],
        ["Data is not passed on for advertising or sold. Authorities receive data only where a legal obligation exists.", "Art. 6(1)(c) GDPR"]
      ]],
      ["h", "5. Transfers to third countries"],
      ["p", "The providers are partly US companies. A transfer or access from the USA relies on the adequacy decision for the EU US Data Privacy Framework where the provider is certified, otherwise on the EU Commission's standard contractual clauses. You can get a copy via the contact address.", "Art. 44 to 46 and Art. 45 GDPR; Decision (EU) 2023/1795"],
      ["h", "6. AI features"],
      ["p", "{app} currently uses no AI models. Scores and recommendations result deterministically from fixed rules and stored sources. There is no automated decision with legal effect for you. If AI features are added, they will be clearly labelled, this policy will be updated beforehand, and you must check the results.", "Art. 22 GDPR; Art. 50 AI Act (EU) 2024/1689"],
      ["h", "7. Browser storage (no cookie banner needed)"],
      ["p", "Only technically necessary data is kept in your browser's localStorage: language, appearance (light/dark), sign in session, local accounts in demo mode and the counter for failed sign ins. It is strictly necessary for the service you request, so no consent and no cookie banner is needed. There is no tracking, analytics or advertising technology. Fonts are delivered locally. If tracking or analytics were used in future, consent would be obtained first.", "§ 25(2) no. 2 TDDDG; for tracking: § 25(1) TDDDG, Art. 6(1)(a) GDPR"],
      ["h", "8. Retention and deletion"],
      ["ul", [
        ["Account and analyses remain until you delete them or your account. Deletion in the Data Center is immediate and final.", "Art. 5(1)(e), Art. 17 GDPR"],
        ["Server logs are kept by the hosting provider only briefly and then deleted or anonymised.", "Art. 5(1)(e) GDPR"],
        ["Statutory retention applies to the operator only for accounting data (e.g. invoices, if paid services are provided). Currently: invoices and booking vouchers 8 years, commercial and business letters 6 years, books and annual accounts 10 years, kept properly and unalterably under GoBD. Your analyses are not accounting records and are not retained for that reason.", "§ 147 AO; § 257 HGB; § 14b UStG; GoBD"]
      ]],
      ["h", "9. Your rights"],
      ["ul", [
        ["Access, rectification, erasure, restriction, data portability.", "Art. 15, 16, 17, 18, 20 GDPR"],
        ["Objection to processing based on legitimate interests.", "Art. 21 GDPR"],
        ["Withdrawal of consent at any time with effect for the future.", "Art. 7(3) GDPR"],
        ["Complaint to a supervisory authority, e.g. at your place of residence or work or at the operator's seat (competent: the state data protection authority of the operator's federal state).", "Art. 77 GDPR"],
        ["In the Data Center you can export your data yourself (Art. 15, 20) and delete your account (Art. 17). Requests are answered within one month.", "Art. 12(3) GDPR"],
        ["Providing the account data is required for use. Without it no account is possible.", "Art. 13(2)(e) GDPR"]
      ]],
      ["h", "10. Security and data breaches"],
      ["p", "Technical and organisational measures: encrypted transmission (TLS), row level access protection (each person sees only their data), hashed passwords at the authentication service, minimum password length, lockout after failed attempts, automatic sign out on inactivity, strict security headers. Absolute security does not exist. In case of a personal data breach the operator reports it to the supervisory authority within 72 hours and informs affected persons without delay where the risk is high.", "Art. 25, 32, 33, 34 GDPR"]
    ]},
  },
  imp: {
    title: "Imprint",
    provider: "Provider", contact: "Contact", email: "E-mail", phone: "Phone (optional)", responsible: "Responsible for content",
    laws: { provider: "§ 5(1) no. 1 DDG", contact: "§ 5(1) no. 2 DDG", responsible: "§ 18(2) MStV" },
    missingTitle: "Note for the operator: mandatory details missing",
    missing: "A legally safe imprint still lacks: {list}. Without a service address and email address the imprint is incomplete. This can be warned off at a cost (competition and consumer associations, § 5 DDG, § 3a UWG, fine up to EUR 50,000 under § 33 DDG). A service address is mandatory, a P.O. box is not enough.",
    alt: "Alternatives if you do not want to publish your home address: a c/o address or an imprint service with a service address (alongside the business address of a law firm, coworking space or office service). Important: the address must actually let mail reach you. Set the values as environment variables VITE_LEGAL_* (see README).",
    missingStreet: "street and number", missingZip: "postcode and city", missingEmail: "e-mail address",
  },
  dc: {
    title: "Data Center", desc: "Your data is yours. Here you can export it or delete your account with all data.",
    export: "Export my data (JSON)", exportLaw: "Art. 15, 20 GDPR", del: "Delete account and all data", delLaw: "Art. 17 GDPR", delSure: "Really delete everything? Click again to confirm.", exported: "Export created.", legal: "Legal", demoNote: "In demo mode all data stays only in this browser."
  },
  consent: { label: "I have read the", link: "privacy policy", labelEnd: ".", error: "Please confirm that you have read the privacy policy." },
  final: "These texts are a carefully prepared template and not legal advice. Please have them reviewed by a lawyer once before going live, especially imprint and privacy policy. Status: October 2026."
};
