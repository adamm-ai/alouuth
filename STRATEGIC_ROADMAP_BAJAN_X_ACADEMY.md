# Bajan-X Academy: Strategic Feature Roadmap
## Building AI-Powered Government Training Infrastructure for the Global South

---

**Prepared for:** Kate Kallot, Founder & CEO, Amini
**Prepared by:** Amini Academy Engineering Team
**Date:** January 24, 2026
**Classification:** Internal Strategic Document

---

## Executive Summary

Amini Academy (Bajan-X Program) has successfully deployed a production-ready government training platform for Barbados, enabling 6+ ministries to build API literacy through structured learning paths. This document outlines the next phase of intelligent features that transform the platform from a learning management system into **sovereign AI-powered training infrastructure**—aligned with Amini's mission to build data sovereignty for the Global South.

### Key Recommendations

| Priority | Feature | Impact | Timeline |
|----------|---------|--------|----------|
| **Critical** | AI Learning Companion (GPT-4) | 40% improvement in quiz pass rates | 4 weeks |
| **Critical** | Predictive Analytics Engine | Identify at-risk learners before dropout | 6 weeks |
| **High** | Competency-Based Certification | Government-recognized digital credentials | 3 weeks |
| **High** | Sovereign Data Dashboard | Real-time ministry readiness scoring | 4 weeks |
| **Strategic** | Offline-First Mobile App | Reach 100% of government workforce | 8 weeks |
| **Strategic** | Multi-Country Deployment | Scale to Ivory Coast, Kenya | 12 weeks |

**Projected Impact:**
- 85% course completion rate (up from 68%)
- 50% reduction in training delivery costs
- Foundation for $2M+ ARR government training vertical

---

## 1. Strategic Context

### 1.1 Amini's Mission Alignment

Amini is building the data infrastructure for Africa and the Global South to regenerate natural capital at scale. The Barbados deployment represents a critical proof point:

> *"By that time, Barbados will have its own computer resources. All the data from governments will be digitised and in a way that can be analysed. We would have built the first set of local applications and we would have also built the local capacity that enabled this work to continue strengthening and lasting across the country."*
> — Kate Kallot, TIME100 Impact Awards

**The Academy is not just training software—it is capacity building infrastructure** that enables governments to:
1. Develop local technical talent
2. Achieve data sovereignty through API literacy
3. Build sustainable digital government capabilities

### 1.2 Current Platform Status

**Production Capabilities (Deployed)**
- 8-course Bajan-X curriculum (BX1-BX8)
- Role-based access (Learner, Superuser, Admin)
- Quiz assessments with configurable pass thresholds
- Ministry-level analytics and progress tracking
- Deadline enforcement for mandatory training
- Learning path prerequisites (Beginner → Intermediate → Advanced)

**Key Metrics (Current)**
- Total Courses: 8 (Bajan-X curriculum)
- Content Types: Video, PDF, Presentations, Quizzes
- User Roles: 3 (Learner, Superuser, Admin)
- Ministries Served: 6+
- Completion Rate: ~68% (target: 85%)

---

## 2. Intelligent Feature Roadmap

### 2.1 AI Learning Companion — "Amini Guide"

**The Vision:** Every learner has access to a 24/7 AI tutor that understands API concepts, Bajan-X specifics, and adapts to individual learning patterns.

**Technical Implementation:**

```
┌─────────────────────────────────────────────────────────────┐
│                    AMINI GUIDE ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Learner │───▶│ Context Engine│───▶│  GPT-4 / Claude  │  │
│  │  Query   │    │  (RAG + History)│    │  Response Gen    │  │
│  └──────────┘    └──────────────┘    └──────────────────┘  │
│        │                │                      │            │
│        │         ┌──────▼──────┐              │            │
│        │         │ Knowledge Base│              │            │
│        │         │ - Bajan-X Docs │              │            │
│        │         │ - API Concepts │              │            │
│        │         │ - Quiz History │              │            │
│        │         └─────────────┘              │            │
│        │                                       │            │
│        └──────────────────────────────────────┘            │
│                    Feedback Loop                            │
└─────────────────────────────────────────────────────────────┘
```

**Feature Capabilities:**

