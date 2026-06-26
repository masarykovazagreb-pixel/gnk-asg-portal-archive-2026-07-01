#!/usr/bin/env python3
import runpy
from pathlib import Path
from reportlab import rl_config

rl_config.invariant = 1
runpy.run_path(str(Path(__file__).with_name('generate-media-invitation-pdf.py')), run_name='__main__')
