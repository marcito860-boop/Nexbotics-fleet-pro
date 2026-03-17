import { Router, Request, Response } from 'express';
import { CourseModel, QuizModel } from '../models/Course';
import { authMiddleware, requireRole } from '../utils/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================
// COURSES
// ============================================

// GET /api/fleet/training/courses - List courses
router.get('/courses', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { isActive } = req.query;

    const courses = await CourseModel.findByCompany(companyId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });

    res.json({ success: true, data: courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch courses' });
  }
});

// GET /api/fleet/training/courses/:id - Get single course
router.get('/courses/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const course = await CourseModel.findById(req.params.id, companyId);

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch course' });
  }
});

// POST /api/fleet/training/courses - Create course
router.post('/courses', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { title, description, category, targetRoles, durationMinutes, passingScore } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Course title is required' });
    }

    const course = await CourseModel.create(companyId, {
      title,
      description,
      category,
      targetRoles,
      durationMinutes,
      passingScore,
      createdBy: userId,
    });

    res.status(201).json({ success: true, data: course });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ success: false, error: 'Failed to create course' });
  }
});

// PUT /api/fleet/training/courses/:id - Update course
router.put('/courses/:id', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { title, description, category, targetRoles, durationMinutes, passingScore, isActive } = req.body;

    const course = await CourseModel.update(req.params.id, companyId, {
      title,
      description,
      category,
      targetRoles,
      durationMinutes,
      passingScore,
      isActive,
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ success: false, error: 'Failed to update course' });
  }
});

// GET /api/fleet/training/courses/:id/slides - Get course slides
router.get('/courses/:id/slides', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const slides = await CourseModel.getSlides(req.params.id, companyId);
    res.json({ success: true, data: slides });
  } catch (error) {
    console.error('Error fetching slides:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch slides' });
  }
});

// POST /api/fleet/training/courses/:id/slides - Add slide to course
router.post('/courses/:id/slides', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { title, content, contentType, mediaUrl, durationSeconds } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'Slide content is required' });
    }

    const slide = await CourseModel.addSlide(req.params.id, companyId, {
      title,
      content,
      contentType,
      mediaUrl,
      durationSeconds,
    });

    res.status(201).json({ success: true, data: slide });
  } catch (error) {
    console.error('Error adding slide:', error);
    res.status(500).json({ success: false, error: 'Failed to add slide' });
  }
});

// ============================================
// QUIZ TEMPLATES
// ============================================

// GET /api/fleet/training/courses/:id/quiz-templates - Get quiz templates
router.get('/courses/:id/quiz-templates', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const templates = await QuizModel.getTemplates(req.params.id, companyId);
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching quiz templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quiz templates' });
  }
});

// POST /api/fleet/training/courses/:id/quiz-templates - Add quiz template
router.post('/courses/:id/quiz-templates', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const { questionText, questionType, options, correctAnswer, explanation, difficulty, points } = req.body;

    if (!questionText || !options || !correctAnswer) {
      return res.status(400).json({ 
        success: false, 
        error: 'Question text, options, and correct answer are required' 
      });
    }

    const template = await QuizModel.addTemplate(req.params.id, companyId, {
      questionText,
      questionType,
      options,
      correctAnswer,
      explanation,
      difficulty,
      points,
    });

    res.status(201).json({ success: true, data: template });
  } catch (error) {
    console.error('Error adding quiz template:', error);
    res.status(500).json({ success: false, error: 'Failed to add quiz template' });
  }
});

// ============================================
// QUIZ ATTEMPTS
// ============================================

// POST /api/fleet/training/courses/:id/start-quiz - Start quiz attempt
router.post('/courses/:id/start-quiz', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const result = await QuizModel.startAttempt(companyId, userId, req.params.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ success: false, error: 'Failed to start quiz' });
  }
});

// GET /api/fleet/training/attempts/:attemptId/questions - Get questions for attempt
router.get('/attempts/:attemptId/questions', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const questions = await QuizModel.getQuestionsForAttempt(req.params.attemptId, userId);
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch questions' });
  }
});

// POST /api/fleet/training/attempts/:attemptId/answer - Submit answer
router.post('/attempts/:attemptId/answer', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { questionId, answer } = req.body;

    if (!questionId || !answer) {
      return res.status(400).json({ success: false, error: 'Question ID and answer are required' });
    }

    const result = await QuizModel.submitAnswer(req.params.attemptId, userId, questionId, answer);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ success: false, error: 'Failed to submit answer' });
  }
});

// POST /api/fleet/training/attempts/:attemptId/complete - Complete quiz
router.post('/attempts/:attemptId/complete', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const attempt = await QuizModel.completeAttempt(req.params.attemptId, userId, companyId);
    res.json({ success: true, data: attempt });
  } catch (error) {
    console.error('Error completing quiz:', error);
    res.status(500).json({ success: false, error: 'Failed to complete quiz' });
  }
});

// ============================================
// CERTIFICATES
// ============================================

// GET /api/fleet/training/my-certificates - Get user's certificates
router.get('/my-certificates', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const certificates = await QuizModel.getCertificates(userId, companyId);
    res.json({ success: true, data: certificates });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch certificates' });
  }
});

// GET /api/fleet/training/courses/:id/progress - Get user's progress for course
router.get('/courses/:id/progress', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;

    const progress = await QuizModel.getUserProgress(userId, req.params.id, companyId);
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

// POST /api/fleet/training/courses/:id/progress - Update progress
router.post('/courses/:id/progress', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const { slideNumber } = req.body;

    if (!slideNumber) {
      return res.status(400).json({ success: false, error: 'Slide number is required' });
    }

    await QuizModel.updateProgress(userId, req.params.id, companyId, slideNumber);
    res.json({ success: true, message: 'Progress updated' });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ success: false, error: 'Failed to update progress' });
  }
});

export default router;
