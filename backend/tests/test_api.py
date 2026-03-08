from datetime import date


# --- Card Template Tests (public, no auth needed) ---


def test_list_card_templates(client):
    resp = client.get("/api/card-templates")
    assert resp.status_code == 200
    cards = resp.json()
    assert len(cards) == 11
    names = {c["name"] for c in cards}
    assert "American Express Platinum" in names
    assert "American Express Business Platinum" in names
    assert "American Express Gold" in names
    assert "Hilton Honors Surpass" in names
    assert "Hilton Honors Aspire" in names
    assert "Chase Sapphire Reserve" in names
    assert "Chase Sapphire Reserve for Business" in names
    assert "Capital One Venture X" in names
    assert "Citi Strata Elite" in names
    assert "Bilt Palladium" in names
    assert "Bank of America Premium Rewards Elite" in names


def test_card_template_annual_fees(client):
    resp = client.get("/api/card-templates")
    cards = {c["name"]: c for c in resp.json()}
    assert cards["American Express Platinum"]["annual_fee"] == 895.0
    assert cards["American Express Business Platinum"]["annual_fee"] == 895.0
    assert cards["American Express Gold"]["annual_fee"] == 325.0
    assert cards["Hilton Honors Surpass"]["annual_fee"] == 150.0
    assert cards["Hilton Honors Aspire"]["annual_fee"] == 550.0
    assert cards["Chase Sapphire Reserve"]["annual_fee"] == 795.0
    assert cards["Chase Sapphire Reserve for Business"]["annual_fee"] == 795.0
    assert cards["Capital One Venture X"]["annual_fee"] == 395.0
    assert cards["Citi Strata Elite"]["annual_fee"] == 595.0
    assert cards["Bilt Palladium"]["annual_fee"] == 495.0
    assert cards["Bank of America Premium Rewards Elite"]["annual_fee"] == 550.0


def test_card_template_benefit_counts(client):
    resp = client.get("/api/card-templates")
    cards = {c["name"]: c for c in resp.json()}
    assert cards["American Express Platinum"]["benefit_count"] == 12
    assert cards["American Express Business Platinum"]["benefit_count"] == 8
    assert cards["American Express Gold"]["benefit_count"] == 4
    assert cards["Hilton Honors Surpass"]["benefit_count"] == 1
    assert cards["Hilton Honors Aspire"]["benefit_count"] == 3
    assert cards["Chase Sapphire Reserve"]["benefit_count"] == 11
    assert cards["Chase Sapphire Reserve for Business"]["benefit_count"] == 9
    assert cards["Capital One Venture X"]["benefit_count"] == 2
    assert cards["Citi Strata Elite"]["benefit_count"] == 4
    assert cards["Bilt Palladium"]["benefit_count"] == 2
    assert cards["Bank of America Premium Rewards Elite"]["benefit_count"] == 3


def test_get_single_card_template(client):
    resp = client.get("/api/card-templates/1")
    assert resp.status_code == 200
    card = resp.json()
    assert card["name"] == "American Express Platinum"
    assert len(card["benefits"]) == 12
    assert card["total_annual_value"] > 0


def test_card_template_404(client):
    resp = client.get("/api/card-templates/999")
    assert resp.status_code == 404


# --- User Card Lifecycle ---


def test_create_user_card(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1, "nickname": "My Amex"}, headers=auth_header)
    assert resp.status_code == 201
    uc = resp.json()
    assert uc["card_name"] == "American Express Platinum"
    assert uc["nickname"] == "My Amex"
    assert uc["is_active"] is True


def test_create_user_card_invalid_template(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 999}, headers=auth_header)
    assert resp.status_code == 404


