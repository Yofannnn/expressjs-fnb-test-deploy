import { EmailLayoutOptions } from "../email.type";
import { AppIdentity } from "@/infrastructure/configs/app-identity.config";

export class LayoutTemplate {
  private readonly BRAND_NAME: string;
  private readonly SUPPORT_EMAIL: string;
  private readonly CLIENT_URL: string;

  constructor(protected readonly config: AppIdentity) {
    this.BRAND_NAME = this.config.brandName;
    this.SUPPORT_EMAIL = this.config.supportEmail;
    this.CLIENT_URL = this.config.clientUrl;
  }

  getLayout(options: EmailLayoutOptions): string {
    const { body, cta, footerNote, title, preheader, theme = "default", includeUnsubscribe = false } = options;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  ${preheader ? `<meta name="description" content="${preheader}" />` : ""}
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    ${this.getCSS(theme)}
  </style>
</head>
<body>
  ${preheader ? `<div class="preheader">${preheader}</div>` : ""}
  
  <table role="presentation" class="email-wrapper">
    <tr>
      <td align="center">
        <table role="presentation" class="email-content">
          
          <!-- Header -->
          <tr>
            <td class="email-header">
              <h1 class="brand-name">${this.BRAND_NAME}</h1>
              <div class="header-divider"></div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="email-body">
              <h2 class="email-title">${title}</h2>
              ${body}
              ${this.renderCTA(cta, theme)}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer">
              <div class="footer-divider"></div>
              ${footerNote ? `<p class="footer-note">${footerNote}</p>` : ""}
              
              <div class="footer-links">
                <a href="${this.CLIENT_URL}" class="footer-link">Visit Website</a>
                <span class="footer-separator">•</span>
                <a href="mailto:${this.SUPPORT_EMAIL}" class="footer-link">Contact Support</a>
                ${
                  includeUnsubscribe
                    ? `
                <span class="footer-separator">•</span>
                <a href="${this.CLIENT_URL}/unsubscribe" class="footer-link">Unsubscribe</a>
                `
                    : ""
                }
              </div>
              
              <p class="copyright">
                &copy; ${new Date().getFullYear()} ${this.BRAND_NAME}. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
  }

  private getCSS(theme: string): string {
    const colors = this.getThemeColors(theme);

    return `
      /* Reset and base styles */
      * { box-sizing: border-box; }
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

      /* Main styles */
      body {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #000000;
        line-height: 1.6;
      }

      /* Preheader */
      .preheader {
        display: none;
        max-width: 0;
        max-height: 0;
        overflow: hidden;
        font-size: 1px;
        line-height: 1px;
        color: #ffffff;
        opacity: 0;
      }

      /* Email wrapper */
      .email-wrapper {
        width: 100%;
        background-color: #f8f8f8;
        padding: 20px 0;
      }

      .email-content {
        width: 100%;
        max-width: 600px;
        background-color: #ffffff;
        border: 2px solid #000000;
        margin: 0 auto;
      }

      /* Header */
      .email-header {
        padding: 32px 24px 24px;
        text-align: center;
        background-color: ${colors.headerBg};
      }

      .brand-name {
        font-size: 28px;
        font-weight: bold;
        margin: 0;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: ${colors.headerText};
      }

      .header-divider {
        height: 2px;
        background-color: ${colors.divider};
        margin: 20px auto;
        width: 60px;
      }

      /* Body */
      .email-body {
        padding: 32px 24px;
        background-color: ${colors.bodyBg};
      }

      .email-title {
        font-size: 22px;
        font-weight: bold;
        margin: 0 0 24px 0;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: ${colors.titleText};
      }

      p {
        font-size: 16px;
        line-height: 1.6;
        margin: 0 0 16px 0;
        color: ${colors.bodyText};
      }

      /* CTA Button */
      .cta-container {
        text-align: center;
        margin: 32px 0;
      }

      .cta-primary {
        display: inline-block;
        background-color: ${colors.ctaPrimaryBg};
        color: ${colors.ctaPrimaryText} !important;
        padding: 16px 32px;
        text-decoration: none;
        font-weight: bold;
        font-size: 16px;
        letter-spacing: 1px;
        text-transform: uppercase;
        border: 2px solid ${colors.ctaPrimaryBorder};
        transition: all 0.3s ease;
      }

      .cta-secondary {
        display: inline-block;
        background-color: ${colors.ctaSecondaryBg};
        color: ${colors.ctaSecondaryText} !important;
        padding: 16px 32px;
        text-decoration: none;
        font-weight: bold;
        font-size: 16px;
        letter-spacing: 1px;
        text-transform: uppercase;
        border: 2px solid ${colors.ctaSecondaryBorder};
        transition: all 0.3s ease;
      }

      /* Footer */
      .email-footer {
        padding: 24px;
        background-color: ${colors.footerBg};
        text-align: center;
      }

      .footer-divider {
        height: 1px;
        background-color: ${colors.divider};
        margin: 0 0 20px 0;
      }

      .footer-note {
        font-size: 14px;
        color: ${colors.footerText};
        margin-bottom: 16px;
      }

      .footer-links {
        margin-bottom: 16px;
      }

      .footer-link {
        color: ${colors.footerLink} !important;
        text-decoration: underline;
        font-size: 14px;
        font-weight: 500;
      }

      .footer-separator {
        margin: 0 8px;
        color: ${colors.footerText};
        font-size: 14px;
      }

      .copyright {
        font-size: 12px;
        color: ${colors.footerText};
        margin: 0;
        opacity: 0.8;
      }

      /* Mobile responsiveness */
      @media screen and (max-width: 600px) {
        .email-content {
          width: 100% !important;
          border-left: none !important;
          border-right: none !important;
        }
        
        .email-header,
        .email-body,
        .email-footer {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }

        .brand-name {
          font-size: 24px !important;
        }

        .email-title {
          font-size: 20px !important;
        }

        .cta-primary,
        .cta-secondary {
          padding: 14px 24px !important;
          font-size: 14px !important;
        }
      }
    `;
  }

