import { Router } from 'express';
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';
import { courseNotesDB, generateQuestionsFromNotes } from '../data/courseNotes';

const router = Router();

// Helper to wrap responses
const successResponse = (data: any, message?: string) => ({ success: true, data, message });
const errorResponse = (error: string, details?: any) => ({ success: false, error, details });

// ==================== ENHANCED COURSES ====================

// GET /api/fleet/training/courses - List courses with notes
router.get('/courses', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const { isActive } = req.query;

    let sql = 'SELECT * FROM courses WHERE company_id = $1';
    const params: any[] = [companyId];
    
    if (isActive !== undefined) {
      sql += ' AND is_active = $2';
      params.push(isActive === 'true');
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const courses = await query(sql, params);
    
    // Add permanent notes to each course
    const coursesWithNotes = courses.map((course: any) => {
      const notes = courseNotesDB[course.id] || courseNotesDB[course.category?.toLowerCase()] || null;
      return {
        ...course,
        permanentNotes: notes,
        hasNotes: !!notes
      };
    });

    res.json(successResponse(coursesWithNotes));
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    res.status(500).json(errorResponse('Failed to fetch courses'));
  }
});

// GET /api/fleet/training/courses/:id - Get single course with notes
router.get('/courses/:id', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    
    const courses = await query(
      'SELECT * FROM courses WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (courses.length === 0) {
      return res.status(404).json(errorResponse('Course not found'));
    }

    const course = courses[0];
    
    // Add permanent notes
    const notes = courseNotesDB[course.id] || courseNotesDB[course.category?.toLowerCase()] || null;
    
    // Get slides
    const slides = await query(
      `SELECT * FROM course_slides 
       WHERE course_id = $1 AND company_id = $2 AND is_active = true
       ORDER BY slide_number ASC`,
      [id, companyId]
    );

    res.json(successResponse({
      ...course,
      slides,
      permanentNotes: notes,
      hasNotes: !!notes
    }));
  } catch (error: any) {
    console.error('Error fetching course:', error);
    res.status(500).json(errorResponse('Failed to fetch course'));
  }
});

// GET /api/fleet/training/courses/:id/notes - Get course notes only
router.get('/courses/:id/notes', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;
    
    const courses = await query(
      'SELECT id, category FROM courses WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (courses.length === 0) {
      return res.status(404).json(errorResponse('Course not found'));
    }

    const course = courses[0];
    const notes = courseNotesDB[course.id] || courseNotesDB[course.category?.toLowerCase()] || null;

    if (!notes) {
      return res.status(404).json(errorResponse('No notes available for this course'));
    }

    res.json(successResponse({ notes }));
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    res.status(500).json(errorResponse('Failed to fetch notes'));
  }
});

