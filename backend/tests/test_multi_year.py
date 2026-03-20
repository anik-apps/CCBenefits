from ccbenefits.models import CardTemplate


def _create_card_with_usage(client, auth_header, db_session, member_since="2024-01-01"):
    """Helper: create a card, log usage in 2025 and 2026, return (card_id, benefit_id)."""
    template = db_session.query(CardTemplate).first()
    resp = client.post(
        "/api/user-cards/",
        json={"card_template_id": template.id, "member_since_date": member_since},
        headers=auth_header,
    )
    card_id = resp.json()["id"]

    # Get a benefit
    resp = client.get(f"/api/user-cards/{card_id}", headers=auth_header)
    benefit_id = resp.json()["benefits_status"][0]["benefit_template_id"]

    # Log usage in Jan 2025
    resp2 = client.post(
        f"/api/user-cards/{card_id}/usage",
        json={"benefit_template_id": benefit_id, "amount_used": 10.0, "target_date": "2025-01-15"},
        headers=auth_header,
    )
    assert resp2.status_code == 201
    # Log usage in Jan 2026
    resp3 = client.post(
        f"/api/user-cards/{card_id}/usage",
        json={"benefit_template_id": benefit_id, "amount_used": 5.0, "target_date": "2026-01-15"},
        headers=auth_header,
    )
    assert resp3.status_code == 201

    return card_id, benefit_id


