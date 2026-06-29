# TAE reconciliation files are generated evidence per child or standalone client

The dashboard will support daily TAE reconciliation files as an operational feature under `/dashboard/reconciliations`. A reconciliation configuration belongs only to a parent client or a standalone client. Parent configurations own one delivery setup, SFTP by default or FTP when explicitly required, and generate one independent TXT file per active child with TAE identifiers. Child clients do not have separate delivery configuration or their own reconciliation section.

Internal administrators can create and edit reconciliation configuration, assign child reconciliation usernames, test the delivery connection, retry sends, and see technical errors. Client users for parent or standalone clients can see business-friendly run history, delivery status, and download generated files, without delivery credentials or internal error details. Child users do not get a separate reconciliation section.

Each active standalone configuration stores a reconciliation username for the `[Usuario]` filename segment. Parent configurations store child-specific reconciliation usernames, the business cutoff timezone used to choose the reconciled calendar day, independent filename/content date formats, the provider-specific filename difference value, and optional delivery settings. The filename difference is not treated as a universal timezone offset because providers may define their own base.

The scheduled job runs once daily and processes enabled configurations. Each parent run resolves current active children with TAE identifiers, queries each child independently for the reconciled day, includes only successful Telcel transactions, validates required fields, writes one TXT file per child to private storage, and stores only metadata in Postgres. If one child fails, sibling files continue independently.

Generated files are evidence, not throwaway exports. The sent file and the downloaded file must be the same stored object. Postgres stores run metadata such as owner client, reconciled date, filename, storage path, status, transaction count, total amount, included external client ids, timestamps, and internal error text. The TXT content lives in private storage, with an initial retention target of 90 days.

Remote delivery is optional. A configuration may generate downloadable files without delivery enabled. SFTP is preferred; plain FTP is allowed only for clients that explicitly require it. If delivery fails, the run records a failed status, keeps the generated file, and allows internal-admin manual retry. The first version does not include email notifications or automatic retry loops.

## Consequences

- Reconciliation is distinct from CSV export: it is scheduled evidence with provider formatting rules.
- Parent reconciliation follows current group membership at generation time; each run records `owner_client_id` for the parent and `subject_client_id` for the child file.
- The dashboard still does not become the transaction source of truth; it stores generated evidence and operational metadata only.
- The file generator depends on normalized transaction fields: phone number, authorization, occurrence date, amount, status, and external client id.
- For Telcel-only v1, authorization is required, numeric, padded to 10 digits when shorter, and rejected when longer than 10 digits.
- Empty successful-transaction days still generate a header-only file so the absence of sales is explicit.
- Replacing an existing run for the same client and date is not part of v1; resend should use the stored file.