// POST /api/fleet/training/courses/:id/notes/update
router.post('/courses/:id/notes/update', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;
    const { id } = req.params;
    const { notes } = req.body;

    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json(errorResponse('Only admins and managers can update notes'));
    }

    const courses = await query(
      'SELECT id FROM courses WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (courses.length === 0) {
      return res.status(404).json(errorResponse('Course not found'));
    }

    await query(
      `UPDATE courses SET permanent_notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [notes, id]
    );

    res.json(successResponse(null, 'Notes updated successfully'));
  } catch (error: any) {
    console.error('Error updating notes:', error);
    res.status(500).json(errorResponse('Failed to update notes'));
  }
});

// ==================== ENHANCED QUIZ SYSTEM ====================

// POST /api/fleet/training/courses/:id/start-quiz
router.post('/courses/:id/start-quiz', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    const { id: courseId } = req.params;

    // Check max attempts (3)
    const attemptCount = await query(
      `SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId]
    );
    
    const totalAttempts = parseInt(attemptCount[0].count);
    
    if (totalAttempts >= 3) {
      const passedAttempt = await query(
        `SELECT * FROM quiz_attempts WHERE user_id = $1 AND course_id = $2 AND passed = true`,
        [userId, courseId]
      );
      
      if (passedAttempt.length === 0) {
        const unlockRequest = await query(
          `SELECT * FROM quiz_unlock_requests WHERE user_id = $1 AND course_id = $2 AND status = 'pending'`,
          [userId, courseId]
        );
        
        return res.status(403).json(errorResponse('Maximum attempts reached', { 
          maxAttempts: 3, 
          attemptsUsed: totalAttempts,
          message: 'You have used all 3 attempts. Contact your administrator to unlock.',
          canRequestUnlock: unlockRequest.length === 0,
          hasPendingRequest: unlockRequest.length > 0
        }));
      }
    }

    const attemptNumber = totalAttempts + 1;

    const attemptResult = await query(
      `INSERT INTO quiz_attempts (id, company_id, user_id, course_id, attempt_number, started_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *`,
      [uuidv4(), companyId, userId, courseId, attemptNumber]
    );

    const attempt = attemptResult[0];

    const courseResult = await query(
      'SELECT category FROM courses WHERE id = $1 AND company_id = $2',
      [courseId, companyId]
    );
    
    const category = courseResult[0]?.category || 'general';

    let questions = await generate15RandomQuestions(courseId, companyId, attempt.id, category);
    
    if (questions.length < 15) {
      const noteQuestions = generateQuestionsFromNotes(category, 15 - questions.length);
      for (const q of noteQuestions) {
        const qResult = await query(
          `INSERT INTO quiz_questions_generated 
           (id, attempt_id, question_text, question_type, options, correct_answer, explanation, points, question_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [uuidv4(), attempt.id, q.questionText, q.questionType, JSON.stringify(q.options), 
           q.correctAnswer, q.explanation, q.points || 1, questions.length + 1]
        );
        questions.push(qResult[0]);
      }
    }

    res.json(successResponse({
      attempt: {
        id: attempt.id,
        attemptNumber: attempt.attempt_number,
        startedAt: attempt.started_at,
        totalQuestions: questions.length,
        timeLimitMinutes: 30
      },
      questions: questions.map(q => ({
        id: q.id,
        questionText: q.question_text,
        questionType: q.question_type,
        options: q.options,
        points: q.points,
        questionOrder: q.question_order
      }))
    }));
  } catch (error: any) {
    console.error('Error starting quiz:', error);
    res.status(500).json(errorResponse('Failed to start quiz: ' + error.message));
  }
});

// Helper function to generate 15 random questions
async function generate15RandomQuestions(courseId: string, companyId: string, attemptId: string, category: string) {
  const templates = await query(
    `SELECT * FROM quiz_question_templates 
     WHERE course_id = $1 AND company_id = $2 AND is_active = true
     ORDER BY RANDOM() LIMIT 15`,
    [courseId, companyId]
  );

  const questions: any[] = [];
  
  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    const shuffledOptions = [...template.options].sort(() => 0.5 - Math.random());
    
    const qResult = await query(
      `INSERT INTO quiz_questions_generated 
       (id, attempt_id, question_text, question_type, options, correct_answer, explanation, points, question_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [uuidv4(), attemptId, template.question_text, template.question_type, 
       JSON.stringify(shuffledOptions), template.correct_answer, 
       template.explanation, template.points || 1, i + 1]
    );
    questions.push(qResult[0]);
  }
  
  return questions;
}

// POST /api/fleet/training/attempts/:attemptId/answer
router.post('/attempts/:attemptId/answer', async (req: any, res) => {
  try {
    const userId = req.user?.userId;
    const { attemptId } = req.params;
    const { questionId, answer } = req.body;

    const attemptCheck = await query(
      'SELECT * FROM quiz_attempts WHERE id = $1 AND user_id = $2',
      [attemptId, userId]
    );

    if (attemptCheck.length === 0) {
      return res.status(403).json(errorResponse('Attempt not found'));
    }

    const questionResult = await query(
      'SELECT * FROM quiz_questions_generated WHERE id = $1 AND attempt_id = $2',
      [questionId, attemptId]
    );

    if (questionResult.length === 0) {
      return res.status(404).json(errorResponse('Question not found'));
    }

    const question = questionResult[0];
    const isCorrect = question.correct_answer === answer;
    const earnedPoints = isCorrect ? question.points : 0;

    await query(
      `UPDATE quiz_questions_generated 
       SET user_answer = $1, is_correct = $2, earned_points = $3
       WHERE id = $4`,
      [answer, isCorrect, earnedPoints, questionId]
    );

    res.json(successResponse({
      isCorrect,
      correctAnswer: isCorrect ? null : question.correct_answer,
      explanation: question.explanation,
      earnedPoints,
      totalPoints: question.points
    }));
  } catch (error: any) {
    console.error('Error submitting answer:', error);
    res.status(500).json(errorResponse('Failed to submit answer'));
  }
});

// POST /api/fleet/training/attempts/:attemptId/complete
router.post('/attempts/:attemptId/complete', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    const { attemptId } = req.params;

    const attemptResult = await query(
      'SELECT * FROM quiz_attempts WHERE id = $1 AND user_id = $2',
      [attemptId, userId]
    );

    if (attemptResult.length === 0) {
      return res.status(403).json(errorResponse('Attempt not found'));
    }

    const attempt = attemptResult[0];

    const scoreResult = await query(
      `SELECT 
        COALESCE(SUM(points), 0) as total_points,
        COALESCE(SUM(earned_points), 0) as earned_points,
        COUNT(*) as total_questions,
        SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END) as correct_answers
       FROM quiz_questions_generated WHERE attempt_id = $1`,
      [attemptId]
    );

    const totalPoints = parseInt(scoreResult[0].total_points);
    const earnedPoints = parseInt(scoreResult[0].earned_points);
    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    const courseResult = await query(
      'SELECT passing_score, title FROM courses WHERE id = $1',
      [attempt.course_id]
    );

    const passingScore = courseResult[0]?.passing_score || 70;
    const passed = percentage >= passingScore;

    const startedAt = new Date(attempt.started_at);
    const completedAt = new Date();
    const timeTakenSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    await query(
      `UPDATE quiz_attempts 
       SET completed_at = CURRENT_TIMESTAMP, score = $1, max_score = $2, percentage = $3, 
           passed = $4, time_taken_seconds = $5 WHERE id = $6`,
      [earnedPoints, totalPoints, percentage, passed, timeTakenSeconds, attemptId]
    );

    let certificate = null;
    if (passed) {
      certificate = await generateCertificate(userId, attempt.course_id, companyId, attemptId, percentage);
    }

    res.json(successResponse({
      passed,
      score: earnedPoints,
      maxScore: totalPoints,
      percentage,
      passingScore,
      timeTakenSeconds,
      attemptNumber: attempt.attempt_number,
      certificate: certificate ? {
        id: certificate.id,
        certificateNumber: certificate.certificate_number,
        downloadUrl: `/api/fleet/training/certificates/${certificate.id}/download`
      } : null
    }));
  } catch (error: any) {
    console.error('Error completing quiz:', error);
    res.status(500).json(errorResponse('Failed to complete quiz'));
  }
});

