# Security Policy: MasterChef Logistics Ecosystem

## 1. Supported Versions

Security updates and patches are actively maintained for the following versions:

| Version | Status | Security Maintenance |
| :--- | :--- | :--- |
| **v1.2.x / Latest** | :white_check_mark: Active | Supported with high-priority patches. |
| **v1.1.x** | :white_check_mark: Active | Critical security updates only. |
| **< v1.1.0** | :x: End of Life | Unsupported. Please upgrade to the latest release. |

---

## 2. Security Architecture & Controls

### A. Authentication & Cryptographic Hashing
- **Scrypt Key Derivation**: Admin password authentication uses Node.js `crypto.scryptSync` with a 32-byte salt and derived key length (compliant with CWE-916).
- **Constant-Time Verification**: Password comparisons utilize `crypto.timingSafeEqual` to eliminate side-channel timing analysis attacks.
- **Session Tokens**: Administrative sessions use JSON Web Tokens (JWT) signed with a secure secret key, expiring after 2 hours.

### B. NoSQL Injection Prevention
- Database query parameters (such as `weekKey` and `chatId`) are strictly sanitized using regular expressions (`/^\d{4,8}$/`) before evaluating database queries.
- Object-based query injection payloads are blocked at the middleware boundary.

### C. Path Traversal & File Upload Guardrails
- Uploaded file names are sanitized with `path.basename` and stripped of invalid path delimiters (`/`, `\`, `..`).
- Ingestion buffers are capped at a strict 15MB limit in `multer` to protect against memory exhaustion.

### D. Third-Party Dependency Vulnerability Mitigations
- **CVE-2024-4367 Mitigation**: The Mozilla PDF.js rendering engine (`pdfjs-dist` v4.10.38) is explicitly configured with `isEvalSupported: false`, prohibiting the execution of arbitrary JavaScript embedded in untrusted PDF files.

### E. HTTP Transport & Network Protections
- **HTTP Security Headers**: Express is hardened using `helmet` to enforce Content Security Policy (CSP), Strict-Transport-Security (HSTS), X-Content-Type-Options (`nosniff`), and X-Frame-Options.
- **Rate Limiting**: `express-rate-limit` throttles request frequency to mitigate brute-force password guessing and DDoS traffic.

---

## 3. Reporting a Vulnerability

We take the security of MasterChef and our users very seriously. If you discover a vulnerability or potential security flaw:

1. **Do NOT open a public GitHub issue.**
2. Email your findings directly to the maintainers:
   - **Brijesh Jagad**: `jagadbrijesh1501@gmail.com`
   - **Urva Suthar**: `urvasuthar2@gmail.com`
3. Please include:
   - A description of the vulnerability and its potential impact.
   - Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
   - Any suggested remediations.

### Response Timeline & SLA
- **Initial Acknowledgment**: Within 24 hours.
- **Triage & Assessment**: Within 72 hours.
- **Fix & Disclosure**: Critical vulnerabilities are patched and released within 7 business days under responsible disclosure.
