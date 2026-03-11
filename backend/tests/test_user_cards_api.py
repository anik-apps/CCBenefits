from ccbenefits.models import CardTemplate


def test_update_user_card_renewal_date(client, auth_header, db_session):
    """Test PATCH /api/user-cards/{id} to set renewal_date."""
    template = db_session.query(CardTemplate).first()
    resp = client.post(
        "/api/user-cards/",
        json={"card_template_id": template.id},
        headers=auth_header,
    )
    card_id = resp.json()["id"]

    resp = client.patch(
        f"/api/user-cards/{card_id}",
        json={"renewal_date": "2026-12-15"},
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["renewal_date"] == "2026-12-15"


def test_update_user_card_clear_renewal_date(client, auth_header, db_session):
    """Test clearing renewal_date by setting to null."""
    template = db_session.query(CardTemplate).first()
    resp = client.post(
        "/api/user-cards/",
        json={"card_template_id": template.id},
        headers=auth_header,
    )
    card_id = resp.json()["id"]

    client.patch(
        f"/api/user-cards/{card_id}",
        json={"renewal_date": "2026-12-15"},
        headers=auth_header,
    )
    resp = client.patch(
        f"/api/user-cards/{card_id}",
        json={"renewal_date": None},
        headers=auth_header,
    )
    assert resp.status_code == 200
    assert resp.json()["renewal_date"] is None


def test_update_user_card_not_found(client, auth_header):
    """Test PATCH for non-existent card returns 404."""
    resp = client.patch(
        "/api/user-cards/99999",
        json={"renewal_date": "2026-12-15"},
        headers=auth_header,
    )
    assert resp.status_code == 404
