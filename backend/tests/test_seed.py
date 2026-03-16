from ccbenefits.models import BenefitTemplate, CardTemplate, PeriodType, RedemptionType
from ccbenefits.seed import seed_data

VALID_PERIOD_TYPES = {e.value for e in PeriodType}
VALID_REDEMPTION_TYPES = {e.value for e in RedemptionType}


def test_seed_creates_all_card_templates(db_session):
    seed_data(db_session)
    cards = db_session.query(CardTemplate).all()
    assert len(cards) == 11


def test_seed_no_duplicate_names(db_session):
    seed_data(db_session)
    cards = db_session.query(CardTemplate).all()
    names = [c.name for c in cards]
    assert len(names) == len(set(names))


def test_each_card_has_benefits(db_session):
    seed_data(db_session)
    cards = db_session.query(CardTemplate).all()
    for card in cards:
        benefits = db_session.query(BenefitTemplate).filter(BenefitTemplate.card_template_id == card.id).all()
        assert len(benefits) > 0, f"{card.name} has no benefits"


def test_benefit_values_are_valid(db_session):
    seed_data(db_session)
    benefits = db_session.query(BenefitTemplate).all()
    for b in benefits:
        assert b.max_value > 0, f"Benefit '{b.name}' has invalid max_value: {b.max_value}"
        assert b.period_type in VALID_PERIOD_TYPES, f"Benefit '{b.name}' has invalid period_type: {b.period_type}"
        assert b.redemption_type in VALID_REDEMPTION_TYPES, f"Benefit '{b.name}' has invalid redemption_type"


def test_seed_is_idempotent(db_session):
    seed_data(db_session)
    count_before = db_session.query(CardTemplate).count()
    seed_data(db_session)  # run again
    count_after = db_session.query(CardTemplate).count()
    assert count_before == count_after
