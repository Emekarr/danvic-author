// Dummy data for Author workspace — no backend connection.
export type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'archived'

export interface DummyContent {
  id: string
  title: string
  type: 'Course' | 'Module' | 'Lesson' | 'Video' | 'Article' | 'Guide'
  tutor: string
  tutorId: string
  courseName: string
  status: ContentStatus
  updatedAt: string
  createdAt: string
  version: string
  views: number
}

export interface DummyAssessment {
  id: string
  title: string
  type: 'assignment' | 'quiz' | 'exam'
  course: string
  questions: number
  status: 'draft' | 'open' | 'closed' | 'pending_review'
  submissions: number
  passMark: number
  durationMinutes: number
  updatedAt: string
}

export interface DummyQuestionBankItem {
  id: string
  prompt: string
  type: 'mcq' | 'short_answer' | 'essay' | 'code'
  category: string
  status: 'draft' | 'approved' | 'pending_review'
  updatedAt: string
}

export interface DummyReview {
  id: string
  contentId: string
  contentTitle: string
  criterion: 'Technical Accuracy' | 'Brand Consistency' | 'Copyright / IP' | 'Safety & Regulatory' | 'Content Quality'
  status: 'pending' | 'pass' | 'needs_revision' | 'fail'
  reviewer: string
  score: number | null
  comment: string
  updatedAt: string
}

export interface DummyVersion {
  id: string
  contentId: string
  contentTitle: string
  label: string
  state: 'draft' | 'published' | 'archived'
  author: string
  changeSummary: string
  updatedAt: string
  reviewDate: string | null
  controlledUpdate: boolean
}

export interface DummyTutor {
  id: string
  name: string
  email: string
  avatar: string
  totalContent: number
  pending: number
  approved: number
  rejected: number
  requiresUpdate: number
  published: number
  lastActive: string
}

const tutorsSeed: DummyTutor[] = [
  { id: 't1', name: 'Aisha Bello', email: 'aisha.bello@danvic.ng', avatar: 'AB', totalContent: 14, pending: 3, approved: 5, rejected: 1, requiresUpdate: 2, published: 6, lastActive: '2026-03-12' },
  { id: 't2', name: 'Chinedu Okafor', email: 'chinedu.okafor@danvic.ng', avatar: 'CO', totalContent: 9, pending: 2, approved: 2, rejected: 2, requiresUpdate: 1, published: 3, lastActive: '2026-03-10' },
  { id: 't3', name: 'Fatima Yusuf', email: 'fatima.yusuf@danvic.ng', avatar: 'FY', totalContent: 21, pending: 5, approved: 8, rejected: 0, requiresUpdate: 3, published: 11, lastActive: '2026-03-13' },
  { id: 't4', name: 'Emeka Daniel', email: 'emeka.daniel@danvic.ng', avatar: 'ED', totalContent: 7, pending: 0, approved: 4, rejected: 1, requiresUpdate: 0, published: 4, lastActive: '2026-03-08' },
  { id: 't5', name: 'Grace Johnson', email: 'grace.j@danvic.ng', avatar: 'GJ', totalContent: 12, pending: 4, approved: 3, rejected: 3, requiresUpdate: 4, published: 2, lastActive: '2026-03-11' },
  { id: 't6', name: 'Samuel Adeyemi', email: 'samuel.a@danvic.ng', avatar: 'SA', totalContent: 6, pending: 1, approved: 1, rejected: 0, requiresUpdate: 1, published: 1, lastActive: '2026-03-09' },
  { id: 't7', name: 'Ngozi Eze', email: 'ngozi.eze@danvic.ng', avatar: 'NE', totalContent: 18, pending: 6, approved: 7, rejected: 2, requiresUpdate: 5, published: 9, lastActive: '2026-03-14' },
  { id: 't8', name: 'Tunde Bakare', email: 'tunde.bakare@danvic.ng', avatar: 'TB', totalContent: 5, pending: 2, approved: 0, rejected: 1, requiresUpdate: 2, published: 0, lastActive: '2026-03-07' },
]

export const dummyTutors = tutorsSeed

export const dummyContent: DummyContent[] = [
  { id: 'c1', title: 'Well Control Fundamentals — Module 1', type: 'Module', tutor: 'Aisha Bello', tutorId: 't1', courseName: 'Well Control & Safety', status: 'published', updatedAt: '2026-03-12', createdAt: '2026-01-10', version: 'v3.0', views: 842 },
  { id: 'c2', title: 'PET – Introduction to Petroleum Economics', type: 'Course', tutor: 'Fatima Yusuf', tutorId: 't3', courseName: 'Petroleum Economics', status: 'pending_review', updatedAt: '2026-03-14', createdAt: '2026-02-20', version: 'v1.2', views: 120 },
  { id: 'c3', title: 'HSE Safety Protocols for Rig Operations', type: 'Lesson', tutor: 'Grace Johnson', tutorId: 't5', courseName: 'HSE Safety', status: 'rejected', updatedAt: '2026-03-10', createdAt: '2026-02-15', version: 'v1.0', views: 45 },
  { id: 'c4', title: 'Reservoir Characterization: Porosity & Permeability', type: 'Article', tutor: 'Ngozi Eze', tutorId: 't7', courseName: 'Reservoir Engineering', status: 'approved', updatedAt: '2026-03-13', createdAt: '2026-02-01', version: 'v2.1', views: 310 },
  { id: 'c5', title: 'Drilling Fluids — Video Walkthrough', type: 'Video', tutor: 'Chinedu Okafor', tutorId: 't2', courseName: 'Drilling Operations', status: 'archived', updatedAt: '2026-03-01', createdAt: '2025-11-12', version: 'v2.0', views: 920 },
  { id: 'c6', title: 'Gas Lift Optimization — Lesson 4', type: 'Lesson', tutor: 'Aisha Bello', tutorId: 't1', courseName: 'Production Engineering', status: 'pending_review', updatedAt: '2026-03-13', createdAt: '2026-03-01', version: 'v1.1', views: 88 },
  { id: 'c7', title: 'Pipeline Integrity Management Guide', type: 'Guide', tutor: 'Samuel Adeyemi', tutorId: 't6', courseName: 'Pipeline Engineering', status: 'approved', updatedAt: '2026-03-11', createdAt: '2026-01-25', version: 'v1.4', views: 210 },
  { id: 'c8', title: 'Offshore Logistics — Module 2: Supply Chain', type: 'Module', tutor: 'Emeka Daniel', tutorId: 't4', courseName: 'Offshore Logistics', status: 'published', updatedAt: '2026-03-08', createdAt: '2026-01-05', version: 'v4.0', views: 654 },
  { id: 'c9', title: 'Petrophysics Lab: Core Analysis', type: 'Lesson', tutor: 'Fatima Yusuf', tutorId: 't3', courseName: 'Petrophysics', status: 'pending_review', updatedAt: '2026-03-12', createdAt: '2026-02-28', version: 'v1.0', views: 67 },
  { id: 'c10', title: 'Financial Modelling for Energy Projects', type: 'Course', tutor: 'Ngozi Eze', tutorId: 't7', courseName: 'Petroleum Economics', status: 'published', updatedAt: '2026-03-14', createdAt: '2026-01-18', version: 'v2.3', views: 430 },
  { id: 'c11', title: 'Corrosion Control in Pipelines', type: 'Article', tutor: 'Tunde Bakare', tutorId: 't8', courseName: 'Asset Integrity', status: 'rejected', updatedAt: '2026-03-09', createdAt: '2026-02-10', version: 'v1.0', views: 33 },
  { id: 'c12', title: 'Seismic Interpretation — Intro Video', type: 'Video', tutor: 'Chinedu Okafor', tutorId: 't2', courseName: 'Geophysics', status: 'approved', updatedAt: '2026-03-07', createdAt: '2026-02-05', version: 'v1.3', views: 198 },
  { id: 'c13', title: 'Well Completion Techniques', type: 'Module', tutor: 'Aisha Bello', tutorId: 't1', courseName: 'Well Engineering', status: 'archived', updatedAt: '2026-02-28', createdAt: '2025-10-20', version: 'v1.9', views: 540 },
  { id: 'c14', title: 'Emergency Response — Safety Drill Guide', type: 'Guide', tutor: 'Grace Johnson', tutorId: 't5', courseName: 'HSE Safety', status: 'pending_review', updatedAt: '2026-03-14', createdAt: '2026-03-05', version: 'v1.0', views: 12 },
  { id: 'c15', title: 'LNG Value Chain Overview', type: 'Course', tutor: 'Emeka Daniel', tutorId: 't4', courseName: 'Gas Processing', status: 'published', updatedAt: '2026-03-06', createdAt: '2026-01-30', version: 'v1.8', views: 720 },
  { id: 'c16', title: 'Downhole Tools Catalog', type: 'Article', tutor: 'Ngozi Eze', tutorId: 't7', courseName: 'Drilling Operations', status: 'draft', updatedAt: '2026-03-13', createdAt: '2026-03-13', version: 'v0.9', views: 5 },
]

