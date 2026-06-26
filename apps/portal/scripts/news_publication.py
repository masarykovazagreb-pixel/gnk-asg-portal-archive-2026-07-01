#!/usr/bin/env python3
"""Compatibility entrypoint for GNK ASG news publication.

Existing workflows may still call this filename. The active implementation now lives in
news_v13_lifecycle.py so the 09:00 / 16:00 / 21:00 cycle uses one code path.
"""
from news_v13_lifecycle import main

if __name__ == '__main__':
    main()
