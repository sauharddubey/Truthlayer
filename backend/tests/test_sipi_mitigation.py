import os
import unittest

class TestSipiMitigation(unittest.TestCase):
    def test_sipi_mitigation_in_compliance(self):
        path = "app/agents/compliance.py"
        self.assertTrue(os.path.exists(path), f"{path} not found")
        with open(path, "r") as f:
            content = f.read()
        self.assertIn("<transcript>", content)
        self.assertIn("</transcript>", content)
        self.assertIn("<policies>", content)
        self.assertIn("</policies>", content)
        self.assertIn("SECURITY INSTRUCTION", content)

    def test_sipi_mitigation_in_fact_check(self):
        path = "app/agents/fact_check.py"
        self.assertTrue(os.path.exists(path), f"{path} not found")
        with open(path, "r") as f:
            content = f.read()
        self.assertIn("<transcript>", content)
        self.assertIn("</transcript>", content)
        self.assertIn("<claims>", content)
        self.assertIn("</claims>", content)
        self.assertIn("SECURITY INSTRUCTION", content)

    def test_sipi_mitigation_in_perception(self):
        path = "app/agents/perception.py"
        self.assertTrue(os.path.exists(path), f"{path} not found")
        with open(path, "r") as f:
            content = f.read()
        self.assertIn("<transcript>", content)
        self.assertIn("</transcript>", content)
        self.assertIn("SECURITY INSTRUCTION", content)

    def test_sipi_mitigation_in_structuring(self):
        path = "app/services/structuring.py"
        self.assertTrue(os.path.exists(path), f"{path} not found")
        with open(path, "r") as f:
            content = f.read()
        self.assertIn("<transcript>", content)
        self.assertIn("</transcript>", content)
        self.assertIn("SECURITY INSTRUCTION", content)

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
