import { Router } from 'express'
import * as LocationVerificationController from '../controllers/location-verification.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router = Router()

// All routes require authentication
router.use(requireAuth)


//  ALLOWED LOCATION CRUD — must be before /:id to avoid param collision

router.post(
  '/allowed-locations',
  requireRole('ADMIN', 'PRINCIPAL'),
  LocationVerificationController.createAllowedLocation
)

router.get(
  '/allowed-locations',
  requireRole('ADMIN', 'PRINCIPAL'),
  LocationVerificationController.getAllowedLocations
)

router.put(
  '/allowed-locations/:id',
  requireRole('ADMIN', 'PRINCIPAL'),
  LocationVerificationController.updateAllowedLocation
)

router.delete(
  '/allowed-locations/:id',
  requireRole('ADMIN', 'PRINCIPAL'),
  LocationVerificationController.deleteAllowedLocation
)

//  TEACHER ROUTES 

router.post(
  '/submit',
  requireRole('TEACHER'),
  LocationVerificationController.submit
)

router.get(
  '/my',
  requireRole('TEACHER'),
  LocationVerificationController.getMyVerifications
)

//ADMIN / PRINCIPAL ROUTES 

router.get(
  '/',
  requireRole('ADMIN', 'PRINCIPAL'),
  LocationVerificationController.getAll
)

router.get(
  '/summary',
  requireRole('ADMIN', 'PRINCIPAL'),
  LocationVerificationController.getSummary
)

router.post(
  '/',
  requireRole('ADMIN'),
  LocationVerificationController.trigger
)

router.put(
  '/:id/retrigger',
  requireRole('ADMIN'),
  LocationVerificationController.retrigger
)

//  Parameterised last to avoid swallowing named paths 

router.get(
  '/:id',
  requireRole('ADMIN', 'PRINCIPAL'),
  LocationVerificationController.getById
)

export default router
