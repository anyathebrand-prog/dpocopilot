// Generated from blog/University_NDPA_GAID_CAR_Audit_Work_Plan.xlsx (NDPA 2023 / GAID 2025 CAR audit work plan). Do not edit by hand.
export type Control = { area: string; law: string; objective: string; procedure: string; evidence: string; risk: string };
export type Unit = { sheet: string; name: string; type: string; reportsTo: string; subjects: string; data: string; systems: string; risk: string; keyProcesses: string; baseRisk: string[]; specific: Control[] };
export const BASE_CONTROLS: Control[] = [
 {
  "area": "ROPA",
  "law": "GAID Art. 13(2)-(3), Art. 52; NDPA s.24(3)",
  "objective": "All processing activities of the unit are captured in the Record of Processing Activities (ROPA) submitted to the DPO.",
  "procedure": "Walk through the unit's key processing (its key processes) and confirm each activity is captured in the ROPA with purpose, data categories, recipients and retention.",
  "evidence": "Unit ROPA extract; process walkthrough notes",
  "risk": "High"
 },
 {
  "area": "Data inventory & sensitive data",
  "law": "NDPA s.30; GAID Art. 28(3)(d)",
  "objective": "Personal and sensitive personal data held by the unit is identified and classified.",
  "procedure": "Inventory data held (its data); flag sensitive categories and confirm they are recorded as such.",
  "evidence": "Data inventory; classification register",
  "risk": "High"
 },
 {
  "area": "Lawful basis",
  "law": "GAID Art. 16, 23; NDPA s.25",
  "objective": "A documented lawful basis exists for each processing activity; legitimate interest supported by LIA.",
  "procedure": "For each ROPA activity, confirm lawful basis is recorded and appropriate; where legitimate interest is used, inspect Schedule 8 LIA.",
  "evidence": "Lawful basis register; LIAs",
  "risk": "High"
 },
 {
  "area": "Consent (CAR disclosure)",
  "law": "GAID Art. 17, 18(1)-(2); NDPA s.26",
  "objective": "Consent is obtained and recorded where required (marketing, sensitive data, children, incompatible further processing, transfers, automated decisions) — CAR must state reliance.",
  "procedure": "Identify Art. 18(1) activities in the unit; test consent capture, records and ease of withdrawal for a sample of 5.",
  "evidence": "Consent forms/records; withdrawal mechanism",
  "risk": "High"
 },
 {
  "area": "Privacy notice at collection",
  "law": "GAID Art. 27; Art. 7(j)-(m); NDPA s.27",
  "objective": "Data subjects receive clear privacy information at every collection point (forms, portals, surveys).",
  "procedure": "Collect all forms/portals used by the unit; check each notice against Art. 27(3)(a)-(j).",
  "evidence": "Forms; screenshots; notice checklist",
  "risk": "Medium"
 },
 {
  "area": "Minimisation & purpose limitation",
  "law": "GAID Art. 15 & Sch. 1; NDPA s.24(1)(b),(c)",
  "objective": "Only data necessary for the stated purpose is collected and used.",
  "procedure": "Review fields on the unit forms and systems (its systems); identify excessive fields (e.g., religion, NIN, BVN) not justified by purpose.",
  "evidence": "Form review worksheet",
  "risk": "Medium"
 },
 {
  "area": "Retention & disposal",
  "law": "GAID Art. 49(3)-(4); NDPA s.24(1)(d)",
  "objective": "Retention periods defined; data disposed of securely (default not later than 6 months after purpose ends unless justified).",
  "procedure": "Obtain retention schedule; inspect archives/systems for data past retention; review disposal records (shredding/wiping).",
  "evidence": "Retention schedule; disposal certificates",
  "risk": "Medium"
 },
 {
  "area": "Accuracy & rectification",
  "law": "GAID Art. 36; NDPA s.24(1)(e)",
  "objective": "Data subjects can verify and correct data; input errors by the unit corrected free of charge.",
  "procedure": "Review rectification procedure (e.g., name/DOB corrections); sample 5 requests for timeliness and absence of fees for unit errors.",
  "evidence": "Correction requests; procedure",
  "risk": "Medium"
 },
 {
  "area": "Data subject rights",
  "law": "GAID Art. 36-38, 40; NDPA s.34-38",
  "objective": "Access, erasure, portability, objection requests and SNAGs are logged, escalated to the DPO and resolved on time.",
  "procedure": "Enquire about requests received by the unit; test log and escalation to DPO.",
  "evidence": "Rights request log; SNAG responses",
  "risk": "Medium"
 },
 {
  "area": "Physical & access security",
  "law": "NDPA s.39; GAID Art. 29",
  "objective": "Physical records and system access are restricted on a need-to-know basis.",
  "procedure": "Inspect records rooms/cabinets; review user access list for its systems and confirm leavers are removed.",
  "evidence": "Access lists; site inspection photos",
  "risk": "High"
 },
 {
  "area": "Technical security & devices",
  "law": "GAID Art. 10(5), 29(2); NDPA s.39",
  "objective": "Unit devices and online systems use authentication, encryption, updated software and are audited frequently.",
  "procedure": "Sample 5 unit laptops/desktops: password, screen lock, encryption, antivirus, OS updates; check use of personal email/USB for personal data.",
  "evidence": "Device checklist; screenshots",
  "risk": "High"
 },
 {
  "area": "Third-party processors & DPAs",
  "law": "GAID Art. 34; NDPA s.29",
  "objective": "Vendors/partners processing personal data for {u} have Data Processing Agreements and were vetted.",
  "procedure": "List third parties receiving data from the unit; inspect DPAs against Art. 34(2).",
  "evidence": "Vendor list; DPAs",
  "risk": "High"
 },
 {
  "area": "DPIA",
  "law": "GAID Art. 28(1)-(5),(13) & Sch. 4",
  "objective": "DPIA completed where processing is high-risk (incl. educational services records under Art. 28(3)(m)) and outcome feeds the CAR.",
  "procedure": "Assess whether the unit's processing triggers Art. 28(3); inspect DPIA and DPO sign-off.",
  "evidence": "DPIA; DPO sign-off",
  "risk": "High"
 },
 {
  "area": "Cross-border transfers",
  "law": "GAID Art. 45 & Sch. 5; NDPA s.41-43",
  "objective": "Any transfer of personal data outside Nigeria (cloud tools, foreign partners) has a valid transfer basis.",
  "procedure": "Identify foreign tools/partners used by the unit (e.g., Google Workspace, Zoom, foreign institutions) and confirm transfer basis.",
  "evidence": "Tool inventory; transfer assessment",
  "risk": "Medium"
 },
 {
  "area": "Breach detection & escalation",
  "law": "GAID Art. 33; NDPA s.40",
  "objective": "Staff know how to recognise and report breaches immediately to the DPO to meet the 72-hour NDPC deadline.",
  "procedure": "Interview 3 staff on breach reporting; review incidents in the unit during the year and escalation timestamps.",
  "evidence": "Interview notes; incident reports",
  "risk": "High"
 },
 {
  "area": "Training & privacy checklist",
  "law": "GAID Art. 7(v), 30(7), 46",
  "objective": "Staff handling personal data are trained at least annually and have a basic privacy checklist.",
  "procedure": "Compare training attendance to staff list of the unit; confirm basic privacy checklist is available.",
  "evidence": "Training register; checklist",
  "risk": "Medium"
 },
 {
  "area": "Privacy Champion",
  "law": "GAID Art. 7(i)",
  "objective": "An Associate DPO / Privacy Champion is designated for the unit and liaises with the DPO.",
  "procedure": "Inspect designation letter and evidence of liaison (meetings, reports).",
  "evidence": "Designation letter; minutes",
  "risk": "Low"
 },
 {
  "area": "Routine compliance checks",
  "law": "GAID Art. 30(8)",
  "objective": "Unannounced routine compliance checks are carried out in the unit.",
  "procedure": "Review results of routine checks performed in the unit during the year.",
  "evidence": "Check reports",
  "risk": "Low"
 },
 {
  "area": "SADPR input",
  "law": "GAID Art. 13(5)",
  "objective": "Unit provides inputs to the DPO's Semi-Annual Data Protection Report.",
  "procedure": "Confirm the unit submissions for H1 and H2 reports.",
  "evidence": "Submissions to DPO",
  "risk": "Low"
 },
 {
  "area": "Software & emerging tech",
  "law": "GAID Art. 31, 43",
  "objective": "New software, apps or AI tools adopted by the unit had DPIA and privacy by design review.",
  "procedure": "Enquire about new tools adopted by the unit (incl. AI tools); inspect approvals/DPIAs.",
  "evidence": "Tool approvals; DPIAs",
  "risk": "Medium"
 },
 {
  "area": "Data ethics & fairness",
  "law": "GAID Art. 41-42",
  "objective": "Processing is fair, transparent and non-discriminatory; outcomes assessed.",
  "procedure": "Review decisions based on personal data in the unit (e.g., selection, discipline) for fairness and transparency.",
  "evidence": "Decision records",
  "risk": "Low"
 },
 {
  "area": "Prior findings follow-up",
  "law": "GAID Art. 10(1), (11)",
  "objective": "Previous audit/CAR findings for the unit are remediated.",
  "procedure": "Obtain prior-year findings for the unit; verify implementation of each agreed action.",
  "evidence": "Prior report; action tracker",
  "risk": "Medium"
 }
];
export const UNITS: Unit[] = [
 {
  "sheet": "CEN-DPO Office",
  "name": "Data Protection Office (DPO) & Central Governance",
  "type": "Central Governance",
  "reportsTo": "Vice-Chancellor / University Management",
  "subjects": "All data subjects of the University",
  "data": "Consolidated ROPA, DPIAs, breach register, complaints, CAR records",
  "systems": "CAR portal, ROPA register, breach log",
  "risk": "High",
  "keyProcesses": "",
  "baseRisk": [],
  "specific": [
   {
    "area": "Registration as DCMI",
    "law": "GAID Art. 8, 9 & Sch. 7; NDPA s.44",
    "objective": "University is registered with NDPC as a Data Controller of Major Importance at the correct level (UHL/EHL/OHL).",
    "procedure": "Confirm NDPC registration certificate, check classification against Schedule 7 criteria (student + staff population, sensitivity) and confirm level is still accurate.",
    "evidence": "NDPC registration certificate; classification working paper",
    "risk": "High"
   },
   {
    "area": "Registration changes",
    "law": "GAID Art. 9(4)",
    "objective": "Significant changes to registration details notified to NDPC within 60 days.",
    "procedure": "Identify changes in the year (new VC/DPO, new campuses, new systems) and trace notification to NDPC within 60 days.",
    "evidence": "Change log; NDPC correspondence",
    "risk": "Medium"
   },
   {
    "area": "CAR filing",
    "law": "GAID Art. 10(6),(7),(12),(14)",
    "objective": "Annual CAR prepared on the Schedule 2 template and filed through a licensed DPCO via the NDPC portal by 31 March.",
    "procedure": "Confirm engagement of an NDPC-licensed DPCO, review prior-year CAR filing date and portal acknowledgement, confirm current CAR timetable meets 31 March deadline.",
    "evidence": "DPCO licence; DPCO engagement letter; prior CAR acknowledgement / certificate",
    "risk": "High"
   },
   {
    "area": "CAR fees & penalties",
    "law": "GAID Art. 10(9),(10) & Sch. 10",
    "objective": "Filing fee paid at the correct rate; no 50% late-filing penalty incurred.",
    "procedure": "Recompute filing fee per Schedule 10, trace payment in Bursary records, check for late-filing penalty.",
    "evidence": "Payment receipt; Schedule 10 computation",
    "risk": "Medium"
   },
   {
    "area": "NDPC information requests",
    "law": "GAID Art. 10(11) & (13)",
    "objective": "Additional information requested by NDPC after CAR filing was provided promptly; CAR certificate obtained.",
    "procedure": "Review NDPC correspondence after last filing and confirm timely responses and receipt of CAR certificate.",
    "evidence": "NDPC letters; response log; CAR certificate",
    "risk": "Medium"
   },
   {
    "area": "DPO designation",
    "law": "GAID Art. 11, 12; NDPA s.32",
    "objective": "DPO formally designated, reports directly to management, is resourced and free from conflict of interest.",
    "procedure": "Review appointment letter, organogram, DPO budget and other roles held; confirm DPO contact details published and communicated to NDPC.",
    "evidence": "Appointment letter; organogram; website DPO contact page",
    "risk": "High"
   },
   {
    "area": "DPO credentials",
    "law": "GAID Art. 14 & Sch. 3",
    "objective": "DPO is certified and maintains CPD for Annual Credential Assessment.",
    "procedure": "Inspect DPO certification and CPD evidence against Schedule 3 metrics.",
    "evidence": "Certificates; CPD log",
    "risk": "Medium"
   },
   {
    "area": "Semi-Annual DP Report",
    "law": "GAID Art. 13",
    "objective": "SADPR compiled twice in the year, acknowledged by management and filed with ROPA.",
    "procedure": "Obtain both SADPRs, confirm coverage of Art. 13(5)(a)-(m) items and management acknowledgement.",
    "evidence": "SADPR (H1 & H2); acknowledgement",
    "risk": "High"
   },
   {
    "area": "Consolidated ROPA",
    "law": "GAID Art. 13(3); Art. 52",
    "objective": "University-wide ROPA is complete and covers every faculty, school, directorate and department.",
    "procedure": "Reconcile consolidated ROPA against the audit universe on the Dashboard; list units without ROPA entries.",
    "evidence": "Consolidated ROPA; reconciliation",
    "risk": "High"
   },
   {
    "area": "Compliance schedules",
    "law": "GAID Art. 7(d),(h)",
    "objective": "Schedule of NDPA obligations and compliance timelines exists and is tracked.",
    "procedure": "Review compliance schedule and test status of five obligations to evidence.",
    "evidence": "Compliance schedule / tracker",
    "risk": "Medium"
   },
   {
    "area": "MEM schedule",
    "law": "GAID Art. 29(1)-(4)",
    "objective": "Monitoring, Evaluation & Maintenance schedule for data security exists and is vetted by a certified information security officer.",
    "procedure": "Inspect MEM schedule; confirm people/process/technology coverage and certification sign-off.",
    "evidence": "MEM schedule; InfoSec officer certificate",
    "risk": "High"
   },
   {
    "area": "SToP schedule",
    "law": "GAID Art. 30(1)-(5); Art. 46",
    "objective": "University-wide Sensitisation & Training on Privacy schedule is approved and published to staff.",
    "procedure": "Inspect SToP schedule, publication medium, and evaluation of stop/start/continue practices.",
    "evidence": "SToP schedule; intranet/notice board evidence",
    "risk": "Medium"
   },
   {
    "area": "Privacy policy & cookies",
    "law": "GAID Art. 7(j)-(l), Art. 19",
    "objective": "University privacy policy and conspicuous cookie banner with accept/reject options are published on the website and portals.",
    "procedure": "Visit main website, student portal and application portal; confirm banner position, reject option and policy content per Art. 27(3).",
    "evidence": "Screenshots; privacy policy",
    "risk": "High"
   },
   {
    "area": "Complaints process",
    "law": "GAID Art. 7(w), 39, 40 & Sch. 9",
    "objective": "Complaints/SNAG process explained to data subjects, including right to complain to NDPC; SNAG decisions reported.",
    "procedure": "Review complaints register and SNAGs received; test resolution timelines and NDPC reporting.",
    "evidence": "Complaints register; SNAG responses",
    "risk": "Medium"
   },
   {
    "area": "Breach register",
    "law": "GAID Art. 33; NDPA s.40",
    "objective": "Central breach register maintained; notifiable breaches reported to NDPC within 72 hours.",
    "procedure": "Review breach register, test notification timestamps and Art. 33(5) content.",
    "evidence": "Breach register; NDPC notifications",
    "risk": "High"
   },
   {
    "area": "DPIA filings",
    "law": "GAID Art. 28(3),(5),(12)",
    "objective": "Mandatory DPIAs (incl. educational services, CCTV, health) completed, signed by a certified DPO and filed with NDPC; outcomes included in CAR.",
    "procedure": "List high-risk processing across units and confirm DPIA exists, is signed and filed.",
    "evidence": "DPIA register; NDPC filing evidence",
    "risk": "High"
   },
   {
    "area": "IDPM benchmarking",
    "law": "GAID Art. 35",
    "objective": "Any benchmarking against interoperable data privacy measures is approved by NDPC.",
    "procedure": "Enquire about IDPMs adopted (e.g., ISO 27701) and confirm approval where required.",
    "evidence": "IDPM approvals",
    "risk": "Low"
   },
   {
    "area": "ROPA",
    "law": "GAID Art. 13(2)-(3), Art. 52; NDPA s.24(3)",
    "objective": "All processing activities of the unit are captured in the Record of Processing Activities (ROPA) submitted to the DPO.",
    "procedure": "Walk through {unit}'s key processing (registration, CAR preparation, ROPA consolidation, SADPR, complaints handling) and confirm each activity is captured in the ROPA with purpose, data categories, recipients and retention.",
    "evidence": "Unit ROPA extract; process walkthrough notes",
    "risk": "High"
   },
   {
    "area": "Data inventory & sensitive data",
    "law": "NDPA s.30; GAID Art. 28(3)(d)",
    "objective": "Personal and sensitive personal data held by the unit is identified and classified.",
    "procedure": "Inventory data held (Consolidated ROPA, DPIAs, breach register, complaints, CAR records); flag sensitive categories and confirm they are recorded as such.",
    "evidence": "Data inventory; classification register",
    "risk": "High"
   },
   {
    "area": "Lawful basis",
    "law": "GAID Art. 16, 23; NDPA s.25",
    "objective": "A documented lawful basis exists for each processing activity; legitimate interest supported by LIA.",
    "procedure": "For each ROPA activity, confirm lawful basis is recorded and appropriate; where legitimate interest is used, inspect Schedule 8 LIA.",
    "evidence": "Lawful basis register; LIAs",
    "risk": "High"
   },
   {
    "area": "Consent (CAR disclosure)",
    "law": "GAID Art. 17, 18(1)-(2); NDPA s.26",
    "objective": "Consent is obtained and recorded where required (marketing, sensitive data, children, incompatible further processing, transfers, automated decisions) — CAR must state reliance.",
    "procedure": "Identify Art. 18(1) activities in {unit}; test consent capture, records and ease of withdrawal for a sample of 5.",
    "evidence": "Consent forms/records; withdrawal mechanism",
    "risk": "High"
   },
   {
    "area": "Privacy notice at collection",
    "law": "GAID Art. 27; Art. 7(j)-(m); NDPA s.27",
    "objective": "Data subjects receive clear privacy information at every collection point (forms, portals, surveys).",
    "procedure": "Collect all forms/portals used by {unit}; check each notice against Art. 27(3)(a)-(j).",
    "evidence": "Forms; screenshots; notice checklist",
    "risk": "High"
   },
   {
    "area": "Minimisation & purpose limitation",
    "law": "GAID Art. 15 & Sch. 1; NDPA s.24(1)(b),(c)",
    "objective": "Only data necessary for the stated purpose is collected and used.",
    "procedure": "Review fields on {unit} forms and systems (CAR portal, ROPA register, breach log); identify excessive fields (e.g., religion, NIN, BVN) not justified by purpose.",
    "evidence": "Form review worksheet",
    "risk": "High"
   },
   {
    "area": "Retention & disposal",
    "law": "GAID Art. 49(3)-(4); NDPA s.24(1)(d)",
    "objective": "Retention periods defined; data disposed of securely (default not later than 6 months after purpose ends unless justified).",
    "procedure": "Obtain retention schedule; inspect archives/systems for data past retention; review disposal records (shredding/wiping).",
    "evidence": "Retention schedule; disposal certificates",
    "risk": "High"
   },
   {
    "area": "Accuracy & rectification",
    "law": "GAID Art. 36; NDPA s.24(1)(e)",
    "objective": "Data subjects can verify and correct data; input errors by the unit corrected free of charge.",
    "procedure": "Review rectification procedure (e.g., name/DOB corrections); sample 5 requests for timeliness and absence of fees for unit errors.",
    "evidence": "Correction requests; procedure",
    "risk": "High"
   },
   {
    "area": "Data subject rights",
    "law": "GAID Art. 36-38, 40; NDPA s.34-38",
    "objective": "Access, erasure, portability, objection requests and SNAGs are logged, escalated to the DPO and resolved on time.",
    "procedure": "Enquire about requests received by {unit}; test log and escalation to DPO.",
    "evidence": "Rights request log; SNAG responses",
    "risk": "High"
   },
   {
    "area": "Physical & access security",
    "law": "NDPA s.39; GAID Art. 29",
    "objective": "Physical records and system access are restricted on a need-to-know basis.",
    "procedure": "Inspect records rooms/cabinets; review user access list for CAR portal, ROPA register, breach log and confirm leavers are removed.",
    "evidence": "Access lists; site inspection photos",
    "risk": "High"
   },
   {
    "area": "Technical security & devices",
    "law": "GAID Art. 10(5), 29(2); NDPA s.39",
    "objective": "Unit devices and online systems use authentication, encryption, updated software and are audited frequently.",
    "procedure": "Sample 5 unit laptops/desktops: password, screen lock, encryption, antivirus, OS updates; check use of personal email/USB for personal data.",
    "evidence": "Device checklist; screenshots",
    "risk": "High"
   },
   {
    "area": "Third-party processors & DPAs",
    "law": "GAID Art. 34; NDPA s.29",
    "objective": "Vendors/partners processing personal data for {unit} have Data Processing Agreements and were vetted.",
    "procedure": "List third parties receiving data from {unit}; inspect DPAs against Art. 34(2).",
    "evidence": "Vendor list; DPAs",
    "risk": "High"
   },
   {
    "area": "DPIA",
    "law": "GAID Art. 28(1)-(5),(13) & Sch. 4",
    "objective": "DPIA completed where processing is high-risk (incl. educational services records under Art. 28(3)(m)) and outcome feeds the CAR.",
    "procedure": "Assess whether {unit}'s processing triggers Art. 28(3); inspect DPIA and DPO sign-off.",
    "evidence": "DPIA; DPO sign-off",
    "risk": "High"
   },
   {
    "area": "Cross-border transfers",
    "law": "GAID Art. 45 & Sch. 5; NDPA s.41-43",
    "objective": "Any transfer of personal data outside Nigeria (cloud tools, foreign partners) has a valid transfer basis.",
    "procedure": "Identify foreign tools/partners used by {unit} (e.g., Google Workspace, Zoom, foreign institutions) and confirm transfer basis.",
    "evidence": "Tool inventory; transfer assessment",
    "risk": "High"
   },
   {
    "area": "Breach detection & escalation",
    "law": "GAID Art. 33; NDPA s.40",
    "objective": "Staff know how to recognise and report breaches immediately to the DPO to meet the 72-hour NDPC deadline.",
    "procedure": "Interview 3 staff on breach reporting; review incidents in {unit} during the year and escalation timestamps.",
    "evidence": "Interview notes; incident reports",
    "risk": "High"
   },
   {
    "area": "Training & privacy checklist",
    "law": "GAID Art. 7(v), 30(7), 46",
    "objective": "Staff handling personal data are trained at least annually and have a basic privacy checklist.",
    "procedure": "Compare training attendance to staff list of {unit}; confirm basic privacy checklist is available.",
    "evidence": "Training register; checklist",
    "risk": "High"
   },
   {
    "area": "Privacy Champion",
    "law": "GAID Art. 7(i)",
    "objective": "An Associate DPO / Privacy Champion is designated for the unit and liaises with the DPO.",
    "procedure": "Inspect designation letter and evidence of liaison (meetings, reports).",
    "evidence": "Designation letter; minutes",
    "risk": "Low"
   },
   {
    "area": "Routine compliance checks",
    "law": "GAID Art. 30(8)",
    "objective": "Unannounced routine compliance checks are carried out in the unit.",
    "procedure": "Review results of routine checks performed in {unit} during the year.",
    "evidence": "Check reports",
    "risk": "Low"
   },
   {
    "area": "SADPR input",
    "law": "GAID Art. 13(5)",
    "objective": "Unit provides inputs to the DPO's Semi-Annual Data Protection Report.",
    "procedure": "Confirm {unit} submissions for H1 and H2 reports.",
    "evidence": "Submissions to DPO",
    "risk": "Low"
   },
   {
    "area": "Software & emerging tech",
    "law": "GAID Art. 31, 43",
    "objective": "New software, apps or AI tools adopted by the unit had DPIA and privacy by design review.",
    "procedure": "Enquire about new tools adopted by {unit} (incl. AI tools); inspect approvals/DPIAs.",
    "evidence": "Tool approvals; DPIAs",
    "risk": "High"
   },
   {
    "area": "Data ethics & fairness",
    "law": "GAID Art. 41-42",
    "objective": "Processing is fair, transparent and non-discriminatory; outcomes assessed.",
    "procedure": "Review decisions based on personal data in {unit} (e.g., selection, discipline) for fairness and transparency.",
    "evidence": "Decision records",
    "risk": "Low"
   },
   {
    "area": "Prior findings follow-up",
    "law": "GAID Art. 10(1), (11)",
    "objective": "Previous audit/CAR findings for the unit are remediated.",
    "procedure": "Obtain prior-year findings for {unit}; verify implementation of each agreed action.",
    "evidence": "Prior report; action tracker",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "DIR-ICT",
  "name": "Directorate of Information & Communication Technology (DICT)",
  "type": "Directorate",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Students, applicants, staff, alumni, website visitors",
  "data": "Portal credentials, biodata, results, email, logs, biometrics",
  "systems": "Student portal, ERP/SIS, email, LMS hosting, data centre, cloud services",
  "risk": "High",
  "keyProcesses": "portal administration, account management, hosting and backups",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Online device audit frequency",
    "law": "GAID Art. 10(5)",
    "objective": "Internet-facing systems holding personal data are audited as frequently as possible.",
    "procedure": "Obtain inventory of internet-facing systems; confirm VAPT / security audit dates within the year.",
    "evidence": "System inventory; VAPT reports",
    "risk": "High"
   },
   {
    "area": "Vulnerability & patching",
    "law": "GAID Art. 29(2)(c),(d)",
    "objective": "Software updates and database vulnerability tests are performed per the MEM schedule.",
    "procedure": "Sample 5 servers/databases; compare patch levels and scan dates against MEM schedule.",
    "evidence": "Patch reports; scan results",
    "risk": "High"
   },
   {
    "area": "Authentication & encryption",
    "law": "GAID Art. 29(2)(f),(g); NDPA s.39",
    "objective": "MFA for privileged and portal admin accounts; encryption at rest and in transit reviewed.",
    "procedure": "Test MFA on admin accounts; inspect TLS configuration of portals and database encryption settings.",
    "evidence": "MFA config; TLS scan; encryption review",
    "risk": "High"
   },
   {
    "area": "Cloud & hosting processors",
    "law": "GAID Art. 34, 45",
    "objective": "Cloud/hosting providers have DPAs and lawful basis for any cross-border storage.",
    "procedure": "List cloud services (email, storage, LMS); inspect DPAs and data location clauses.",
    "evidence": "DPAs; hosting contracts",
    "risk": "High"
   },
   {
    "area": "Backup & availability",
    "law": "GAID Art. 29; Sch. 1 (CIA)",
    "objective": "Backups are encrypted, tested for restoration and access-restricted.",
    "procedure": "Review backup schedule and last restore test; confirm offsite copy protection.",
    "evidence": "Backup logs; restore test report",
    "risk": "Medium"
   },
   {
    "area": "Software deployment",
    "law": "GAID Art. 31",
    "objective": "University apps/portals interacting with data subjects had DPIA, privacy by design and in-app privacy statement.",
    "procedure": "For each app launched/updated in the year, inspect DPIA and pre-installation privacy statement per Art. 31(2)(e).",
    "evidence": "App DPIAs; screenshots",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "DIR-Academic Planning",
  "name": "Directorate of Academic Planning",
  "type": "Directorate",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Students, staff",
  "data": "Enrolment statistics, staff nominal roll, NUC returns",
  "systems": "NUC portal, planning databases, spreadsheets",
  "risk": "Medium",
  "keyProcesses": "NUC/TETFund statistical returns, programme planning",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Anonymisation of statistics",
    "law": "GAID Art. 35(6)(a); NDPA s.24(1)(c)",
    "objective": "Statistical returns to NUC, TETFund and rankings bodies use aggregated or anonymised data where identities are not required.",
    "procedure": "Sample 3 external returns; confirm personal identifiers are removed or justified by legal obligation.",
    "evidence": "Returns submitted; data extracts",
    "risk": "Medium"
   },
   {
    "area": "Legal obligation reliance",
    "law": "GAID Art. 22",
    "objective": "Disclosures to regulators rest on a documented legal obligation limited to the minimum required.",
    "procedure": "Review requests from NUC/JAMB/TETFund; confirm DPO opinion or legal basis on file.",
    "evidence": "Request letters; DPO opinion",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "DIR-Quality Assurance",
  "name": "Directorate of Quality Assurance",
  "type": "Directorate",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Students, lecturers",
  "data": "Course evaluation responses, staff appraisal inputs, accreditation files",
  "systems": "Survey tools (online forms), accreditation portal",
  "risk": "Medium",
  "keyProcesses": "student evaluation of teaching, accreditation preparation",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Survey tools",
    "law": "GAID Art. 34, 45; Art. 19",
    "objective": "Online survey tools (e.g., Google Forms, SurveyMonkey) have DPAs and transfer safeguards; anonymity promised is honoured.",
    "procedure": "Inspect survey settings (email collection off where anonymous), tool terms and data location.",
    "evidence": "Survey settings screenshots; tool terms",
    "risk": "Medium"
   },
   {
    "area": "Use of evaluations",
    "law": "GAID Art. 41, 42(5)",
    "objective": "Evaluation results used against staff are fair, accurate and not solely automated.",
    "procedure": "Review how evaluation scores feed appraisal/promotion; confirm human review.",
    "evidence": "QA procedure; appraisal guidelines",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "DIR-Physical Planning",
  "name": "Directorate of Physical Planning & Works",
  "type": "Directorate",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Contractors, artisans, staff housing occupants",
  "data": "Contractor IDs, staff quarters allocation, maintenance requests",
  "systems": "Works request system, access registers",
  "risk": "Low",
  "keyProcesses": "staff housing allocation, contractor management, maintenance requests",
  "baseRisk": [
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Contractor data & site access",
    "law": "GAID Art. 34(3),(4)",
    "objective": "Contractors/artisans handling university premises data are bound by confidentiality and trained where high risk.",
    "procedure": "Sample contractor contracts for confidentiality clauses; review site access registers retention.",
    "evidence": "Contracts; access registers",
    "risk": "Low"
   }
  ]
 },
 {
  "sheet": "DIR-Health Services",
  "name": "Directorate of Health Services (University Health Centre)",
  "type": "Directorate",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Students, staff, dependants, patients",
  "data": "Medical records, diagnoses, test results, health insurance (NHIA/TISHIP) data, counselling notes",
  "systems": "Electronic Medical Records, NHIA portal, lab system",
  "risk": "High",
  "keyProcesses": "patient registration, consultation, pharmacy, lab tests, health insurance claims, medical fitness certification",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Sensitive health data",
    "law": "NDPA s.30; GAID Art. 18(1)(b)",
    "objective": "Processing of health data has an Art. 30 condition and explicit consent where required.",
    "procedure": "Review patient registration forms and consent for treatment/data use; test 10 files.",
    "evidence": "Consent forms; patient files",
    "risk": "High"
   },
   {
    "area": "Health care DPIA",
    "law": "GAID Art. 28(3)(i)",
    "objective": "DPIA for health care services is completed, signed by a certified DPO and filed with NDPC.",
    "procedure": "Inspect DPIA and NDPC filing evidence.",
    "evidence": "DPIA; filing evidence",
    "risk": "High"
   },
   {
    "area": "Medical confidentiality",
    "law": "GAID Art. 38(2)(b)(iv); NDPA s.39",
    "objective": "Medical records accessible only to clinicians on need-to-know basis; fitness reports to faculties disclose only outcome.",
    "procedure": "Test EMR role permissions and review medical fitness reports sent to admissions/sports.",
    "evidence": "EMR access list; sample reports",
    "risk": "High"
   },
   {
    "area": "Insurance processors",
    "law": "GAID Art. 34",
    "objective": "DPAs in place with HMOs/NHIA and lab partners.",
    "procedure": "Inspect agreements with HMOs and external labs for Art. 34(2) clauses.",
    "evidence": "HMO agreements",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "DIR-Security Services",
  "name": "Directorate of Security Services",
  "type": "Directorate",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Students, staff, visitors, suspects/complainants",
  "data": "CCTV footage, visitor logs, incident reports, ID cards, vehicle registration",
  "systems": "CCTV/NVR, visitor register, access control / biometric gates",
  "risk": "High",
  "keyProcesses": "CCTV surveillance, visitor management, investigations, gate access control",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "CCTV DPIA & signage",
    "law": "GAID Art. 28(3)(k)",
    "objective": "DPIA completed for CCTV in publicly accessible areas; signage displayed; no cameras in private areas.",
    "procedure": "Inspect CCTV DPIA; physically check 5 camera locations for signage and intrusiveness.",
    "evidence": "CCTV DPIA; site photos",
    "risk": "High"
   },
   {
    "area": "Footage retention & release",
    "law": "GAID Art. 49(3); Art. 22",
    "objective": "CCTV retention period defined; footage released to police only on valid legal request, logged.",
    "procedure": "Review NVR retention settings and footage release log against written requests.",
    "evidence": "NVR settings; release log",
    "risk": "High"
   },
   {
    "area": "Criminal/incident records",
    "law": "NDPA s.30; GAID Art. 41",
    "objective": "Incident and disciplinary investigation reports secured and shared only with authorised panels.",
    "procedure": "Inspect storage of investigation files; test access restrictions.",
    "evidence": "Incident files; access list",
    "risk": "High"
   },
   {
    "area": "Biometric access",
    "law": "GAID Art. 18(1)(b), 28(3)(d)",
    "objective": "Biometric gate/attendance data has lawful basis, DPIA and security controls.",
    "procedure": "Confirm biometric systems in use, DPIA, vendor DPA and template storage protection.",
    "evidence": "Biometric system DPIA; vendor DPA",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "DIR-Research & Dev",
  "name": "Directorate of Research, Innovation & Development",
  "type": "Directorate",
  "reportsTo": "DVC (Research)",
  "subjects": "Researchers, research participants, grant applicants",
  "data": "Research proposals, participant data, grant applicant biodata",
  "systems": "Grant management system, ethics committee files",
  "risk": "Medium",
  "keyProcesses": "TETFund/IBR grants, research ethics review, IP and innovation",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Research ethics & DPIA",
    "law": "GAID Art. 28, 41, 42",
    "objective": "Research ethics committee requires data protection review (consent, anonymisation, DPIA) for studies involving human participants.",
    "procedure": "Review ethics application template and 5 approved protocols for data protection sections.",
    "evidence": "Ethics template; approved protocols",
    "risk": "High"
   },
   {
    "area": "Research exemption use",
    "law": "GAID Art. 5; Art. 38(2)(c)",
    "objective": "Reliance on research exemptions still complies with principles, lawful basis, DPO and breach obligations.",
    "procedure": "Confirm research data management plans address s.24, s.25, s.40 obligations.",
    "evidence": "Data management plans",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "DIR-Linkages",
  "name": "Directorate of Linkages & International Collaborations",
  "type": "Directorate",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Exchange students, visiting scholars, foreign partners",
  "data": "Passport details, visas, transcripts, travel records",
  "systems": "Partner portals, email",
  "risk": "High",
  "keyProcesses": "student/staff exchange, MoU partnerships, international admissions",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Cross-border transfers",
    "law": "GAID Art. 45 & Sch. 5; NDPA s.41-43",
    "objective": "Transfers of student/staff data to foreign partners rely on adequacy, SCCs or consent with documented assessment.",
    "procedure": "List partners receiving personal data; inspect transfer mechanism and Schedule 5 assessment for each.",
    "evidence": "MoUs; SCCs; transfer assessments",
    "risk": "High"
   },
   {
    "area": "Consent for transfer",
    "law": "GAID Art. 18(1)(e)",
    "objective": "Consent is obtained where transfer is to a country without an NDPC adequacy decision.",
    "procedure": "Sample 5 exchange participants; confirm informed consent covering transfer risks.",
    "evidence": "Consent forms",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "DIR-Student Affairs",
  "name": "Directorate of Student Affairs",
  "type": "Directorate",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, parents/guardians, student union officials",
  "data": "Hostel allocation, counselling notes, disciplinary records, scholarships, disability records",
  "systems": "Hostel portal, counselling files, SUG records",
  "risk": "High",
  "keyProcesses": "hostel allocation, counselling, student discipline, scholarships and bursaries",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Counselling & welfare records",
    "law": "NDPA s.30; GAID Art. 18(1)(b)",
    "objective": "Counselling and disability records are held separately under strict confidentiality with explicit consent.",
    "procedure": "Inspect counselling record storage and consent forms; test access restrictions.",
    "evidence": "Consent forms; storage inspection",
    "risk": "High"
   },
   {
    "area": "Minors in residence",
    "law": "NDPA s.31; GAID Art. 18(1)(d)",
    "objective": "Parent/guardian consent obtained for processing of students under 18.",
    "procedure": "Filter hostel records for students under 18; confirm guardian consent on file.",
    "evidence": "Age report; guardian consent",
    "risk": "High"
   },
   {
    "area": "Disciplinary publication",
    "law": "GAID Art. 41, 42(3)",
    "objective": "Publication of expulsion/rustication lists limits personal data to what is necessary.",
    "procedure": "Review notices published in the year for excessive personal data.",
    "evidence": "Published notices",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "DIR-Advancement",
  "name": "Directorate of Advancement, Alumni & Endowment",
  "type": "Directorate",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Alumni, donors, prospective donors",
  "data": "Contact details, employment, donation history, bank details",
  "systems": "Alumni database, CRM, bulk email/SMS tools",
  "risk": "Medium",
  "keyProcesses": "alumni database, fundraising campaigns, newsletters",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Direct marketing consent",
    "law": "GAID Art. 18(1)(a); NDPA s.36",
    "objective": "Fundraising and marketing messages are sent only with consent and include easy opt-out.",
    "procedure": "Sample 3 campaigns; trace recipients to consent records and test unsubscribe.",
    "evidence": "Consent records; campaign samples",
    "risk": "High"
   },
   {
    "area": "Bulk messaging processors",
    "law": "GAID Art. 34, 45",
    "objective": "Bulk SMS/email/CRM vendors have DPAs and transfer safeguards.",
    "procedure": "Inspect vendor DPAs and data location.",
    "evidence": "Vendor DPAs",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "DEPT-HR Establishments",
  "name": "Registry – Establishments / Human Resources",
  "type": "Department",
  "reportsTo": "Registrar",
  "subjects": "Staff, job applicants, next of kin, pensioners",
  "data": "Staff files, NIN, BVN, next of kin, medical, promotion, disciplinary records",
  "systems": "IPPIS, HR records, recruitment portal, personnel files",
  "risk": "High",
  "keyProcesses": "recruitment, staff records, promotion, discipline, pensions",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Recruitment data",
    "law": "GAID Art. 21(1),(2)",
    "objective": "Data of unsuccessful job applicants destroyed within 6 months unless legally justified.",
    "procedure": "Review retention of last recruitment exercise applications.",
    "evidence": "Applicant files; disposal records",
    "risk": "Medium"
   },
   {
    "area": "IPPIS/PFA sharing",
    "law": "GAID Art. 22, 34",
    "objective": "Sharing with IPPIS, PFAs, PenCom and tax authorities rests on legal obligation and is limited to required fields.",
    "procedure": "Map staff data fields shared with each external body; confirm necessity.",
    "evidence": "Data-sharing map; returns",
    "risk": "Medium"
   },
   {
    "area": "Personnel file security",
    "law": "NDPA s.39; GAID Art. 29",
    "objective": "Personnel files secured in locked registry with sign-out log.",
    "procedure": "Physically inspect records room and test file movement register.",
    "evidence": "File movement register",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "DEPT-Admissions",
  "name": "Registry – Admissions Office",
  "type": "Department",
  "reportsTo": "Registrar",
  "subjects": "UTME/DE applicants (incl. minors), parents",
  "data": "JAMB CAPS data, O'level results, post-UTME scores, photographs",
  "systems": "JAMB CAPS, admissions portal, screening CBT",
  "risk": "High",
  "keyProcesses": "post-UTME screening, CAPS admission processing, result verification with WAEC/NECO",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Applicants under 18",
    "law": "NDPA s.31; GAID Art. 18(1)(d)",
    "objective": "Parental consent/authorisation obtained for processing data of applicants below 18.",
    "procedure": "Filter applicant data by date of birth; confirm guardian consent mechanism on portal.",
    "evidence": "Portal consent screen; age analysis",
    "risk": "High"
   },
   {
    "area": "Educational services DPIA",
    "law": "GAID Art. 28(3)(m)",
    "objective": "DPIA covers applicant screening and admission processing.",
    "procedure": "Inspect DPIA for admissions processing.",
    "evidence": "DPIA",
    "risk": "High"
   },
   {
    "area": "Admission list publication",
    "law": "GAID Art. 15; Sch. 1",
    "objective": "Published admission lists show minimum data (no phone numbers, DOB or scores beyond necessity).",
    "procedure": "Review published lists on website/notice boards.",
    "evidence": "Published lists",
    "risk": "Medium"
   },
   {
    "area": "Automated screening decisions",
    "law": "GAID Art. 18(1)(f); NDPA s.37",
    "objective": "Admission decisions are not solely automated, or consent/review mechanism exists.",
    "procedure": "Walk through cut-off and ranking logic; confirm human review and appeal route.",
    "evidence": "Screening procedure; appeal records",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "DEPT-Exams & Records",
  "name": "Registry – Examinations & Records",
  "type": "Department",
  "reportsTo": "Registrar",
  "subjects": "Students, graduates, employers, verification agencies",
  "data": "Results, transcripts, certificates, verification requests",
  "systems": "Results processing system, transcript portal",
  "risk": "High",
  "keyProcesses": "result compilation, transcript issuance, certificate verification",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Transcript & verification requests",
    "law": "GAID Art. 45; Art. 17",
    "objective": "Transcripts sent abroad (e.g., WES, foreign universities) and verification responses to employers rely on graduate request/consent.",
    "procedure": "Sample 10 transcript/verification requests; confirm authorisation by the graduate.",
    "evidence": "Request forms; consent evidence",
    "risk": "High"
   },
   {
    "area": "Result integrity",
    "law": "GAID Art. 36; NDPA s.24(1)(e)",
    "objective": "Result amendments are authorised, logged and traceable to source.",
    "procedure": "Sample 10 result changes; trace to Senate approval and audit trail.",
    "evidence": "Audit trail; Senate approvals",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "DEPT-Council & Senate",
  "name": "Registry – Council & Senate Affairs",
  "type": "Department",
  "reportsTo": "Registrar",
  "subjects": "Council/Senate members, students and staff discussed in minutes",
  "data": "Minutes containing disciplinary, appointment and appeal decisions",
  "systems": "Minutes archive, board papers",
  "risk": "Medium",
  "keyProcesses": "preparing and circulating Council/Senate papers and minutes",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Circulation of papers",
    "law": "GAID Art. 15; NDPA s.39",
    "objective": "Board papers containing personal data are circulated securely and retrieved/destroyed after use.",
    "procedure": "Review distribution method (email/WhatsApp/hard copy) and retrieval practice.",
    "evidence": "Distribution list; procedure",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "DEPT-Bursary",
  "name": "Bursary Department",
  "type": "Department",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Students, staff, vendors, parents",
  "data": "Bank details, BVN, payroll, fee payments, tax IDs",
  "systems": "Remita/TSA, payment gateways, payroll, accounting system",
  "risk": "High",
  "keyProcesses": "fee collection, payroll, vendor payments, refunds",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Payment gateway processors",
    "law": "GAID Art. 34; Art. 28(3)(h)",
    "objective": "Payment gateways and banks have DPAs; digital payment processing covered by DPIA.",
    "procedure": "Inspect gateway contracts and DPIA for online payments.",
    "evidence": "Gateway contracts; DPIA",
    "risk": "High"
   },
   {
    "area": "Financial data security",
    "law": "NDPA s.39; GAID Art. 29",
    "objective": "Payroll and bank data restricted by role; exports encrypted.",
    "procedure": "Test system access rights; review how payroll schedules are sent to banks.",
    "evidence": "Access list; transmission method",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "DEPT-Library",
  "name": "University Library",
  "type": "Department",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Students, staff, external readers",
  "data": "Patron records, borrowing history, e-resource access logs",
  "systems": "Library management system, e-resource proxy, CCTV",
  "risk": "Medium",
  "keyProcesses": "patron registration, circulation, e-resource authentication",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Reading history confidentiality",
    "law": "GAID Art. 41, 42(3)",
    "objective": "Borrowing and e-resource access histories are not disclosed or used for profiling.",
    "procedure": "Review LMS privacy settings and log retention for proxy/e-resources.",
    "evidence": "System settings; retention policy",
    "risk": "Medium"
   },
   {
    "area": "E-resource vendors",
    "law": "GAID Art. 34, 45",
    "objective": "Foreign e-resource providers receiving user identifiers have transfer safeguards.",
    "procedure": "List SSO/proxy integrations passing user data; inspect terms.",
    "evidence": "Vendor terms",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "DEPT-Legal Unit",
  "name": "Legal Unit",
  "type": "Department",
  "reportsTo": "Registrar",
  "subjects": "Litigants, staff, students, contractors",
  "data": "Litigation files, contracts, legal opinions",
  "systems": "Legal files, contract register",
  "risk": "Medium",
  "keyProcesses": "litigation, contract review, legal opinions",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "DPA templates",
    "law": "GAID Art. 34(2)",
    "objective": "Standard DPA template containing Art. 34(2)(a)-(t) clauses is used for all processor contracts.",
    "procedure": "Review DPA template against Art. 34(2) checklist; sample 5 recent contracts.",
    "evidence": "DPA template; contracts",
    "risk": "High"
   },
   {
    "area": "Legal obligation opinions",
    "law": "GAID Art. 22(6),(7)",
    "objective": "Requests from police, courts and agencies are reviewed for legal competence and scope before disclosure.",
    "procedure": "Sample disclosure requests and review opinions issued.",
    "evidence": "Request files; opinions",
    "risk": "Medium"
   },
   {
    "area": "Oust clauses",
    "law": "GAID Art. 21(4)",
    "objective": "Contracts do not oust jurisdiction of Nigerian courts or NDPC on data processing.",
    "procedure": "Review foreign vendor contracts for governing law/jurisdiction clauses.",
    "evidence": "Vendor contracts",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "DEPT-Info & PR",
  "name": "Information, Public Relations & Protocol",
  "type": "Department",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Students, staff, event attendees, social media audience",
  "data": "Photos, videos, names in publications, website visitor data",
  "systems": "Website, social media pages, bulk SMS, CMS",
  "risk": "Medium",
  "keyProcesses": "event coverage, publications, social media, website management",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Event photography",
    "law": "GAID Art. 17(8)(a)",
    "objective": "Event images used only for reporting unless express consent obtained for promotional use; attendees notified.",
    "procedure": "Review event notices and a sample of adverts/prospectus images for model consent.",
    "evidence": "Event notices; consent releases",
    "risk": "Medium"
   },
   {
    "area": "Website cookies",
    "law": "GAID Art. 19; Art. 7(l)",
    "objective": "Website cookie banner is conspicuous, not at page bottom, with accept/reject choices.",
    "procedure": "Inspect website on desktop and mobile; review analytics/tracking tools used.",
    "evidence": "Screenshots; tag inventory",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "DEPT-Procurement",
  "name": "Procurement Department",
  "type": "Department",
  "reportsTo": "Vice-Chancellor",
  "subjects": "Bidders, vendors, contractors",
  "data": "Bidder directors' IDs, tax & bank details, CVs of key personnel",
  "systems": "Vendor register, tender files",
  "risk": "Medium",
  "keyProcesses": "tendering, vendor registration, contract award publication",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Vendor due diligence",
    "law": "GAID Art. 21(1),(2); Art. 34(3)",
    "objective": "Processors are vetted for NDPA compliance (incl. NDPC registration) before engagement; unsuccessful bid data retained only as justified.",
    "procedure": "Review vendor registration checklist for data protection criteria; check disposal of unsuccessful bids.",
    "evidence": "Checklist; tender files",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "FAC-Arts",
  "name": "Faculty of Arts",
  "type": "Faculty",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, lecturers, research participants",
  "data": "Student records, CA & exam scores, projects, oral history recordings",
  "systems": "Faculty/department files, results sheets, LMS",
  "risk": "Medium",
  "keyProcesses": "course registration, CA/exam records, project supervision, language lab recordings",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Recordings & oral histories",
    "law": "GAID Art. 17, 41",
    "objective": "Audio/video recordings of participants (oral history, language labs) have informed consent and secure storage.",
    "procedure": "Sample 5 recording projects for consent forms and storage location.",
    "evidence": "Consent forms; storage check",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "FAC-Education",
  "name": "Faculty of Education",
  "type": "Faculty",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, pupils in partner schools, teachers",
  "data": "Teaching practice reports, pupils' assessment data, student records",
  "systems": "Teaching practice files, results sheets",
  "risk": "High",
  "keyProcesses": "teaching practice supervision, micro-teaching recordings, examinations",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Pupils' data (minors)",
    "law": "NDPA s.31; GAID Art. 18(1)(d)",
    "objective": "Research and teaching practice involving pupils has school and parental consent; pupils' data is minimised.",
    "procedure": "Review 5 student projects/teaching practice files involving pupils for consent and anonymisation.",
    "evidence": "Consent letters; project files",
    "risk": "High"
   },
   {
    "area": "Micro-teaching recordings",
    "law": "GAID Art. 17, 49(3)",
    "objective": "Micro-teaching videos have consent and defined retention.",
    "procedure": "Inspect storage and retention of recordings.",
    "evidence": "Recording archive",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "FAC-Engineering",
  "name": "Faculty of Engineering",
  "type": "Faculty",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, industry supervisors",
  "data": "Student records, SIWES placement data, project data",
  "systems": "Results sheets, SIWES logbooks/portal",
  "risk": "Medium",
  "keyProcesses": "SIWES placement, labs, examinations, final-year projects",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "SIWES data sharing",
    "law": "GAID Art. 22, 34",
    "objective": "Student data shared with ITF and host companies is limited and covered by legal basis/agreements.",
    "procedure": "Map data shared on SIWES forms and with host employers.",
    "evidence": "SIWES forms; ITF returns",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "FAC-Law",
  "name": "Faculty of Law",
  "type": "Faculty",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, legal clinic clients, Law School",
  "data": "Student records, legal clinic client files (often sensitive), moot records",
  "systems": "Law clinic case files, results sheets",
  "risk": "High",
  "keyProcesses": "law clinic services, examinations, Law School enrolment",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Law clinic client files",
    "law": "NDPA s.30, s.39; GAID Art. 17",
    "objective": "Law clinic client data (incl. criminal/sensitive data) has consent, confidentiality undertakings from student volunteers and secure storage.",
    "procedure": "Inspect 5 client files, confidentiality undertakings and storage.",
    "evidence": "Client files; undertakings",
    "risk": "High"
   },
   {
    "area": "Law School referrals",
    "law": "GAID Art. 15",
    "objective": "Data sent to Nigerian Law School is limited to requirements.",
    "procedure": "Review data fields sent for Law School admission.",
    "evidence": "Referral forms",
    "risk": "Low"
   }
  ]
 },
 {
  "sheet": "FAC-Management Sciences",
  "name": "Faculty of Management Sciences",
  "type": "Faculty",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, survey respondents, SIWES employers",
  "data": "Student records, research survey data, SIWES data",
  "systems": "Results sheets, survey tools",
  "risk": "Medium",
  "keyProcesses": "examinations, student research surveys, SIWES",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Student survey research",
    "law": "GAID Art. 17, 27, 34",
    "objective": "Student research questionnaires include privacy information and consent; online survey tools are appropriate.",
    "procedure": "Sample 5 project questionnaires for consent/privacy notice and anonymisation.",
    "evidence": "Questionnaires",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "FAC-Science",
  "name": "Faculty of Science",
  "type": "Faculty",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, research participants",
  "data": "Student records, lab research data, SIWES data",
  "systems": "Results sheets, lab records",
  "risk": "Medium",
  "keyProcesses": "laboratory work, examinations, research projects",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Human subject samples",
    "law": "NDPA s.30; GAID Art. 28(3)(d)",
    "objective": "Studies involving human samples (e.g., microbiology, biochemistry) have ethics approval, consent and anonymisation.",
    "procedure": "Sample 3 projects involving human samples for ethics approval and coding of identities.",
    "evidence": "Ethics approvals; sample logs",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "FAC-Social Sciences",
  "name": "Faculty of Social Sciences",
  "type": "Faculty",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, research participants, communities",
  "data": "Student records, interview and survey data (political opinion, religion, ethnicity)",
  "systems": "Results sheets, field data, cloud storage",
  "risk": "High",
  "keyProcesses": "field research, surveys, examinations",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Sensitive research data",
    "law": "NDPA s.30; GAID Art. 18(1)(b), 28(3)(d)",
    "objective": "Research collecting sensitive attributes has explicit consent, DPIA where large-scale and pseudonymisation.",
    "procedure": "Sample 5 research instruments; confirm explicit consent and pseudonymised datasets.",
    "evidence": "Instruments; datasets",
    "risk": "High"
   },
   {
    "area": "Vulnerable participants",
    "law": "GAID Art. 28(3)(e) & Sch. 6",
    "objective": "Research involving vulnerable groups (IDPs, minors) assessed using Data Subject Vulnerability Indexes.",
    "procedure": "Identify projects with vulnerable groups; inspect DPIA/vulnerability assessment.",
    "evidence": "DPIAs",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "FAC-Agriculture",
  "name": "Faculty of Agriculture",
  "type": "Faculty",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, farmers, farm workers",
  "data": "Student records, farmer survey data, farm workers' records",
  "systems": "Results sheets, extension programme records",
  "risk": "Low",
  "keyProcesses": "farm practice, extension services, examinations",
  "baseRisk": [
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Farmer data & extension",
    "law": "GAID Art. 27(2)",
    "objective": "Farmers receive privacy information in a language they understand before data collection.",
    "procedure": "Review extension survey process and language of notices.",
    "evidence": "Field instruments",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "FAC-Environmental Sci",
  "name": "Faculty of Environmental Sciences",
  "type": "Faculty",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, communities surveyed",
  "data": "Student records, GIS/geolocation data, drone imagery",
  "systems": "GIS systems, drone footage archives",
  "risk": "Medium",
  "keyProcesses": "studio work, field surveys, drone/GIS mapping",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Geolocation & drone imagery",
    "law": "GAID Art. 28(3)(c), 43",
    "objective": "Drone and geolocation surveys that can identify people/homes are assessed for privacy and images of individuals minimised.",
    "procedure": "Review drone/GIS projects for DPIA/risk assessment and blurring practice.",
    "evidence": "Project files; imagery",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "FAC-Pharmaceutical Sci",
  "name": "Faculty of Pharmaceutical Sciences",
  "type": "Faculty",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, patients, trial participants",
  "data": "Student records, patient medication data, clinical trial data",
  "systems": "Results sheets, trial records",
  "risk": "High",
  "keyProcesses": "clinical pharmacy placements, drug research, examinations",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Clinical/trial data",
    "law": "NDPA s.30; GAID Art. 28(3)(i)",
    "objective": "Drug research and clinical placements handling patient data have ethics approval, consent and DPIA.",
    "procedure": "Sample research/placement records for consent, DPIA and pseudonymisation.",
    "evidence": "Ethics approvals; DPIA",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "FAC-Basic Medical Sci",
  "name": "Faculty of Basic Medical Sciences",
  "type": "Faculty",
  "reportsTo": "Provost, College of Health Sciences",
  "subjects": "Students, cadaver donors' families, research participants",
  "data": "Student records, anatomical donor records, physiological research data",
  "systems": "Results sheets, donor registers, lab records",
  "risk": "High",
  "keyProcesses": "anatomy/dissection, physiology experiments, examinations",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Donor & biological data",
    "law": "NDPA s.30; GAID Art. 41",
    "objective": "Cadaver/donor records and biological samples are handled with dignity, restricted access and lawful documentation.",
    "procedure": "Inspect donor register access and documentation.",
    "evidence": "Donor register",
    "risk": "High"
   },
   {
    "area": "Genetic/biobank research",
    "law": "GAID Art. 28(3)(d), 45",
    "objective": "Genetic or biobank data shared with foreign collaborators has DPIA and transfer safeguards.",
    "procedure": "Identify genetic studies; inspect DPIA and MTA/transfer agreements.",
    "evidence": "DPIA; MTAs",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "FAC-Clinical Sci",
  "name": "Faculty of Clinical Sciences",
  "type": "Faculty",
  "reportsTo": "Provost, College of Health Sciences",
  "subjects": "Medical students, patients in teaching hospital",
  "data": "Student records, patient case notes used in teaching, clinical photographs",
  "systems": "Teaching hospital EMR, case presentation files, WhatsApp groups",
  "risk": "High",
  "keyProcesses": "clinical postings, case presentations, examinations",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Patient data in teaching",
    "law": "NDPA s.30; GAID Art. 15, 41",
    "objective": "Case presentations, theses and clinical photos are de-identified; patient consent obtained for identifiable images.",
    "procedure": "Sample 5 case presentation slides/theses and clinical photos for identifiers.",
    "evidence": "Presentation files; consent",
    "risk": "High"
   },
   {
    "area": "Messaging groups",
    "law": "NDPA s.39; GAID Art. 29",
    "objective": "Patient information is not shared on personal messaging groups without safeguards.",
    "procedure": "Interview residents/students; review policy on use of WhatsApp for clinical discussions.",
    "evidence": "Policy; interview notes",
    "risk": "High"
   },
   {
    "area": "Teaching hospital arrangement",
    "law": "GAID Art. 34",
    "objective": "Data sharing between University and Teaching Hospital is covered by agreement defining controller roles.",
    "procedure": "Inspect University–Teaching Hospital MoU/data sharing agreement.",
    "evidence": "MoU / DSA",
    "risk": "High"
   }
  ]
 },
 {
  "sheet": "FAC-Computing",
  "name": "Faculty of Computing",
  "type": "Faculty",
  "reportsTo": "DVC (Academic)",
  "subjects": "Students, app users of student projects",
  "data": "Student records, project datasets, app user data",
  "systems": "Results sheets, project repositories (GitHub), lab servers",
  "risk": "Medium",
  "keyProcesses": "software projects, AI/ML coursework, examinations",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "Datasets in projects",
    "law": "GAID Art. 35(6)(a),(k), 43",
    "objective": "Student projects use anonymised or synthetic data; scraped personal data is not used without lawful basis.",
    "procedure": "Review 5 final-year project datasets and repositories for personal data exposure.",
    "evidence": "Repositories; datasets",
    "risk": "Medium"
   },
   {
    "area": "AI & emerging tech",
    "law": "GAID Art. 43, 44",
    "objective": "AI tools built or used in teaching/assessment consider automated decision rights and disparate outcomes.",
    "procedure": "Enquire about AI proctoring/grading tools; inspect risk assessment.",
    "evidence": "Tool assessments",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "SCH-Postgraduate",
  "name": "School of Postgraduate Studies",
  "type": "School",
  "reportsTo": "DVC (Academic)",
  "subjects": "PG applicants, students, supervisors, external examiners",
  "data": "Applications, referee reports, transcripts, theses, plagiarism reports",
  "systems": "PG portal, plagiarism checker (e.g., Turnitin), thesis repository",
  "risk": "High",
  "keyProcesses": "PG admission, thesis processing, external examination, repository deposit",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Plagiarism tool transfers",
    "law": "GAID Art. 34, 45",
    "objective": "Uploading theses to foreign plagiarism checkers is covered by agreement, transfer safeguards and student notice.",
    "procedure": "Inspect Turnitin/iThenticate licence terms, repository settings and student notice.",
    "evidence": "Licence; notice",
    "risk": "High"
   },
   {
    "area": "External examiners",
    "law": "GAID Art. 34(3); NDPA s.39",
    "objective": "Theses and results sent to external examiners are transmitted securely and returned/destroyed.",
    "procedure": "Review transmission method and confidentiality undertakings.",
    "evidence": "Examiner correspondence",
    "risk": "Medium"
   },
   {
    "area": "Referee reports",
    "law": "NDPA s.34",
    "objective": "Access requests to referee reports handled while protecting third-party rights.",
    "procedure": "Review procedure for access requests involving referee reports.",
    "evidence": "Procedure",
    "risk": "Low"
   }
  ]
 },
 {
  "sheet": "SCH-General Studies",
  "name": "School of General Studies",
  "type": "School",
  "reportsTo": "DVC (Academic)",
  "subjects": "All 100/200-level students",
  "data": "Registration lists, CBT exam data, scores",
  "systems": "CBT centre systems, results sheets",
  "risk": "Medium",
  "keyProcesses": "GST course registration, CBT examinations, results",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "Medium",
   "High",
   "High",
   "High",
   "High",
   "Medium",
   "High",
   "Medium",
   "Low",
   "Low",
   "Low",
   "Medium",
   "Low",
   "Medium"
  ],
  "specific": [
   {
    "area": "CBT examination data",
    "law": "GAID Art. 29, 36",
    "objective": "CBT systems protect candidate data, log access and allow correction of input errors without charge.",
    "procedure": "Test CBT admin access, audit logs and error-correction procedure.",
    "evidence": "CBT logs; procedure",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "SCH-Distance Learning",
  "name": "Centre/School of Distance Learning & Continuing Education",
  "type": "School",
  "reportsTo": "DVC (Academic)",
  "subjects": "Online learners (local & diaspora), facilitators",
  "data": "Biodata, payment data, LMS activity, proctoring video/biometrics",
  "systems": "Online LMS, online proctoring tool, payment gateway",
  "risk": "High",
  "keyProcesses": "online admission, LMS delivery, e-proctored exams",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Online proctoring",
    "law": "GAID Art. 18(1)(b),(f), 28(3)(c),(d)",
    "objective": "Webcam/biometric proctoring has DPIA, explicit consent, human review of flags and retention limits.",
    "procedure": "Inspect proctoring DPIA, consent screen, flag review process and video retention.",
    "evidence": "DPIA; consent screen; retention settings",
    "risk": "High"
   },
   {
    "area": "LMS cookies & tracking",
    "law": "GAID Art. 19, 31",
    "objective": "LMS and learner app display conspicuous cookie/privacy notices and in-app privacy statement.",
    "procedure": "Inspect LMS/app for cookie banner and pre-installation privacy statement.",
    "evidence": "Screenshots",
    "risk": "High"
   },
   {
    "area": "Diaspora learners",
    "law": "GAID Art. 1(4)(d), 45",
    "objective": "Processing of learners outside Nigeria and use of foreign cloud LMS addresses cross-border rules.",
    "procedure": "Review LMS hosting location and transfer basis.",
    "evidence": "Hosting contract",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "SCH-Basic Studies",
  "name": "School of Basic / Pre-Degree Studies (JUPEB/IJMB)",
  "type": "School",
  "reportsTo": "DVC (Academic)",
  "subjects": "Pre-degree students (mostly minors), parents",
  "data": "Biodata, parents' contacts, results",
  "systems": "Pre-degree portal, results sheets",
  "risk": "High",
  "keyProcesses": "pre-degree admission, examinations, JUPEB/IJMB registration",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Minors' consent",
    "law": "NDPA s.31; GAID Art. 18(1)(d)",
    "objective": "Parental consent obtained and parents informed of rights for students under 18.",
    "procedure": "Test 10 student files for parental consent and privacy information to parents.",
    "evidence": "Admission forms",
    "risk": "High"
   },
   {
    "area": "Exam body sharing",
    "law": "GAID Art. 22, 34",
    "objective": "Data shared with JUPEB/IJMB boards is limited and documented.",
    "procedure": "Review registration data fields sent to exam boards.",
    "evidence": "Registration returns",
    "risk": "Medium"
   }
  ]
 },
 {
  "sheet": "SCH-Staff School",
  "name": "University Staff School (Nursery/Primary/Secondary)",
  "type": "School",
  "reportsTo": "Registrar",
  "subjects": "Pupils (minors), parents, teachers",
  "data": "Pupil records, health and allergy data, photos, report cards",
  "systems": "School management software, class WhatsApp groups, CCTV",
  "risk": "High",
  "keyProcesses": "pupil enrolment, assessments, school events, parent communication",
  "baseRisk": [
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "High",
   "Low",
   "Low",
   "Low",
   "High",
   "Low",
   "High"
  ],
  "specific": [
   {
    "area": "Child data protection",
    "law": "NDPA s.31; GAID Art. 18(1)(d), 35(6)(c)",
    "objective": "All pupil data processing has parental consent; child online protection practices applied.",
    "procedure": "Review enrolment forms, consent and child online protection policy.",
    "evidence": "Forms; policy",
    "risk": "High"
   },
   {
    "area": "Pupil photos & social media",
    "law": "GAID Art. 17(8)(a), 41",
    "objective": "Pupils' images are not posted publicly without parental consent and never in ways that portray them badly.",
    "procedure": "Review school social media posts for identifiable pupils against consent list.",
    "evidence": "Posts; consent list",
    "risk": "High"
   },
   {
    "area": "Health & allergy data",
    "law": "NDPA s.30",
    "objective": "Pupils' health data restricted to school nurse/class teacher as necessary.",
    "procedure": "Inspect storage and access of pupil health records.",
    "evidence": "Health records",
    "risk": "High"
   }
  ]
 }
];