export const dummyAssessments: DummyAssessment[] = [
  { id: 'a1', title: 'Well Control — Final Assessment', type: 'exam', course: 'Well Control & Safety', questions: 40, status: 'open', submissions: 112, passMark: 70, durationMinutes: 60, updatedAt: '2026-03-12' },
  { id: 'a2', title: 'HSE Safety: Quiz 1 — PPE & Hazards', type: 'quiz', course: 'HSE Safety', questions: 15, status: 'open', submissions: 84, passMark: 60, durationMinutes: 20, updatedAt: '2026-03-11' },
  { id: 'a3', title: 'Reservoir Engineering Assignment 02', type: 'assignment', course: 'Reservoir Engineering', questions: 5, status: 'pending_review', submissions: 22, passMark: 50, durationMinutes: 0, updatedAt: '2026-03-13' },
  { id: 'a4', title: 'Pipeline Integrity — Midterm Exam', type: 'exam', course: 'Pipeline Engineering', questions: 30, status: 'closed', submissions: 45, passMark: 65, durationMinutes: 90, updatedAt: '2026-02-28' },
  { id: 'a5', title: 'Petroleum Economics: Quiz 3 — Valuation', type: 'quiz', course: 'Petroleum Economics', questions: 12, status: 'pending_review', submissions: 18, passMark: 60, durationMinutes: 15, updatedAt: '2026-03-14' },
  { id: 'a6', title: 'Drilling Fluids Assignment — Lab Report', type: 'assignment', course: 'Drilling Operations', questions: 3, status: 'draft', submissions: 0, passMark: 50, durationMinutes: 0, updatedAt: '2026-03-10' },
  { id: 'a7', title: 'Gas Processing Quiz — LNG Basics', type: 'quiz', course: 'Gas Processing', questions: 10, status: 'open', submissions: 63, passMark: 60, durationMinutes: 15, updatedAt: '2026-03-09' },
  { id: 'a8', title: 'Offshore Logistics Final Exam', type: 'exam', course: 'Offshore Logistics', questions: 35, status: 'pending_review', submissions: 9, passMark: 70, durationMinutes: 75, updatedAt: '2026-03-14' },
]

