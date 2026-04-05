from sqlalchemy.orm import Session

from .models import BenefitTemplate, CardTemplate, PeriodType, RedemptionType


def seed_data(db: Session) -> None:
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
        # --- 30 new cards below ---
        _amex_green(),
        _delta_skymiles_gold(),
        _delta_skymiles_platinum(),
        _delta_skymiles_reserve(),
        _delta_skymiles_gold_business(),
        _delta_skymiles_platinum_business(),
        _delta_skymiles_reserve_business(),
        _amex_business_gold(),
        _marriott_bonvoy_brilliant(),
        _hilton_honors_business(),
        _blue_cash_preferred(),
        _united_club_infinite(),
        _united_club_business(),
        _united_quest(),
        _united_explorer(),
        _united_business(),
        _ihg_premier(),
        _ihg_premier_business(),
        _world_of_hyatt_business(),
        _chase_sapphire_preferred(),
        _marriott_bonvoy_boundless(),
        _capital_one_venture_x_business(),
        _citi_aadvantage_executive(),
        _citi_aadvantage_globe(),
        _citi_strata_premier(),
        _citi_aadvantage_platinum_select(),
        _us_bank_altitude_reserve(),
        _wells_fargo_autograph_journey(),
        _boa_premium_rewards(),
        _jetblue_plus(),
    ]

    added = False
    for card_data in cards:
        existing = db.query(CardTemplate).filter_by(name=card_data["name"]).first()
        if existing:
            continue

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

        added = True

    if added:
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