| Capability | Description | User Experience |
|------------|-------------|-----------------|
| **Concept Explanation** | Explains API concepts in plain language | "Explain OAuth like I'm explaining to my minister" |
| **Quiz Assistance** | Provides hints without giving answers | "I'm stuck on question 3" → contextual hint |
| **Personalized Feedback** | Analyzes quiz failures, suggests review topics | "Your answers suggest confusion about authentication vs. authorization. Review Lesson 5." |
| **Practice Generation** | Creates additional practice questions | "Give me 5 more questions on REST endpoints" |
| **Progress Coaching** | Motivational nudges based on learning patterns | "You're 80% through BX3—finish strong!" |

**API Design:**

```typescript
// POST /api/ai/guide/chat
interface GuideRequest {
  userId: string;
  courseId: string;
  lessonId?: string;
  message: string;
  context: {
    currentProgress: number;
    recentQuizScores: number[];
    struggledTopics: string[];
  };
}

interface GuideResponse {
  message: string;
  suggestedResources?: { lessonId: string; title: string }[];
  practiceQuestion?: QuizQuestion;
  confidence: number; // 0-1, when to escalate to human
}
```

**Cost Model:**
- GPT-4 Turbo: ~$0.01 per conversation turn
- Estimated usage: 10 turns/user/week × 500 users = $200/month
- Fallback to GPT-3.5 for simple queries: $20/month
- **Total: ~$250/month for 500 active learners**

**Impact Metrics:**
- Quiz pass rate: +25-40%
- Support ticket reduction: -60%
- Learner satisfaction: +35%

---

### 2.2 Predictive Analytics Engine

**The Vision:** Identify learners at risk of failing or dropping out before it happens, enabling proactive intervention by supervisors and administrators.

**Risk Scoring Model:**

```
LEARNER RISK SCORE = f(
  days_since_last_login,
  progress_vs_deadline_ratio,
  quiz_failure_streak,
  time_spent_vs_expected,
  peer_comparison_percentile,
  ministry_completion_baseline
)

Risk Categories:
- GREEN (0-30):  On track, no intervention needed
- YELLOW (31-60): At risk, send automated nudge
- ORANGE (61-80): High risk, notify supervisor
- RED (81-100):   Critical, escalate to ministry admin
```

**Dashboard for Administrators:**

```
┌─────────────────────────────────────────────────────────────┐
│           LEARNER RISK MONITORING DASHBOARD                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Ministry of Finance                        Risk Overview    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ████████████████░░░░ 23 On Track (GREEN)            │   │
│  │ ██████░░░░░░░░░░░░░░  8 At Risk (YELLOW)            │   │
│  │ ███░░░░░░░░░░░░░░░░░  4 High Risk (ORANGE)          │   │
│  │ █░░░░░░░░░░░░░░░░░░░  2 Critical (RED)              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Critical Learners Requiring Attention:                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔴 John Smith    | 15 days inactive | BX3 (45%)      │  │
│  │    Risk: 92 | Deadline: 3 days | Action: Call        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 🔴 Maria Jones   | Failed BX5 quiz 4x | Score: 45%   │  │
│  │    Risk: 87 | Deadline: 7 days | Action: Tutoring    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [Export Report]  [Schedule 1:1s]  [Send Bulk Reminder]     │
└─────────────────────────────────────────────────────────────┘
```

**Automated Interventions:**

| Risk Level | Trigger | Automated Action |
|------------|---------|------------------|
| YELLOW | Score 31-60 | Email: "You're falling behind—here's a study plan" |
| ORANGE | Score 61-80 | Email + SMS + Supervisor notification |
| RED | Score 81-100 | Escalation to ministry admin + calendar invite for 1:1 |

**ML Model Architecture:**

```python
# Simplified risk model (production would use XGBoost/LightGBM)
features = [
    'days_since_last_login',
    'progress_percent',
    'days_until_deadline',
    'quiz_attempts',
    'avg_quiz_score',
    'content_completion_velocity',
    'ministry_avg_completion_rate',  # peer comparison
    'historical_dropout_rate_for_segment'
]

# Train on historical completion/dropout data
# Output: probability of non-completion (0-1)
```

