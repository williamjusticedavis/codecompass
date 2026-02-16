import { Router } from 'express';
import { projectsController } from '../controllers/projects.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../config/multer';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Create project from GitHub
router.post('/github', projectsController.createGitHubProject.bind(projectsController));

// Create project from upload
router.post(
  '/upload',
  upload.single('file'),
  projectsController.createUploadProject.bind(projectsController)
);

// Get all projects
router.get('/', projectsController.getProjects.bind(projectsController));

// Get single project
router.get('/:id', projectsController.getProject.bind(projectsController));

// Delete project
router.delete('/:id', projectsController.deleteProject.bind(projectsController));

// Get project status
router.get('/:id/status', projectsController.getProjectStatus.bind(projectsController));

export default router;