// Helper function to generate certificate
async function generateCertificate(userId: string, courseId: string, companyId: string, attemptId: string, scorePercentage: number) {
  const userResult = await query(
    `SELECT u.first_name, u.last_name, u.email, s.staff_name, s.role as staff_role
     FROM users u LEFT JOIN staff s ON s.email = u.email WHERE u.id = $1`,
    [userId]
  );

  const courseResult = await query('SELECT title FROM courses WHERE id = $1', [courseId]);
  const companyResult = await query('SELECT name FROM companies WHERE id = $1', [companyId]);

  const user = userResult[0];
  const userFullName = user?.staff_name || `${user?.first_name} ${user?.last_name}`;
  const credential = user?.staff_role || 'Fleet Driver';

  const certNumber = `FLT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const certResult = await query(
    `INSERT INTO certificates 
     (id, company_id, user_id, course_id, quiz_attempt_id, certificate_number,
      user_full_name, user_credentials, company_name, course_title, 
      completion_date, score_percentage, pdf_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, $11, $12) RETURNING *`,
    [
      uuidv4(), companyId, userId, courseId, attemptId, certNumber,
      userFullName, credential, companyResult[0]?.name || 'Fleet Company', 
      courseResult[0]?.title, scorePercentage, null
    ]
  );

  return certResult[0];
}

// ==================== CERTIFICATES ====================

// GET /api/fleet/training/my-certificates
router.get('/my-certificates', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;

    const certificates = await query(
      `SELECT c.*, co.title as course_title FROM certificates c
       JOIN courses co ON c.course_id = co.id
       WHERE c.user_id = $1 AND c.company_id = $2 AND c.is_revoked = false
       ORDER BY c.completion_date DESC`,
      [userId, companyId]
    );

    res.json(successResponse(certificates));
  } catch (error: any) {
    console.error('Error fetching certificates:', error);
    res.status(500).json(errorResponse('Failed to fetch certificates'));
  }
});

// GET /api/fleet/training/certificates/:id/download
router.get('/certificates/:id/download', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    const { id } = req.params;

    const certResult = await query(
      `SELECT c.*, co.title as course_title FROM certificates c
       JOIN courses co ON c.course_id = co.id
       WHERE c.id = $1 AND (c.user_id = $2 OR $3 = 'super_admin') AND c.company_id = $4`,
      [id, userId, req.user?.role, companyId]
    );

    if (certResult.length === 0) {
      return res.status(404).json(errorResponse('Certificate not found'));
    }

    const cert = certResult[0];

    if (!cert.pdf_data) {
      const pdfData = generateCertificatePDF(cert);
      await query('UPDATE certificates SET pdf_data = $1 WHERE id = $2', [pdfData, id]);
      cert.pdf_data = pdfData;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${cert.certificate_number}.pdf"`);
    
    const pdfBuffer = Buffer.from(cert.pdf_data, 'base64');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error downloading certificate:', error);
    res.status(500).json(errorResponse('Failed to download certificate'));
  }
});