def test_list_user_cards(client, auth_header):
    client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    client.post("/api/user-cards/", json={"card_template_id": 2}, headers=auth_header)
    resp = client.get("/api/user-cards/", headers=auth_header)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_get_user_card_detail(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    resp = client.get(f"/api/user-cards/{uc_id}", headers=auth_header)
    assert resp.status_code == 200
    detail = resp.json()
    assert len(detail["benefits_status"]) == 12
    for b in detail["benefits_status"]:
        assert b["amount_used"] == 0.0
        assert b["is_used"] is False
        assert b["days_remaining"] >= 0
        assert len(b["periods"]) > 0  # verify period segments present


def test_user_card_404(client, auth_header):
    resp = client.get("/api/user-cards/999", headers=auth_header)
    assert resp.status_code == 404


def test_delete_user_card(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    resp = client.delete(f"/api/user-cards/{uc_id}", headers=auth_header)
    assert resp.status_code == 204
    resp = client.get(f"/api/user-cards/{uc_id}", headers=auth_header)
    assert resp.status_code == 404


def test_delete_user_card_cascades_usage(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    client.post(f"/api/user-cards/{uc_id}/usage", json={"benefit_template_id": 1, "amount_used": 10.0}, headers=auth_header)
    resp = client.delete(f"/api/user-cards/{uc_id}", headers=auth_header)
    assert resp.status_code == 204


# --- Usage Logging ---


def _get_benefit_id_by_name(client, card_template_id: int, name: str) -> int:
    """Helper to get benefit_template_id by name, avoiding hardcoded IDs."""
    resp = client.get(f"/api/card-templates/{card_template_id}")
    for b in resp.json()["benefits"]:
        if b["name"] == name:
            return b["id"]
    raise ValueError(f"Benefit '{name}' not found in card template {card_template_id}")


def test_log_continuous_usage(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")
    resp = client.post(
        f"/api/user-cards/{uc_id}/usage",
        json={"benefit_template_id": uber_id, "amount_used": 10.0, "notes": "Uber Eats"},
        headers=auth_header,
    )
    assert resp.status_code == 201
    usage = resp.json()
    assert usage["amount_used"] == 10.0
    assert usage["benefit_name"] == "Uber Cash"
    assert usage["notes"] == "Uber Eats"


def test_log_binary_usage_coerces_to_max(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    equinox_id = _get_benefit_id_by_name(client, 1, "Equinox Credit")
    resp = client.post(
        f"/api/user-cards/{uc_id}/usage",
        json={"benefit_template_id": equinox_id, "amount_used": 1.0},
        headers=auth_header,
    )
    assert resp.status_code == 201
    assert resp.json()["amount_used"] == 25.0


def test_log_binary_usage_zero_stays_zero(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    equinox_id = _get_benefit_id_by_name(client, 1, "Equinox Credit")
    resp = client.post(
        f"/api/user-cards/{uc_id}/usage",
        json={"benefit_template_id": equinox_id, "amount_used": 0.0},
        headers=auth_header,
    )
    assert resp.status_code == 201
    assert resp.json()["amount_used"] == 0.0


def test_usage_exceeds_max_rejected(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")
    resp = client.post(
        f"/api/user-cards/{uc_id}/usage",
        json={"benefit_template_id": uber_id, "amount_used": 20.0},
        headers=auth_header,
    )
    assert resp.status_code == 400


def test_negative_amount_rejected(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")
    resp = client.post(
        f"/api/user-cards/{uc_id}/usage",
        json={"benefit_template_id": uber_id, "amount_used": -5.0},
        headers=auth_header,
    )
    assert resp.status_code == 422


def test_duplicate_usage_rejected(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")
    client.post(f"/api/user-cards/{uc_id}/usage", json={"benefit_template_id": uber_id, "amount_used": 10.0}, headers=auth_header)
    resp = client.post(f"/api/user-cards/{uc_id}/usage", json={"benefit_template_id": uber_id, "amount_used": 5.0}, headers=auth_header)
    assert resp.status_code == 409


def test_usage_wrong_card_benefit_rejected(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    # Get a Chase benefit ID (Lyft from CSR) — find CSR template ID by name first
    templates = client.get("/api/card-templates").json()
    csr_id = next(t["id"] for t in templates if t["name"] == "Chase Sapphire Reserve")
    lyft_id = _get_benefit_id_by_name(client, csr_id, "Lyft Credit")
    resp = client.post(f"/api/user-cards/{uc_id}/usage", json={"benefit_template_id": lyft_id, "amount_used": 5.0}, headers=auth_header)
    assert resp.status_code == 400


def test_usage_with_target_date(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")
    resp = client.post(
        f"/api/user-cards/{uc_id}/usage",
        json={"benefit_template_id": uber_id, "amount_used": 15.0, "target_date": "2026-01-15"},
        headers=auth_header,
    )
    assert resp.status_code == 201
    usage = resp.json()
    assert usage["period_start_date"] == "2026-01-01"
    assert usage["period_end_date"] == "2026-01-31"


# --- Usage Update/Delete ---


def test_update_usage(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")
    resp = client.post(f"/api/user-cards/{uc_id}/usage", json={"benefit_template_id": uber_id, "amount_used": 10.0}, headers=auth_header)
    usage_id = resp.json()["id"]
    resp = client.put(f"/api/usage/{usage_id}", json={"amount_used": 15.0}, headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["amount_used"] == 15.0


def test_delete_usage(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")
    resp = client.post(f"/api/user-cards/{uc_id}/usage", json={"benefit_template_id": uber_id, "amount_used": 10.0}, headers=auth_header)
    usage_id = resp.json()["id"]
    resp = client.delete(f"/api/usage/{usage_id}", headers=auth_header)
    assert resp.status_code == 204


def test_update_usage_404(client, auth_header):
    resp = client.put("/api/usage/999", json={"amount_used": 5.0}, headers=auth_header)
    assert resp.status_code == 404


def test_delete_usage_404(client, auth_header):
    resp = client.delete("/api/usage/999", headers=auth_header)
    assert resp.status_code == 404


# --- Perceived Value ---


def test_perceived_value_calculation(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")

    client.put(f"/api/user-cards/{uc_id}/benefits/{uber_id}/setting", json={"perceived_max_value": 12.0}, headers=auth_header)
    client.post(f"/api/user-cards/{uc_id}/usage", json={"benefit_template_id": uber_id, "amount_used": 10.0}, headers=auth_header)

    detail = client.get(f"/api/user-cards/{uc_id}", headers=auth_header).json()
    uber = next(b for b in detail["benefits_status"] if b["benefit_template_id"] == uber_id)
    assert uber["perceived_max_value"] == 12.0
    assert uber["utilized_perceived_value"] == 8.0
    assert uber["remaining"] == 5.0


def test_perceived_value_defaults_to_max(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")

    client.post(f"/api/user-cards/{uc_id}/usage", json={"benefit_template_id": uber_id, "amount_used": 10.0}, headers=auth_header)

    detail = client.get(f"/api/user-cards/{uc_id}", headers=auth_header).json()
    uber = next(b for b in detail["benefits_status"] if b["benefit_template_id"] == uber_id)
    assert uber["perceived_max_value"] == 15.0
    assert uber["utilized_perceived_value"] == 10.0


def test_negative_perceived_value_rejected(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")
    resp = client.put(f"/api/user-cards/{uc_id}/benefits/{uber_id}/setting", json={"perceived_max_value": -10.0}, headers=auth_header)
    assert resp.status_code == 422


def test_setting_upsert(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")

    resp = client.put(f"/api/user-cards/{uc_id}/benefits/{uber_id}/setting", json={"perceived_max_value": 10.0}, headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["perceived_max_value"] == 10.0

    resp = client.put(f"/api/user-cards/{uc_id}/benefits/{uber_id}/setting", json={"perceived_max_value": 5.0}, headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["perceived_max_value"] == 5.0


# --- Summary / ROI ---


def test_summary_basic(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")

    client.post(f"/api/user-cards/{uc_id}/usage", json={"benefit_template_id": uber_id, "amount_used": 15.0}, headers=auth_header)

    resp = client.get(f"/api/user-cards/{uc_id}/summary", headers=auth_header)
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["annual_fee"] == 895.0
    assert summary["ytd_actual_used"] == 15.0
    assert summary["benefit_count"] == 12


def test_summary_with_perceived_value(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    uber_id = _get_benefit_id_by_name(client, 1, "Uber Cash")

    client.put(f"/api/user-cards/{uc_id}/benefits/{uber_id}/setting", json={"perceived_max_value": 10.0}, headers=auth_header)
    client.post(f"/api/user-cards/{uc_id}/usage", json={"benefit_template_id": uber_id, "amount_used": 15.0}, headers=auth_header)

    summary = client.get(f"/api/user-cards/{uc_id}/summary", headers=auth_header).json()
    assert summary["ytd_perceived_value"] == 10.0
    assert summary["net_perceived"] == 10.0 - 895.0
    # Uber Cash perceived_max is 10, monthly -> 10*12=120. Others default to max.
    # total_perceived_annual_value should differ from total_max_annual_value
    assert summary["total_perceived_annual_value"] < summary["total_max_annual_value"]


def test_summary_404(client, auth_header):
    resp = client.get("/api/user-cards/999/summary", headers=auth_header)
    assert resp.status_code == 404


# --- Period Boundaries ---


def test_period_monthly():
    from ccbenefits.utils import get_current_period
    start, end = get_current_period("monthly", date(2026, 3, 15))
    assert start == date(2026, 3, 1)
    assert end == date(2026, 3, 31)


def test_period_quarterly():
    from ccbenefits.utils import get_current_period
    start, end = get_current_period("quarterly", date(2026, 5, 10))
    assert start == date(2026, 4, 1)
    assert end == date(2026, 6, 30)


def test_period_semiannual():
    from ccbenefits.utils import get_current_period
    start, end = get_current_period("semiannual", date(2026, 8, 1))
    assert start == date(2026, 7, 1)
    assert end == date(2026, 12, 31)


def test_period_annual():
    from ccbenefits.utils import get_current_period
    start, end = get_current_period("annual", date(2026, 6, 15))
    assert start == date(2026, 1, 1)
    assert end == date(2026, 12, 31)


def test_period_february_leap_year():
    from ccbenefits.utils import get_current_period
    start, end = get_current_period("monthly", date(2028, 2, 15))
    assert start == date(2028, 2, 1)
    assert end == date(2028, 2, 29)


def test_annual_max_computation():
    from ccbenefits.utils import compute_annual_max
    assert compute_annual_max(15.0, "monthly") == 180.0
    assert compute_annual_max(100.0, "quarterly") == 400.0
    assert compute_annual_max(50.0, "semiannual") == 100.0
    assert compute_annual_max(200.0, "annual") == 200.0


# --- Period Segments ---


def test_period_segments_monthly(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    detail = client.get(f"/api/user-cards/{uc_id}", headers=auth_header).json()
    uber = next(b for b in detail["benefits_status"] if b["name"] == "Uber Cash")
    assert len(uber["periods"]) == 12
    labels = [p["label"] for p in uber["periods"]]
    assert labels == ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def test_period_segments_quarterly(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    detail = client.get(f"/api/user-cards/{uc_id}", headers=auth_header).json()
    resy = next(b for b in detail["benefits_status"] if b["name"] == "Resy Dining Credit")
    assert len(resy["periods"]) == 4
    labels = [p["label"] for p in resy["periods"]]
    assert labels == ["Q1", "Q2", "Q3", "Q4"]


def test_period_segments_semiannual(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    detail = client.get(f"/api/user-cards/{uc_id}", headers=auth_header).json()
    saks = next(b for b in detail["benefits_status"] if b["name"] == "Saks Fifth Avenue Credit")
    assert len(saks["periods"]) == 2
    labels = [p["label"] for p in saks["periods"]]
    assert labels == ["H1", "H2"]


def test_period_segments_annual(client, auth_header):
    resp = client.post("/api/user-cards/", json={"card_template_id": 1}, headers=auth_header)
    uc_id = resp.json()["id"]
    detail = client.get(f"/api/user-cards/{uc_id}", headers=auth_header).json()
    airline = next(b for b in detail["benefits_status"] if b["name"] == "Airline Fee Credit")
    assert len(airline["periods"]) == 1
    assert airline["periods"][0]["label"] == "2026"
