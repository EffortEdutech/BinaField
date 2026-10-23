.PHONY: verify db-up db-down db-migrate db-verify db-reset manifest

verify:
	node tools/verify-batch1.mjs

db-up:
	docker compose up -d postgres

db-down:
	docker compose down

db-migrate:
	bash scripts/db/migrate.sh

db-verify:
	bash scripts/db/verify.sh

db-reset:
	bash scripts/db/reset.sh

manifest:
	node tools/generate-manifest.mjs
