import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import { z } from 'zod'

export const contactRouter = Router()

// Stricter rate limit specifically for the contact endpoint — 5 per 10 minutes per IP
const contactLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many contact requests. Please try again later.' },
})

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.string().max(200).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
})

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true', // false = STARTTLS (port 587), true = SSL (port 465)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

contactRouter.post('/contact', contactLimit, async (req: Request, res: Response) => {
  const result = contactSchema.safeParse(req.body)

  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return
  }

  const { name, email, subject, message } = result.data
  const recipient = process.env.CONTACT_RECIPIENT
  const fromName = process.env.FROM_NAME ?? 'Contact Form'
  const fromAddress = process.env.SMTP_USER ?? ''

  if (!recipient) {
    console.error('CONTACT_RECIPIENT env var is not set')
    res.status(500).json({ error: 'Server misconfiguration.' })
    return
  }

  const subjectLine = subject
    ? `[Contact] ${subject} — from ${name}`
    : `[Contact] New message from ${name}`

  try {
    const transporter = buildTransporter()
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: recipient,
      replyTo: email,
      subject: subjectLine,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject ?? '—'}\n\n${message}`,
      html: `
        <table style="font-family:sans-serif;font-size:14px;color:#333;max-width:600px">
          <tr><td><strong>Name:</strong> ${name}</td></tr>
          <tr><td><strong>Email:</strong> <a href="mailto:${email}">${email}</a></td></tr>
          <tr><td><strong>Subject:</strong> ${subject ?? '—'}</td></tr>
          <tr><td style="padding-top:16px;border-top:1px solid #eee;white-space:pre-wrap">${message.replace(/\n/g, '<br/>')}</td></tr>
        </table>
      `,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('Failed to send email:', err)
    res.status(500).json({ error: 'Failed to send message. Please try again.' })
  }
})
