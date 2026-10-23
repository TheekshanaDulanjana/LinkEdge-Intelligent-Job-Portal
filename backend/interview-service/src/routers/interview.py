from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from src.database.db import get_db
from src.database.models import InterviewSession, InterviewQuestion
from src.agents.workflow import question_workflow, evaluation_workflow
from src.models.schemas import (
    StartSessionRequest, StartSessionResponse,
    SubmitAnswersRequest, SubmitAnswersResponse,
    QuestionEvaluation, SessionSummary,
)

router = APIRouter()


@router.get("/can-practice/{application_id}")
def check_practice_eligibility(application_id: str, db: Session = Depends(get_db)):
    """
    Server-clock controlled check.
    Returns whether the practice feature is still available.
    This CANNOT be bypassed by the client — the check is server-side.
    """
    # Query the application directly from DB
    result = db.execute(
        text("""
            SELECT 
            status,
            "practiceExpiresAt",
            "interviewDate",
            "interviewTime",
            "interviewVenue"
        FROM "Application"
        WHERE id = :app_id
        """),
        {"app_id": application_id}
    ).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Application not found")

    status = result[0]
    practice_expires_at = result[1]
    
    # Must be INTERVIEW status
    if status != 'INTERVIEW':
        return {
            "can_practice": False,
            "reason": "Practice interview is only available for shortlisted candidates",
            "interview_date": None,
            "interview_time": None,
            "interview_venue": None,
        }

    # Check server clock against expiry — client cannot fake this
    now = datetime.utcnow()
    
    if practice_expires_at and now > practice_expires_at:
        return {
            "can_practice": False,
            "reason": "Practice interview period has expired. Your actual interview is approaching.",
            "interview_date": str(result[2]),
            "interview_time": result[3],
            "interview_venue": result[4],
        }

    return {
        "can_practice": True,
        "reason": None,
        "expires_at": practice_expires_at.isoformat() if practice_expires_at else None,
        "interview_date": str(result[2]) if result[2] else None,
        "interview_time": result[3],
        "interview_venue": result[4],
    }


@router.post("/start", response_model=StartSessionResponse)
def start_interview(request: StartSessionRequest, db: Session = Depends(get_db)):
    """
    Creates a new interview session and generates questions.
    Call this when the seeker clicks 'Start Practice Interview'.
    """
    print(f"\nStarting interview for job: {request.job_title}")

    # Run the question generation workflow
    initial_state = {
        "job_title": request.job_title,
        "job_description": request.job_description,
        "job_requirements": request.job_requirements,
        "seeker_answers": [],
        "questions": [],
        "evaluations": [],
        "total_score": 0.0,
        "overall_feedback": "",
        "improvement_tips": [],
        "error": None,
        "current_step": "starting",
    }

    try:
        final_state = question_workflow.invoke(initial_state)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate questions: {str(e)}"
        )

    questions = final_state.get("questions", [])
    if not questions:
        raise HTTPException(status_code=500, detail="No questions were generated")

    # Save the session to the database
    session = InterviewSession(
        application_id=request.application_id,
        seeker_id=request.seeker_id,
        job_id=request.job_id,
        job_title=request.job_title,
        status="IN_PROGRESS",
    )
    db.add(session)
    db.flush()  # Get the session ID before adding questions

    # Save each question as a row
    for i, q_text in enumerate(questions):
        question = InterviewQuestion(
            session_id=session.id,
            order_num=i + 1,
            question_text=q_text,
        )
        db.add(question)

    db.commit()
    db.refresh(session)

    print(f"Session created: {session.id}")

    return StartSessionResponse(
        session_id=session.id,
        questions=questions,
        message=f"Interview started. Answer all {len(questions)} questions.",
    )


