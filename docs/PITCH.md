# Pitch — EduMoe / MoeAI

Four minutes. One student, one moment, one workflow, one ask.

**The story is MoeAI, shown through one student.** EduMoe is the environment it
lives in. The mobile app is the next surface. Do not pitch three products.

---

### 1 — Opening
MoeAI is a curriculum-aware AI tutor for Egyptian university students. It teaches
in Egyptian Arabic, Franco-Arabic or English, from the student's actual syllabus.

### 2 — Problem
Mariam, first year CS at FUE, opens a general AI to revise physics. It explains
Newtonian motion, in formal English, with American examples. Her course covers
electrodynamics. She loses an hour, closes the tab, and crams the night before.

*Why now:* models finally handle Egyptian Arabic and Franco well. What they still
do not have is her syllabus.

### 3 — User
- **User:** Mariam, 18, first-year CS at FUE
- **Beneficiary:** her cohort — roughly 120 students
- **Buyer:** free for students; the university, via pilot
- **Approver:** one professor sponsoring that pilot

### 4 — Evidence
- **Observed:** ~230 students in `t.me/CS_Epic_Save`, about half the first-year
  CS cohort, with the same questions recurring every week for a semester.
- **Tested:** we shipped a prototype with MoeAI's personality to real students.
  Their words: a digital Egyptian TA. That personality is now `prompts/`.
- **Sourced:** two semesters of first-year curriculum already collected.

### 5 — Solution
**Before:** generic AI, generic answer, wrong curriculum, formal English, no memory.
**After:** knows the course, answers in her language, cites her lecture, checks
she understood, remembers what she got wrong.

### 6 — Workflow
1. Mariam opens `moe-ai.vercel.app`
2. Types `msh fahem el pointers`
3. MoeAI detects Franco, retrieves her CS102 lecture, explains in Franco
4. Asks a check question. She answers. Her dashboard updates.

### 7 — Demo
That exact flow, live. The hero beat is the language switch: ask in Franco, get
Franco; ask the same thing in Arabic script, get Arabic script. Nothing else on
the market does this for Egyptian students.

*Record a backup video. Venue wifi is not a risk worth taking.*

### 8 — Impact
- **Primary metric:** misconception correction rate — not engagement
- **Guardrail:** ungrounded-answer rate stays low
- **Target:** 230 → 400 students by end of semester

### 9 — Adoption
Beachhead: FUE first-year CS, already reached. Path: student → classmate →
professor champion → department. Model: free for students, institution pays per
active cohort. Library Mode lets any faculty upload its own material.

### 10 — Difference
Against ChatGPT and Gemini: they do not have her syllabus, and they default to
English. Against YouTube: it cannot track her. Against the university LMS: nobody
opens it twice.

### 11 — Trust
- Grounding: answers cite retrieved lecture material; MoeAI says when it has none
- Curriculum conflict: teaches the instructor's method and names the difference
- Privacy: minimal data, Law 151/2020, student can delete their own memory
- Integrity: it teaches, it does not submit graded work
- Security: RLS per student, prompt-injection defences, no secret ever printed

### 12 — Ask
One professor to sponsor an eight-week pilot: one course, one cohort. We measure
misconception correction and report back.

**Team:** Moe — product and design · Moemen — content and curriculum ·
Eslam — AI behaviour and personality · Youssef — mobile.

---

## Run of show (4:00)

| Time | Beat |
|---|---|
| 0:00–0:30 | Mariam's problem |
| 0:30–1:00 | Evidence: 230 students, the recurring questions |
| 1:00–2:15 | **Live demo** — the language switch, the citation, the check question |
| 2:15–3:00 | Impact, adoption, why not ChatGPT |
| 3:00–3:30 | Trust and risks |
| 3:30–4:00 | The ask |

## Q&A drills

- *How is this different from ChatGPT?* → curriculum retrieval + per-message
  language enforcement + persistent student model. Show, do not assert.
- *What if it hallucinates?* → grounded in retrieved lectures; says so when it
  has none; conflict shield names instructor-vs-textbook differences.
- *How do you afford this?* → free tiers with multi-key rotation, per-user hourly
  caps, every call logged with tokens.
- *What is actually built?* → all of the above, live, right now.
- *Why will students use it over a group chat?* → they already do use a group
  chat. 230 of them. This is where that group chat was going anyway.
