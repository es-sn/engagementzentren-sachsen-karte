# Engagementzentren Sachsen Karte

## Live Page
[Click here to see the live page.](https://es-sn.github.io/selbsthilfe-sachsen-karte/).

## Contributing

You can contribute to this project by adding or updating information in the `contact-points.json` file. This file contains all the data for the contact points displayed on the map.

### File Structure

The `contact-points.json` file is a JSON object where each key is a region code (e.g., `L` for Leipzig, `DD` for Dresden). Each region has a `fullName` and a list of `contactPoints`.

```json
{
  "REGION_CODE": {
    "fullName": "Full Name of the Region",
    "contactPoints": [
      { ... contact point object ... },
      { ... contact point object ... }
    ]
  }
}
```

### Contact Point Object

Each contact point is a JSON object with the following properties.

**Required Properties:**

*   `id` (string): A unique identifier for the contact point. The convention is `REGION_CODE-XXX` (e.g., `L-002`).
*   `name` (string): The name of the contact point or organization.

**Optional Properties:**

*   `carrier` (string): The responsible body or carrier of the organization.
*   `address` (object): The physical address.
    *   `street` (string)
    *   `postalCode` (string)
    *   `city` (string)
*   `contact` (object): Contact information.
    *   `phone` (array of strings): List of phone numbers.
    *   `email` (string)
    *   `web` (string)
*   `openingHours` (object): Opening hours information.
    *   `text` (string): A free-text description of the opening hours.
    *   `comment` (string): An optional comment, e.g., for appointment details.
    *   `openingHoursLastUpdated` (string): The date when the opening hours were last updated (format: YYYY-MM-DD).
    *   `structured` (object): A structured representation of the opening hours. It can contain keys for each day of the week (`mon`, `tue`, etc.). Only the days with defined hours need to be included. The values are arrays of strings, which can be time ranges (e.g., "09:00-12:00") or "appointment".
*   `download` (object): Optional downloadable resource (for example, an info-PDF).
    *   `text` (string): The human-facing link text to display (e.g. "Info-PDF herunterladen").
    *   `url` (string): The URL to the downloadable resource (absolute URL recommended). If the URL does not include a scheme, the application will assume `https://`.
  
* `social` (object): Social media links.
    *   `facebook` (string)
    *   `instagram` (string)
    *   `linkedin` (string)

### Example

Here is an example of a single contact point object with all possible fields:

```json
{
  "id": "REGION-001",
  "name": "Selbsthilfekontakt Name",
  "carrier": "Trägerverein e.V.",
  "address": {
    "street": "Musterstraße 1",
    "postalCode": "12345",
    "city": "Musterstadt"
  },
  "contact": {
    "phone": ["+49 123 456789", "+49 987 654321"],
    "email": "info@example.com",
    "web": "https://www.example.com"
  },
  "openingHours": {
    "text": "Mo & Di 09-12, Di 13-17, Mi nach Vereinbarung",
    "comment": "Persönliche Beratung nur nach Termin.",
    "openingHoursLastUpdated": "2025-10-09",
    "structured": {
      "mon": [
        "09:00-12:00"
      ],
      "tue": [
        "09:00-12:00",
        "13:00-17:00"
      ],
      "wed": [
        "appointment"
      ]
    }
  },
  "download": {
    "text": "Info-PDF herunterladen",
    "url": "https://example.org/documents/info.pdf"
  },
  "social": {
    "facebook": "https://www.facebook.com/example",
    "instagram": "https://www.instagram.com/example",
    "linkedin": "https://www.linkedin.com/company/example"
  }
}
```

After adding or updating data, please create a pull request. The data will be automatically validated to ensure it follows the correct format.

## Data Validation

This project uses a GitHub Action to validate the `contact-points.json` file against the `schema.json`. This ensures that all data entries have the correct format.

The badge above shows the status of the validation on the `main` branch.

If the validation fails (for example, in a pull request), the action log will show a detailed error message indicating which file is invalid and why. For example:

```
✗ /github/workspace/contact-points.json
REQUIRED should have required property 'id'

  42 |                 }
  43 |             },
> 44 |             {
     |             ^ ☹️  id is missing here!
  45 |                 "name": "test entry no id"
  46 |             }
  47 |         ]
```
