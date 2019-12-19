import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'

// Route files
import starterRouter from '../src/routes/starter'

// Load env vars
dotenv.config({
  path: './src/config/config.env'
})

const app = express()

// Dev logging middleware
if (
  process.env.NODE_ENV === undefined ||
  process.env.NODE_ENV === 'development'
) {
  app.use(morgan('dev'))
}

// Mount routers
app.use('/', starterRouter)

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`)
})
