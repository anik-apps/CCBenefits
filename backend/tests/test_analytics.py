from ccbenefits.models import CardTemplate


def test_batch_details_returns_all_cards_with_benefits(client, auth_header, db_session):
    """GET /api/user-cards/details returns all user cards with benefits_status."""
    templates = db_session.query(CardTemplate).limit(2).all()
    for t in templates:
        resp = client.post(
            "/api/user-cards/",
            json={"card_template_id": t.id},
            headers=auth_header,
        )
        assert resp.status_code == 201

    resp = client.get("/api/user-cards/details", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == len(templates)

    for card in data:
        assert "benefits_status" in card
        assert "ytd_actual_used" in card
        assert "utilization_pct" in card
        assert isinstance(card["benefits_status"], list)
        assert len(card["benefits_status"]) > 0


def test_batch_details_empty_for_user_with_no_cards(client, auth_header):
    """GET /api/user-cards/details returns empty list when user has no cards."""
    resp = client.get("/api/user-cards/details", headers=auth_header)
    assert resp.status_code == 200
    assert resp.json() == []


def test_batch_details_requires_auth(client):
    """GET /api/user-cards/details requires authentication."""
    resp = client.get("/api/user-cards/details")
    assert resp.status_code == 401
