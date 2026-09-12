# Security policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately to the portfolio owner's security email address. Add that address here before publishing the repository. Do not include sensitive personal data in a report.

You should receive an acknowledgement within five business days. Please allow a reasonable period for investigation and remediation before public disclosure.

## Supported version

Only the version currently deployed from the default branch is supported.

## Deployment expectations

- Terminate traffic with HTTPS and redirect HTTP to HTTPS.
- Store secrets in the hosting provider's secret manager, never in the repository.
- Keep `TRUST_PROXY=false` unless the proxy is trusted and replaces forwarded headers.
- Restrict production access and logs using least privilege.
- Enable automated dependency and platform security updates.
- Review privacy disclosures whenever analytics, embeds, hosting, or email providers change.
