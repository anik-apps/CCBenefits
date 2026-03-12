from datetime import datetime, timezone as dt_timezone

from ccbenefits.models import Notification


def _make_notification(db, user_id, title="Test", body="Body", is_read=False, notification_type="expiring_credits"):
    notif = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        is_read=is_read,
        created_at=datetime.now(dt_timezone.utc),
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def test_inbox_empty(client, auth_header):
    resp = client.get("/api/notifications/inbox", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["unread_count"] == 0


def test_create_and_list_notifications(client, auth_header, test_user, db_session):
    _make_notification(db_session, test_user.id, title="First")
    _make_notification(db_session, test_user.id, title="Second")

    resp = client.get("/api/notifications/inbox", headers=auth_header)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    # Most recent first
    assert data["items"][0]["title"] == "Second"
    assert data["items"][1]["title"] == "First"


def test_mark_read(client, auth_header, test_user, db_session):
    notif = _make_notification(db_session, test_user.id, title="Unread")
    assert notif.is_read is False

    resp = client.patch(f"/api/notifications/inbox/{notif.id}", headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

    # Verify it's read
    db_session.refresh(notif)
    assert notif.is_read is True


def test_mark_all_read(client, auth_header, test_user, db_session):
    _make_notification(db_session, test_user.id, title="A", is_read=False)
    _make_notification(db_session, test_user.id, title="B", is_read=False)
    _make_notification(db_session, test_user.id, title="C", is_read=True)

    resp = client.post("/api/notifications/inbox/mark-all-read", headers=auth_header)
    assert resp.status_code == 200

    # All should be read now
    unread = db_session.query(Notification).filter_by(user_id=test_user.id, is_read=False).count()
    assert unread == 0


def test_unread_count(client, auth_header, test_user, db_session):
    _make_notification(db_session, test_user.id, is_read=False)
    _make_notification(db_session, test_user.id, is_read=False)
    _make_notification(db_session, test_user.id, is_read=True)

    resp = client.get("/api/notifications/inbox/unread-count", headers=auth_header)
    assert resp.status_code == 200
    assert resp.json()["unread_count"] == 2


def test_inbox_pagination(client, auth_header, test_user, db_session):
    for i in range(5):
        _make_notification(db_session, test_user.id, title=f"Notif {i}")

    # First page
    resp = client.get("/api/notifications/inbox?limit=2&offset=0", headers=auth_header)
    data = resp.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5

    # Second page
    resp = client.get("/api/notifications/inbox?limit=2&offset=2", headers=auth_header)
    data = resp.json()
    assert len(data["items"]) == 2

    # Third page (only 1 left)
    resp = client.get("/api/notifications/inbox?limit=2&offset=4", headers=auth_header)
    data = resp.json()
    assert len(data["items"]) == 1
