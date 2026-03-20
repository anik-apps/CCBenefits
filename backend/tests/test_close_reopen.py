from ccbenefits.models import CardTemplate


def _create_card(client, auth_header, db_session, member_since_date=None):
    """Helper: create a user card, return card_id."""
    template = db_session.query(CardTemplate).first()
    payload = {"card_template_id": template.id}
    if member_since_date:
        payload["member_since_date"] = member_since_date
    resp = client.post("/api/user-cards/", json=payload, headers=auth_header)
    assert resp.status_code == 201
    return resp.json()["id"]


def test_close_card(client, auth_header, db_session):
    card_id = _create_card(client, auth_header, db_session, member_since_date="2024-01-15")
    resp = client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2026-03-01"},
        headers=auth_header,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["closed_date"] == "2026-03-01"
    assert data["is_active"] is False


def test_reopen_card(client, auth_header, db_session):
    card_id = _create_card(client, auth_header, db_session)
    # Close first
    client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2026-03-01"},
        headers=auth_header,
    )
    # Reopen
    resp = client.put(
        f"/api/user-cards/{card_id}/reopen",
        headers=auth_header,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["closed_date"] is None
    assert data["is_active"] is True


def test_close_card_invalid_date_before_member_since(client, auth_header, db_session):
    card_id = _create_card(client, auth_header, db_session, member_since_date="2025-06-01")
    resp = client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2025-01-01"},
        headers=auth_header,
    )
    assert resp.status_code == 400
    assert "before membership date" in resp.json()["detail"]


def test_close_already_closed_card(client, auth_header, db_session):
    card_id = _create_card(client, auth_header, db_session)
    client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2026-03-01"},
        headers=auth_header,
    )
    resp = client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2026-04-01"},
        headers=auth_header,
    )
    assert resp.status_code == 400
    assert "already closed" in resp.json()["detail"]


def test_reopen_active_card(client, auth_header, db_session):
    card_id = _create_card(client, auth_header, db_session)
    resp = client.put(
        f"/api/user-cards/{card_id}/reopen",
        headers=auth_header,
    )
    assert resp.status_code == 400
    assert "not closed" in resp.json()["detail"]


def test_log_usage_closed_card_before_close_date(client, auth_header, db_session):
    """Usage with target_date before closed_date should succeed."""
    card_id = _create_card(client, auth_header, db_session, member_since_date="2024-01-01")
    # Close card mid-2025
    client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2025-06-15"},
        headers=auth_header,
    )
    # Get a benefit for this card
    resp = client.get(f"/api/user-cards/{card_id}", headers=auth_header)
    benefit_id = resp.json()["benefits_status"][0]["benefit_template_id"]

    # Log usage for Jan 2025 (before close date) — should succeed
    resp = client.post(
        f"/api/user-cards/{card_id}/usage",
        json={
            "benefit_template_id": benefit_id,
            "amount_used": 10.0,
            "target_date": "2025-01-15",
        },
        headers=auth_header,
    )
    assert resp.status_code == 201


def test_log_usage_closed_card_after_close_date(client, auth_header, db_session):
    """Usage with target_date after closed_date should fail."""
    card_id = _create_card(client, auth_header, db_session, member_since_date="2024-01-01")
    client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2025-06-15"},
        headers=auth_header,
    )
    resp = client.get(f"/api/user-cards/{card_id}", headers=auth_header)
    benefit_id = resp.json()["benefits_status"][0]["benefit_template_id"]

    resp = client.post(
        f"/api/user-cards/{card_id}/usage",
        json={
            "benefit_template_id": benefit_id,
            "amount_used": 10.0,
            "target_date": "2025-07-15",
        },
        headers=auth_header,
    )
    assert resp.status_code == 400
    assert "after card close date" in resp.json()["detail"]


def test_log_usage_before_member_since(client, auth_header, db_session):
    """Usage with target_date before member_since_date should fail."""
    card_id = _create_card(client, auth_header, db_session, member_since_date="2025-06-01")
    resp = client.get(f"/api/user-cards/{card_id}", headers=auth_header)
    benefit_id = resp.json()["benefits_status"][0]["benefit_template_id"]

    resp = client.post(
        f"/api/user-cards/{card_id}/usage",
        json={
            "benefit_template_id": benefit_id,
            "amount_used": 10.0,
            "target_date": "2025-01-15",
        },
        headers=auth_header,
    )
    assert resp.status_code == 400
    assert "before card membership date" in resp.json()["detail"]


def test_closed_card_visible_in_close_year(client, auth_header, db_session):
    """Closed cards should still appear when viewing the year they were closed."""
    card_id = _create_card(client, auth_header, db_session)
    client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2026-03-01"},
        headers=auth_header,
    )
    # Card closed in 2026 should still appear in 2026 list
    resp = client.get("/api/user-cards/?year=2026", headers=auth_header)
    card_ids = [c["id"] for c in resp.json()]
    assert card_id in card_ids


def test_closed_card_hidden_from_future_year(client, auth_header, db_session):
    """Closed cards should not appear when viewing a year after they were closed."""
    card_id = _create_card(client, auth_header, db_session)
    client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2024-12-31"},
        headers=auth_header,
    )
    # Card closed in 2024 should NOT appear in 2026 list
    resp = client.get("/api/user-cards/?year=2026", headers=auth_header)
    card_ids = [c["id"] for c in resp.json()]
    assert card_id not in card_ids

    # But should appear in 2024
    resp = client.get("/api/user-cards/?year=2024", headers=auth_header)
    card_ids = [c["id"] for c in resp.json()]
    assert card_id in card_ids


def test_closed_card_hidden_from_details_future_year(client, auth_header, db_session):
    """Closed cards should not appear in details for year after close."""
    card_id = _create_card(client, auth_header, db_session)
    client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2024-12-31"},
        headers=auth_header,
    )
    resp = client.get("/api/user-cards/details?year=2026", headers=auth_header)
    card_ids = [c["id"] for c in resp.json()]
    assert card_id not in card_ids


def test_close_card_no_member_since(client, auth_header, db_session):
    """Closing a card with no member_since_date should work."""
    card_id = _create_card(client, auth_header, db_session)  # no member_since_date
    resp = client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2026-03-01"},
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["closed_date"] == "2026-03-01"


def test_close_reopen_close_lifecycle(client, auth_header, db_session):
    """Full lifecycle: create -> close -> reopen -> close with different date."""
    card_id = _create_card(client, auth_header, db_session)
    # Close
    resp = client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2026-01-01"},
        headers=auth_header,
    )
    assert resp.status_code == 200

    # Reopen
    resp = client.put(f"/api/user-cards/{card_id}/reopen", headers=auth_header)
    assert resp.status_code == 200

    # Close again with different date
    resp = client.put(
        f"/api/user-cards/{card_id}/close",
        json={"closed_date": "2026-06-15"},
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["closed_date"] == "2026-06-15"


def test_close_other_users_card_returns_404(client, auth_header, db_session):
    """Attempting to close another user's card returns 404."""
    # Card ID 99999 doesn't exist for this user
    resp = client.put(
        "/api/user-cards/99999/close",
        json={"closed_date": "2026-03-01"},
        headers=auth_header,
    )
    assert resp.status_code == 404


def test_reopen_other_users_card_returns_404(client, auth_header, db_session):
    """Attempting to reopen another user's card returns 404."""
    resp = client.put("/api/user-cards/99999/reopen", headers=auth_header)
    assert resp.status_code == 404
