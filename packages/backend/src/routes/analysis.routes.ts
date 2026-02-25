import { Router } from 'express';
import { analysisController } from '../controllers/analysis.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All analysis routes require authentication
router.use(authenticateToken);

// Get project overview with AI analysis
router.get('/projects/:projectId/analysis/overview', (req, res) =>
  analysisController.getProjectOverview(req, res)
);

// Get architecture analysis
router.get('/projects/:projectId/analysis/architecture', (req, res) =>
  analysisController.getArchitectureAnalysis(req, res)
);

// Get onboarding guide
router.get('/projects/:projectId/analysis/onboarding', (req, res) =>
  analysisController.getOnboardingGuide(req, res)
);

// Ask a question about the codebase
router.post('/projects/:projectId/analysis/query', (req, res) =>
  analysisController.queryCodebase(req, res)
);

export default router;
