# Standard Library
import os
import sys
from unittest.mock import MagicMock

# Mock psycopg2 before any imports so database.py can be imported without a real DB
sys.modules["psycopg2"] = MagicMock()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "yolox-consumer"))
