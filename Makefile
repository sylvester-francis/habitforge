.PHONY: gen
gen:
	cd backend && sqlc generate && tygo generate