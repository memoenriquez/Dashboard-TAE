# TAE reconciliation files are generated evidence per parent or standalone client

The dashboard will support daily TAE reconciliation files as an operational feature under `/dashboard/reconciliations`. A reconciliation configuration belongs only to a parent client or a standalone client. Child clients are included in their parent file and do not have separate SFTP configuration or reconciliation history in the first version.

Internal administrators can create and edit reconciliation configuration, test the SFTP connection, retry sends, and see technical errors. Client users for parent or standalone clients can see business-friendly run history, delivery status, and download generated files, without SFTP credentials or internal error details. Child users do not get a separate reconciliation section because the file format does not identify child origin per line.

Each active configuration stores a reconciliation username for the `[Usuario]` filename segment, the business cutoff timezone used to choose the reconciled calendar day, the provider-specific filename difference value, and optional SFTP delivery settings. The filename difference is not treated as a universal timezone offset because providers may define their own base.

The scheduled job runs once daily at 03:00 Mexico City time and processes enabled configurations. Each run resolves the current active external client ids for the parent or standalone scope, queries the external TAE source for the reconciled day, includes only successful Telcel transactions, validates required fields, writes one TXT file to private storage, and stores only metadata in Postgres. If required line data is missing or invalid, the run fails and the file is not sent.

Generated files are evidence, not throwaway exports. The sent file and the downloaded file must be the same stored object. Postgres stores run metadata such as owner client, reconciled date, filename, storage path, status, transaction count, total amount, included external client ids, timestamps, and internal error text. The TXT content lives in private storage, with an initial retention target of 90 days.

SFTP delivery is optional. A configuration may generate downloadable files without SFTP enabled. If SFTP delivery fails, the run records a failed status, keeps the generated file, and allows internal-admin manual retry. The first version does not include email notifications or automatic retry loops.

## Consequences

- Reconciliation is distinct from CSV export: it is scheduled evidence with provider formatting rules.
- Parent reconciliation follows current group membership at generation time; the run metadata should record which external client ids were included.
- The dashboard still does not become the transaction source of truth; it stores generated evidence and operational metadata only.
- The file generator depends on normalized transaction fields: phone number, authorization, occurrence date, amount, status, and external client id.
- For Telcel-only v1, authorization is required, numeric, padded to 10 digits when shorter, and rejected when longer than 10 digits.
- Empty successful-transaction days still generate a header-only file so the absence of sales is explicit.
- Replacing an existing run for the same client and date is not part of v1; resend should use the stored file.