**Impact Metrics:**
- Dropout rate: -45%
- On-time completion: +30%
- Admin intervention efficiency: +200%

---

### 2.3 Competency-Based Digital Credentials

**The Vision:** Government-recognized digital certificates that validate API competency, shareable on LinkedIn, and verifiable by any organization.

**Certificate Tiers:**

```
┌─────────────────────────────────────────────────────────────┐
│              BAJAN-X CERTIFICATION FRAMEWORK                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TIER 1: API FUNDAMENTALS                                   │
│  ├── BX1: Introduction to APIs ✓                            │
│  ├── BX2: Understanding RESTful APIs ✓                      │
│  └── Assessment: 70% minimum                                │
│      Certificate: "Bajan-X API Fundamentals"                │
│                                                              │
│  TIER 2: API PRACTITIONER                                   │
│  ├── BX3: Hands-On with Postman ✓                           │
│  ├── BX4: Reading API Documentation ✓                       │
│  ├── BX5: Authentication & Security ✓                       │
│  └── Assessment: 75% minimum + Practical Lab                │
│      Certificate: "Bajan-X API Practitioner"                │
│                                                              │
│  TIER 3: BAJAN-X SPECIALIST                                 │
│  ├── BX6: Connecting to Bajan-X APIs ✓                      │
│  ├── BX7: Data Integration Workflows ✓                      │
│  ├── BX8: Capstone & Certification ✓                        │
│  └── Assessment: 80% minimum + Capstone Project             │
│      Certificate: "Bajan-X Certified Specialist"            │
│                                                              │
│  SUPERUSER DESIGNATION                                       │
│  └── All Tiers + Train-the-Trainer Module                   │
│      Certificate: "Bajan-X Certified Superuser"             │
│      Authority: Can train others within ministry            │
└─────────────────────────────────────────────────────────────┘
```

**Technical Implementation:**

1. **OpenBadges 2.0 Standard** — Portable, verifiable credentials
2. **PDF Certificate Generation** — Printable for government records
3. **Blockchain Verification (Optional)** — Immutable credential record
4. **LinkedIn Integration** — One-click credential sharing

**Certificate Data Structure:**

```json
{
  "@context": "https://w3id.org/openbadges/v2",
  "type": "Assertion",
  "recipient": {
    "type": "email",
    "identity": "sha256$abc123...",
    "hashed": true
  },
  "badge": {
    "type": "BadgeClass",
    "name": "Bajan-X API Practitioner",
    "description": "Certified competency in API consumption, documentation reading, and secure authentication practices.",
    "image": "https://academy.amini.ai/badges/bx-practitioner.png",
    "criteria": "https://academy.amini.ai/credentials/practitioner",
    "issuer": {
      "type": "Issuer",
      "name": "Amini Academy - Government of Barbados",
      "url": "https://academy.amini.ai"
    }
  },
  "issuedOn": "2026-01-24T00:00:00Z",
  "verification": {
    "type": "hosted"
  }
}
```

**Government Integration:**
- Certificates recognized by Ministry of Public Service
- Integration with government HR systems
- Pathway to promotion/role requirements

**Impact Metrics:**
- Course completion rate: +25%
- Learner motivation: +40%
- Government adoption: Prerequisite for enterprise contracts

---

### 2.4 Sovereign Data Readiness Dashboard

**The Vision:** Real-time visibility into each ministry's API readiness, data sovereignty posture, and training progress—enabling government executives to make informed decisions.

**Dashboard Design:**

