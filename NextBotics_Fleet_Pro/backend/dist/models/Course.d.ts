export interface Course {
    id: string;
    companyId: string;
    title: string;
    description?: string;
    category?: string;
    targetRoles: string[];
    durationMinutes?: number;
    passingScore: number;
    isActive: boolean;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CourseSlide {
    id: string;
    companyId: string;
    courseId: string;
    slideNumber: number;
    title?: string;
    content: string;
    contentType: 'text' | 'video' | 'image' | 'interactive';
    mediaUrl?: string;
    durationSeconds?: number;
    isActive: boolean;
}
export interface QuizQuestionTemplate {
    id: string;
    companyId: string;
    courseId: string;
    questionText: string;
    questionType: 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching';
    options: QuizOption[];
    correctAnswer: string;
    explanation?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    isActive: boolean;
}
export interface QuizOption {
    id: string;
    text: string;
    isCorrect: boolean;
}
export interface QuizAttempt {
    id: string;
    companyId: string;
    userId: string;
    courseId: string;
    attemptNumber: number;
    startedAt: Date;
    completedAt?: Date;
    score?: number;
    maxScore?: number;
    percentage?: number;
    passed?: boolean;
    timeTakenSeconds?: number;
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    course?: {
        title: string;
    };
}
export interface GeneratedQuestion {
    id: string;
    attemptId: string;
    questionText: string;
    questionType: string;
    options: QuizOption[];
    correctAnswer: string;
    userAnswer?: string;
    isCorrect?: boolean;
    points: number;
    earnedPoints: number;
    questionOrder: number;
}
export interface Certificate {
    id: string;
    companyId: string;
    userId: string;
    courseId: string;
    quizAttemptId?: string;
    certificateNumber: string;
    userFullName: string;
    courseTitle: string;
    completionDate: Date;
    expiryDate?: Date;
    scorePercentage?: number;
    isRevoked: boolean;
    pdfUrl?: string;
}
export interface UserCourseProgress {
    id: string;
    companyId: string;
    userId: string;
    courseId: string;
    currentSlideNumber: number;
    slidesCompleted: number[];
    progressPercentage: number;
    status: 'not_started' | 'in_progress' | 'completed';
    startedAt?: Date;
    completedAt?: Date;
    lastAccessedAt: Date;
    course?: {
        title: string;
        totalSlides: number;
    };
}
export declare class CourseModel {
    static findById(id: string, companyId: string): Promise<Course | null>;
    static findByCompany(companyId: string, options?: {
        isActive?: boolean;
    }): Promise<Course[]>;
    static create(companyId: string, data: Partial<Course>): Promise<Course>;
    static update(id: string, companyId: string, data: Partial<Course>): Promise<Course | null>;
    static getSlides(courseId: string, companyId: string): Promise<CourseSlide[]>;
    static addSlide(courseId: string, companyId: string, data: Partial<CourseSlide>): Promise<CourseSlide>;
    private static mapCourseRow;
}
export declare class QuizModel {
    static getTemplates(courseId: string, companyId: string): Promise<QuizQuestionTemplate[]>;
    static addTemplate(courseId: string, companyId: string, data: Partial<QuizQuestionTemplate>): Promise<QuizQuestionTemplate>;
    static generateQuestionsForAttempt(attemptId: string, courseId: string, companyId: string): Promise<GeneratedQuestion[]>;
    private static generateDefaultQuestions;
    static startAttempt(companyId: string, userId: string, courseId: string): Promise<{
        attempt: QuizAttempt;
        questions: GeneratedQuestion[];
    }>;
    static getQuestionsForAttempt(attemptId: string, userId: string): Promise<GeneratedQuestion[]>;
    static submitAnswer(attemptId: string, userId: string, questionId: string, answer: string): Promise<{
        isCorrect: boolean;
        correctAnswer: string;
        explanation?: string;
    }>;
    static completeAttempt(attemptId: string, userId: string, companyId: string): Promise<QuizAttempt>;
    static generateCertificate(attemptId: string, userId: string, courseId: string, companyId: string, scorePercentage: number): Promise<Certificate>;
    static getCertificates(userId: string, companyId: string): Promise<Certificate[]>;
    static getUserProgress(userId: string, courseId: string, companyId: string): Promise<UserCourseProgress | null>;
    static updateProgress(userId: string, courseId: string, companyId: string, slideNumber: number): Promise<void>;
    private static mapTemplateRow;
    private static mapAttemptRow;
    private static mapGeneratedQuestionRow;
    private static mapCertificateRow;
}
//# sourceMappingURL=Course.d.ts.map