import { Request, Response } from 'express';
import { analysisService } from '../services/analysis.service';
import { logger } from '../utils/logger';

export class AnalysisController {
  /**
   * Get project overview with AI analysis
   */
  async getProjectOverview(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      const result = await analysisService.generateProjectOverview(projectId);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to get project overview', { error, projectId: req.params.projectId });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate project overview',
      });
    }
  }

  /**
   * Get architecture analysis
   */
  async getArchitectureAnalysis(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      const result = await analysisService.generateArchitectureAnalysis(projectId);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to get architecture analysis', { error, projectId: req.params.projectId });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate architecture analysis',
      });
    }
  }

  /**
   * Get onboarding guide
   */
  async getOnboardingGuide(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      const result = await analysisService.generateOnboardingGuide(projectId);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to get onboarding guide', { error, projectId: req.params.projectId });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate onboarding guide',
      });
    }
  }
  /**
   * Query the codebase with a question
   */
  async queryCodebase(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { question } = req.body;

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Question is required',
        });
      }

      const result = await analysisService.queryCodebase(projectId, question.trim());

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error('Failed to query codebase', { error, projectId: req.params.projectId });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to query codebase',
      });
    }
  }
}

export const analysisController = new AnalysisController();