export const dummyQuestionBank: DummyQuestionBankItem[] = [
  { id: 'q1', prompt: 'What is the primary function of a blowout preventer (BOP)?', type: 'mcq', category: 'Well Control', status: 'approved', updatedAt: '2026-03-10' },
  { id: 'q2', prompt: 'Calculate hydrostatic pressure for a 2500 m well with 1.2 SG mud.', type: 'short_answer', category: 'Well Control', status: 'pending_review', updatedAt: '2026-03-12' },
  { id: 'q3', prompt: 'Explain the difference between porosity and permeability with field examples.', type: 'essay', category: 'Reservoir Eng.', status: 'approved', updatedAt: '2026-03-08' },
  { id: 'q4', prompt: 'Which corrosion inhibitor is suitable for sour gas pipelines at 80°C?', type: 'mcq', category: 'Asset Integrity', status: 'draft', updatedAt: '2026-03-13' },
  { id: 'q5', prompt: 'Write Python to estimate NPV for an energy project cashflow.', type: 'code', category: 'Petroleum Economics', status: 'pending_review', updatedAt: '2026-03-14' },
  { id: 'q6', prompt: 'List 5 mandatory PPE items for rig floor operations.', type: 'short_answer', category: 'HSE', status: 'approved', updatedAt: '2026-03-09' },
  { id: 'q7', prompt: 'Describe the gas lift optimization workflow step-by-step.', type: 'essay', category: 'Production Eng.', status: 'draft', updatedAt: '2026-03-11' },
  { id: 'q8', prompt: 'What is the MAWP formula for ASME Section VIII vessels?', type: 'mcq', category: 'Facilities', status: 'approved', updatedAt: '2026-03-07' },
]

export const dummyReviews: DummyReview[] = [
  { id: 'r1', contentId: 'c2', contentTitle: 'PET – Introduction to Petroleum Economics', criterion: 'Technical Accuracy', status: 'pending', reviewer: 'Dr. Okoro', score: null, comment: 'Awaiting SME validation of cash-flow model.', updatedAt: '2026-03-14' },
  { id: 'r2', contentId: 'c4', contentTitle: 'Reservoir Characterization: Porosity & Permeability', criterion: 'Technical Accuracy', status: 'pass', reviewer: 'Dr. Okoro', score: 9, comment: 'Accurate definitions, correct equations.', updatedAt: '2026-03-13' },
  { id: 'r3', contentId: 'c3', contentTitle: 'HSE Safety Protocols for Rig Operations', criterion: 'Safety & Regulatory', status: 'fail', reviewer: 'HSE Lead', score: 4, comment: 'Missing ISO 45001 lockout/tagout reference.', updatedAt: '2026-03-10' },
  { id: 'r4', contentId: 'c14', contentTitle: 'Emergency Response — Safety Drill Guide', criterion: 'Safety & Regulatory', status: 'pending', reviewer: 'HSE Lead', score: null, comment: 'Queued for safety audit.', updatedAt: '2026-03-14' },
  { id: 'r5', contentId: 'c6', contentTitle: 'Gas Lift Optimization — Lesson 4', criterion: 'Brand Consistency', status: 'needs_revision', reviewer: 'Brand Desk', score: 6, comment: 'Logo usage on diagram p.3 violates brand guide.', updatedAt: '2026-03-13' },
  { id: 'r6', contentId: 'c7', contentTitle: 'Pipeline Integrity Management Guide', criterion: 'Brand Consistency', status: 'pass', reviewer: 'Brand Desk', score: 8, comment: 'Typography and palette consistent.', updatedAt: '2026-03-11' },
  { id: 'r7', contentId: 'c11', contentTitle: 'Corrosion Control in Pipelines', criterion: 'Copyright / IP', status: 'fail', reviewer: 'Legal', score: 3, comment: 'Figure 2 appears unlicensed — replace with owned asset.', updatedAt: '2026-03-09' },
  { id: 'r8', contentId: 'c12', contentTitle: 'Seismic Interpretation — Intro Video', criterion: 'Copyright / IP', status: 'pass', reviewer: 'Legal', score: 9, comment: 'All media cleared.', updatedAt: '2026-03-07' },
  { id: 'r9', contentId: 'c2', contentTitle: 'PET – Introduction to Petroleum Economics', criterion: 'Content Quality', status: 'needs_revision', reviewer: 'Editorial', score: 7, comment: 'Add learning-outcome summary and tighten intro.', updatedAt: '2026-03-14' },
  { id: 'r10', contentId: 'c4', contentTitle: 'Reservoir Characterization: Porosity & Permeability', criterion: 'Content Quality', status: 'pass', reviewer: 'Editorial', score: 9, comment: 'Concise, well-structured.', updatedAt: '2026-03-13' },
  { id: 'r11', contentId: 'c9', contentTitle: 'Petrophysics Lab: Core Analysis', criterion: 'Content Quality', status: 'pending', reviewer: 'Editorial', score: null, comment: 'In editorial queue — est. 2 days.', updatedAt: '2026-03-12' },
  { id: 'r12', contentId: 'c1', contentTitle: 'Well Control Fundamentals — Module 1', criterion: 'Content Quality', status: 'pass', reviewer: 'Editorial', score: 9, comment: 'Excellent progression.', updatedAt: '2026-03-12' },
]

