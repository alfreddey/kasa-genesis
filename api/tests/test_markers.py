"""Test types: unmarked tests are unit tests; integration and model tests are opt-in."""

import pytest


def test_unmarked_tests_are_unit_tests(request):
    assert request.node.get_closest_marker("unit") is not None


@pytest.mark.integration
def test_integration_tests_are_skipped_by_default():
    # Runs only with KASA_TEST_INTEGRATION=1, so reaching here means the opt-in worked.
    import os

    assert os.environ["KASA_TEST_INTEGRATION"] == "1"


@pytest.mark.model
def test_model_tests_are_skipped_by_default():
    import os

    assert os.environ["KASA_TEST_MODEL"] == "1"
