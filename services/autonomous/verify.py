# ============================================================
# BusinessAIOS - services/autonomous/verify.py
# UPGRADED: richer verification with structured feedback
# ============================================================

from core.logger import get_logger

logger = get_logger("VerifyEngine")


class VerifyEngine:
    """
    Verifies execution results and decides if retry is needed.
    UPGRADED: uses same heuristics as ExecutionEngine quality score
    but returns richer structured feedback.
    """

    PASS_THRESHOLD = 0.55

    def verify_result(self, result: str, expected_category: str = "general") -> dict:
        if not result or len(result.strip()) < 20:
            return self._fail("Empty or too-short response", needs_retry=True)

        score = 0.0
        feedback = []

        # Length
        length = len(result)
        if length > 300:
            score += 0.20
        if length > 800:
            score += 0.15
        if length > 1500:
            score += 0.10

        # Structure signals
        structure_hits = sum(
            1 for kw in ["##", "**", "1.", "2.", "•", "-", ":", "\n\n"]
            if kw in result
        )
        score += min(structure_hits * 0.05, 0.20)

        # Content quality signals
        quality_hits = sum(
            1 for kw in [
                "recommendation", "analysis", "strategy", "conclusion",
                "summary", "objective", "plan", "action", "result",
            ]
            if kw.lower() in result.lower()
        )
        score += min(quality_hits * 0.04, 0.20)

        # Penalties
        if "error" in result.lower() and len(result) < 200:
            score -= 0.20
            feedback.append("Response appears to be an error message")

        score = round(max(0.0, min(score, 1.0)), 2)
        passed = score >= self.PASS_THRESHOLD

        if not passed:
            feedback.append(f"Quality score {score} below threshold {self.PASS_THRESHOLD}")

        logger.info(f"VerifyEngine | score={score} passed={passed}")

        return {
            "success": passed,
            "quality_score": score,
            "needs_retry": not passed,
            "feedback": feedback,
            "reason": "; ".join(feedback) if feedback else None,
        }

    def _fail(self, reason: str, needs_retry: bool = True) -> dict:
        return {
            "success": False,
            "quality_score": 0.0,
            "needs_retry": needs_retry,
            "feedback": [reason],
            "reason": reason,
        }