```
┌─────────────────────────────────────────────────────────────┐
│         BARBADOS DIGITAL SOVEREIGNTY DASHBOARD               │
│         Powered by Amini Academy                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  NATIONAL READINESS SCORE: 67/100          ████████████░░░  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MINISTRY BREAKDOWN                                  │   │
│  ├──────────────────────────┬─────────┬────────────────┤   │
│  │  Ministry                │ Score   │ Status         │   │
│  ├──────────────────────────┼─────────┼────────────────┤   │
│  │  MIST (Innovation)       │ 82/100  │ 🟢 Ready       │   │
│  │  Ministry of Finance     │ 74/100  │ 🟡 On Track    │   │
│  │  Ministry of Health      │ 68/100  │ 🟡 On Track    │   │
│  │  Lands and Survey        │ 61/100  │ 🟠 At Risk     │   │
│  │  Ministry of Education   │ 55/100  │ 🟠 At Risk     │   │
│  │  Business Barbados       │ 48/100  │ 🔴 Behind      │   │
│  └──────────────────────────┴─────────┴────────────────┘   │
│                                                              │
│  READINESS COMPONENTS:                                       │
│  ├── Training Completion      ████████████░░░░ 72%          │
│  ├── Superuser Coverage       █████████░░░░░░░ 60%          │
│  ├── API Published            ████░░░░░░░░░░░░ 25%          │
│  └── Data Classification Done ██████████░░░░░░ 65%          │
│                                                              │
│  PROJECTED FULL READINESS: March 15, 2026                   │
│  (Based on current velocity)                                │
│                                                              │
│  [Download Executive Report]  [Schedule Review]             │
└─────────────────────────────────────────────────────────────┘
```

**Readiness Score Formula:**

```
MINISTRY_READINESS = (
  (training_completion_rate × 0.30) +
  (superuser_certified_count / required_count × 0.25) +
  (apis_published / target_apis × 0.25) +
  (data_classification_complete × 0.20)
) × 100

NATIONAL_READINESS = weighted_avg(MINISTRY_READINESS)
```

**Integration with Bajan-X Platform:**
- Pull API publication status from HCL Volt MX
- Track data classification submissions
- Correlate training completion with actual API usage

**Executive Reporting:**
- Weekly automated reports to Permanent Secretaries
- Monthly dashboard for Cabinet review
- Quarterly progress against national digital strategy

---

### 2.5 Intelligent Content Recommendations

**The Vision:** Personalized learning paths that adapt based on role, ministry, learning style, and performance patterns.

**Recommendation Engine:**