// Helper function to generate certificate PDF
function generateCertificatePDF(cert: any): string {
  const certificateHTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Times New Roman', serif; text-align: center; padding: 50px; }
    .certificate { border: 10px solid #1a365d; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { font-size: 24px; color: #1a365d; margin-bottom: 20px; }
    .title { font-size: 48px; font-weight: bold; color: #d69e2e; margin: 30px 0; }
    .recipient { font-size: 36px; font-weight: bold; margin: 20px 0; }
    .details { font-size: 18px; margin: 20px 0; }
    .score { font-size: 24px; color: #2f855a; margin: 20px 0; }
    .signature { margin-top: 60px; }
    .signature-line { border-top: 1px solid #000; width: 300px; margin: 10px auto; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">${cert.company_name}</div>
    <div class="title">Certificate of Completion</div>
    <div class="details">This certifies that</div>
    <div class="recipient">${cert.user_full_name}</div>
    <div class="details">${cert.user_credentials}</div>
    <div class="details">has successfully completed</div>
    <div class="details" style="font-size: 24px; font-weight: bold;">${cert.course_title}</div>
    <div class="score">Score: ${cert.score_percentage}%</div>
    <div class="details">Date: ${new Date(cert.completion_date).toLocaleDateString()}</div>
    <div class="details">Certificate #${cert.certificate_number}</div>
    <div class="signature">
      <div class="signature-line"></div>
      <div>Authorized Signature</div>
    </div>
  </div>
</body>
</html>`;

  return Buffer.from(certificateHTML).toString('base64');
}

// ==================== QUIZ UNLOCK REQUESTS ====================

// POST /api/fleet/training/courses/:id/request-unlock
router.post('/courses/:id/request-unlock', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    const { id: courseId } = req.params;
    const { reason } = req.body;

    const existingRequest = await query(
      `SELECT * FROM quiz_unlock_requests WHERE user_id = $1 AND course_id = $2 AND status = 'pending'`,
      [userId, courseId]
    );

    if (existingRequest.length > 0) {
      return res.status(400).json(errorResponse('Unlock request already pending'));
    }

    await query(
      `INSERT INTO quiz_unlock_requests (id, company_id, user_id, course_id, reason, requested_at, status)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'pending')`,
      [uuidv4(), companyId, userId, courseId, reason || 'Max attempts reached']
    );

    res.json(successResponse(null, 'Unlock request submitted'));
  } catch (error: any) {
    console.error('Error requesting unlock:', error);
    res.status(500).json(errorResponse('Failed to submit unlock request'));
  }
});

// GET /api/fleet/training/unlock-requests
router.get('/unlock-requests', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;

    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const requests = await query(
      `SELECT r.*, u.first_name, u.last_name, u.email, c.title as course_title
       FROM quiz_unlock_requests r
       JOIN users u ON r.user_id = u.id
       JOIN courses c ON r.course_id = c.id
       WHERE r.company_id = $1 AND r.status = 'pending'
       ORDER BY r.requested_at DESC`,
      [companyId]
    );

    res.json(successResponse(requests));
  } catch (error: any) {
    console.error('Error fetching unlock requests:', error);
    res.status(500).json(errorResponse('Failed to fetch unlock requests'));
  }
});

// POST /api/fleet/training/unlock-requests/:id/approve
router.post('/unlock-requests/:id/approve', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;
    const adminId = req.user?.userId;
    const { id } = req.params;

    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    const requestResult = await query(
      'SELECT * FROM quiz_unlock_requests WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (requestResult.length === 0) {
      return res.status(404).json(errorResponse('Request not found'));
    }

    const request = requestResult[0];

    await query(
      `UPDATE quiz_unlock_requests SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [adminId, id]
    );

    await query('DELETE FROM quiz_attempts WHERE user_id = $1 AND course_id = $2', 
      [request.user_id, request.course_id]
    );

    res.json(successResponse(null, 'Unlock request approved. User can now retake the quiz.'));
  } catch (error: any) {
    console.error('Error approving unlock:', error);
    res.status(500).json(errorResponse('Failed to approve unlock request'));
  }
});

