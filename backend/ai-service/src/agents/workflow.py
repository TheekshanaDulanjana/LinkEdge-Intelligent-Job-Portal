from langgraph.graph import StateGraph, END
from src.models.state import CVAnalysisState
from src.agents.parsing_agent import parsing_agent
from src.agents.gap_analysis_agent import gap_analysis_agent
from src.agents.recommendation_agent import recommendation_agent


def route_after_parsing(state: CVAnalysisState) -> str:
    """
    Decision function — runs after the parsing agent.
    If parsing produced no skills AND an error occurred, stop the pipeline.
    Otherwise continue to gap analysis.
    """
    has_skills = bool(state.get("extracted_skills"))
    has_error = bool(state.get("error"))

    if has_error and not has_skills:
        print("   Router: parsing produced no data — stopping pipeline")
        return "end"

    print("   Router: parsing succeeded — continuing to gap analysis")
    return "gap_analysis"


def build_workflow():
    """
    Assembles the three agents into a LangGraph state machine.

    Pipeline:
        START
          ↓
        parsing_agent
          ↓  (router checks result)
        gap_analysis_agent
          ↓
        recommendation_agent
          ↓
        END
    """
    graph = StateGraph(CVAnalysisState)

    # Register each agent as a named node
    graph.add_node("parsing_agent", parsing_agent)
    graph.add_node("gap_analysis_agent", gap_analysis_agent)
    graph.add_node("recommendation_agent", recommendation_agent)

    # Always start at parsing
    graph.set_entry_point("parsing_agent")

    # After parsing: router decides whether to continue or stop
    graph.add_conditional_edges(
        "parsing_agent",
        route_after_parsing,
        {
            "gap_analysis": "gap_analysis_agent",
            "end": END,
        },
    )

    # After gap analysis: always go to recommendation
    graph.add_edge("gap_analysis_agent", "recommendation_agent")

    # After recommendation: always end
    graph.add_edge("recommendation_agent", END)

    return graph.compile()


# Build once at import time — reused for every request
cv_analysis_workflow = build_workflow()
print("LangGraph workflow compiled successfully")