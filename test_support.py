import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import server


class SupportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        data_dir = Path(self.temp.name)
        for name in ("orders.json", "shipments.json"):
            (data_dir / name).write_bytes((server.DATA_DIR / name).read_bytes())
        (data_dir / "tickets.json").write_text("[]", encoding="utf-8")
        patcher = patch.object(server, "DATA_DIR", data_dir)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_delayed_order_persists_ticket_without_duplicates(self):
        self.assertTrue(server.get_order("1042")["is_delayed"])
        self.assertTrue(server.get_shipment("1042")["found"])
        first = server.create_support_ticket("1042", "Teslimat gecikti.")
        self.assertTrue(first["created"])
        again = server.create_support_ticket("1042", "Tekrar kontrol.")
        self.assertEqual(again["reason"], "already_exists")
        self.assertEqual(first["ticket"]["ticket_id"], again["ticket"]["ticket_id"])
        self.assertEqual(len(server.read_data("tickets.json")), 1)

    def test_on_time_order_cannot_create_ticket(self):
        self.assertFalse(server.get_order("1043")["is_delayed"])
        self.assertEqual(server.create_support_ticket("1043", "Kontrol")["reason"], "not_delayed")
        self.assertEqual(server.read_data("tickets.json"), [])

    def test_unknown_order(self):
        self.assertFalse(server.get_order("9999")["found"])
        self.assertFalse(server.get_shipment("9999")["found"])
        self.assertEqual(server.create_support_ticket("9999", "Kontrol")["reason"], "order_not_found")

    def test_empty_summary(self):
        with self.assertRaises(ValueError):
            server.create_support_ticket("1042", "  ")


if __name__ == "__main__":
    unittest.main()