// POST /api/fleet/training/unlock-requests/:id/deny
router.post('/unlock-requests/:id/deny', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;
    const adminId = req.user?.userId;
    const { id } = req.params;
    const { denialReason } = req.body;

    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json(errorResponse('Access denied'));
    }

    await query(
      `UPDATE quiz_unlock_requests SET status = 'denied', approved_by = $1, approved_at = CURRENT_TIMESTAMP, 
       denial_reason = $2 WHERE id = $3 AND company_id = $4`,
      [adminId, denialReason || '', id, companyId]
    );

    res.json(successResponse(null, 'Unlock request denied'));
  } catch (error: any) {
    console.error('Error denying unlock:', error);
    res.status(500).json(errorResponse('Failed to deny unlock request'));
  }
});

// ==================== PROGRESS & ENROLLMENTS ====================

// GET /api/fleet/training/my-enrollments
router.get('/my-enrollments', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;

    const enrollments = await query(
      `SELECT c.*,
        COALESCE(p.current_slide_number, 0) as current_slide,
        COALESCE(p.progress_percentage, 0) as progress,
        p.status as progress_status,
        p.started_at, p.completed_at as progress_completed_at,
        (SELECT COUNT(*) FROM course_slides WHERE course_id = c.id AND is_active = true) as total_slides,
        (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = $1 AND course_id = c.id) as attempt_count,
        (SELECT MAX(percentage) FROM quiz_attempts WHERE user_id = $1 AND course_id = c.id AND passed = true) as best_score,
        EXISTS(SELECT 1 FROM certificates WHERE user_id = $1 AND course_id = c.id AND is_revoked = false) as has_certificate
       FROM courses c
       LEFT JOIN user_course_progress p ON p.course_id = c.id AND p.user_id = $1
       WHERE c.company_id = $2 AND c.is_active = true
       ORDER BY c.created_at DESC`,
      [userId, companyId]
    );

    const enrichedEnrollments = enrollments.map((e: any) => {
      const notes = courseNotesDB[e.id] || courseNotesDB[e.category?.toLowerCase()] || null;
      return {
        ...e,
        permanentNotes: notes,
        canTakeQuiz: e.progress >= 80 || e.progress_status === 'completed',
        maxAttemptsReached: e.attempt_count >= 3 && !e.best_score
      };
    });

    res.json(successResponse(enrichedEnrollments));
  } catch (error: any) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json(errorResponse('Failed to fetch enrollments'));
  }
});

// POST /api/fleet/training/courses/:id/progress
router.post('/courses/:id/progress', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    const { id: courseId } = req.params;
    const { slideNumber } = req.body;

    const slideCount = await query(
      'SELECT COUNT(*) as count FROM course_slides WHERE course_id = $1 AND is_active = true',
      [courseId]
    );
    const totalSlides = parseInt(slideCount[0].count);

    const existing = await query(
      'SELECT * FROM user_course_progress WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    const progressPercentage = Math.min(100, Math.round((slideNumber / totalSlides) * 100));
    const status = progressPercentage >= 100 ? 'completed' : 'in_progress';

    if (existing.length > 0) {
      const slidesCompleted = [...(existing[0].slides_completed || []), slideNumber];
      const uniqueSlides = [...new Set(slidesCompleted)];
      
      await query(
        `UPDATE user_course_progress 
         SET current_slide_number = $1, slides_completed = $2, progress_percentage = $3,
             status = $4, last_accessed_at = CURRENT_TIMESTAMP,
             completed_at = CASE WHEN $4 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
         WHERE user_id = $5 AND course_id = $6`,
        [slideNumber, uniqueSlides, progressPercentage, status, userId, courseId]
      );
    } else {
      await query(
        `INSERT INTO user_course_progress 
         (company_id, user_id, course_id, current_slide_number, slides_completed, 
          progress_percentage, status, started_at, last_accessed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [companyId, userId, courseId, slideNumber, [slideNumber], progressPercentage, status]
      );
    }

    res.json(successResponse({ progress: progressPercentage, status }));
  } catch (error: any) {
    console.error('Error updating progress:', error);
    res.status(500).json(errorResponse('Failed to update progress'));
  }
});

export default router;