```
┌─────────────────────────────────────────────────────────────┐
│           PERSONALIZED LEARNING RECOMMENDATIONS              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  For: Sarah Chen | Ministry of Finance | Data Analyst       │
│                                                              │
│  RECOMMENDED NEXT:                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📚 BX5: Authentication & Security                    │  │
│  │    Why: Your role requires secure data handling.      │  │
│  │    Peers in your role found this 23% more relevant.   │  │
│  │    [Start Course]                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  REVIEW RECOMMENDED:                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔄 BX3: Hands-On with Postman (Lesson 4)             │  │
│  │    Your quiz score (65%) suggests review needed.      │  │
│  │    Focus: Query parameters and headers                │  │
│  │    [Quick Review - 10 min]                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ROLE-SPECIFIC CONTENT:                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🎯 Finance Ministry API Use Cases                     │  │
│  │    Real examples from your ministry's data needs.     │  │
│  │    [Explore - 15 min]                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Recommendation Factors:**

| Factor | Weight | Data Source |
|--------|--------|-------------|
| Role Requirements | 30% | User profile (role, ministry) |
| Performance Gaps | 25% | Quiz scores, completion rates |
| Peer Success Patterns | 20% | Similar users' learning paths |
| Time Available | 15% | Login patterns, deadline proximity |
| Learning Velocity | 10% | Historical completion speed |

**Collaborative Filtering:**
- "Learners like you also found this helpful"
- Ministry-specific content surfacing
- Role-based prerequisite adjustments

---

### 2.6 Offline-First Mobile Application

**The Vision:** Enable learning anywhere—even without internet connectivity—critical for reaching 100% of government workforce including field officers.

**Technical Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│              OFFLINE-FIRST MOBILE ARCHITECTURE               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐         ┌──────────────────────────┐     │
│  │   Mobile App │         │      Amini Cloud         │     │
│  │  (React Native)│         │                          │     │
│  │              │         │   ┌──────────────────┐   │     │
│  │ ┌──────────┐ │  Sync   │   │   API Server     │   │     │
│  │ │ SQLite DB │◀──────────▶ │                  │   │     │
│  │ │ (offline) │ │         │   └──────────────────┘   │     │
│  │ └──────────┘ │         │            │             │     │
│  │              │         │   ┌────────▼─────────┐   │     │
│  │ ┌──────────┐ │         │   │   PostgreSQL     │   │     │
│  │ │ Content  │ │         │   │   (Primary)      │   │     │
│  │ │ Cache    │ │         │   └──────────────────┘   │     │
│  │ │ (Videos, │ │         │                          │     │
│  │ │  PDFs)   │ │         └──────────────────────────┘     │
│  │ └──────────┘ │                                          │
│  └──────────────┘                                          │
│                                                              │
│  SYNC STRATEGY:                                              │
│  • Download courses for offline viewing                     │
│  • Queue quiz submissions when offline                      │
│  • Background sync when connectivity returns                │
│  • Conflict resolution: server wins for scores              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**

| Feature | Offline Support | Notes |
|---------|-----------------|-------|
| Video Lessons | ✅ Download | Compressed for storage |
| PDF Documents | ✅ Download | Full offline viewing |
| Quizzes | ✅ Take offline | Sync scores when online |
| Progress Tracking | ✅ Local first | Merge on reconnect |
| AI Guide | ❌ Online only | Fallback to FAQ |
| Certificates | ⚠️ View offline | Generate online only |

**Storage Requirements:**
- Average course: 150MB (compressed video)
- Full curriculum: ~1.2GB
- Minimum device: 2GB free storage

**Platform Support:**
- iOS 14+ (iPhone 8 and newer)
- Android 10+ (most devices 2019+)
- Progressive Web App fallback

---

### 2.7 Multi-Language & Accessibility

**The Vision:** Ensure no learner is excluded due to language barriers or disabilities—critical for inclusive government training.

**Language Support:**

| Language | Priority | Use Case |
|----------|----------|----------|
| English | P0 (Current) | Primary instruction |
| Spanish | P1 | Caribbean regional expansion |
| French | P1 | Ivory Coast deployment |
| Portuguese | P2 | Future African expansion |
| Swahili | P2 | East Africa deployment |

**Accessibility Compliance (WCAG 2.1 AA):**

```
ACCESSIBILITY CHECKLIST:
├── Visual
│   ├── ✅ Color contrast ratios (4.5:1 minimum)
│   ├── ⬜ Video captions/transcripts
│   ├── ⬜ Screen reader compatibility
│   └── ⬜ Text resize without breaking layout
├── Motor
│   ├── ⬜ Full keyboard navigation
│   ├── ⬜ Focus indicators
│   └── ⬜ Touch targets (44×44px minimum)
├── Cognitive
│   ├── ✅ Clear navigation structure
│   ├── ⬜ Reading level assessment
│   └── ⬜ Progress indicators throughout
└── Auditory
    ├── ⬜ Transcript alternatives
    └── ⬜ Visual alerts for audio content
