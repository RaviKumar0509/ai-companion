import nodemailer, {
  type SendMailOptions,
  type Transporter,
} from "nodemailer";

import { env } from "../../../config/env.js";

const transporter: Transporter = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: env.MAIL_PORT,
  secure: env.MAIL_SECURE,
  auth: {
    user: env.MAIL_USER,
    pass: env.MAIL_PASSWORD,
  },
});

export async function sendMail(
  options: SendMailOptions,
): Promise<void> {
  await transporter.sendMail({
    from: env.MAIL_FROM,
    ...options,
  });
}