// CAR readiness template: the NDP Audit Questionnaire (GAID Schedule 2), from blog/NDP Audit Questionnaire (Schedule 2) 1.xlsx.
// Wording lightly corrected (spelling, grammar); meaning kept. Each row: [part, section, question, priority, auto-link rule].

export type TemplateRow = [category: string, section: string | null, text: string, priority: "high" | "medium", autoLink: string | null];

export const SCHEDULE_2: TemplateRow[] = [
  // Part 1: People and process (governance)
  ["governance", null, "Is the organisation currently registered with the NDPC for data processing?", "high", null],
  ["governance", null, "NDPC registration number", "high", null],
  ["governance", null, "Is there a designated Data Protection Officer (DPO) for the organisation?", "high", null],
  ["governance", null, "Is the DPO a member of staff or a consultant?", "medium", null],
  ["governance", null, "Is the DPO trained in data privacy and protection?", "high", null],
  ["governance", null, "Is the DPO certified by a duly accredited certification body for data protection?", "medium", null],
  ["governance", null, "Is the DPO participating in Continuous Professional Development (CPD) training?", "medium", null],
  ["governance", null, "Did the DPO obtain the required CPD credit within 12 months?", "medium", null],
  ["governance", null, "Does the organisation have a schedule for capacity building on data protection for all relevant personnel?", "high", null],
  ["governance", null, "Has training been conducted on the schedule provided?", "high", null],
  ["governance", null, "Does the organisation have updated data protection policies and procedures?", "high", "approved_policies"],
  ["governance", null, "Are those policies communicated to employees and stakeholders?", "medium", null],
  ["governance", null, "Is there a procedure for periodic review of policies?", "high", null],

  // Part 2: Data protection principles and lawful basis
  ["principles", null, "Is processing fair, lawful and transparent?", "high", null],
  ["principles", null, "Is processing limited to specified purposes?", "high", null],
  ["principles", null, "Does data minimisation apply?", "high", null],
  ["principles", null, "Are retention and deletion policies enforced?", "high", null],
  ["principles", null, "Are accuracy and correction mechanisms in place?", "medium", null],
  ["principles", null, "Are confidentiality, integrity and availability ensured?", "high", null],
  ["principles", null, "What is the lawful basis for processing? (Consent / Contract / Legal obligation / Vital interest / Public interest / Legitimate interest)", "high", "ropa_lawful_basis"],
  ["principles", null, "If profiling or marketing is conducted, is there a documented lawful basis?", "medium", null],

  // Part 3: Technology and security controls
  ["technology", null, "Does the organisation have a central database or secure server for personal data?", "high", null],
  ["technology", null, "Are personal data files and registers managed securely outside a central system?", "high", null],
  ["technology", null, "Is access to personal data limited to authorised personnel?", "high", null],
  ["technology", null, "Is there secure storage (locked or controlled) for registers?", "high", null],
  ["technology", null, "Are digital devices protected (passwords, MFA, encryption)?", "high", null],
  ["technology", null, "Are access controls sufficient for breach risks?", "high", null],
  ["technology", null, "Is there a Monitoring, Evaluation and Maintenance (MEM) schedule?", "medium", null],
  ["technology", null, "Is the MEM schedule vetted by a certified expert?", "medium", null],
  ["technology", null, "Is a Disaster Recovery Plan (DRP) in place?", "high", null],
  ["technology", null, "What is the quality level of the DRP? (Poor / Fair / Good / Excellent)", "high", null],
  ["technology", null, "Data security rating (Poor / Average / Above average)", "high", null],
  ["technology", "Security standards adopted", "Has the organisation adopted any of the following security standards?", "high", null],
  ["technology", "Security standards adopted", "ISO 27000 series", "high", null],
  ["technology", "Security standards adopted", "National Institute of Standards and Technology Special Publications (NIST SP) 800 series", "high", null],
  ["technology", "Security standards adopted", "NIST Cybersecurity Framework (CSF)", "high", null],
  ["technology", "Security standards adopted", "Center for Internet Security (CIS) Critical Security Controls", "high", null],
  ["technology", "Security standards adopted", "COBIT", "medium", null],
  ["technology", "Security standards adopted", "Health Information Trust Alliance (HITRUST) Common Security Framework (CSF)", "medium", null],

  // Part 4: Accountability and risk evaluation
  ["accountability_risk", "Data privacy impact assessment", "Has a Data Privacy Impact Assessment (DPIA) been conducted?", "high", "dpias"],
  ["accountability_risk", "Data privacy impact assessment", "Were new technologies or processing introduced in the last year?", "medium", null],
  ["accountability_risk", "Data privacy impact assessment", "Was the NDP Act considered during new technology implementations?", "high", null],
  ["accountability_risk", "Data privacy impact assessment", "Does the organisation process sensitive personal data?", "high", null],
  ["accountability_risk", "Data privacy impact assessment", "Are data subjects in vulnerable categories involved?", "high", null],
  ["accountability_risk", "Legitimate interest assessment", "Does the organisation rely on legitimate interest to process personal data?", "high", null],
  ["accountability_risk", "Legitimate interest assessment", "Is a legitimate interest assessment done?", "medium", null],
  ["accountability_risk", "Accountability and record of processing activities", "Does the DPO prepare the Semi-Annual Data Protection Report (SAPR) required under the NDP Act GAID?", "medium", null],
  ["accountability_risk", "Accountability and record of processing activities", "Are complaint and breach records maintained?", "high", null],
  ["accountability_risk", "Accountability and record of processing activities", "Are DPO reports submitted to management and acknowledged by the DPCO?", "medium", null],
  ["accountability_risk", "Accountability and record of processing activities", "At least how many data subjects' personal data has the organisation processed in the last 3 months?", "high", null],
  ["accountability_risk", "Accountability and record of processing activities", "Does the organisation have a lawful basis recognised by the NDP Act to process personal data?", "high", "ropa_lawful_basis"],
  ["accountability_risk", "Accountability and record of processing activities", "Where the organisation is unsure of its lawful basis, does it seek guidance from a DPCO or the NDPC?", "medium", null],
  ["accountability_risk", "Accountability and record of processing activities", "Have data subjects made complaints to the organisation?", "high", null],
  ["accountability_risk", "Accountability and record of processing activities", "How many complaints are under investigation? (or Not applicable)", "medium", null],
  ["accountability_risk", "Accountability and record of processing activities", "How many complaints were resolved, and within what timeframe?", "medium", null],
  ["accountability_risk", "Accountability and record of processing activities", "How many data subject access requests (DSARs) did the organisation receive? (or Not applicable)", "high", null],
  ["accountability_risk", "Accountability and record of processing activities", "How many DSARs were resolved within 72 hours? (or Not applicable)", "high", null],
  ["accountability_risk", "Accountability and record of processing activities", "How many breaches have occurred or been recorded in the organisation? (or Not applicable)", "high", null],
  ["accountability_risk", "Accountability and record of processing activities", "Are breach notifications sent to the NDPC within 72 hours? (or Not applicable)", "high", null],
  ["accountability_risk", "Accountability and record of processing activities", "Are breach notifications sent to data subjects immediately? (or Not applicable)", "high", null],

  // Part 5: Cross-border data transfer
  ["cross_border_transfer", null, "Does the organisation transfer data across borders?", "high", null],
  ["cross_border_transfer", null, "What type of personal data is transferred? (Sensitive / Non-sensitive)", "high", null],
  ["cross_border_transfer", null, "What is the legal basis for transfer?", "high", "ropa_transfers"],
  ["cross_border_transfer", null, "Are cross-border transfers documented and assessed for compliance?", "high", "ropa_transfers"],
  ["cross_border_transfer", null, "List the countries to which data is transferred", "medium", null],

  // Part 6: Data processors (third parties)
  ["data_processors", null, "Does the organisation use data processors?", "high", "ropa_recipients"],
  ["data_processors", null, "Are written contracts in place with processors?", "high", null],
  ["data_processors", null, "Are due diligence measures in place (compliance checks, NDPC registration, certifications)?", "high", null],
  ["data_processors", null, "Are post-termination measures ensured (deletion, anonymisation, access revocation)?", "high", null],
];