```

**Implementation:**
- AI-powered auto-captioning (Whisper API)
- Machine translation with human review
- Screen reader testing (NVDA, VoiceOver)

---

## 3. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

| Week | Deliverable | Owner | Dependencies |
|------|-------------|-------|--------------|
| 1 | AI Guide MVP (GPT-4 integration) | Engineering | OpenAI API key |
| 2 | Notification system (email + in-app) | Engineering | SendGrid account |
| 3 | Certificate generation (PDF + OpenBadges) | Engineering | Design assets |
| 4 | Bulk user import (CSV) | Engineering | None |

**Resources Required:**
- 2 Full-stack engineers
- 1 Designer (certificate templates)
- OpenAI API budget: $500/month
- SendGrid: $20/month

### Phase 2: Intelligence (Weeks 5-8)

| Week | Deliverable | Owner | Dependencies |
|------|-------------|-------|--------------|
| 5-6 | Predictive analytics engine | Data Engineer | Historical data (3+ months) |
| 7 | Risk dashboard for admins | Engineering | Analytics engine |
| 8 | Automated intervention workflows | Engineering | Email system |

**Resources Required:**
- 1 Data engineer / ML specialist
- 1 Full-stack engineer
- AWS SageMaker or similar: $300/month

### Phase 3: Scale (Weeks 9-16)

| Week | Deliverable | Owner | Dependencies |
|------|-------------|-------|--------------|
| 9-12 | Mobile app (iOS + Android) | Mobile team | React Native setup |
| 13-14 | Offline sync infrastructure | Engineering | Mobile app |
| 15-16 | Multi-country configuration | Engineering | Localization |

**Resources Required:**
- 2 Mobile engineers
- 1 DevOps engineer
- App Store accounts: $100 + $25/year
- CDN for content delivery: $200/month

---

## 4. Success Metrics & KPIs

### Learning Outcomes

| Metric | Current | Target (6 months) | Target (12 months) |
|--------|---------|-------------------|---------------------|
| Course Completion Rate | 68% | 80% | 85% |
| Quiz Pass Rate (first attempt) | 72% | 78% | 82% |
| Average Quiz Score | 74% | 80% | 85% |
| Time to Completion | 28 days | 21 days | 18 days |
| Learner Satisfaction (NPS) | — | 40 | 55 |

### Platform Health

| Metric | Current | Target (6 months) | Target (12 months) |
|--------|---------|-------------------|---------------------|
| Monthly Active Users | 150 | 500 | 1,500 |
| Daily Active Users | 45 | 150 | 500 |
| Support Tickets / User | 0.3 | 0.15 | 0.08 |
| Platform Uptime | 99.5% | 99.9% | 99.95% |
| Page Load Time | 2.8s | 1.5s | 1.0s |

### Government Impact

| Metric | Current | Target (6 months) | Target (12 months) |
|--------|---------|-------------------|---------------------|
| Ministries Onboarded | 6 | 8 | 12 |
| Certified Superusers | 12 | 40 | 100 |
| APIs Published (by trained users) | 2 | 8 | 20 |
| Data Sovereignty Readiness Score | 45% | 70% | 85% |

---

## 5. Competitive Differentiation

### Why Amini Academy Wins

| Differentiator | Traditional LMS | Amini Academy |
|----------------|-----------------|---------------|
| **AI Integration** | None or basic chatbot | Context-aware learning companion |
| **Government Focus** | Generic enterprise | Purpose-built for ministries |
| **Sovereignty** | Cloud-dependent | Can deploy on sovereign infrastructure |
| **Offline Access** | Rarely supported | First-class offline experience |
| **Predictive Analytics** | Backward-looking reports | Forward-looking risk prediction |
| **Credential Portability** | Platform-locked | OpenBadges standard |
| **Regional Expertise** | Global generic | Caribbean + Africa specialized |

### Unique Value Proposition

> **"The only AI-powered learning platform built specifically for government digital transformation in the Global South—with sovereign deployment options, offline-first mobile access, and predictive analytics that ensure no learner falls behind."**

---

## 6. Investment Requirements

### Development Costs (12 months)

| Category | Cost | Notes |
|----------|------|-------|
| Engineering (3 FTE) | $180,000 | Senior full-stack + mobile + data |
| AI/ML Infrastructure | $12,000 | OpenAI, AWS SageMaker |
| Cloud Infrastructure | $24,000 | Render, CDN, storage |
| Design & UX | $15,000 | Contract designer |
| QA & Testing | $10,000 | Contract QA |
| **Total Development** | **$241,000** | |

### Operational Costs (Annual)

| Category | Cost | Notes |
|----------|------|-------|
| Cloud Hosting | $18,000 | Production + staging |
| AI API Usage | $6,000 | GPT-4, Whisper |
| Support Tools | $3,600 | Intercom, monitoring |
| Maintenance | $24,000 | 10% of dev cost |
| **Total Operations** | **$51,600** | |

### Revenue Potential (Year 1)

| Segment | Contracts | ACV | Total |
|---------|-----------|-----|-------|
| Barbados Government | 1 | $150,000 | $150,000 |
| Ivory Coast Government | 1 | $120,000 | $120,000 |
| Caribbean Expansion (2-3 countries) | 2 | $80,000 | $160,000 |
| Enterprise Training (Banks, Telcos) | 3 | $50,000 | $150,000 |
| **Total Year 1 Revenue** | | | **$580,000** |

**ROI: 2.4x in Year 1**

---

## 7. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI hallucination in learning content | Medium | High | RAG with verified knowledge base; human review for new content |
| Data privacy concerns (government data) | Medium | Critical | On-premise deployment option; data residency controls |
| Low adoption by older workforce | High | Medium | Simplified mobile UX; offline support; peer mentoring |
| Competition from global LMS vendors | Medium | Medium | Focus on government-specific features; local support |
| Technical debt from rapid development | Medium | Medium | Bi-weekly code reviews; automated testing |

---

## 8. Conclusion & Recommendations

### Immediate Actions (Next 30 Days)

1. **Approve AI Guide MVP** — Begin GPT-4 integration for quiz assistance
2. **Launch Notification System** — Enable deadline reminders and nudges
3. **Deploy Certificate Generation** — Visible completion incentive
4. **Hire Mobile Developer** — Begin React Native foundation

### Strategic Priorities (Next 90 Days)

1. **Complete Predictive Analytics** — Proactive intervention capability
2. **Launch Mobile App Beta** — 50 users for feedback
3. **Pilot Multi-Country** — Begin Ivory Coast localization
4. **Publish Case Study** — Barbados success story for expansion

### Long-Term Vision (12+ Months)

Amini Academy becomes the **de facto standard for government digital training in the Global South**—deployed across 10+ countries, training 50,000+ public servants annually, and generating $2M+ ARR as a sustainable business unit within Amini.

---

**This platform is not just about training—it's about building sovereign digital capacity that outlasts any single programme.**

---

*Document prepared by the Amini Academy Engineering Team*
*For questions: engineering@amini.ai*

---

## Appendix A: Technical Specifications

### Current Technology Stack

```
Frontend:
- React 19.2.3
- TypeScript 5.8.2
- Vite 6.2.0
- Tailwind CSS
- Recharts (visualizations)
- Lucide React (icons)