export const dummyVersions: DummyVersion[] = [
  { id: 'v1', contentId: 'c1', contentTitle: 'Well Control Fundamentals — Module 1', label: 'v3.0', state: 'published', author: 'Aisha Bello', changeSummary: 'Major update — added new IWCF scenarios', updatedAt: '2026-03-12', reviewDate: '2026-03-12', controlledUpdate: false },
  { id: 'v2', contentId: 'c1', contentTitle: 'Well Control Fundamentals — Module 1', label: 'v2.4', state: 'archived', author: 'Aisha Bello', changeSummary: 'Corrected kick tolerance calc', updatedAt: '2026-02-20', reviewDate: '2026-02-21', controlledUpdate: false },
  { id: 'v3', contentId: 'c1', contentTitle: 'Well Control Fundamentals — Module 1', label: 'v3.1-draft', state: 'draft', author: 'Aisha Bello', changeSummary: 'Draft — adding VR simulation link', updatedAt: '2026-03-14', reviewDate: null, controlledUpdate: true },
  { id: 'v4', contentId: 'c2', contentTitle: 'PET – Introduction to Petroleum Economics', label: 'v1.2', state: 'draft', author: 'Fatima Yusuf', changeSummary: 'Awaiting approval — no published version yet', updatedAt: '2026-03-14', reviewDate: '2026-03-16', controlledUpdate: false },
  { id: 'v5', contentId: 'c8', contentTitle: 'Offshore Logistics — Module 2', label: 'v4.0', state: 'published', author: 'Emeka Daniel', changeSummary: 'Published — supply chain maps refreshed', updatedAt: '2026-03-08', reviewDate: '2026-03-07', controlledUpdate: false },
  { id: 'v6', contentId: 'c8', contentTitle: 'Offshore Logistics — Module 2', label: 'v4.1-draft', state: 'draft', author: 'Emeka Daniel', changeSummary: 'Draft — controlled update for 2026 rates', updatedAt: '2026-03-13', reviewDate: '2026-03-18', controlledUpdate: true },
  { id: 'v7', contentId: 'c5', contentTitle: 'Drilling Fluids — Video Walkthrough', label: 'v2.0', state: 'archived', author: 'Chinedu Okafor', changeSummary: 'Archived — superseded by Module 4', updatedAt: '2026-03-01', reviewDate: '2026-02-28', controlledUpdate: false },
  { id: 'v8', contentId: 'c10', contentTitle: 'Financial Modelling for Energy Projects', label: 'v2.3', state: 'published', author: 'Ngozi Eze', changeSummary: 'Published — Excel template v2', updatedAt: '2026-03-14', reviewDate: '2026-03-13', controlledUpdate: false },
  { id: 'v9', contentId: 'c4', contentTitle: 'Reservoir Characterization', label: 'v2.1', state: 'published', author: 'Ngozi Eze', changeSummary: 'Published — peer-reviewed', updatedAt: '2026-03-13', reviewDate: '2026-03-12', controlledUpdate: false },
]

export function countsByStatus(list: DummyContent[]) {
  return {
    all: list.length,
    draft: list.filter((c) => c.status === 'draft').length,
    pending_review: list.filter((c) => c.status === 'pending_review').length,
    approved: list.filter((c) => c.status === 'approved').length,
    rejected: list.filter((c) => c.status === 'rejected').length,
    published: list.filter((c) => c.status === 'published').length,
    archived: list.filter((c) => c.status === 'archived').length,
  }
}