  private getThemeColors(theme: string) {
    const themes = {
      default: {
        headerBg: "#ffffff",
        headerText: "#000000",
        bodyBg: "#ffffff",
        bodyText: "#333333",
        titleText: "#000000",
        ctaPrimaryBg: "#000000",
        ctaPrimaryText: "#ffffff",
        ctaPrimaryBorder: "#000000",
        ctaSecondaryBg: "#ffffff",
        ctaSecondaryText: "#000000",
        ctaSecondaryBorder: "#000000",
        footerBg: "#f8f8f8",
        footerText: "#666666",
        footerLink: "#000000",
        divider: "#000000",
      },
      urgent: {
        headerBg: "#fff5f5",
        headerText: "#000000",
        bodyBg: "#ffffff",
        bodyText: "#333333",
        titleText: "#dc2626",
        ctaPrimaryBg: "#dc2626",
        ctaPrimaryText: "#ffffff",
        ctaPrimaryBorder: "#dc2626",
        ctaSecondaryBg: "#ffffff",
        ctaSecondaryText: "#dc2626",
        ctaSecondaryBorder: "#dc2626",
        footerBg: "#f8f8f8",
        footerText: "#666666",
        footerLink: "#dc2626",
        divider: "#dc2626",
      },
      success: {
        headerBg: "#f0fdf4",
        headerText: "#000000",
        bodyBg: "#ffffff",
        bodyText: "#333333",
        titleText: "#16a34a",
        ctaPrimaryBg: "#16a34a",
        ctaPrimaryText: "#ffffff",
        ctaPrimaryBorder: "#16a34a",
        ctaSecondaryBg: "#ffffff",
        ctaSecondaryText: "#16a34a",
        ctaSecondaryBorder: "#16a34a",
        footerBg: "#f8f8f8",
        footerText: "#666666",
        footerLink: "#16a34a",
        divider: "#16a34a",
      },
    };

    return themes[theme as keyof typeof themes] || themes.default;
  }

  private renderCTA(cta?: EmailLayoutOptions["cta"], theme?: string): string {
    if (!cta) return "";

    const variant = cta.variant || "primary";
    const className = variant === "primary" ? "cta-primary" : "cta-secondary";

    if (theme === "default") {
      return `
        <div class="cta-container">
          <a href="${cta.url}" class="${className}">${cta.label}</a>
        </div>
      `;
    }

    return `
      <div class="cta-container">
        <a href="${cta.url}" class="${className}">${cta.label}</a>
      </div>
    `;
  }
}