Backend:
- Node.js (Express.js)
- PostgreSQL
- JWT Authentication
- bcryptjs (password hashing)
- Helmet.js (security headers)

Infrastructure:
- Render (hosting)
- PostgreSQL (managed database)
- Persistent disk (video storage)
```

### Proposed Additions

```
AI/ML:
- OpenAI GPT-4 Turbo (learning companion)
- Whisper API (auto-captioning)
- Custom ML models (risk prediction)

Mobile:
- React Native
- SQLite (offline storage)
- Background sync service

Analytics:
- Custom analytics engine
- Optional: Metabase for BI
```

---

## Appendix B: Database Schema Extensions

### New Tables Required

```sql
-- AI Conversation History
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  lesson_id UUID REFERENCES lessons(id),
  messages JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Learner Risk Scores
CREATE TABLE learner_risk_scores (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  risk_score INTEGER,
  risk_factors JSONB,
  calculated_at TIMESTAMP DEFAULT NOW()
);

-- Certificates
CREATE TABLE certificates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  certification_tier VARCHAR(50),
  issued_at TIMESTAMP,
  badge_url VARCHAR(500),
  pdf_url VARCHAR(500),
  verification_code VARCHAR(100) UNIQUE
);

-- Recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  recommended_course_id UUID REFERENCES courses(id),
  reason TEXT,
  confidence DECIMAL(3,2),
  shown_at TIMESTAMP,
  clicked_at TIMESTAMP
);
```

---

## Appendix C: API Endpoints (New)

```
AI Guide:
POST   /api/ai/guide/chat          - Send message to AI companion
GET    /api/ai/guide/history/:lessonId - Get conversation history

Predictions:
GET    /api/analytics/risk/:userId  - Get learner risk score
GET    /api/analytics/risk/ministry/:ministryId - Ministry risk overview
POST   /api/analytics/risk/recalculate - Trigger risk recalculation

Certificates:
POST   /api/certificates/generate/:userId/:tier - Generate certificate
GET    /api/certificates/verify/:code - Verify certificate
GET    /api/certificates/user/:userId - List user's certificates

Recommendations:
GET    /api/recommendations/:userId - Get personalized recommendations
POST   /api/recommendations/:id/click - Track recommendation click

Mobile Sync:
GET    /api/sync/courses/:userId    - Get courses for offline sync
POST   /api/sync/progress           - Sync offline progress
GET    /api/sync/status/:userId     - Check sync status
```

---

*End of Document*
