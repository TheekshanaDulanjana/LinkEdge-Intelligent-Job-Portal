from langgraph.graph import StateGraph, END
from src.models.state import InterviewState
from src.agents.interview_agent import question_generator_node, evaluator_node


def build_question_workflow():
    """
    Workflow 1 — just generates questions.
    Used when starting a new session.
    """
    graph = StateGraph(InterviewState)
    graph.add_node("question_generator", question_generator_node)
    graph.set_entry_point("question_generator")
    graph.add_edge("question_generator", END)
    return graph.compile()


def build_evaluation_workflow():
    """
    Workflow 2 — evaluates submitted answers.
    Used when the seeker submits all answers.
    """
    graph = StateGraph(InterviewState)
    graph.add_node("evaluator", evaluator_node)
    graph.set_entry_point("evaluator")
    graph.add_edge("evaluator", END)
    return graph.compile()


question_workflow = build_question_workflow()
evaluation_workflow = build_evaluation_workflow()

print("Interview workflows compiled successfully")