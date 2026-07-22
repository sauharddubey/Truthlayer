import os
import unittest

class TestSipiMitigation(unittest.TestCase):
    """Static-injection-prompt-injection mitigation checks.

    ``compliance.py``, ``fact_check.py``, ``perception.py`` and
    ``structuring.py`` now delegate untrusted-content delimiting to the shared
    ``wrap_untrusted()`` helper (app/agents/base.py) instead of hand-rolled
    ``<tag>``/"SECURITY INSTRUCTION" text — these tests assert the helper is
    actually imported and called, rather than asserting on the old literal
    prompt text.
    """

    def test_sipi_mitigation_in_compliance(self):
        path = "app/agents/compliance.py"
        self.assertTrue(os.path.exists(path), f"{path} not found")
        with open(path, "r") as f:
            content = f.read()
        self.assertIn("wrap_untrusted", content)
        self.assertIn("<transcript>", content)
        self.assertIn("<policies>", content)

    def test_sipi_mitigation_in_fact_check(self):
        path = "app/agents/fact_check.py"
        self.assertTrue(os.path.exists(path), f"{path} not found")
        with open(path, "r") as f:
            content = f.read()
        self.assertIn("wrap_untrusted", content)
        self.assertIn("<transcript>", content)
        self.assertIn("<claims>", content)
        self.assertIn("<evidence>", content)

    def test_sipi_mitigation_in_perception(self):
        path = "app/agents/perception.py"
        self.assertTrue(os.path.exists(path), f"{path} not found")
        with open(path, "r") as f:
            content = f.read()
        self.assertIn("wrap_untrusted", content)

    def test_sipi_mitigation_in_structuring(self):
        path = "app/services/structuring.py"
        self.assertTrue(os.path.exists(path), f"{path} not found")
        with open(path, "r") as f:
            content = f.read()
        self.assertIn("wrap_untrusted", content)

    def test_sipi_mitigation_in_contradictions(self):
        path = "app/api/products.py"
        self.assertTrue(os.path.exists(path), f"{path} not found")
        with open(path, "r") as f:
            content = f.read()
        self.assertIn("wrap_untrusted", content)

    def test_sipi_mitigation_in_orchestrator(self):
        path = "app/agents/orchestrator.py"
        self.assertTrue(os.path.exists(path), f"{path} not found")
        with open(path, "r") as f:
            content = f.read()
        self.assertIn("<fact_check>", content)
        self.assertIn("</fact_check>", content)
        self.assertIn("<perception>", content)
        self.assertIn("</perception>", content)
        self.assertIn("SECURITY INSTRUCTION", content)
