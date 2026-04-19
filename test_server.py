from datetime import datetime, timezone
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from server import merge_planning_status, preserve_event_first_seen, update_planning_state
from unittest.mock import patch


class EventCatalogMetadataTests(unittest.TestCase):
    def test_preserve_event_first_seen_sets_date_added_for_new_events(self) -> None:
        observed_at = datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc)
        planning_state: dict[str, dict[str, str]] = {}
        events = [{"id": "ticketmaster:1", "starts_at": "2026-05-01T20:00:00+00:00"}]

        changed = preserve_event_first_seen(events, planning_state, observed_at=observed_at)

        self.assertTrue(changed)
        self.assertEqual(events[0]["date_added"], observed_at.isoformat())
        self.assertEqual(planning_state["ticketmaster:1"]["first_seen_at"], observed_at.isoformat())

    def test_preserve_event_first_seen_keeps_existing_first_seen(self) -> None:
        observed_at = datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc)
        first_seen_at = "2026-04-12T09:30:00+00:00"
        planning_state = {"ticketmaster:1": {"first_seen_at": first_seen_at}}
        events = [{"id": "ticketmaster:1", "starts_at": "2026-05-01T20:00:00+00:00"}]

        changed = preserve_event_first_seen(events, planning_state, observed_at=observed_at)

        self.assertFalse(changed)
        self.assertEqual(events[0]["date_added"], first_seen_at)

    def test_merge_planning_status_attaches_status_and_date_added(self) -> None:
        events = [{"id": "ticketmaster:1", "starts_at": "2026-05-01T20:00:00+00:00"}]
        planning_state = {"ticketmaster:1": {"status": "Considering", "first_seen_at": "2026-04-12T09:30:00+00:00"}}

        merge_planning_status(events, planning_state)

        self.assertEqual(events[0]["status"], "Considering")
        self.assertEqual(events[0]["date_added"], "2026-04-12T09:30:00+00:00")

    def test_preserve_event_first_seen_persists_original_value_across_refreshes(self) -> None:
        first_seen_at = "2026-04-12T09:30:00+00:00"
        planning_state = {"ticketmaster:1": {"first_seen_at": first_seen_at}}
        events = [{"id": "ticketmaster:1", "starts_at": "2026-05-01T20:00:00+00:00"}]

        changed = preserve_event_first_seen(
            events,
            planning_state,
            observed_at=datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc),
        )

        self.assertFalse(changed)
        self.assertEqual(events[0]["date_added"], first_seen_at)
        self.assertEqual(planning_state["ticketmaster:1"]["first_seen_at"], first_seen_at)

    def test_update_planning_state_clears_hidden_status_without_losing_first_seen(self) -> None:
        stored_state = {
            "ticketmaster:hidden": {"status": "Not Interested", "first_seen_at": "2026-04-01T10:00:00+00:00"},
            "ticketmaster:booked": {"status": "Booked", "first_seen_at": "2026-04-02T10:00:00+00:00"},
        }

        with patch("server.read_planning_state", return_value=stored_state), patch("server.write_planning_state") as write_mock, patch(
            "server.reset_cache"
        ):
            payload, status = update_planning_state({"action": "reset_not_interested"})

        self.assertEqual(status, 200)
        self.assertEqual(payload["action"], "reset_not_interested")
        written_state = write_mock.call_args.args[0]
        self.assertEqual(written_state["ticketmaster:hidden"], {"first_seen_at": "2026-04-01T10:00:00+00:00"})
        self.assertEqual(
            written_state["ticketmaster:booked"],
            {"status": "Booked", "first_seen_at": "2026-04-02T10:00:00+00:00"},
        )

    def test_update_planning_state_clears_status_without_losing_first_seen(self) -> None:
        stored_state = {
            "ticketmaster:1": {"status": "Considering", "first_seen_at": "2026-04-12T09:30:00+00:00"},
        }

        with patch("server.read_planning_state", return_value=stored_state), patch("server.write_planning_state") as write_mock, patch(
            "server.reset_cache"
        ):
            _, status = update_planning_state({"event_id": "ticketmaster:1", "status": None})

        self.assertEqual(status, 200)
        written_state = write_mock.call_args.args[0]
        self.assertEqual(written_state["ticketmaster:1"], {"first_seen_at": "2026-04-12T09:30:00+00:00"})


if __name__ == "__main__":
    unittest.main()