# ---------------------------------------------------------------------------
# American Express Green ($150/yr)
# ---------------------------------------------------------------------------
def _amex_green() -> dict:
    return {
        "name": "American Express Green",
        "issuer": "American Express",
        "annual_fee": 150.0,
        "benefits": [
            {
                "name": "CLEAR+ Credit",
                "description": "CLEAR Plus membership reimbursement",
                "max_value": 209.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Delta SkyMiles Gold ($150/yr)
# ---------------------------------------------------------------------------
def _delta_skymiles_gold() -> dict:
    return {
        "name": "Delta SkyMiles Gold",
        "issuer": "American Express",
        "annual_fee": 150.0,
        "benefits": [
            {
                "name": "Delta Flight Credit",
                "description": "$200 statement credit on Delta purchases after $10K annual spend",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
            {
                "name": "Delta Stays Credit",
                "description": "Credit for hotels booked through Delta Stays",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Delta SkyMiles Platinum ($350/yr)
# ---------------------------------------------------------------------------
def _delta_skymiles_platinum() -> dict:
    return {
        "name": "Delta SkyMiles Platinum",
        "issuer": "American Express",
        "annual_fee": 350.0,
        "benefits": [
            {
                "name": "Resy Dining Credit",
                "description": "$10/month at select restaurants via Resy",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "Rideshare Credit",
                "description": "$10/month on Uber, Lyft, or other rideshares",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Delta Stays Credit",
                "description": "Credit for hotels booked through Delta Stays",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Delta SkyMiles Reserve ($650/yr)
# ---------------------------------------------------------------------------
def _delta_skymiles_reserve() -> dict:
    return {
        "name": "Delta SkyMiles Reserve",
        "issuer": "American Express",
        "annual_fee": 650.0,
        "benefits": [
            {
                "name": "Resy Dining Credit",
                "description": "$20/month at select restaurants via Resy",
                "max_value": 20.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "Rideshare Credit",
                "description": "$10/month on Uber, Lyft, or other rideshares",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Delta Stays Credit",
                "description": "Credit for hotels booked through Delta Stays",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Delta SkyMiles Gold Business ($150/yr)
# ---------------------------------------------------------------------------
def _delta_skymiles_gold_business() -> dict:
    return {
        "name": "Delta SkyMiles Gold Business",
        "issuer": "American Express",
        "annual_fee": 150.0,
        "benefits": [
            {
                "name": "Delta Flight Credit",
                "description": "$200 statement credit on Delta purchases after $10K annual spend",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
            {
                "name": "Delta Stays Credit",
                "description": "Credit for hotels booked through Delta Stays",
                "max_value": 150.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Delta SkyMiles Platinum Business ($350/yr)
# ---------------------------------------------------------------------------
def _delta_skymiles_platinum_business() -> dict:
    return {
        "name": "Delta SkyMiles Platinum Business",
        "issuer": "American Express",
        "annual_fee": 350.0,
        "benefits": [
            {
                "name": "Resy Dining Credit",
                "description": "$10/month at select restaurants via Resy",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "Rideshare Credit",
                "description": "$10/month on Uber, Lyft, or other rideshares",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Delta Stays Credit",
                "description": "Credit for hotels booked through Delta Stays",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Delta SkyMiles Reserve Business ($650/yr)
# ---------------------------------------------------------------------------
def _delta_skymiles_reserve_business() -> dict:
    return {
        "name": "Delta SkyMiles Reserve Business",
        "issuer": "American Express",
        "annual_fee": 650.0,
        "benefits": [
            {
                "name": "Resy Dining Credit",
                "description": "$20/month at select restaurants via Resy",
                "max_value": 20.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "Rideshare Credit",
                "description": "$10/month on Uber, Lyft, or other rideshares",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Delta Stays Credit",
                "description": "Credit for hotels booked through Delta Stays",
                "max_value": 250.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# American Express Business Gold ($375/yr)
# ---------------------------------------------------------------------------
def _amex_business_gold() -> dict:
    return {
        "name": "American Express Business Gold",
        "issuer": "American Express",
        "annual_fee": 375.0,
        "benefits": [
            {
                "name": "Flexible Business Credit",
                "description": "$20/month on FedEx, Grubhub, office supplies, and more",
                "max_value": 20.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "shopping",
            },
            {
                "name": "Walmart+ Membership Credit",
                "description": "Monthly credit covering Walmart+ membership (~$12.95/mo)",
                "max_value": 12.95,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.binary,
                "category": "shopping",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Marriott Bonvoy Brilliant ($650/yr)
# ---------------------------------------------------------------------------
def _marriott_bonvoy_brilliant() -> dict:
    return {
        "name": "Marriott Bonvoy Brilliant",
        "issuer": "American Express",
        "annual_fee": 650.0,
        "benefits": [
            {
                "name": "Dining Credit",
                "description": "$25/month at participating restaurants",
                "max_value": 25.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Hilton Honors Business ($195/yr)
# ---------------------------------------------------------------------------
def _hilton_honors_business() -> dict:
    return {
        "name": "Hilton Honors Business",
        "issuer": "American Express",
        "annual_fee": 195.0,
        "benefits": [
            {
                "name": "Hilton Property Credit",
                "description": "$60/quarter at Hilton properties for food, drinks, spa, etc.",
                "max_value": 60.0,
                "period_type": PeriodType.quarterly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Blue Cash Preferred ($95/yr)
# ---------------------------------------------------------------------------
def _blue_cash_preferred() -> dict:
    return {
        "name": "Blue Cash Preferred",
        "issuer": "American Express",
        "annual_fee": 95.0,
        "benefits": [
            {
                "name": "Disney Streaming Credit",
                "description": "$10/month statement credit for Disney+, Hulu, or ESPN+ subscriptions",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "entertainment",
            },
        ],
    }


# ---------------------------------------------------------------------------
# United Club Infinite ($695/yr)
# ---------------------------------------------------------------------------
def _united_club_infinite() -> dict:
    return {
        "name": "United Club Infinite",
        "issuer": "Chase",
        "annual_fee": 695.0,
        "benefits": [
            {
                "name": "Instacart Credit",
                "description": "$20/month statement credit on Instacart purchases",
                "max_value": 20.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "shopping",
            },
            {
                "name": "Rideshare Credit",
                "description": "$12/month Jan-Nov for Uber/Lyft (+$6 bonus in December is separate)",
                "max_value": 12.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Rideshare Credit December Bonus",
                "description": "Extra $6 rideshare credit in December ($18 total that month)",
                "max_value": 6.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
            {
                "name": "Renowned Hotels & Resorts Credit",
                "description": "$200/year at select luxury hotel properties",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "JSX Flight Credit",
                "description": "$200/year on JSX semi-private flights",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Avis/Budget Car Rental Credit",
                "description": "$100/year on Avis or Budget car rentals",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# United Club Business ($695/yr)
# ---------------------------------------------------------------------------
def _united_club_business() -> dict:
    return {
        "name": "United Club Business",
        "issuer": "Chase",
        "annual_fee": 695.0,
        "benefits": [
            {
                "name": "Instacart Credit",
                "description": "$20/month statement credit on Instacart purchases",
                "max_value": 20.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "shopping",
            },
            {
                "name": "Rideshare Credit",
                "description": "$12/month Jan-Nov for Uber/Lyft (+$6 bonus in December is separate)",
                "max_value": 12.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Rideshare Credit December Bonus",
                "description": "Extra $6 rideshare credit in December ($18 total that month)",
                "max_value": 6.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
            {
                "name": "Renowned Hotels & Resorts Credit",
                "description": "$200/year at select luxury hotel properties",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "JSX Flight Credit",
                "description": "$200/year on JSX semi-private flights",
                "max_value": 200.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Avis/Budget Car Rental Credit",
                "description": "$100/year on Avis or Budget car rentals",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# United Quest ($350/yr)
# ---------------------------------------------------------------------------
def _united_quest() -> dict:
    return {
        "name": "United Quest",
        "issuer": "Chase",
        "annual_fee": 350.0,
        "benefits": [
            {
                "name": "Instacart Credit",
                "description": "$15/month ($10 Instacart + $5 Instacart+) statement credit",
                "max_value": 15.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "shopping",
            },
            {
                "name": "JSX Flight Credit",
                "description": "$150/year on JSX semi-private flights",
                "max_value": 150.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Renowned Hotels & Resorts Credit",
                "description": "$150/year at select luxury hotel properties",
                "max_value": 150.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Rideshare Credit",
                "description": "$100/year on Uber/Lyft rides",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Avis/Budget Car Rental Credit",
                "description": "$80/year on Avis or Budget car rentals",
                "max_value": 80.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# United Explorer ($150/yr)
# ---------------------------------------------------------------------------
def _united_explorer() -> dict:
    return {
        "name": "United Explorer",
        "issuer": "Chase",
        "annual_fee": 150.0,
        "benefits": [
            {
                "name": "Instacart Credit",
                "description": "$10/month statement credit on Instacart purchases",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "shopping",
            },
            {
                "name": "Rideshare Credit",
                "description": "$5/month on Uber/Lyft rides",
                "max_value": 5.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "United Hotels Credit",
                "description": "$100/year on hotels booked through United",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "JSX Flight Credit",
                "description": "$100/year on JSX semi-private flights",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# United Business ($150/yr)
# ---------------------------------------------------------------------------
def _united_business() -> dict:
    return {
        "name": "United Business",
        "issuer": "Chase",
        "annual_fee": 150.0,
        "benefits": [
            {
                "name": "Instacart Credit",
                "description": "$10/month statement credit on Instacart purchases",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "shopping",
            },
            {
                "name": "Rideshare Credit",
                "description": "$8/month Jan-Nov for Uber/Lyft (+$4 bonus in December is separate)",
                "max_value": 8.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Rideshare Credit December Bonus",
                "description": "Extra $4 rideshare credit in December ($12 total that month)",
                "max_value": 4.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
            {
                "name": "United Hotels Credit",
                "description": "$100/year on hotels booked through United",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "JSX Flight Credit",
                "description": "$100/year on JSX semi-private flights",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# IHG One Rewards Premier ($99/yr)
# ---------------------------------------------------------------------------
def _ihg_premier() -> dict:
    return {
        "name": "IHG One Rewards Premier",
        "issuer": "Chase",
        "annual_fee": 99.0,
        "benefits": [
            {
                "name": "United TravelBank Cash",
                "description": "$50/year in United TravelBank Cash for flights",
                "max_value": 50.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# IHG One Rewards Premier Business ($99/yr)
# ---------------------------------------------------------------------------
def _ihg_premier_business() -> dict:
    return {
        "name": "IHG One Rewards Premier Business",
        "issuer": "Chase",
        "annual_fee": 99.0,
        "benefits": [
            {
                "name": "Statement Credit",
                "description": "$100/year after $20K annual spend on the card",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
            {
                "name": "United TravelBank Cash",
                "description": "$50/year in United TravelBank Cash",
                "max_value": 50.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# World of Hyatt Business ($199/yr)
# ---------------------------------------------------------------------------
def _world_of_hyatt_business() -> dict:
    return {
        "name": "World of Hyatt Business",
        "issuer": "Chase",
        "annual_fee": 199.0,
        "benefits": [
            {
                "name": "Hyatt Property Credit",
                "description": "Two $50 credits per year at Hyatt properties for dining, spa, etc.",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Chase Sapphire Preferred ($95/yr)
# ---------------------------------------------------------------------------
def _chase_sapphire_preferred() -> dict:
    return {
        "name": "Chase Sapphire Preferred",
        "issuer": "Chase",
        "annual_fee": 95.0,
        "benefits": [
            {
                "name": "Chase Travel Hotel Credit",
                "description": "$50/year statement credit on hotels booked through Chase Travel",
                "max_value": 50.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Marriott Bonvoy Boundless ($95/yr)
# ---------------------------------------------------------------------------
def _marriott_bonvoy_boundless() -> dict:
    return {
        "name": "Marriott Bonvoy Boundless",
        "issuer": "Chase",
        "annual_fee": 95.0,
        "benefits": [
            {
                "name": "Airline Statement Credit",
                "description": "$50/semiannual airline credit (2026 promotional benefit)",
                "max_value": 50.0,
                "period_type": PeriodType.semiannual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Capital One Venture X Business ($395/yr)
# ---------------------------------------------------------------------------
def _capital_one_venture_x_business() -> dict:
    return {
        "name": "Capital One Venture X Business",
        "issuer": "Capital One",
        "annual_fee": 395.0,
        "benefits": [
            {
                "name": "Capital One Business Travel Credit",
                "description": "$300/year on bookings through Capital One Travel",
                "max_value": 300.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Citi AAdvantage Executive ($595/yr)
# ---------------------------------------------------------------------------
def _citi_aadvantage_executive() -> dict:
    return {
        "name": "Citi AAdvantage Executive",
        "issuer": "Citi",
        "annual_fee": 595.0,
        "benefits": [
            {
                "name": "Grubhub Credit",
                "description": "$10/month statement credit on Grubhub orders",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "dining",
            },
            {
                "name": "Lyft Credit",
                "description": "$10/month credit after 3+ Lyft rides in the month",
                "max_value": 10.0,
                "period_type": PeriodType.monthly,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Avis/Budget Car Rental Credit",
                "description": "$120/year on Avis or Budget car rentals",
                "max_value": 120.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Citi AAdvantage Globe ($350/yr)
# ---------------------------------------------------------------------------
def _citi_aadvantage_globe() -> dict:
    return {
        "name": "Citi AAdvantage Globe",
        "issuer": "Citi",
        "annual_fee": 350.0,
        "benefits": [
            {
                "name": "Turo Car Rental Credit",
                "description": "$30/trip credit on Turo, up to $240/year",
                "max_value": 240.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Splurge Credit",
                "description": "$100/year on 2 brands you choose from a curated list",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "lifestyle",
            },
            {
                "name": "Inflight Purchase Credit",
                "description": "$100/year on American Airlines inflight purchases (Wi-Fi, food, etc.)",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Citi Strata Premier ($95/yr)
# ---------------------------------------------------------------------------
def _citi_strata_premier() -> dict:
    return {
        "name": "Citi Strata Premier",
        "issuer": "Citi",
        "annual_fee": 95.0,
        "benefits": [
            {
                "name": "Hotel Credit",
                "description": "$100/year on $500+ hotel stay booked via cititravel.com",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Citi AAdvantage Platinum Select ($99/yr)
# ---------------------------------------------------------------------------
def _citi_aadvantage_platinum_select() -> dict:
    return {
        "name": "Citi AAdvantage Platinum Select",
        "issuer": "Citi",
        "annual_fee": 99.0,
        "benefits": [
            {
                "name": "Turo Credit",
                "description": "$30/trip on Turo, up to $180/year",
                "max_value": 180.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "AA Flight Discount",
                "description": "$125 American Airlines statement credit after $20K annual spend",
                "max_value": 125.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# U.S. Bank Altitude Reserve ($400/yr)
# ---------------------------------------------------------------------------
def _us_bank_altitude_reserve() -> dict:
    return {
        "name": "U.S. Bank Altitude Reserve",
        "issuer": "U.S. Bank",
        "annual_fee": 400.0,
        "benefits": [
            {
                "name": "Travel Credit",
                "description": "$325/year on travel purchases booked through US Bank Travel Center",
                "max_value": 325.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Wells Fargo Autograph Journey ($95/yr)
# ---------------------------------------------------------------------------
def _wells_fargo_autograph_journey() -> dict:
    return {
        "name": "Wells Fargo Autograph Journey",
        "issuer": "Wells Fargo",
        "annual_fee": 95.0,
        "benefits": [
            {
                "name": "Airline Purchase Credit",
                "description": "$50/year statement credit for airline incidental purchases",
                "max_value": 50.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Bank of America Premium Rewards ($95/yr)
# ---------------------------------------------------------------------------
def _boa_premium_rewards() -> dict:
    return {
        "name": "Bank of America Premium Rewards",
        "issuer": "Bank of America",
        "annual_fee": 95.0,
        "benefits": [
            {
                "name": "Airline Incidental Credit",
                "description": "$100/year for airline incidentals (seat upgrades, baggage, etc.)",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
            {
                "name": "Global Entry/TSA PreCheck",
                "description": "Global Entry or TSA PreCheck fee credit (resets ~every 4 years, annualized)",
                "max_value": 25.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.binary,
                "category": "travel",
            },
        ],
    }


# ---------------------------------------------------------------------------
# JetBlue Plus ($99/yr)
# ---------------------------------------------------------------------------
def _jetblue_plus() -> dict:
    return {
        "name": "JetBlue Plus",
        "issuer": "Barclays",
        "annual_fee": 99.0,
        "benefits": [
            {
                "name": "JetBlue Vacations Credit",
                "description": "$100/year on JetBlue Vacations packages",
                "max_value": 100.0,
                "period_type": PeriodType.annual,
                "redemption_type": RedemptionType.continuous,
                "category": "travel",
            },
        ],
    }
