// POST /api/fleet/training/courses/:id/progress - Update progress
router.post('/courses/:id/progress', async (req: any, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId;
    const { id: courseId } = req.params;
    const { slideNumber } = req.body;

    // Get total slides
    const slideCount = await query(
      'SELECT COUNT(*) as count FROM course_slides WHERE course_id = $1 AND is_active = true',
      [courseId]
    );
    const totalSlides = parseInt(slideCount[0].count);

    // Check if progress record exists
    const existing = await query(
      'SELECT * FROM user_course_progress WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    const progressPercentage = Math.min(100, Math.round((slideNumber / totalSlides) * 100));
    const status = progressPercentage >= 100 ? 'completed' : 'in_progress';

    if (existing.length > 0) {
      // Update existing
      const slidesCompleted = [...(existing[0].slides_completed || []), slideNumber];
      const uniqueSlides = [...new Set(slidesCompleted)];
      
      await query(
        `UPDATE user_course_progress 
         SET current_slide_number = $1, 
             slides_completed = $2, 
             progress_percentage = $3,
             status = $4,
             last_accessed_at = CURRENT_TIMESTAMP,
             completed_at = CASE WHEN $4 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
         WHERE user_id = $5 AND course_id = $6`,
        [slideNumber, uniqueSlides, progressPercentage, status, userId, courseId]
      );
    } else {
      // Create new
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
