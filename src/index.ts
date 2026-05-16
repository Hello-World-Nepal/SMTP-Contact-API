import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { contactRouter } from './routes/contact'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(express.json())

// CORS — restrict to your frontend origin in production via ALLOWED_ORIGINS env var
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000']

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`))
  },
  methods: ['GET', 'POST', 'OPTIONS'],
}))

// Global rate limit — 30 requests per 10 minutes per IP
app.use(rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
}))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api', contactRouter)

app.listen(PORT, () => {
  console.log(`smtp-contact-api running on port ${PORT}`)
})
