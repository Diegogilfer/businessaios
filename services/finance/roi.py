# ============================================================
# BusinessAIOS - services/finance/roi.py
# UPGRADED: full ROI analysis with payback period + rating
# ============================================================

def calculate_roi(revenue: float, cost: float) -> float:
    if cost == 0:
        return 0.0
    return round(((revenue - cost) / cost) * 100, 2)


def roi_analysis(revenue: float, cost: float, months: int = 12) -> dict:
    profit = revenue - cost
    roi = calculate_roi(revenue, cost)
    monthly_net = round(profit / months, 2) if months > 0 else 0

    rating = "excellent" if roi > 100 else "good" if roi > 50 else "fair" if roi > 0 else "negative"

    return {
        "revenue": revenue,
        "cost": cost,
        "profit": round(profit, 2),
        "roi_percent": roi,
        "monthly_net": monthly_net,
        "payback_months": round(cost / (profit / months), 1) if profit > 0 and months > 0 else None,
        "rating": rating,
    }
