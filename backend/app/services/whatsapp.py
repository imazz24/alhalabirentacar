from datetime import datetime

from ..config import settings
from ..models import Booking


def format_datetime(dt: datetime) -> str:
    return dt.strftime("%d %B %Y, %I:%M %p")


def maps_link(latitude, longitude) -> str:
    return f"https://www.google.com/maps?q={latitude:.6f},{longitude:.6f}"


def _place(location) -> list[str]:
    """Location line, plus a map link when we know where it is."""
    lines = [f"📍 {location.name}"]
    if location.latitude is not None and location.longitude is not None:
        lines.append(maps_link(location.latitude, location.longitude))
    return lines


def build_whatsapp_message(booking: Booking) -> str:
    lines = [
        "Hello 👋",
        "",
        "I have submitted a car rental request.",
        "",
        "━━━━━━━━━━━━━━━━",
        "🔖 BOOKING REFERENCE",
        booking.booking_reference,
        "━━━━━━━━━━━━━━━━",
        "🚗 CAR",
        booking.car.name,
        "━━━━━━━━━━━━━━━━",
        "📅 PICKUP",
        format_datetime(booking.pickup_datetime),
        *_place(booking.pickup_location),
        "━━━━━━━━━━━━━━━━",
        "📅 RETURN",
        format_datetime(booking.return_datetime),
        *_place(booking.return_location),
        "━━━━━━━━━━━━━━━━",
        "⏱ DURATION",
        f"{booking.rental_days} Days",
        "━━━━━━━━━━━━━━━━",
        "💰 ESTIMATED PRICE",
        f"${booking.estimated_price:.2f}",
        "━━━━━━━━━━━━━━━━",
        "👤 CUSTOMER",
        booking.customer.full_name,
        f"📱 {booking.customer.phone_number}",
    ]
    if booking.customer.email:
        lines += ["📧 " + booking.customer.email]
    if booking.customer_notes:
        lines += ["", "💬 NOTES", booking.customer_notes]
    lines += [
        "━━━━━━━━━━━━━━━━",
        "",
        "Please confirm availability and final price.",
        "Thank you!",
    ]
    return "\n".join(lines)


def build_whatsapp_url(booking: Booking, whatsapp_number: str = settings.COMPANY_WHATSAPP_NUMBER) -> str:
    message = build_whatsapp_message(booking)
    number = whatsapp_number.lstrip("+").replace(" ", "")
    return f"https://wa.me/{number}?text={urlencode(message)}"


def urlencode(text: str) -> str:
    from urllib.parse import quote

    return quote(text)