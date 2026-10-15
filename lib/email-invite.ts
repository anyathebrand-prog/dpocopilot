// Invitation email (HTML), from the design in dpo-copilot-invite-email.html. {{name}} placeholders are filled, HTML-escaped, by inviteHtml().
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type InviteVars = { firm_name: string; inviter_name: string; role: string; expires_in: string; invite_url: string; email: string };

export const inviteHtml = (v: InviteVars) => TEMPLATE.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in v ? esc(v[k as keyof InviteVars]) : m));

export const inviteText = (v: InviteVars) =>
  `You've been invited to join ${v.firm_name} on DPO Copilot.

${v.inviter_name} added you as ${v.role}. Accept the invitation (expires in ${v.expires_in}):
${v.invite_url}

This invite is for ${v.email} only. If you weren't expecting it, ignore this email and no account will be created.`;

const TEMPLATE = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>You've been invited to DPO Copilot</title>
  <style>
    body { margin:0; padding:0; background:#EEF2F8; }
    a { text-decoration:none; }
    @media only screen and (max-width:620px) {
      .container { width:100% !important; }
      .px { padding-left:24px !important; padding-right:24px !important; }
      .h1 { font-size:24px !important; line-height:32px !important; }
      .btn a { display:block !important; }
      .stack { display:block !important; width:100% !important; padding-bottom:12px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#EEF2F8;">

  <!-- Preheader (shows in inbox preview, hidden in the email) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#EEF2F8;">
    {{inviter_name}} added you to {{firm_name}}'s compliance workspace. Accept to get started.
    &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF2F8;">
    <tr>
      <td align="center" style="padding:32px 12px;">

        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:#0A1F44; border-radius:16px 16px 0 0; padding:28px 40px;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                    <img src="cid:dpocopilot-logo" width="150" height="40" alt="DPO Copilot" style="display:block; width:150px; height:auto; border:0; outline:none; color:#FFFFFF; font-size:18px; font-weight:700;">
                  </td>
                  <td align="right" style="font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:12px; color:#8FA6CC;">
                    Powered by Bitechnologies
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="background:#0A1F44; padding:8px 40px 40px;" class="px">
              <h1 class="h1" style="margin:0; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:30px; line-height:38px; font-weight:700; color:#FFFFFF; letter-spacing:-0.5px;">
                You've been invited to join {{firm_name}} on DPO Copilot
              </h1>
              <p style="margin:14px 0 0; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:16px; line-height:25px; color:#C3D1EA;">
                {{inviter_name}} wants you on the team. Your workspace is set up and waiting.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF; padding:36px 40px 8px;" class="px">

              <!-- Access pass -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #D6E0F0; border-radius:14px; background:#F6F9FE;">
                <tr>
                  <td width="6" style="width:6px; background:#C9A227; border-radius:14px 0 0 14px;">&nbsp;</td>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 14px; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; color:#12336E;">
                      Your access pass
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="stack" width="50%" valign="top" style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                          <span style="display:block; font-size:12px; color:#6B7C99;">Workspace</span>
                          <span style="display:block; margin-top:2px; font-size:15px; font-weight:600; color:#0A1F44;">{{firm_name}}</span>
                        </td>
                        <td class="stack" width="50%" valign="top" style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                          <span style="display:block; font-size:12px; color:#6B7C99;">Your role</span>
                          <span style="display:block; margin-top:2px; font-size:15px; font-weight:600; color:#0A1F44;">{{role}}</span>
                        </td>
                      </tr>
                      <tr>
                        <td class="stack" width="50%" valign="top" style="padding-top:14px; font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                          <span style="display:block; font-size:12px; color:#6B7C99;">Invited by</span>
                          <span style="display:block; margin-top:2px; font-size:15px; font-weight:600; color:#0A1F44;">{{inviter_name}}</span>
                        </td>
                        <td class="stack" width="50%" valign="top" style="padding-top:14px; font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                          <span style="display:block; font-size:12px; color:#6B7C99;">Invite expires</span>
                          <span style="display:block; margin-top:2px; font-size:15px; font-weight:600; color:#0A1F44;">{{expires_in}}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;">
                <tr>
                  <td class="btn" align="left">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{invite_url}}" style="height:52px;v-text-anchor:middle;width:260px;" arcsize="20%" stroke="f" fillcolor="#12336E">
                      <center style="color:#FFFFFF;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Accept invitation</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="{{invite_url}}" target="_blank" style="display:inline-block; background:#12336E; color:#FFFFFF; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:16px; font-weight:600; line-height:52px; padding:0 36px; border-radius:10px; text-align:center;">
                      Accept invitation
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:16px 0 0; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:13px; line-height:20px; color:#6B7C99;">
                Button not working? Paste this link into your browser:<br>
                <a href="{{invite_url}}" style="color:#1E4FA8; word-break:break-all;">{{invite_url}}</a>
              </p>

              <!-- Divider -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 24px;">
                <tr><td style="border-top:1px solid #E3E9F3; font-size:0; line-height:0;">&nbsp;</td></tr>
              </table>

              <!-- What's inside -->
              <p style="margin:0 0 16px; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:16px; font-weight:700; color:#0A1F44;">
                What you can do once you're in
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="28" valign="top" style="padding:2px 0 16px;">
                    <div style="width:10px; height:10px; margin-top:6px; background:#1E4FA8; border-radius:3px;"></div>
                  </td>
                  <td valign="top" style="padding-bottom:16px; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:15px; line-height:23px; color:#334563;">
                    <strong style="color:#0A1F44;">Keep client records in one place.</strong> Processing activities, DPIAs, breaches and evidence, organised per client.
                  </td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="padding:2px 0 16px;">
                    <div style="width:10px; height:10px; margin-top:6px; background:#1E4FA8; border-radius:3px;"></div>
                  </td>
                  <td valign="top" style="padding-bottom:16px; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:15px; line-height:23px; color:#334563;">
                    <strong style="color:#0A1F44;">Never miss a DSAR deadline.</strong> Track every data subject request against its due date.
                  </td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="padding:2px 0 8px;">
                    <div style="width:10px; height:10px; margin-top:6px; background:#C9A227; border-radius:3px;"></div>
                  </td>
                  <td valign="top" style="padding-bottom:8px; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:15px; line-height:23px; color:#334563;">
                    <strong style="color:#0A1F44;">Work faster with the AI copilot.</strong> Draft policies, run gap analyses and ask NDPA questions in plain language.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="background:#FFFFFF; padding:24px 40px 36px; border-radius:0 0 16px 16px;" class="px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F9FE; border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:13px; line-height:20px; color:#4A5B78;">
                    This invite is for <strong style="color:#0A1F44;">{{email}}</strong> only. If you weren't expecting it, you can ignore this email and no account will be created.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 24px 8px; font-family:'Segoe UI',Helvetica,Arial,sans-serif; font-size:12px; line-height:19px; color:#6B7C99;">
              DPO Copilot &mdash; compliance workflows for Nigerian data protection teams.<br>
              Your data is hosted in Nigeria.<br><br>
              <a href="https://www.dpocopilot.ng" style="color:#12336E; font-weight:600;">dpocopilot.ng</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="mailto:info@dpocopilot.ng" style="color:#12336E; font-weight:600;">info@dpocopilot.ng</a>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;
