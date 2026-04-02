from langgraph.graph import StateGraph, END
from src.models.state import CVAnalysisState
from src.agents.parsing_agent import parsing_agent
from src.agents.gap_analysis_agent import gap_analysis_agent
from src.agents.recommendation_agent import recommendation_agent


def should_continue_after_parsing(state: CVAnalysisState) -> str:
    """
    Router function: after parsing, decide what to do next.
    If parsing failed badly, stop. Otherwise continue.
    """
    if state.get("error") and not state.get("extracted_skills"):
        return "end"   # Something went badly wrong, stop here
    return "gap_analysis"


def build_cv_analysis_workflow():
    """
    Builds and compiles the LangGraph agent pipeline.

    The flow is:
      START
        → parsing_agent         (reads CV, extracts skills)
        → [router decides]
        → gap_analysis_agent    (finds skill gaps, suggests courses)
        → recommendation_agent  (matches CV to live jobs)
        → END
    """

    # Create the state graph — tell it what state shape to use
    workflow = StateGraph(CVAnalysisState)

    # Add each agent as a node
    workflow.add_node("parsing_agent", parsing_agent)
    workflow.add_node("gap_analysis_agent", gap_analysis_agent)
    workflow.add_node("recommendation_agent", recommendation_agent)

    # Set the entry point — always start with parsing
    workflow.set_entry_point("parsing_agent")

    # After parsing: use router to decide next step
    workflow.add_conditional_edges(
        "parsing_agent",
        should_continue_after_parsing,
        {
            "gap_analysis": "gap_analysis_agent",
            "end": END,
        }
    )

    # After gap analysis: always go to recommendation
    workflow.add_edge("gap_analysis_agent", "recommendation_agent")

    # After recommendation: always end
    workflow.add_edge("recommendation_agent", END)

    # Compile and return the runnable workflow
    return workflow.compile()


# Create one instance that gets reused across all requests
cv_analysis_workflow = build_cv_analysis_workflow()