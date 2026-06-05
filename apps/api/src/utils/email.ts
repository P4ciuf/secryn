import { Resend } from "resend";
import { EnvUtils } from "./env.js";
import { logger } from "../core/logger/index.js";

/**
 * Utility wrapper around the Resend email API.
 * The sender address and API key are read from environment variables.
 */
export class EmailUtils {
  /** Resend client initialised once with the API key from the environment. */
  private resend = new Resend(EnvUtils.envVariables().resendApiKey);

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
      from: EnvUtils.envVariables().email,
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
}
