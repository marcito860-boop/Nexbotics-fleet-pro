"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizModel = exports.CourseModel = void 0;
const database_1 = require("../database");
class CourseModel {
    static async findById(id, companyId) {
        const rows = await (0, database_1.query)('SELECT * FROM courses WHERE id = $1 AND company_id = $2', [id, companyId]);
        return rows.length > 0 ? this.mapCourseRow(rows[0]) : null;
    }
    static async findByCompany(companyId, options) {
        let sql = 'SELECT * FROM courses WHERE company_id = $1';
        const params = [companyId];
        if (options?.isActive !== undefined) {
            sql += ' AND is_active = $2';
            params.push(options.isActive);
        }
        sql += ' ORDER BY created_at DESC';
        const rows = await (0, database_1.query)(sql, params);
        return rows.map(this.mapCourseRow);
    }
    static async create(companyId, data) {
        const rows = await (0, database_1.query)(`INSERT INTO courses (company_id, title, description, category, target_roles, 
       duration_minutes, passing_score, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [companyId, data.title, data.description, data.category, data.targetRoles || [],
            data.durationMinutes, data.passingScore || 70, data.createdBy]);
        return this.mapCourseRow(rows[0]);
    }
    static async update(id, companyId, data) {
        const updates = [];
        const params = [];
        if (data.title !== undefined) {
            updates.push(`title = $${params.length + 1}`);
            params.push(data.title);
        }
        if (data.description !== undefined) {
            updates.push(`description = $${params.length + 1}`);
            params.push(data.description);
        }
        if (data.category !== undefined) {
            updates.push(`category = $${params.length + 1}`);
            params.push(data.category);
        }
        if (data.targetRoles !== undefined) {
            updates.push(`target_roles = $${params.length + 1}`);
            params.push(data.targetRoles);
        }
        if (data.durationMinutes !== undefined) {
            updates.push(`duration_minutes = $${params.length + 1}`);
            params.push(data.durationMinutes);
        }
        if (data.passingScore !== undefined) {
            updates.push(`passing_score = $${params.length + 1}`);
            params.push(data.passingScore);
        }
        if (data.isActive !== undefined) {
            updates.push(`is_active = $${params.length + 1}`);
            params.push(data.isActive);
        }
        if (updates.length === 0)
            return this.findById(id, companyId);
        params.push(id, companyId);
        const rows = await (0, database_1.query)(`UPDATE courses SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND company_id = $${params.length} RETURNING *`, params);
        return rows.length > 0 ? this.mapCourseRow(rows[0]) : null;
    }
    static async getSlides(courseId, companyId) {
        const rows = await (0, database_1.query)(`SELECT * FROM course_slides 
       WHERE course_id = $1 AND company_id = $2 AND is_active = true
       ORDER BY slide_number ASC`, [courseId, companyId]);
        return rows.map((row) => ({
            id: row.id,
            companyId: row.company_id,
            courseId: row.course_id,
            slideNumber: row.slide_number,
            title: row.title,
            content: row.content,
            contentType: row.content_type,
            mediaUrl: row.media_url,
            durationSeconds: row.duration_seconds,
            isActive: row.is_active,
        }));
    }
    static async addSlide(courseId, companyId, data) {
        // Get next slide number
        const countRows = await (0, database_1.query)('SELECT COUNT(*) as count FROM course_slides WHERE course_id = $1 AND company_id = $2', [courseId, companyId]);
        const slideNumber = parseInt(countRows[0].count) + 1;
        const rows = await (0, database_1.query)(`INSERT INTO course_slides (company_id, course_id, slide_number, title, content, content_type, media_url, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [companyId, courseId, slideNumber, data.title, data.content, data.contentType || 'text', data.mediaUrl, data.durationSeconds]);
        return {
            id: rows[0].id,
            companyId: rows[0].company_id,
            courseId: rows[0].course_id,
            slideNumber: rows[0].slide_number,
            title: rows[0].title,
            content: rows[0].content,
            contentType: rows[0].content_type,
            mediaUrl: rows[0].media_url,
            durationSeconds: rows[0].duration_seconds,
            isActive: rows[0].is_active,
        };
    }
    static mapCourseRow(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            title: row.title,
            description: row.description,
            category: row.category,
            targetRoles: row.target_roles || [],
            durationMinutes: row.duration_minutes,
            passingScore: row.passing_score,
            isActive: row.is_active,
            createdBy: row.created_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        };
    }
}
exports.CourseModel = CourseModel;
class QuizModel {
    static async getTemplates(courseId, companyId) {
        const rows = await (0, database_1.query)(`SELECT * FROM quiz_question_templates 
       WHERE course_id = $1 AND company_id = $2 AND is_active = true`, [courseId, companyId]);
        return rows.map(this.mapTemplateRow);
    }
    static async addTemplate(courseId, companyId, data) {
        const rows = await (0, database_1.query)(`INSERT INTO quiz_question_templates (company_id, course_id, question_text, question_type, options, 
       correct_answer, explanation, difficulty, points)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [companyId, courseId, data.questionText, data.questionType || 'multiple_choice',
            JSON.stringify(data.options), data.correctAnswer, data.explanation,
            data.difficulty || 'medium', data.points || 1]);
        return this.mapTemplateRow(rows[0]);
    }
    static async generateQuestionsForAttempt(attemptId, courseId, companyId) {
        // Get templates and shuffle for random selection
        const templates = await this.getTemplates(courseId, companyId);
        if (templates.length === 0) {
            // Generate default questions if no templates exist
            return this.generateDefaultQuestions(attemptId);
        }
        // Shuffle and select up to 10 questions
        const shuffled = templates.sort(() => 0.5 - Math.random()).slice(0, 10);
        const generated = [];
        for (let i = 0; i < shuffled.length; i++) {
            const template = shuffled[i];
            // Shuffle options for this question
            const shuffledOptions = [...template.options].sort(() => 0.5 - Math.random());
            const rows = await (0, database_1.query)(`INSERT INTO quiz_questions_generated (attempt_id, question_text, question_type, options, 
         correct_answer, points, question_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [attemptId, template.questionText, template.questionType,
                JSON.stringify(shuffledOptions), template.correctAnswer, template.points, i + 1]);
            generated.push(this.mapGeneratedQuestionRow(rows[0]));
        }
        return generated;
    }
    static async generateDefaultQuestions(attemptId) {
        // Placeholder for AI-generated questions
        // In production, this would call an AI service
        const defaultQuestions = [
            {
                questionText: 'What is the most important factor in safe driving?',
                questionType: 'multiple_choice',
                options: [
                    { id: 'a', text: 'Speed', isCorrect: false },
                    { id: 'b', text: 'Vehicle condition', isCorrect: false },
                    { id: 'c', text: 'Driver awareness', isCorrect: true },
                    { id: 'd', text: 'Weather conditions', isCorrect: false },
                ],
                correctAnswer: 'c',
                points: 1,
            },
            {
                questionText: 'Pre-trip inspections should be performed daily.',
                questionType: 'true_false',
                options: [
                    { id: 'a', text: 'True', isCorrect: true },
                    { id: 'b', text: 'False', isCorrect: false },
                ],
                correctAnswer: 'a',
                points: 1,
            },
        ];
        const generated = [];
        for (let i = 0; i < defaultQuestions.length; i++) {
            const q = defaultQuestions[i];
            const rows = await (0, database_1.query)(`INSERT INTO quiz_questions_generated (attempt_id, question_text, question_type, options, 
         correct_answer, points, question_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [attemptId, q.questionText, q.questionType, JSON.stringify(q.options), q.correctAnswer, q.points, i + 1]);
            generated.push(this.mapGeneratedQuestionRow(rows[0]));
        }
        return generated;
    }
    static async startAttempt(companyId, userId, courseId) {
        // Get attempt number
        const countRows = await (0, database_1.query)('SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = $1 AND course_id = $2', [userId, courseId]);
        const attemptNumber = parseInt(countRows[0].count) + 1;
        const rows = await (0, database_1.query)(`INSERT INTO quiz_attempts (company_id, user_id, course_id, attempt_number)
       VALUES ($1, $2, $3, $4) RETURNING *`, [companyId, userId, courseId, attemptNumber]);
        const attempt = this.mapAttemptRow(rows[0]);
        // Generate questions
        const questions = await this.generateQuestionsForAttempt(attempt.id, courseId, companyId);
        return { attempt, questions };
    }
    static async getQuestionsForAttempt(attemptId, userId) {
        const rows = await (0, database_1.query)(`SELECT q.* FROM quiz_questions_generated q
       JOIN quiz_attempts a ON q.attempt_id = a.id
       WHERE q.attempt_id = $1 AND a.user_id = $2
       ORDER BY q.question_order ASC`, [attemptId, userId]);
        return rows.map(this.mapGeneratedQuestionRow);
    }
    static async submitAnswer(attemptId, userId, questionId, answer) {
        // Verify attempt belongs to user
        const attemptRows = await (0, database_1.query)('SELECT * FROM quiz_attempts WHERE id = $1 AND user_id = $2', [attemptId, userId]);
        if (attemptRows.length === 0) {
            throw new Error('Attempt not found');
        }
        const questionRows = await (0, database_1.query)('SELECT * FROM quiz_questions_generated WHERE id = $1 AND attempt_id = $2', [questionId, attemptId]);
        if (questionRows.length === 0) {
            throw new Error('Question not found');
        }
        const question = questionRows[0];
        const isCorrect = question.correct_answer === answer;
        const earnedPoints = isCorrect ? question.points : 0;
        await (0, database_1.query)(`UPDATE quiz_questions_generated 
       SET user_answer = $1, is_correct = $2, earned_points = $3
       WHERE id = $4`, [answer, isCorrect, earnedPoints, questionId]);
        return {
            isCorrect,
            correctAnswer: question.correct_answer,
        };
    }
    static async completeAttempt(attemptId, userId, companyId) {
        // Calculate score
        const scoreRows = await (0, database_1.query)(`SELECT 
        COALESCE(SUM(earned_points), 0) as earned,
        COALESCE(SUM(points), 0) as total
       FROM quiz_questions_generated 
       WHERE attempt_id = $1`, [attemptId]);
        const earned = parseInt(scoreRows[0].earned);
        const total = parseInt(scoreRows[0].total);
        const percentage = total > 0 ? (earned / total) * 100 : 0;
        // Get passing score
        const attemptRows = await (0, database_1.query)('SELECT course_id FROM quiz_attempts WHERE id = $1', [attemptId]);
        const courseId = attemptRows[0].course_id;
        const courseRows = await (0, database_1.query)('SELECT passing_score FROM courses WHERE id = $1 AND company_id = $2', [courseId, companyId]);
        const passingScore = courseRows.length > 0 ? courseRows[0].passing_score : 70;
        const passed = percentage >= passingScore;
        // Get attempt start time for duration calculation
        const startRows = await (0, database_1.query)('SELECT started_at FROM quiz_attempts WHERE id = $1', [attemptId]);
        const startedAt = new Date(startRows[0].started_at);
        const completedAt = new Date();
        const timeTakenSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);
        const rows = await (0, database_1.query)(`UPDATE quiz_attempts 
       SET completed_at = $1, score = $2, max_score = $3, percentage = $4, passed = $5, time_taken_seconds = $6
       WHERE id = $7 AND user_id = $8
       RETURNING *`, [completedAt, earned, total, percentage, passed, timeTakenSeconds, attemptId, userId]);
        // If passed, generate certificate
        if (passed) {
            await this.generateCertificate(attemptId, userId, courseId, companyId, percentage);
        }
        return this.mapAttemptRow(rows[0]);
    }
    static async generateCertificate(attemptId, userId, courseId, companyId, scorePercentage) {
        // Get user and course info
        const userRows = await (0, database_1.query)('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
        const courseRows = await (0, database_1.query)('SELECT title FROM courses WHERE id = $1', [courseId]);
        const userFullName = `${userRows[0].first_name} ${userRows[0].last_name}`;
        const courseTitle = courseRows[0].title;
        // Generate certificate number
        const certNumber = `CERT-${companyId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
        const rows = await (0, database_1.query)(`INSERT INTO certificates (company_id, user_id, course_id, quiz_attempt_id, certificate_number,
       user_full_name, course_title, completion_date, score_percentage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`, [companyId, userId, courseId, attemptId, certNumber, userFullName, courseTitle,
            new Date(), scorePercentage]);
        return this.mapCertificateRow(rows[0]);
    }
    static async getCertificates(userId, companyId) {
        const rows = await (0, database_1.query)(`SELECT * FROM certificates 
       WHERE user_id = $1 AND company_id = $2 AND is_revoked = false
       ORDER BY completion_date DESC`, [userId, companyId]);
        return rows.map(this.mapCertificateRow);
    }
    static async getUserProgress(userId, courseId, companyId) {
        const rows = await (0, database_1.query)(`SELECT p.*, 
        (SELECT COUNT(*) FROM course_slides WHERE course_id = $1 AND is_active = true) as total_slides
       FROM user_course_progress p
       WHERE p.user_id = $2 AND p.course_id = $1 AND p.company_id = $3`, [courseId, userId, companyId]);
        if (rows.length === 0)
            return null;
        return {
            id: rows[0].id,
            companyId: rows[0].company_id,
            userId: rows[0].user_id,
            courseId: rows[0].course_id,
            currentSlideNumber: rows[0].current_slide_number,
            slidesCompleted: rows[0].slides_completed || [],
            progressPercentage: rows[0].progress_percentage,
            status: rows[0].status,
            startedAt: rows[0].started_at ? new Date(rows[0].started_at) : undefined,
            completedAt: rows[0].completed_at ? new Date(rows[0].completed_at) : undefined,
            lastAccessedAt: new Date(rows[0].last_accessed_at),
            course: {
                title: '', // Would need to fetch separately
                totalSlides: parseInt(rows[0].total_slides),
            },
        };
    }
    static async updateProgress(userId, courseId, companyId, slideNumber) {
        const existing = await this.getUserProgress(userId, courseId, companyId);
        if (existing) {
            const slidesCompleted = [...existing.slidesCompleted];
            if (!slidesCompleted.includes(slideNumber)) {
                slidesCompleted.push(slideNumber);
            }
            const totalSlides = existing.course?.totalSlides || 1;
            const progressPercentage = Math.round((slidesCompleted.length / totalSlides) * 100);
            const status = progressPercentage >= 100 ? 'completed' : 'in_progress';
            await (0, database_1.query)(`UPDATE user_course_progress 
         SET current_slide_number = $1, slides_completed = $2, progress_percentage = $3,
             status = $4, last_accessed_at = NOW()
         WHERE user_id = $5 AND course_id = $6`, [slideNumber, slidesCompleted, progressPercentage, status, userId, courseId]);
        }
        else {
            await (0, database_1.query)(`INSERT INTO user_course_progress (company_id, user_id, course_id, current_slide_number, 
         slides_completed, progress_percentage, status, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [companyId, userId, courseId, slideNumber, [slideNumber], 0, 'in_progress']);
        }
    }
    static mapTemplateRow(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            courseId: row.course_id,
            questionText: row.question_text,
            questionType: row.question_type,
            options: row.options,
            correctAnswer: row.correct_answer,
            explanation: row.explanation,
            difficulty: row.difficulty,
            points: row.points,
            isActive: row.is_active,
        };
    }
    static mapAttemptRow(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            userId: row.user_id,
            courseId: row.course_id,
            attemptNumber: row.attempt_number,
            startedAt: new Date(row.started_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            score: row.score,
            maxScore: row.max_score,
            percentage: row.percentage ? parseFloat(row.percentage) : undefined,
            passed: row.passed,
            timeTakenSeconds: row.time_taken_seconds,
        };
    }
    static mapGeneratedQuestionRow(row) {
        return {
            id: row.id,
            attemptId: row.attempt_id,
            questionText: row.question_text,
            questionType: row.question_type,
            options: row.options,
            correctAnswer: row.correct_answer,
            userAnswer: row.user_answer,
            isCorrect: row.is_correct,
            points: row.points,
            earnedPoints: row.earned_points || 0,
            questionOrder: row.question_order,
        };
    }
    static mapCertificateRow(row) {
        return {
            id: row.id,
            companyId: row.company_id,
            userId: row.user_id,
            courseId: row.course_id,
            quizAttemptId: row.quiz_attempt_id,
            certificateNumber: row.certificate_number,
            userFullName: row.user_full_name,
            courseTitle: row.course_title,
            completionDate: new Date(row.completion_date),
            expiryDate: row.expiry_date ? new Date(row.expiry_date) : undefined,
            scorePercentage: row.score_percentage ? parseFloat(row.score_percentage) : undefined,
            isRevoked: row.is_revoked,
            pdfUrl: row.pdf_url,
        };
    }
}
exports.QuizModel = QuizModel;
//# sourceMappingURL=Course.js.map