@router.post("/submit", response_model=SubmitAnswersResponse)
def submit_answers(request: SubmitAnswersRequest, db: Session = Depends(get_db)):
    """
    Receives the seeker's answers, evaluates them with Gemini,
    and saves the results to the database.
    """
    # Load the session
    session = db.query(InterviewSession).filter(
        InterviewSession.id == request.session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session.status == "COMPLETED":
        raise HTTPException(
            status_code=400, detail="This interview session is already completed"
        )

    # Load the questions in order
    questions_db = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.session_id == session.id)
        .order_by(InterviewQuestion.order_num)
        .all()
    )

    questions_text = [q.question_text for q in questions_db]
    answers = request.answers

    if len(answers) != len(questions_text):
        raise HTTPException(
            status_code=400,
            detail=f"Expected {len(questions_text)} answers, got {len(answers)}",
        )

    print(f"\nEvaluating {len(answers)} answers for session {request.session_id[:8]}...")

    # Run evaluation workflow
    eval_state = {
        "job_title": session.job_title,
        "job_description": "",
        "job_requirements": "",
        "seeker_answers": answers,
        "questions": questions_text,
        "evaluations": [],
        "total_score": 0.0,
        "overall_feedback": "",
        "improvement_tips": [],
        "error": None,
        "current_step": "starting",
    }

    try:
        final_state = evaluation_workflow.invoke(eval_state)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Evaluation failed: {str(e)}"
        )

    evaluations = final_state.get("evaluations", [])
    total_score = final_state.get("total_score", 0.0)

    # Save answers and scores back to the question rows
    for i, q_row in enumerate(questions_db):
        if i < len(evaluations):
            ev = evaluations[i]
            q_row.answer_text = answers[i] if i < len(answers) else ""
            q_row.score = ev.get("score", 0.0)
            q_row.feedback = ev.get("feedback", "")

    # Mark session as completed
    session.status = "COMPLETED"
    session.total_score = total_score
    session.overall_feedback = final_state.get("overall_feedback", "")
    session.completed_at = datetime.utcnow()

    db.commit()

    # Determine grade
    if total_score >= 85:
        grade = "Excellent"
    elif total_score >= 70:
        grade = "Good"
    elif total_score >= 55:
        grade = "Satisfactory"
    elif total_score >= 40:
        grade = "Needs Improvement"
    else:
        grade = "Poor"

    return SubmitAnswersResponse(
        session_id=session.id,
        total_score=total_score,
        grade=grade,
        overall_feedback=final_state.get("overall_feedback", ""),
        improvement_tips=final_state.get("improvement_tips", []),
        evaluations=[
            QuestionEvaluation(
                question=ev.get("question", ""),
                answer=ev.get("answer", ""),
                score=ev.get("score", 0.0),
                feedback=ev.get("feedback", ""),
            )
            for ev in evaluations
        ],
    )


@router.get("/session/{session_id}", response_model=SubmitAnswersResponse)
def get_session_results(session_id: str, db: Session = Depends(get_db)):
    """Returns saved results for a completed session."""
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.session_id == session_id)
        .order_by(InterviewQuestion.order_num)
        .all()
    )

    grade = "Not completed"
    if session.total_score is not None:
        s = session.total_score
        if s >= 85: grade = "Excellent"
        elif s >= 70: grade = "Good"
        elif s >= 55: grade = "Satisfactory"
        elif s >= 40: grade = "Needs Improvement"
        else: grade = "Poor"

    return SubmitAnswersResponse(
        session_id=session.id,
        total_score=session.total_score or 0.0,
        grade=grade,
        overall_feedback=session.overall_feedback or "",
        improvement_tips=[],
        evaluations=[
            QuestionEvaluation(
                question=q.question_text,
                answer=q.answer_text or "",
                score=q.score or 0.0,
                feedback=q.feedback or "",
            )
            for q in questions
        ],
    )


@router.get("/my-sessions/{seeker_id}", response_model=list)
def get_my_sessions(seeker_id: str, db: Session = Depends(get_db)):
    """Returns all interview sessions for a seeker."""
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.seeker_id == seeker_id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )
    return [
        {
            "session_id": s.id,
            "job_title": s.job_title,
            "status": s.status,
            "total_score": s.total_score,
            "grade": (
                "Excellent" if (s.total_score or 0) >= 85 else
                "Good" if (s.total_score or 0) >= 70 else
                "Satisfactory" if (s.total_score or 0) >= 55 else
                "Needs Improvement" if (s.total_score or 0) >= 40 else
                "Poor" if s.status == "COMPLETED" else "In Progress"
            ),
            "created_at": s.created_at.isoformat(),
        }
        for s in sessions
    ]