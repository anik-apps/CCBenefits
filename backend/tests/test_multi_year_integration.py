"""Integration tests for the multi-year benefit tracking feature.

These tests exercise the full workflow end-to-end: create cards, log usage
across years, close/reopen cards, switch years, and verify data isolation.
"""
from ccbenefits.models import CardTemplate


def test_full_multi_year_workflow(client, auth_header, db_session):
    """End-to-end: create card, log usage in multiple years, close, verify year filtering."""
    template = db_session.query(CardTemplate).first()

    # 1. Create card with member_since in 2023
    resp = client.post("/api/user-cards/", json={
        "card_template_id": template.id,
        "member_since_date": "2023-06-15",
    }, headers=auth_header)
    assert resp.status_code == 201
    card_id = resp.json()["id"]
    assert resp.json()["closed_date"] is None

    # 2. Get card detail — should have available_years from 2023 to current year
    resp = client.get(f"/api/user-cards/{card_id}", headers=auth_header)
    assert resp.status_code == 200
    years = resp.json()["available_years"]
    assert 2023 in years
    assert 2024 in years
    assert 2025 in years
    assert 2026 in years

    # 3. Get a benefit to log usage
    benefit_id = resp.json()["benefits_status"][0]["benefit_template_id"]

    # 4. Log usage in 2024, 2025, and 2026
    for target_year, amount in [(2024, 5.0), (2025, 8.0), (2026, 12.0)]:
        resp = client.post(f"/api/user-cards/{card_id}/usage", json={
            "benefit_template_id": benefit_id,
            "amount_used": amount,
            "target_date": f"{target_year}-03-15",
        }, headers=auth_header)
        assert resp.status_code == 201, f"Failed to log usage for {target_year}: {resp.json()}"

    # 5. Verify year-filtered summaries
    resp = client.get(f"/api/user-cards/{card_id}/summary?year=2024", headers=auth_header)
    assert resp.json()["ytd_actual_used"] == 5.0

    resp = client.get(f"/api/user-cards/{card_id}/summary?year=2025", headers=auth_header)
    assert resp.json()["ytd_actual_used"] == 8.0

    resp = client.get(f"/api/user-cards/{card_id}/summary?year=2026", headers=auth_header)
    assert resp.json()["ytd_actual_used"] == 12.0

    # 6. Verify year-filtered details have correct period segments
    resp = client.get(f"/api/user-cards/{card_id}?year=2024", headers=auth_header)
    benefit_2024 = resp.json()["benefits_status"][0]
    for period in benefit_2024["periods"]:
        assert period["period_start_date"].startswith("2024")

    resp = client.get(f"/api/user-cards/{card_id}?year=2025", headers=auth_header)
    benefit_2025 = resp.json()["benefits_status"][0]
    for period in benefit_2025["periods"]:
        assert period["period_start_date"].startswith("2025")

    # 7. Close the card
    resp = client.put(f"/api/user-cards/{card_id}/close", json={
        "closed_date": "2026-02-01",
    }, headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["closed_date"] == "2026-02-01"
    assert resp.json()["is_active"] is False

    # 8. Closed card should still appear in 2025 list (was active then)
    resp = client.get("/api/user-cards/?year=2025", headers=auth_header)
    card_ids = [c["id"] for c in resp.json()]
    assert card_id in card_ids

    # 9. Closed card should appear in 2026 (closed in 2026, after Jan 1)
    resp = client.get("/api/user-cards/?year=2026", headers=auth_header)
    card_ids = [c["id"] for c in resp.json()]
    assert card_id in card_ids

    # 10. Can still log usage before close date (retroactive)
    resp = client.post(f"/api/user-cards/{card_id}/usage", json={
        "benefit_template_id": benefit_id,
        "amount_used": 3.0,
        "target_date": "2025-06-15",
    }, headers=auth_header)
    assert resp.status_code == 201

    # 11. Cannot log usage after close date
    resp = client.post(f"/api/user-cards/{card_id}/usage", json={
        "benefit_template_id": benefit_id,
        "amount_used": 3.0,
        "target_date": "2026-03-15",
    }, headers=auth_header)
    assert resp.status_code == 400
    assert "after card close date" in resp.json()["detail"]

    # 12. Reopen the card
    resp = client.put(f"/api/user-cards/{card_id}/reopen", headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["closed_date"] is None
    assert resp.json()["is_active"] is True

    # 13. Now can log usage after former close date
    resp = client.post(f"/api/user-cards/{card_id}/usage", json={
        "benefit_template_id": benefit_id,
        "amount_used": 2.0,
        "target_date": "2026-04-15",
    }, headers=auth_header)
    assert resp.status_code == 201


def test_year_isolation_between_cards(client, auth_header, db_session):
    """Two cards: verify year filtering returns correct data per card."""
    templates = db_session.query(CardTemplate).all()

    # Create two cards with different member_since dates
    resp = client.post("/api/user-cards/", json={
        "card_template_id": templates[0].id,
        "member_since_date": "2024-01-01",
    }, headers=auth_header)
    card_a = resp.json()["id"]

    resp = client.post("/api/user-cards/", json={
        "card_template_id": templates[1].id,
        "member_since_date": "2025-06-01",
    }, headers=auth_header)
    card_b = resp.json()["id"]

    # Card B should not appear in 2024 list (opened in 2025)
    resp = client.get("/api/user-cards/?year=2024", headers=auth_header)
    card_ids = [c["id"] for c in resp.json()]
    assert card_a in card_ids
    assert card_b not in card_ids

    # Both should appear in 2026
    resp = client.get("/api/user-cards/?year=2026", headers=auth_header)
    card_ids = [c["id"] for c in resp.json()]
    assert card_a in card_ids
    assert card_b in card_ids


def test_list_endpoint_returns_available_years(client, auth_header, db_session):
    """GET /api/user-cards/ should include available_years in each summary."""
    template = db_session.query(CardTemplate).first()
    resp = client.post("/api/user-cards/", json={
        "card_template_id": template.id,
        "member_since_date": "2024-01-01",
    }, headers=auth_header)
    card_id = resp.json()["id"]

    resp = client.get("/api/user-cards/", headers=auth_header)
    card = next(c for c in resp.json() if c["id"] == card_id)
    assert "available_years" in card
    assert 2024 in card["available_years"]
    assert 2026 in card["available_years"]


def test_details_endpoint_returns_available_years(client, auth_header, db_session):
    """GET /api/user-cards/details should include available_years."""
    template = db_session.query(CardTemplate).first()
    resp = client.post("/api/user-cards/", json={
        "card_template_id": template.id,
        "member_since_date": "2023-01-01",
    }, headers=auth_header)
    card_id = resp.json()["id"]

    resp = client.get("/api/user-cards/details", headers=auth_header)
    card = next(c for c in resp.json() if c["id"] == card_id)
    assert "available_years" in card
    assert 2023 in card["available_years"]


def test_close_date_before_member_since_rejected(client, auth_header, db_session):
    """Close date before member_since should be rejected."""
    template = db_session.query(CardTemplate).first()
    resp = client.post("/api/user-cards/", json={
        "card_template_id": template.id,
        "member_since_date": "2025-06-01",
    }, headers=auth_header)
    card_id = resp.json()["id"]

    resp = client.put(f"/api/user-cards/{card_id}/close", json={
        "closed_date": "2025-01-01",
    }, headers=auth_header)
    assert resp.status_code == 400


def test_year_param_validation(client, auth_header, db_session):
    """Invalid year values should return 422."""
    resp = client.get("/api/user-cards/?year=0", headers=auth_header)
    assert resp.status_code == 422

    resp = client.get("/api/user-cards/?year=-1", headers=auth_header)
    assert resp.status_code == 422

    resp = client.get("/api/user-cards/details?year=99999", headers=auth_header)
    assert resp.status_code == 422


def test_past_year_benefits_used_count_nonzero(client, auth_header, db_session):
    """benefits_used_count should reflect usage in the requested year."""
    template = db_session.query(CardTemplate).first()
    resp = client.post("/api/user-cards/", json={
        "card_template_id": template.id,
        "member_since_date": "2024-01-01",
    }, headers=auth_header)
    card_id = resp.json()["id"]

    # Get benefit id
    resp = client.get(f"/api/user-cards/{card_id}", headers=auth_header)
    benefit_id = resp.json()["benefits_status"][0]["benefit_template_id"]

    # Log usage in 2025
    resp = client.post(f"/api/user-cards/{card_id}/usage", json={
        "benefit_template_id": benefit_id,
        "amount_used": 5.0,
        "target_date": "2025-02-15",
    }, headers=auth_header)
    assert resp.status_code == 201

    # Check 2025 summary
    resp = client.get(f"/api/user-cards/{card_id}/summary?year=2025", headers=auth_header)
    assert resp.json()["benefits_used_count"] >= 1
    assert resp.json()["ytd_actual_used"] == 5.0

    # Check 2024 summary — should have no usage
    resp = client.get(f"/api/user-cards/{card_id}/summary?year=2024", headers=auth_header)
    assert resp.json()["benefits_used_count"] == 0
    assert resp.json()["ytd_actual_used"] == 0.0