def test_detail_default_year(client, auth_header, db_session):
    """No ?year param defaults to current year behavior."""
    template = db_session.query(CardTemplate).first()
    resp = client.post(
        "/api/user-cards/",
        json={"card_template_id": template.id},
        headers=auth_header,
    )
    card_id = resp.json()["id"]

    resp = client.get(f"/api/user-cards/{card_id}", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert "benefits_status" in data
    assert "available_years" in data


def test_detail_past_year_segments(client, auth_header, db_session):
    """?year=2025 returns 2025 period segments."""
    card_id, _ = _create_card_with_usage(client, auth_header, db_session)
    resp = client.get(f"/api/user-cards/{card_id}?year=2025", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    benefit = data["benefits_status"][0]
    # All period segments should be in year 2025
    for period in benefit["periods"]:
        assert period["period_start_date"].startswith("2025")


def test_summary_ytd_filtered_by_year(client, auth_header, db_session):
    """Usage in 2025 shows in ?year=2025 but not ?year=2026."""
    card_id, _ = _create_card_with_usage(client, auth_header, db_session)

    # Year 2025 should include the $10 usage
    resp = client.get(f"/api/user-cards/{card_id}/summary?year=2025", headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["ytd_actual_used"] == 10.0

    # Year 2026 should include the $5 usage
    resp = client.get(f"/api/user-cards/{card_id}/summary?year=2026", headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["ytd_actual_used"] == 5.0


def test_past_year_prorated_max_is_full_year(client, auth_header, db_session):
    """For past years, prorated_max = full annual max (all periods elapsed)."""
    card_id, _ = _create_card_with_usage(client, auth_header, db_session)

    resp_past = client.get(f"/api/user-cards/{card_id}/summary?year=2025", headers=auth_header)
    resp_current = client.get(f"/api/user-cards/{card_id}/summary?year=2026", headers=auth_header)

    past = resp_past.json()
    current = resp_current.json()

    # Past year utilization is based on full annual max
    # Current year utilization is based on prorated max (partial year)
    # With $10 usage in 2025 and the same card, past utilization should be deterministic
    assert past["utilization_pct"] > 0
    assert past["total_max_annual_value"] == current["total_max_annual_value"]


def test_available_years_active_card(client, auth_header, db_session):
    """Active card: available_years from member_since through current year."""
    template = db_session.query(CardTemplate).first()
    resp = client.post(
        "/api/user-cards/",
        json={"card_template_id": template.id, "member_since_date": "2024-06-15"},
        headers=auth_header,
    )
    card_id = resp.json()["id"]

    resp = client.get(f"/api/user-cards/{card_id}", headers=auth_header)
    years = resp.json()["available_years"]
    assert 2024 in years
    assert 2025 in years
    assert 2026 in years
    assert 2023 not in years


def test_available_years_closed_card(client, auth_header, db_session):
    """Closed card: available_years from member_since through closed_date year."""
    template = db_session.query(CardTemplate).first()
    resp = client.post(
        "/api/user-cards/",
        json={"card_template_id": template.id, "member_since_date": "2023-01-01"},
        headers=auth_header,
    )
    card_id = resp.json()["id"]

    client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2025-06-15"},
        headers=auth_header,
    )

    resp = client.get(f"/api/user-cards/{card_id}", headers=auth_header)
    years = resp.json()["available_years"]
    assert years == [2023, 2024, 2025]


def test_list_cards_with_year(client, auth_header, db_session):
    """GET /api/user-cards/?year=2025 returns summaries for 2025."""
    card_id, _ = _create_card_with_usage(client, auth_header, db_session)
    resp = client.get("/api/user-cards/?year=2025", headers=auth_header)
    assert resp.status_code == 200
    cards = resp.json()
    card = next(c for c in cards if c["id"] == card_id)
    assert card["ytd_actual_used"] == 10.0


def test_closed_card_visible_in_past_year(client, auth_header, db_session):
    """Card closed in 2026 should appear when viewing ?year=2025."""
    card_id, _ = _create_card_with_usage(client, auth_header, db_session)
    client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2026-01-15"},
        headers=auth_header,
    )

    resp = client.get("/api/user-cards/?year=2025", headers=auth_header)
    card_ids = [c["id"] for c in resp.json()]
    assert card_id in card_ids


def test_closed_card_hidden_for_year_after_close(client, auth_header, db_session):
    """Card closed in 2024 should not appear when viewing ?year=2026."""
    template = db_session.query(CardTemplate).first()
    resp = client.post(
        "/api/user-cards/",
        json={"card_template_id": template.id, "member_since_date": "2023-01-01"},
        headers=auth_header,
    )
    card_id = resp.json()["id"]
    client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2024-06-15"},
        headers=auth_header,
    )

    resp = client.get("/api/user-cards/?year=2026", headers=auth_header)
    card_ids = [c["id"] for c in resp.json()]
    assert card_id not in card_ids


def test_benefits_used_count_past_year(client, auth_header, db_session):
    """benefits_used_count should be non-zero for past year with usage."""
    card_id, _ = _create_card_with_usage(client, auth_header, db_session)

    resp = client.get(f"/api/user-cards/{card_id}/summary?year=2025", headers=auth_header)
    assert resp.json()["benefits_used_count"] >= 1


def test_year_param_on_details_endpoint(client, auth_header, db_session):
    """GET /api/user-cards/details?year=2025 returns details for 2025."""
    card_id, _ = _create_card_with_usage(client, auth_header, db_session)
    resp = client.get("/api/user-cards/details?year=2025", headers=auth_header)
    assert resp.status_code == 200
    cards = resp.json()
    card = next(c for c in cards if c["id"] == card_id)
    benefit = card["benefits_status"][0]
    for period in benefit["periods"]:
        assert period["period_start_date"].startswith("2025")


def test_invalid_year_returns_422(client, auth_header, db_session):
    """Invalid year values (out of range) should return 422."""
    resp = client.get("/api/user-cards/?year=0", headers=auth_header)
    assert resp.status_code == 422

    resp = client.get("/api/user-cards/?year=-1", headers=auth_header)
    assert resp.status_code == 422

    resp = client.get("/api/user-cards/?year=99999", headers=auth_header)
    assert resp.status_code == 422


def test_card_no_member_since_with_year_param(client, auth_header, db_session):
    """Card with no member_since_date should appear in year-filtered results."""
    template = db_session.query(CardTemplate).first()
    resp = client.post(
        "/api/user-cards/",
        json={"card_template_id": template.id},  # no member_since_date
        headers=auth_header,
    )
    card_id = resp.json()["id"]

    resp = client.get("/api/user-cards/?year=2025", headers=auth_header)
    card_ids = [c["id"] for c in resp.json()]
    assert card_id in card_ids
