# Sprint 1 - database tests 001-006 after migration 0017 (27 Oct 2026)

Run by the operator with psql against BinaField-test (PostgreSQL 17, migration 0017 applied), each file with ON_ERROR_STOP=1.
Result: 001, 002, 003, 004, 005 and 006 all completed with no error and no FAILED line.
Note: a "'more' is not recognized" line in 004 is the Windows psql pager, not a test failure.
Scope: test database only; the main database got migration 0017 but the tests were not re-run there.
