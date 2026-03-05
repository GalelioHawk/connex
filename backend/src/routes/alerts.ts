import { Router, Request, Response, NextFunction } from 'express';
import { getCurrentStage, getSuburbSchedule } from '../services/eskomsepush';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth);

// GET /alerts/loadshedding/stage
// Returns the current national Eskom + Cape Town stage
router.get('/loadshedding/stage', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stage = await getCurrentStage();
    res.json(stage);
  } catch (err) {
    next(err);
  }
});

// GET /alerts/loadshedding?suburb_id=eskde-16-somerset-west-westerncape
// Returns the full 7-day schedule for a suburb
router.get('/loadshedding', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suburbId = req.query.suburb_id as string | undefined;
    if (!suburbId) {
      throw new AppError(400, 'suburb_id query parameter is required');
    }

    const schedule = await getSuburbSchedule(suburbId);
    res.json(schedule);
  } catch (err) {
    next(err);
  }
});

export default router;
