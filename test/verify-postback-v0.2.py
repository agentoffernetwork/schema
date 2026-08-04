#!/usr/bin/env python3
"""Reference verifier for the static AON → Agent webhook v0.2 contract.

This test intentionally implements no HTTP sender or receiver runtime. It
verifies the machine-readable protocol vectors with Python's standard library
only, so schema/test/validate-postback.sh is a complete static contract gate.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit


FIXTURE_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "postback-agent-webhook-v0.2.json"
EXAMPLE_PATH = (
    Path(__file__).resolve().parents[2]
    / "examples"
    / "http"
    / "postback"
    / "agent"
    / "basic-conversion.json"
)
BASIC_HTTP_PATH = EXAMPLE_PATH.with_name("basic-conversion.http")
RETRY_HTTP_PATH = EXAMPLE_PATH.with_name("retry-scenario.http")
SIGNATURE_DOC_PATH = EXAMPLE_PATH.with_name("signature-verification.md")
ASSERTION_COUNT = 0


def check(condition: bool, label: str) -> None:
    """Count every checked contract invariant and fail with a useful label."""
    global ASSERTION_COUNT
    ASSERTION_COUNT += 1
    if not condition:
        raise AssertionError(label)


def sign(secret: str, request_target: str, raw_body: str, timestamp: str) -> str:
    signing_input = f"POST\n{request_target}\n{raw_body}\n{timestamp}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).hexdigest()


def first_difference(actual: object, expected: object, path: str = "$") -> str | None:
    """Return the first deterministic JSON difference path for fixture errors."""
    if type(actual) is not type(expected):
        return path
    if isinstance(actual, dict) and isinstance(expected, dict):
        for key in sorted(actual.keys() | expected.keys()):
            child_path = f"{path}.{key}"
            if key not in actual or key not in expected:
                return child_path
            difference = first_difference(actual[key], expected[key], child_path)
            if difference is not None:
                return difference
        return None
    if isinstance(actual, list) and isinstance(expected, list):
        if len(actual) != len(expected):
            return f"{path}.length"
        for index, (actual_item, expected_item) in enumerate(zip(actual, expected)):
            difference = first_difference(actual_item, expected_item, f"{path}[{index}]")
            if difference is not None:
                return difference
        return None
    return None if actual == expected else path


def assert_raw_body_matches_example(raw_body: str, example: dict[str, object]) -> None:
    """Pin signing vectors to the public example instead of a parallel payload."""
    parsed = json.loads(raw_body)
    difference = first_difference(parsed, example)
    if difference is not None:
        raise AssertionError(
            f"signed raw body must equal basic-conversion.json; first difference at {difference}"
        )
    canonical = json.dumps(example, separators=(",", ":"), ensure_ascii=False)
    if raw_body != canonical:
        raise AssertionError("signed raw body must use deterministic compact example serialization")


def origin_form_request_target(callback_url: str) -> str:
    """Reject disallowed URL pieces while preserving path/query bytes exactly."""
    parts = urlsplit(callback_url)
    if parts.scheme != "https":
        raise ValueError("callback URL must use https")
    if not parts.netloc:
        raise ValueError("callback URL must include host")
    if parts.username is not None or parts.password is not None:
        raise ValueError("userinfo is not allowed")
    if parts.fragment:
        raise ValueError("fragment is not allowed")

    without_fragment = callback_url.split("#", 1)[0]
    path = parts.path or "/"
    # urlsplit preserves query bytes, including percent-escape case. Preserve an
    # explicit '?' even when the query is empty, because it is a request-target byte.
    return f"{path}?{parts.query}" if "?" in without_fragment else path


def verify_signature(
    keys: dict[str, str],
    now_epoch: int,
    request_target: str,
    raw_body: str,
    key_id: str,
    timestamp: str,
    provided_signature: str,
) -> str:
    """Static reference for the key/timestamp/HMAC verification ordering."""
    try:
        signed_at = int(timestamp)
    except ValueError:
        return "invalid_timestamp"

    if abs(now_epoch - signed_at) > 300:
        return "timestamp_outside_allowed_skew"

    secret = keys.get(key_id)
    if secret is None:
        return "unknown_key"

    expected = sign(secret, request_target, raw_body, timestamp)
    if not hmac.compare_digest(expected, provided_signature):
        return "invalid_signature"
    return "accepted"


class IdempotencyContract:
    """In-memory model of the v0.2 receiver outcome; not runtime storage."""

    def __init__(self) -> None:
        self._body_by_key: dict[tuple[str, str], str] = {}

    def receive(self, agent_id: str, event_id: str, raw_body: str) -> int:
        key = (agent_id, event_id)
        existing = self._body_by_key.get(key)
        if existing is None:
            self._body_by_key[key] = raw_body
            return 200
        if hmac.compare_digest(existing, raw_body):
            return 204
        return 409


def main() -> int:
    fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    example = json.loads(EXAMPLE_PATH.read_text(encoding="utf-8"))
    basic_http = BASIC_HTTP_PATH.read_text(encoding="utf-8")
    retry_http = RETRY_HTTP_PATH.read_text(encoding="utf-8")
    signature_doc = SIGNATURE_DOC_PATH.read_text(encoding="utf-8")
    request = fixture["request"]
    keys = request["keys"]
    now_epoch = request["now_epoch"]
    raw_body = request["raw_body"]

    check(fixture["version"] == "postback-agent-webhook-v0.2", "fixture version")
    check(request["method"] == "POST", "only POST is signed")
    check(fixture["idempotency"]["minimum_retention_hours"] >= 24, "durable retention is at least 24 hours")
    assert_raw_body_matches_example(raw_body, example)
    check(True, "signed raw body equals the public example")

    drifted_example = dict(example)
    drifted_example["event_name"] = "drift_canary"
    drift_detected = False
    try:
        assert_raw_body_matches_example(raw_body, drifted_example)
    except AssertionError:
        drift_detected = True
    check(drift_detected, "example/signing-vector drift canary is rejected")

    resolved_targets: dict[str, str] = {}
    for case in fixture["url_cases"]:
        name = case["name"]
        try:
            target = origin_form_request_target(case["url"])
        except ValueError as error:
            check("expected_error" in case, f"{name}: unexpectedly rejected")
            check(str(error) == case["expected_error"], f"{name}: error result")
            continue
        check("expected_request_target" in case, f"{name}: unexpectedly accepted")
        check(target == case["expected_request_target"], f"{name}: byte-preserved request-target")
        resolved_targets[name] = target

    primary_target = resolved_targets["path-query-preserves-percent-case-and-order"]
    slash_target = resolved_targets["tail-repeat-slash-and-percent-bytes-are-preserved"]
    check(
        sign(keys[request["current_key_id"]], primary_target, raw_body, request["timestamp"])
        != sign(keys[request["current_key_id"]], slash_target, raw_body, request["timestamp"]),
        "raw path/query bytes alter the signing input",
    )

    current_signature = fixture["fixed_signatures"]["current"]
    previous_signature = fixture["fixed_signatures"]["previous"]
    check(
        sign(keys[request["current_key_id"]], primary_target, raw_body, request["timestamp"])
        == current_signature,
        "fixed current-key HMAC vector",
    )
    check(
        verify_signature(
            keys, now_epoch, primary_target, raw_body, request["current_key_id"], request["timestamp"], current_signature
        )
        == "accepted",
        "current key verifies",
    )
    check(
        sign(keys[request["previous_key_id"]], primary_target, raw_body, request["timestamp"])
        == previous_signature,
        "fixed previous-key HMAC vector",
    )
    check(
        verify_signature(
            keys, now_epoch, primary_target, raw_body, request["previous_key_id"], request["timestamp"], previous_signature
        )
        == "accepted",
        "previous key verifies",
    )
    check(
        verify_signature(
            keys,
            now_epoch,
            primary_target,
            raw_body,
            request["unknown_key_id"],
            request["timestamp"],
            current_signature,
        )
        == "unknown_key",
        "unknown key is rejected without another-secret lookup",
    )

    tampered_body = raw_body + " "
    check(
        verify_signature(
            keys, now_epoch, primary_target, tampered_body, request["current_key_id"], request["timestamp"], current_signature
        )
        == "invalid_signature",
        "tampered raw body is rejected",
    )
    canary = fixture["fixed_signatures"]["bad_signature_canary"]
    check(canary != current_signature, "bad-signature canary differs from known-good vector")
    check(
        verify_signature(
            keys, now_epoch, primary_target, raw_body, request["current_key_id"], request["timestamp"], canary
        )
        == "invalid_signature",
        "bad-signature canary is rejected",
    )

    expired_timestamp = "1776100000"
    expired_signature = fixture["fixed_signatures"]["expired"]
    check(
        sign(keys[request["current_key_id"]], primary_target, raw_body, expired_timestamp)
        == expired_signature,
        "fixed expired-timestamp HMAC vector",
    )
    check(
        verify_signature(
            keys,
            now_epoch,
            primary_target,
            raw_body,
            request["current_key_id"],
            expired_timestamp,
            expired_signature,
        )
        == "timestamp_outside_allowed_skew",
        "expired fixed vector is rejected before business processing",
    )

    for case in fixture["timestamp_cases"]:
        timestamp = case["timestamp"]
        signature = sign(keys[request["current_key_id"]], primary_target, raw_body, timestamp)
        check(
            verify_signature(
                keys, now_epoch, primary_target, raw_body, request["current_key_id"], timestamp, signature
            )
            == case["expected"],
            f"timestamp boundary: {case['name']}",
        )

    retry_vectors = fixture["retry_vectors"]
    check([item["attempt"] for item in retry_vectors] == [1, 2, 3, 4, 5], "five fixed retry attempts")
    check(
        len({item["timestamp"] for item in retry_vectors}) == len(retry_vectors),
        "each retry has a fresh timestamp",
    )
    retry_labels = {
        1: "1",
        2: "2 (+1 min)",
        3: "3 (+5 min)",
        4: "4 (+30 min)",
        5: "5 (+2 h)",
    }
    for vector in retry_vectors:
        check(
            sign(keys[request["current_key_id"]], primary_target, raw_body, vector["timestamp"])
            == vector["signature"],
            f"retry vector {vector['attempt']} signature",
        )
        check(
            verify_signature(
                keys,
                int(vector["timestamp"]),
                primary_target,
                raw_body,
                request["current_key_id"],
                vector["timestamp"],
                vector["signature"],
            )
            == "accepted",
            f"retry vector {vector['attempt']} verifies at its delivery time",
        )
        expected_row = (
            f"| {retry_labels[vector['attempt']]} | {vector['timestamp']} "
            f"| {vector['signature']} |"
        )
        check(
            expected_row in retry_http,
            f"retry vector {vector['attempt']} is bound to retry-scenario.http",
        )

    check(f"POST {primary_target} HTTP/1.1" in basic_http, "basic HTTP request-target is pinned")
    check(f"X-AON-Key: {request['current_key_id']}" in basic_http, "basic HTTP key id is pinned")
    check(f"X-AON-Timestamp: {request['timestamp']}" in basic_http, "basic HTTP timestamp is pinned")
    check(f"X-AON-Signature: {current_signature}" in basic_http, "basic HTTP signature is pinned")
    check(raw_body in basic_http, "basic HTTP raw body is pinned")
    for label, signature in (
        ("current", current_signature),
        ("previous", previous_signature),
        ("expired", expired_signature),
    ):
        check(signature in signature_doc, f"{label} signature is pinned in verification documentation")

    idempotency = fixture["idempotency"]
    contract = IdempotencyContract()
    first_status = contract.receive(idempotency["agent_id"], idempotency["event_id"], raw_body)
    same_body_status = contract.receive(idempotency["agent_id"], idempotency["event_id"], raw_body)
    conflicting_status = contract.receive(
        idempotency["agent_id"], idempotency["event_id"], tampered_body
    )
    check(first_status == idempotency["same_body_statuses"][0], "first delivery is successful")
    check(same_body_status == idempotency["same_body_statuses"][1], "same body is idempotent 2xx")
    check(200 <= same_body_status < 300, "same body response is 2xx")
    check(conflicting_status == idempotency["different_body_status"], "different body is HTTP 409")

    print(f"postback v0.2 reference verifier OK ({ASSERTION_COUNT} assertions)")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (AssertionError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        print(f"postback v0.2 reference verifier FAILED: {error}", file=sys.stderr)
        sys.exit(1)
