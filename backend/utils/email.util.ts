import nodemailer from 'nodemailer';
import { env } from './env.ts';

let transporter: nodemailer.Transporter | null = null;

export function initEmailTransporter() {
    if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) {
        return false;
    }

    try {
        transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: Number(env.SMTP_PORT),
            secure: env.SMTP_SECURE === 'true',
            auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASSWORD,
            },
        });
        return true;
    } catch (error) {
        console.error('[email] Error initializing SMTP transporter:', error);
        return false;
    }
}

export async function sendPasswordResetEmail(userEmail: string, username: string, resetToken: string): Promise<boolean> {
    if (!transporter) {
        console.error('[email] Transporter SMTP not initialized');
        return false;
    }

    const resetLink = `${env.FRONTEND_URL}/reset?token=${resetToken}`;

    try {
        await transporter.sendMail({
            from: env.SMTP_FROM,
            to: userEmail,
            subject: 'Password Recovery - Reset Link',
            html: `
                <h2>Password Recovery</h2>
                <p>Hello ${username},</p>
                <p>You requested to reset your password. Click the link below within 1 hour:</p>
                <p><a href="${resetLink}">Reset Password</a></p>
                <p>Oppure copia e incolla questo link nel tuo browser:</p>
                <p>${resetLink}</p>
                <p>If you did not request this reset, please ignore this message.</p>
                <hr />
                <small>Link valido per 1 ora</small>
            `,
            text: `
Password Recovery

Hello ${username},

You requested to reset your password. Visit the link below within 1 hour:
${resetLink}

If you did not request this reset, please ignore this message.

Link valido per 1 ora
            `,
        });

        console.log(`[email] Password reset email sent to ${userEmail}`);
        return true;
    } catch (error) {
        console.error('[email] Error sending password reset email:', error);
        return false;
    }
}
