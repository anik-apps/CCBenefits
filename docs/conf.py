import os
import sys

sys.path.insert(0, os.path.abspath("../backend"))

project = "CCBenefits"
copyright = "2026, Anik"
author = "Anik"
release = "0.1.0"

extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
    "sphinx.ext.viewcode",
    "sphinx.ext.intersphinx",
    "sphinx_autodoc_typehints",
]

templates_path = ["_templates"]
exclude_patterns = ["_build"]

html_theme = "sphinx_rtd_theme"
html_static_path = []

autodoc_member_order = "bysource"
autodoc_typehints = "description"

intersphinx_mapping = {
    "python": ("https://docs.python.org/3", None),
    "sqlalchemy": ("https://docs.sqlalchemy.org/en/20/", None),
}

napoleon_google_docstrings = True
napoleon_numpy_docstrings = False

suppress_warnings = ["ref.paramref"]
