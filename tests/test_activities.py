import copy
from urllib.parse import quote
from fastapi.testclient import TestClient
import src.app as appmod


def test_get_activities_structure():
    client = TestClient(appmod.app)
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # basic sanity check for one known activity
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    # Backup the in-memory activities and restore at the end
    original = copy.deepcopy(appmod.activities)
    client = TestClient(appmod.app)
    email = "testuser+pytest@example.com"

    try:
        # Ensure email is not present already
        if email in appmod.activities["Chess Club"]["participants"]:
            appmod.activities["Chess Club"]["participants"].remove(email)

        # Signup (URL-encode email so '+' is preserved)
        signup_resp = client.post(f"/activities/Chess%20Club/signup?email={quote(email, safe='')}")
        assert signup_resp.status_code == 200, signup_resp.text

        # Verify participant appears
        after = client.get("/activities").json()
        assert email in after["Chess Club"]["participants"]

        # Now unregister
        del_resp = client.delete(f"/activities/Chess%20Club/participants?email={quote(email, safe='')}")
        assert del_resp.status_code == 200, del_resp.text

        # Verify participant removed
        after_del = client.get("/activities").json()
        assert email not in after_del["Chess Club"]["participants"]

    finally:
        # Restore original state to avoid leaking changes between tests/runs
        appmod.activities = copy.deepcopy(original)
