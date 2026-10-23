"""
TF-IDF cosine similarity scorer.
Measures keyword relevance between resume text and job description.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class KeywordScorer:

    def calculate_similarity(self, resume_text: str, job_text: str) -> float:
        """
        Returns a 0–100 similarity score using TF-IDF cosine similarity.
        Captures keyword relevance beyond exact word matching.
        """
        if not resume_text.strip() or not job_text.strip():
            return 0.0
        try:
            vectorizer = TfidfVectorizer(
                ngram_range  = (1, 2),
                stop_words   = "english",
                max_features = 5000,
                sublinear_tf = True,
                min_df       = 1,
            )
            matrix     = vectorizer.fit_transform([resume_text, job_text])
            similarity = float(
                cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
            )
            # Scale: raw cosine 0.0-0.4 → ATS 0-100
            return min(similarity * 250, 100.0)
        except Exception as e:
            print(f"[keyword_scorer] error: {e}")
            return 0.0


keyword_scorer = KeywordScorer()