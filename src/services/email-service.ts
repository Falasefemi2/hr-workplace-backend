import { BrevoClient } from "@getbrevo/brevo"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"
import { passwordResetEmailTemplate, verificationEmailTemplate } from "../templates/email"
import { SecretsService } from "./secrets-service"

export class EmailError extends Schema.TaggedErrorClass<EmailError>()("EmailError", {
  message: Schema.String,
  cause: Schema.Unknown,
}) {}

interface EmailServiceShape {
  sendVerificationEmail: (params: { to: string; fullName: string; token: string }) => Effect.Effect<void, EmailError>
  sendPasswordResetEmail: (params: { to: string; fullName: string; token: string }) => Effect.Effect<void, EmailError>
}

export class EmailService extends Context.Service<EmailService, EmailServiceShape>()("hr-workplace/EmailService") {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const secrets = yield* SecretsService
      const apiKey = yield* secrets.getOrThrow("BREVO_API_KEY")
      const fromEmail = yield* secrets.getOrThrow("FROM_EMAIL")
      const frontendUrl = yield* secrets.getOrThrow("FRONTEND_URL")
      const brevo = new BrevoClient({ apiKey })

      const send = (params: { to: string; subject: string; html: string }) =>
        Effect.retry(
          Effect.tryPromise({
            try: () =>
              brevo.transactionalEmails
                .sendTransacEmail({
                  sender: {
                    email: fromEmail,
                    name: "hr-workplace",
                  },
                  to: [
                    {
                      email: params.to,
                    },
                  ],
                  subject: params.subject,
                  htmlContent: params.html,
                })
                .then(() => void 0),
            catch: (cause) =>
              new EmailError({
                message: `Failed to send email to ${params.to}`,
                cause,
              }),
          }),
          Schedule.exponential("300 millis").pipe(Schedule.jittered, Schedule.both(Schedule.recurs(2))),
        )

      const sendVerificationEmail: EmailServiceShape["sendVerificationEmail"] = Effect.fn(
        "EmailService.sendVerificationEmail",
      )((params) =>
        send({
          to: params.to,
          subject: "Verify your hr-workplace account",
          html: verificationEmailTemplate({
            fullName: params.fullName,
            verifyUrl: `${frontendUrl}/verify-email?token=${params.token}`,
          }),
        }),
      )

      const sendPasswordResetEmail: EmailServiceShape["sendPasswordResetEmail"] = Effect.fn(
        "EmailService.sendPasswordResetEmail",
      )((params) =>
        send({
          to: params.to,
          subject: "Reset your hr-workplace password",
          html: passwordResetEmailTemplate({
            fullName: params.fullName,
            resetUrl: `${frontendUrl}/reset-password?token=${params.token}`,
          }),
        }),
      )

      return {
        sendVerificationEmail,
        sendPasswordResetEmail,
      }
    }),
  )
}
