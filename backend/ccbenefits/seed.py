from sqlalchemy.orm import Session

from .models import BenefitTemplate, CardTemplate, PeriodType, RedemptionType


def seed_data(db: Session) -> None:
    if db.query(CardTemplate).first() is not None:
        return

    cards = [
        _amex_platinum(),
        _amex_business_platinum(),
        _amex_gold(),
        _hilton_surpass(),
        _hilton_aspire(),
        _chase_sapphire_reserve(),
        _chase_sapphire_reserve_business(),
        _capital_one_venture_x(),
        _citi_strata_elite(),
        _bilt_palladium(),
        _boa_premium_rewards_elite(),
    ]

    for card_data in cards:
        card = CardTemplate(
            name=card_data["name"],
            issuer=card_data["issuer"],
            annual_fee=card_data["annual_fee"],
            image_url=card_data.get("image_url"),
        )
        db.add(card)
        db.flush()

        for b in card_data["benefits"]:
            benefit = BenefitTemplate(
                card_template_id=card.id,
                name=b["name"],
                description=b.get("description"),
                max_value=b["max_value"],
                period_type=b["period_type"],
                redemption_type=b["redemption_type"],
                category=b["category"],
            )
            db.add(benefit)

    db.commit()


# ---------------------------------------------------------------------------
# American Express Platinum ($895/yr)
# ---------------------------------------------------------------------------
def _amex_platinum() -> dict:
    return {
        "name": "American Express Platinum",
        "issuer": "American Express",
        "annual_fee": 895.0,
        "benefits": [
            {
                "name": "Uber Cash",
                "description": "$15/mo in Uber Cash for rides and Uber Eats (+$20 bonus in December is separate)",
                "max_value": 15.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Uber Cash December Bonus",
                "description": "Extra $20 Uber Cash in December",
                "max_value": 20.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
            {
                "name": "Uber One Credit",
                "description": "Statement credit for auto-renewing Uber One membership",
                "max_value": 120.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
            {
                "name": "Digital Entertainment Credit",
                "description": "Statement credit for select streaming: Disney+, Hulu, ESPN, Paramount+, Peacock, YouTube Premium/TV, NYT, WSJ, Audible, SiriusXM",
                "max_value": 25.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "entertainment",
            },
            {
                "name": "Equinox Credit",
                "description": "Monthly statement credit for Equinox gym membership",
                "max_value": 25.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.binary,
                "category": "wellness",
            },
            {
                "name": "Walmart+ Membership",
                "description": "Monthly statement credit for Walmart+ membership",
                "max_value": 12.95,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.binary,
                "category": "shopping",
            },
            {
                "name": "Resy Dining Credit",
                "description": "Statement credit for dining at U.S. Resy restaurants",
                "max_value": 100.0,
                "period_type": PeriodType.quarterly,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "lululemon Credit",
                "description": "Statement credit at U.S. lululemon retail stores and lululemon.com",
                "max_value": 75.0,
                "period_type": PeriodType.quarterly,
                "redemption_type": RedemptionType.continuous,
                "category": "shopping",
            },
            {
                "name": "Saks Fifth Avenue Credit",
                "description": "Statement credit at Saks Fifth Avenue or saks.com ($50 per half-year)",
                "max_value": 50.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "shopping",
            },
            {
                "name": "Hotel Credit (FHR/THC)",
                "description": "Statement credit for prepaid stays via Fine Hotels + Resorts or The Hotel Collection ($300 per half-year)",
                "max_value": 300.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Airline Fee Credit",
                "description": "Annual statement credit for incidental fees (checked bags, in-flight) with selected airline",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "CLEAR+ Credit",
                "description": "Annual statement credit covering CLEAR+ membership at 55+ airports",
                "max_value": 209.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# American Express Business Platinum ($895/yr)
# ---------------------------------------------------------------------------
def _amex_business_platinum() -> dict:
    return {
        "name": "American Express Business Platinum",
        "issuer": "American Express",
        "annual_fee": 895.0,
        "benefits": [
            {
                "name": "Hilton Credit",
                "description": "Quarterly statement credit for purchases made directly with Hilton",
                "max_value": 50.0,
                "period_type": PeriodType.quarterly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Hotel Credit (FHR/THC)",
                "description": "Statement credit for prepaid stays via Fine Hotels + Resorts or The Hotel Collection ($300 per half-year)",
                "max_value": 300.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Indeed Credit",
                "description": "Quarterly statement credit for purchases at Indeed.com ($90 per quarter)",
                "max_value": 90.0,
                "period_type": PeriodType.quarterly,
                "redemption_type": RedemptionType.continuous,
                "category": "lifestyle",
            },
            {
                "name": "Dell Technologies Credit",
                "description": "Annual statement credit on U.S. purchases directly from Dell Technologies",
                "max_value": 150.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "shopping",
            },
            {
                "name": "Adobe Credit",
                "description": "$250 statement credit after spending $600+ on U.S. Adobe purchases per year",
                "max_value": 250.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "shopping",
            },
            {
                "name": "Wireless Credit",
                "description": "Annual statement credit for U.S. wireless service purchases",
                "max_value": 120.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "lifestyle",
            },
            {
                "name": "Airline Fee Credit",
                "description": "Annual statement credit for incidental fees with selected airline",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "CLEAR+ Credit",
                "description": "Annual statement credit covering CLEAR+ membership",
                "max_value": 209.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# American Express Gold ($325/yr)
# ---------------------------------------------------------------------------
def _amex_gold() -> dict:
    return {
        "name": "American Express Gold",
        "issuer": "American Express",
        "annual_fee": 325.0,
        "benefits": [
            {
                "name": "Uber Cash",
                "description": "$10/mo in Uber Cash for Uber Eats and rides in the U.S.",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Dining Credit",
                "description": "$10/mo statement credit at select restaurants and delivery (Grubhub, Goldbelly, etc.)",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "Dunkin' Credit",
                "description": "$7/mo statement credit at U.S. Dunkin' locations",
                "max_value": 7.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "Resy Dining Credit",
                "description": "Statement credit for dining at U.S. Resy restaurants ($50 per half-year)",
                "max_value": 50.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Hilton Honors American Express Surpass ($150/yr)
# ---------------------------------------------------------------------------
def _hilton_surpass() -> dict:
    return {
        "name": "Hilton Honors Surpass",
        "issuer": "American Express",
        "annual_fee": 150.0,
        "benefits": [
            {
                "name": "Hilton Credit",
                "description": "Quarterly statement credit for purchases made directly at Hilton portfolio hotels ($50 per quarter)",
                "max_value": 50.0,
                "period_type": PeriodType.quarterly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Hilton Honors American Express Aspire ($550/yr)
# ---------------------------------------------------------------------------
def _hilton_aspire() -> dict:
    return {
        "name": "Hilton Honors Aspire",
        "issuer": "American Express",
        "annual_fee": 550.0,
        "benefits": [
            {
                "name": "Hilton Resort Credit",
                "description": "Statement credit for eligible purchases at participating Hilton Resorts ($200 per half-year)",
                "max_value": 200.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Flight Credit",
                "description": "Quarterly statement credit for flights booked directly with airlines or via amextravel.com ($50 per quarter)",
                "max_value": 50.0,
                "period_type": PeriodType.quarterly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "CLEAR+ Credit",
                "description": "Annual statement credit covering CLEAR+ membership",
                "max_value": 209.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Chase Sapphire Reserve ($795/yr)
# ---------------------------------------------------------------------------
def _chase_sapphire_reserve() -> dict:
    return {
        "name": "Chase Sapphire Reserve",
        "issuer": "Chase",
        "annual_fee": 795.0,
        "benefits": [
            {
                "name": "Lyft Credit",
                "description": "$10/mo statement credit on eligible Lyft purchases",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Peloton Credit",
                "description": "$10/mo statement credit for eligible Peloton membership (through 12/2027)",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.binary,
                "category": "wellness",
            },
            {
                "name": "DoorDash Credits",
                "description": "$25/mo: $5 restaurant + two $10 non-restaurant order credits. Includes free DashPass.",
                "max_value": 25.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "Apple TV+",
                "description": "Complimentary Apple TV+ subscription (through 6/2027)",
                "max_value": 12.99,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.binary,
                "category": "entertainment",
            },
            {
                "name": "Apple Music",
                "description": "Complimentary Apple Music subscription (through 6/2027)",
                "max_value": 10.99,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.binary,
                "category": "entertainment",
            },
            {
                "name": "Dining Credit (Exclusive Tables)",
                "description": "Statement credit for dining at Sapphire Reserve Exclusive Tables restaurants ($150 per half-year)",
                "max_value": 150.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "StubHub/viagogo Credit",
                "description": "Statement credit for StubHub.com and viagogo.com ($150 per half-year)",
                "max_value": 150.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "entertainment",
            },
            {
                "name": "The Edit Hotel Credit",
                "description": "Statement credit for hotels via The Edit by Chase Travel ($250 per half-year)",
                "max_value": 250.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Annual Travel Credit",
                "description": "Annual statement credit for any travel purchase",
                "max_value": 300.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Select Hotel Credit",
                "description": "One-time $250 credit for select Chase Travel hotels (IHG, Montage, Pendry, Omni, etc.) — expires 12/31/2026",
                "max_value": 250.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Statement credit for Global Entry or TSA PreCheck application fee (every 4 years)",
                "max_value": 120.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Citi Strata Elite ($595/yr)
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Chase Sapphire Reserve for Business ($795/yr)
# ---------------------------------------------------------------------------
def _chase_sapphire_reserve_business() -> dict:
    return {
        "name": "Chase Sapphire Reserve for Business",
        "issuer": "Chase",
        "annual_fee": 795.0,
        "benefits": [
            {
                "name": "Lyft Credit",
                "description": "$10/mo statement credit on eligible Lyft purchases (through 9/2027)",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "DoorDash Credits",
                "description": "$25/mo: $5 restaurant + two $10 non-restaurant order credits. Includes free DashPass.",
                "max_value": 25.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "The Edit Hotel Credit",
                "description": "Statement credit for hotels via The Edit by Chase Travel ($250 per half-year)",
                "max_value": 250.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "ZipRecruiter Credit",
                "description": "Statement credit for ZipRecruiter ($200 per half-year)",
                "max_value": 200.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "lifestyle",
            },
            {
                "name": "Gift Card Credit",
                "description": "Statement credit for gift cards from giftcards.com/reservebusiness ($50 per half-year)",
                "max_value": 50.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "shopping",
            },
            {
                "name": "Annual Travel Credit",
                "description": "Annual statement credit for any travel purchase",
                "max_value": 300.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Select Hotel Credit",
                "description": "One-time $250 credit for select Chase Travel hotels (IHG, Montage, Pendry, Omni, etc.) — expires 12/31/2026",
                "max_value": 250.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Google Workspace Credit",
                "description": "Annual statement credit on purchases made directly on Google Workspace",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "shopping",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Statement credit for Global Entry or TSA PreCheck application fee (every 4 years)",
                "max_value": 120.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Capital One Venture X ($395/yr)
# ---------------------------------------------------------------------------
def _capital_one_venture_x() -> dict:
    return {
        "name": "Capital One Venture X",
        "issuer": "Capital One",
        "annual_fee": 395.0,
        "benefits": [
            {
                "name": "Travel Credit",
                "description": "Annual credit for bookings (flights, hotels, rental cars) through Capital One Travel",
                "max_value": 300.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Statement credit for Global Entry or TSA PreCheck application fee (every 4 years)",
                "max_value": 120.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Citi Strata Elite ($595/yr)
# ---------------------------------------------------------------------------
def _citi_strata_elite() -> dict:
    return {
        "name": "Citi Strata Elite",
        "issuer": "Citi",
        "annual_fee": 595.0,
        "benefits": [
            {
                "name": "Blacklane Chauffeur Credit",
                "description": "Statement credit for Blacklane premium chauffeur service ($100 per half-year)",
                "max_value": 100.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Hotel Stay Credit",
                "description": "Credit for hotel stay of 2+ nights booked through cititravel.com",
                "max_value": 300.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Splurge Credits",
                "description": "Annual credits for up to 2 brands: 1stDibs, American Airlines, Best Buy, Future Personal Training, Live Nation",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "lifestyle",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Statement credit for Global Entry or TSA PreCheck application fee (every 4 years)",
                "max_value": 120.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Bilt Palladium ($495/yr)
# ---------------------------------------------------------------------------
def _bilt_palladium() -> dict:
    return {
        "name": "Bilt Palladium",
        "issuer": "Bilt",
        "annual_fee": 495.0,
        "benefits": [
            {
                "name": "Bilt Travel Hotel Credit",
                "description": "Statement credit for hotel bookings of 2+ nights through Bilt Travel ($200 per half-year)",
                "max_value": 200.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Bilt Cash",
                "description": "Annual $200 Bilt Cash credited to your account",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "lifestyle",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Bank of America Premium Rewards Elite ($550/yr)
# ---------------------------------------------------------------------------
def _boa_premium_rewards_elite() -> dict:
    return {
        "name": "Bank of America Premium Rewards Elite",
        "issuer": "Bank of America",
        "annual_fee": 550.0,
        "benefits": [
            {
                "name": "Airline Incidental Credit",
                "description": "Annual statement credit for airline incidental fees (checked bags, seat upgrades, etc.)",
                "max_value": 300.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Lifestyle Credit",
                "description": "Annual statement credit for streaming, food delivery, fitness, and rideshare services",
                "max_value": 150.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "lifestyle",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Statement credit for Global Entry or TSA PreCheck application fee (every 4 years)",
                "max_value": 120.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }
