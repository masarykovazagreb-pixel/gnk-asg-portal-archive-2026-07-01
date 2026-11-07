#!/usr/bin/env python3
"""Execute the workflow's real dispatch function with a fake API; never sends requests."""
import json
import pathlib
import textwrap
import unittest
import urllib.parse

WORKFLOW = pathlib.Path(__file__).resolve().parents[2] / '.github/workflows/ops-automation-sla-watchdog.yml'
source = WORKFLOW.read_text(encoding='utf8')
fragment = source[source.index('          _dispatched = {}'):source.index('\n          def ensure_age')]

class DispatchTests(unittest.TestCase):
    def setup_dispatch(self, api_call):
        env = {'json': json, 'urllib': __import__('urllib'), 'api': 'https://api.example',
               'request_json': api_call, 'failures': [], 'recoveries': [], 'observations': []}
        exec(textwrap.dedent(fragment), env)
        return env

    def test_success_is_deduplicated_and_records_payload(self):
        calls = []
        def api(*args, **kw):
            calls.append((args, kw))
            return {'workflow_runs': []} if kw.get('method') != 'POST' else None
        env = self.setup_dispatch(api)
        self.assertTrue(env['dispatch']('region-daily.yml', {'channel': 'zagreb'}))
        self.assertFalse(env['dispatch']('region-daily.yml', {'channel': 'zagreb'}))
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1][1]['payload'], {'ref': 'main', 'inputs': {'channel': 'zagreb'}})
        self.assertEqual(env['recoveries'], ['region-daily.yml'])
        self.assertEqual(env['failures'], [])

    def test_failed_dispatch_is_reported_once_and_never_claimed_success(self):
        calls = []
        def deny(*args, **kwargs):
            calls.append(1)
            if kwargs.get('method') != 'POST':
                return {'workflow_runs': []}
            raise PermissionError('sensitive details must not be logged')
        env = self.setup_dispatch(deny)
        self.assertFalse(env['dispatch']('gnk-news-refresh-v2.yml'))
        self.assertFalse(env['dispatch']('gnk-news-refresh-v2.yml'))
        self.assertEqual(len(calls), 2)
        self.assertEqual(env['recoveries'], [])
        self.assertEqual(env['failures'], ['gnk-news-refresh-v2.yml: recovery dispatch failed (PermissionError)'])

    def test_active_run_prevents_duplicate_writer_dispatch(self):
        calls = []
        def active(*args, **kw):
            calls.append((args, kw))
            return {'workflow_runs': [{'status': 'in_progress'}]}
        env = self.setup_dispatch(active)
        self.assertFalse(env['dispatch']('gnk-news-refresh-v2.yml'))
        self.assertFalse(env['dispatch']('gnk-news-refresh-v2.yml'))
        self.assertEqual(len(calls), 1)
        self.assertEqual(env['recoveries'], [])
        self.assertEqual(env['failures'], [])

    def test_unknown_api_response_fails_closed(self):
        calls = []
        def unavailable(*args, **kw):
            calls.append(1)
            return None
        env = self.setup_dispatch(unavailable)
        self.assertFalse(env['dispatch']('region-daily.yml'))
        self.assertFalse(env['dispatch']('region-daily.yml'))
        self.assertEqual(len(calls), 1)
        self.assertEqual(env['recoveries'], [])
        self.assertEqual(env['failures'], ['region-daily.yml: recovery preflight failed (ValueError)'])

if __name__ == '__main__':
    unittest.main()
