# ============================================================
# BusinessAIOS - services/finance/margin.py
# UPGRADED: gross, net, and contribution margin
# ============================================================

def calculate_margin(revenue: float, cost: float) -> float:
    return round(revenue - cost, 2)


def margin_analysis(revenue: float, cogs: float, operating_expenses: float = 0) -> dict:
    gross_profit = revenue - cogs
    gross_margin_pct = round((gross_profit / revenue) * 100, 2) if revenue else 0
    net_profit = gross_profit - operating_expenses
    net_margin_pct = round((net_profit / revenue) * 100, 2) if revenue else 0

    return {
        "revenue": revenue,
        "cogs": cogs,
        "operating_expenses": operating_expenses,
        "gross_profit": round(gross_profit, 2),
        "gross_margin_percent": gross_margin_pct,
        "net_profit": round(net_profit, 2),
        "net_margin_percent": net_margin_pct,
        "is_profitable": net_profit > 0,
    }
