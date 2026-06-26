import { Resend } from "resend";
import { EnvUtils } from "./env";
import { logger } from "@repo/shared";
import fs from "fs";
import path from "path";

/**
 * Utility wrapper around the Resend email API.
 * The sender address and API key are read from environment variables.
 */
export class EmailUtils {
  /** Resend client initialised once with the API key from the environment. */
  private resend = new Resend(EnvUtils.variables.resendApiKey);

  /**
   * Sends a transactional email via Resend.
   *
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param html - HTML body content
   * @returns The email ID from Resend
   * @throws If the Resend API returns an error
   */
  async sendEmail(to: string, subject: string, html: string) {
    const { data, error } = await this.resend.emails.send({
      from: EnvUtils.variables.email,
      to,
      subject,
      html,
    });

    if (error) {
      logger.error(`[EmailUtils] Failed to send email to ${to}: ${error.name} — ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    logger.info(`[EmailUtils] Email sent to ${to} (id: ${data?.id})`);
    return data!.id;
  }

  /**
   * Reads an HTML email template from {@code src/template/<name>.html},
   * replaces the {@code {{YEAR}}} placeholder with the current year, and
   * returns the resulting HTML string. Templates are read synchronously from
   * disk because they are served at most once per request.
   *
   * @param name - The template file name without the {@code .html} extension
   * @returns The template HTML with {@code {{YEAR}}} substituted
   */
  getTemplate(name: string): string {
    const html = fs.readFileSync(
      path.join(process.cwd(), "src", "template", `${name}.html`),
      "utf-8",
    );
    return html.replaceAll("{{YEAR}}", new Date().getFullYear().toString());
  }

  /**
   * Substitutes placeholders in the template HTML with concrete values.
   * Placeholders are {@code {{KEY}}} mustache-style tokens; this method
   * performs a simple string replacement without a template engine.
   *
   * @param html - The template HTML containing {@code {{KEY}}} placeholders
   * @param vars - A mapping of placeholder keys to replacement values
   * @returns The HTML with all matching placeholders substituted
   */
  insertVariables(html: string, vars: Record<string, string>): string {
    for (const [key, value] of Object.entries(vars)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }
    return html;
  }
}
