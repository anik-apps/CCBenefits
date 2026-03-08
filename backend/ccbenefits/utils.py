import calendar
from datetime import date

from .models import BenefitTemplate, PeriodType, RedemptionType


def coerce_binary_amount(amount: float, benefit: BenefitTemplate) -> float:
    """For binary benefits, snap amount to max_value or 0."""
    if benefit.redemption_type == RedemptionType.binary:
        return benefit.max_value if amount > 0 else 0.0
    return amount


def get_current_period(period_type: str, reference_date: date | None = None) -> tuple[date, date]:
    ref = reference_date or date.today()
    year = ref.year
    month = ref.month

    if period_type == PeriodType.monthly:
        last_day = calendar.monthrange(year, month)[1]
        return date(year, month, 1), date(year, month, last_day)

    if period_type == PeriodType.quarterly:
        quarter_start_month = ((month - 1) // 3) * 3 + 1
        quarter_end_month = quarter_start_month + 2
        last_day = calendar.monthrange(year, quarter_end_month)[1]
        return date(year, quarter_start_month, 1), date(year, quarter_end_month, last_day)

    if period_type == PeriodType.semiannual:
        if month <= 6:
            return date(year, 1, 1), date(year, 6, 30)
        else:
            return date(year, 7, 1), date(year, 12, 31)

    if period_type == PeriodType.annual:
        return date(year, 1, 1), date(year, 12, 31)

    raise ValueError(f"Unknown period type: {period_type}")


PERIOD_MULTIPLIERS = {
    PeriodType.monthly: 12,
    PeriodType.quarterly: 4,
    PeriodType.semiannual: 2,
    PeriodType.annual: 1,
}


def compute_annual_max(max_value: float, period_type: str) -> float:
    multiplier = PERIOD_MULTIPLIERS.get(period_type, 1)
    return max_value * multiplier


MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def get_all_periods_in_year(period_type: str, year: int) -> list[tuple[date, date, str]]:
    """Return all (start, end, label) tuples for the given period type in a year."""
    if period_type == PeriodType.monthly:
        result = []
        for m in range(1, 13):
            last_day = calendar.monthrange(year, m)[1]
            result.append((date(year, m, 1), date(year, m, last_day), MONTH_LABELS[m - 1]))
        return result

    if period_type == PeriodType.quarterly:
        return [
            (date(year, 1, 1), date(year, 3, 31), "Q1"),
            (date(year, 4, 1), date(year, 6, 30), "Q2"),
            (date(year, 7, 1), date(year, 9, 30), "Q3"),
            (date(year, 10, 1), date(year, 12, 31), "Q4"),
        ]

    if period_type == PeriodType.semiannual:
        return [
            (date(year, 1, 1), date(year, 6, 30), "H1"),
            (date(year, 7, 1), date(year, 12, 31), "H2"),
        ]

    if period_type == PeriodType.annual:
        return [
            (date(year, 1, 1), date(year, 12, 31), str(year)),
        ]

    raise ValueError(f"Unknown period type: {period_type}")
