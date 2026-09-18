from datetime import datetime

from ..models import Car
from ..utils.dates import calculate_rental_days


def estimate_price(car: Car, pickup_datetime: datetime, return_datetime: datetime) -> tuple[int, float]:
    days = calculate_rental_days(pickup_datetime, return_datetime)
    days = max(days, 1)

    base = effective_daily_price(car)
    price = base * days
    if days >= 7 and car.weekly_price:
        price = min(price, float(car.weekly_price) * (days / 7))
    if days >= 30 and car.monthly_price:
        price = min(price, float(car.monthly_price) * (days / 30))

    return days, round(price, 2)


def effective_daily_price(car: Car) -> float:
    """The rate a customer actually pays per day.

    Returns the promotional price when one is set and it really is a discount
    (below the list price); otherwise the list price.
    """
    discount = car.discount_daily_price
    if discount is not None and float(discount) > 0 and float(discount) < float(car.daily_price):
        return float(discount)
    return float(car.daily_price)