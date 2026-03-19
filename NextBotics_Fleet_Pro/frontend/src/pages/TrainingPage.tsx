import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, BookOpen, Award, Clock, Play, CheckCircle, 
  AlertCircle, Plus, Search, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import DashboardLayout from '../components/Layout';
import { api } from '../services/api';
import { Course, QuizAttempt, Certificate } from '../types/fleet';

const CATEGORIES = [
  { key: 'all', label: 'All Courses', icon: BookOpen },
  { key: 'safety', label: 'Safety', icon: AlertCircle },
  { key: 'compliance', label: 'Compliance', icon: CheckCircle },
  { key: 'technical', label: 'Technical', icon: Award },
  { key: 'defensive_driving', label: 'Defensive Driving', icon: GraduationCap },
];

export default function TrainingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<QuizAttempt[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'my-learning' | 'certificates'>('courses');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesRes, enrollmentsRes, certificatesRes] = await Promise.all([
        api.getCourses(),
        api.getMyEnrollments(),
        api.getMyCertificates()
      ]);

      if (coursesRes.success) {
        setCourses(coursesRes.data?.courses || []);
      }
      if (enrollmentsRes.success) {
        setEnrollments(enrollmentsRes.data?.attempts || []);
      }
      if (certificatesRes.success) {
        setCertificates(certificatesRes.data?.certificates || []);
      }
    } catch (err: any) {
      console.error('Failed to load training data:', err);
      setError('Failed to load training data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = async (course: Course) => {
    try {
      setError('');
      const res = await api.startQuiz(course.id);
      if (res.success && res.data) {
        navigate(`/training/quiz/${res.data.id}`);
      } else {
        setError(res.error || 'Failed to start course');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start course');
    }
  };

  const getEnrollmentStatus = (courseId: string) => {
    const enrollment = enrollments.find(e => e.courseId === courseId);
    if (!enrollment) return 'not_started';
    if (enrollment.completedAt) return enrollment.passed ? 'completed' : 'failed';
    return 'in_progress';
  };

  const filteredCourses = courses.filter(course => {
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    const matchesSearch = (course.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (course.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && course.isActive;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-amber-100 text-amber-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'failed': return 'Failed';
      default: return 'Not Started';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Training Center</h1>
            <p className="text-gray-500 mt-1">Complete courses and earn certifications</p>
          </div>
          <div className="flex gap-3">
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <button className="inline-flex items-center px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors">
                <Plus className="h-5 w-5 mr-2" />
                Add Course
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'courses', label: 'All Courses', icon: BookOpen },
                { key: 'my-learning', label: 'My Learning', icon: GraduationCap },
                { key: 'certificates', label: 'My Certificates', icon: Award },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
              </div>
            ) : (
              <>
                {/* All Courses Tab */}
                {activeTab === 'courses' && (
                  <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search courses..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.key}
                            onClick={() => setSelectedCategory(cat.key)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                              selectedCategory === cat.key
                                ? 'bg-amber-500 text-slate-900'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Courses Grid */}
                    {filteredCourses.length === 0 ? (
                      <div className="text-center py-12">
                        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No courses found</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((course) => {
                          const status = getEnrollmentStatus(course.id);
                          return (
                            <div
                              key={course.id}
                              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                            >
                              <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="p-2 bg-amber-100 rounded-lg">
                                    <GraduationCap className="h-6 w-6 text-amber-600" />
                                  </div>
                                  {course.isMandatory && (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                      Mandatory
                                    </span>
                                  )}
                                </div>
                                
                                <h3 className="font-semibold text-gray-900 mb-2">{course.title}</h3>
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.description || 'No description available'}</p>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {course.durationMinutes} min
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4" />
                                    {course.passingScore}% to pass
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(status)}`}>
                                    {getStatusLabel(status)}
                                  </span>
                                  
                                  {status === 'not_started' && (
                                    <button
                                      onClick={() => handleStartCourse(course)}
                                      className="inline-flex items-center px-3 py-1.5 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                                    >
                                      <Play className="h-4 w-4 mr-1" />
                                      Start
                                    </button>
                                  )}
                                  {status === 'in_progress' && (
                                    <button
                                      onClick={() => {
                                        const enrollment = enrollments.find(e => e.courseId === course.id);
                                        if (enrollment) navigate(`/training/quiz/${enrollment.id}`);
                                      }}
                                      className="inline-flex items-center px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                                    >
                                      Continue
                                      <ChevronRight className="h-4 w-4 ml-1" />
                                    </button>
                                  )}
                                  {status === 'completed' && (
                                    <span className="flex items-center text-green-600 text-sm font-medium">
                                      <Award className="h-4 w-4 mr-1" />
                                      Certified
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* My Learning Tab */}
                {activeTab === 'my-learning' && (
                  <div className="space-y-4">
                    {enrollments.length === 0 ? (
                      <div className="text-center py-12">
                        <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">You haven't started any courses yet</p>
                        <button
                          onClick={() => setActiveTab('courses')}
                          className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                        >
                          Browse Courses
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {enrollments.map((enrollment) => {
                          const course = courses.find(c => c.id === enrollment.courseId);
                          if (!course) return null;
                          
                          return (
                            <div
                              key={enrollment.id}
                              className="bg-gray-50 rounded-xl p-5 border border-gray-200"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                  <div className="p-3 bg-amber-100 rounded-lg">
                                    <GraduationCap className="h-6 w-6 text-amber-600" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-gray-900">{course.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                      Started {new Date(enrollment.startedAt).toLocaleDateString()}
                                    </p>
                                    {enrollment.completedAt && (
                                      <div className="mt-2">
                                        {enrollment.passed ? (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Passed with {enrollment.score}%
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Failed ({enrollment.score}%)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {!enrollment.completedAt ? (
                                    <button
                                      onClick={() => navigate(`/training/quiz/${enrollment.id}`)}
                                      className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                                    >
                                      Continue
                                    </button>
                                  ) : !enrollment.passed ? (
                                    <button
                                      onClick={() => handleStartCourse(course)}
                                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                    >
                                      Retry
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Certificates Tab */}
                {activeTab === 'certificates' && (
                  <div className="space-y-4">
                    {certificates.length === 0 ? (
                      <div className="text-center py-12">
                        <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">You haven't earned any certificates yet</p>
                        <button
                          onClick={() => setActiveTab('courses')}
                          className="px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-600 transition-colors"
                        >
                          Start Learning
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {certificates.map((cert) => {
                          const course = courses.find(c => c.id === cert.courseId);
                          return (
                            <div
                              key={cert.id}
                              className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200"
                            >
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-white rounded-lg shadow-sm">
                                  <Award className="h-8 w-8 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900">{course?.title || 'Course Certificate'}</h3>
                                  <p className="text-sm text-gray-500 mt-1">
                                    Certificate #{cert.certificateNumber}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Issued {new Date(cert.issuedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-amber-200">
                                <button className="text-amber-700 text-sm font-medium hover:text-amber-800">
                                  Download Certificate →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
