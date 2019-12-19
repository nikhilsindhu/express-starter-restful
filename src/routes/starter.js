import express from 'express'

// Load controllers
import { getStart } from '../controllers/starter'

const starterRouter = express.Router()

starterRouter.route('/').get(getStart)

export default starterRouter
