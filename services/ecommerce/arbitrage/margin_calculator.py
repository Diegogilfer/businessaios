# ============================================================
# BusinessAIOS - services/ecommerce/arbitrage/margin_calculator.py
# FASE 10+ — Advanced margin & ROI calculation
# ============================================================

from dataclasses import dataclass
from datetime import datetime
from core.logger import get_logger

logger = get_logger("MarginCalculator")


@dataclass
class MarginAnalysis:
    amazon_price: float
    supplier_price: float
    shipping_cost: float
    total_cost: float
    gross_margin: float
    net_margin: float
    net_margin_percent: float
    roi_percent: float
    viable: bool
    risk_level: str
    warnings: list[str]


class MarginCalculator:
    """
    Calculate arbitrage margins with detailed breakdown.
    Accounts for Amazon fees, taxes, and supplier reliability.
    """

    # Fee constants
    AMAZON_FEE_PERCENT = 0.15  # ~15% fees + FBA costs
    MIN_VIABLE_MARGIN = 15.00  # $15 minimum net margin
    SUPPLIER_RATING_THRESHOLD = 95.0

    def calculate(
        self,
        amazon_price: float,
        supplier_price: float,
        shipping_cost: float,
        supplier_rating: float = 100.0,
        moq: int = 1,
        shipping_days: int = 30,
    ) -> MarginAnalysis:
        """
        Full margin analysis for an arbitrage opportunity.

        Args:
            amazon_price: Listed price on Amazon (USD)
            supplier_price: Supplier cost (USD)
            shipping_cost: Shipping per unit (USD)
            supplier_rating: Supplier rating 0-100 (AliExpress scale)
            moq: Minimum order quantity
            shipping_days: Estimated shipping days

        Returns:
            MarginAnalysis object with full breakdown
        """

        # Calculate costs
        total_cost = supplier_price + shipping_cost
        gross_margin = amazon_price - total_cost

        # Apply Amazon fee factor (15% deduction for fees + taxes)
        net_margin = gross_margin * (1 - self.AMAZON_FEE_PERCENT)
        net_margin_percent = (net_margin / amazon_price) * 100

        # ROI = profit / cost
        roi_percent = (net_margin / total_cost) * 100 if total_cost > 0 else 0

        # Risk assessment
        warnings = []
        risk_level = "LOW"

        if supplier_rating < self.SUPPLIER_RATING_THRESHOLD:
            risk_level = "HIGH"
            warnings.append(
                f"Supplier rating {supplier_rating}% below threshold {self.SUPPLIER_RATING_THRESHOLD}%"
            )

        if moq > 1:
            warnings.append(f"MOQ {moq} — requires bulk order")
            risk_level = "MEDIUM" if risk_level == "LOW" else risk_level

        if shipping_days > 30:
            warnings.append(f"Slow shipping ({shipping_days} days) — working capital risk")
            risk_level = "MEDIUM" if risk_level == "LOW" else risk_level

        if net_margin < self.MIN_VIABLE_MARGIN:
            warnings.append(f"Net margin ${net_margin:.2f} below minimum ${self.MIN_VIABLE_MARGIN}")

        viable = (
            net_margin >= self.MIN_VIABLE_MARGIN
            and supplier_rating >= 90.0  # At least decent rating
        )

        return MarginAnalysis(
            amazon_price=round(amazon_price, 2),
            supplier_price=round(supplier_price, 2),
            shipping_cost=round(shipping_cost, 2),
            total_cost=round(total_cost, 2),
            gross_margin=round(gross_margin, 2),
            net_margin=round(net_margin, 2),
            net_margin_percent=round(net_margin_percent, 2),
            roi_percent=round(roi_percent, 1),
            viable=viable,
            risk_level=risk_level,
            warnings=warnings,
        )

    def rank_opportunities(self, analyses: list[MarginAnalysis]) -> list[MarginAnalysis]:
        """Rank opportunities by ROI descending, filter viable only."""
        viable = [a for a in analyses if a.viable]
        return sorted(viable, key=lambda a: a.roi_percent, reverse=True)

    def batch_calculate(self, opportunities: list[dict]) -> list[dict]:
        """
        Batch calculate margins for multiple opportunities.

        Input format:
        [
            {
                "amazon_price": 45.99,
                "supplier_price": 8.50,
                "shipping_cost": 2.30,
                "supplier_rating": 97.2,
                ...
            }
        ]
        """
        results = []

        for opp in opportunities:
            analysis = self.calculate(
                amazon_price=opp.get("amazon_price", 0),
                supplier_price=opp.get("supplier_price", 0),
                shipping_cost=opp.get("shipping_cost", 0),
                supplier_rating=opp.get("supplier_rating", 100.0),
                moq=opp.get("moq", 1),
                shipping_days=opp.get("shipping_days", 30),
            )

            results.append({
                **opp,
                "financials": {
                    "total_cost": analysis.total_cost,
                    "gross_margin": analysis.gross_margin,
                    "net_margin": analysis.net_margin,
                    "net_margin_percent": analysis.net_margin_percent,
                    "roi_percent": analysis.roi_percent,
                    "fee_factor": f"{self.AMAZON_FEE_PERCENT*100:.0f}%",
                    "viable": analysis.viable,
                },
                "risk": {
                    "level": analysis.risk_level,
                    "warnings": analysis.warnings,
                },
            })

        logger.info(f"Calculated margins for {len(results)} opportunities")
        return results


margin_calculator = MarginCalculator()
