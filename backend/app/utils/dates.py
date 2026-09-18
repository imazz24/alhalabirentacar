from datetime import datetime


def calculate_rental_days(pickup_datetime: datetime, return_datetime: datetime) -> int:
    """Calculate the number of rental days between two datetimes.

    The minimum is 1 day. A partial day counts as a full day.
    """
    delta = return_datetime - pickup_datetime
    total_hours = delta.total_seconds() / 3600.0
    days = int(total_hours / 24)
    days = max(days, 1)
    return days