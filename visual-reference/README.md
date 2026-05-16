# TISATO Visual Reference Package

This folder is a reconstructed visual reference package for the TISATO website rebuild.

It gives a designer or developer clear visual direction for the public website, booking flow, admin portal, and customer email automation without requiring access to the previous live deployment.

## Open First

```txt
visual-reference/index.html
```

## Included Screens

- `index.html`
  Visual reference hub and design system overview.

- `homepage-reference.html`
  Public website direction with hero, services, trust strip, booking CTA, and care-focused messaging.

- `booking-flow-reference.html`
  Multi-step booking flow reference with passenger, trip, mobility, and confirmation states.

- `admin-portal-reference.html`
  Dispatch/admin operations dashboard reference with queue metrics, booking table, trip detail panel, and status controls.

- `email-reference.html`
  Email automation reference for dispatch notification, passenger confirmation, and passenger status update messages.

## Implementation Notes

These files are static visual references. They are intentionally separate from `production-starter/`, which contains runnable booking/admin/email code.

Recommended development path:

1. Use `visual-reference/` for design direction and screen layout.
2. Use `production-starter/` for runnable booking/admin/email behavior.
3. Use `backend-blueprints/` for production database, API, security, and email requirements.
