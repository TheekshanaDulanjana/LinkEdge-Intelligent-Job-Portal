from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List
from src.agents.ranking_agent import ranking_workflow

router = APIRouter()


class ApplicationInput(BaseModel):
    id: str = Field(max_length=64)
    seekerId: str = Field(max_length=64)
    cvUrl: str = Field(max_length=500)


class RankingRequest(BaseModel):
    job_id: str = Field(max_length=64)
    job_title: str = Field(max_length=200)
    job_description: str = Field(max_length=30000)
    job_requirements: str = Field(max_length=30000)
    applications: List[ApplicationInput] = Field(max_length=200)


class CandidateResult(BaseModel):
    application_id: str
    seeker_id: str
    score: float
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str


class RankingResponse(BaseModel):
    ranked_candidates: List[CandidateResult]
    ranking_summary: str
    total_ranked: int


@router.post("/rank-candidates", response_model=RankingResponse)
async def rank_candidates(request: RankingRequest):
    """
    Receives all applications for a job and returns them
    ranked by AI score from highest to lowest.
    """
    if not request.applications:
        raise HTTPException(
            status_code=400,
            detail="No applications provided to rank"
        )

    print(f"\nRanking {len(request.applications)} candidates for: {request.job_title}")

    initial_state = {
        "job_id": request.job_id,
        "job_title": request.job_title,
        "job_description": request.job_description,
        "job_requirements": request.job_requirements,
        "applications": [a.dict() for a in request.applications],
        "cv_texts": [],
        "scored_candidates": [],
        "ranking_summary": "",
        "error": None,
        "current_step": "starting",
    }

    try:
        final_state = ranking_workflow.invoke(initial_state)

        candidates = [
            CandidateResult(
                application_id=c["application_id"],
                seeker_id=c["seeker_id"],
                score=c.get("score", 0.0),
                strengths=c.get("strengths", []),
                weaknesses=c.get("weaknesses", []),
                recommendation=c.get("recommendation", ""),
            )
            for c in final_state.get("scored_candidates", [])
        ]

        return RankingResponse(
            ranked_candidates=candidates,
            ranking_summary=final_state.get("ranking_summary", ""),
            total_ranked=len(candidates),
        )

    except Exception as e:
        print(f"Ranking error: {e}")
        raise HTTPException(status_code=500, detail=f"Ranking failed: {str(e)}")