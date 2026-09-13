# Snowflake track, Person B

The API runs fully offline against the json store and a canned market projection,
so nothing here blocks the frontend. This folder is the real data path.

## Account setup (only you can do these)

1. Trial account at signup.snowflake.com. Confirm you hold ACCOUNTADMIN, and can
   switch to ORGADMIN (needed to mount a Marketplace listing).
2. Marketplace, search "Snowflake Public Data (Free)" (the Cybersyn Financial and
   Economic Essentials data) and Get it. Write down the database name it mounts
   under, you will need it below.
3. Paste setup.sql into a Snowsight SQL file and run it. The sanity row should
   show disc_room = 200.
4. Keep alive: leave a worksheet on SELECT 1 or a small TASK running from an hour
   before judging, since the warehouse auto suspends at 300 seconds.

## The monte carlo maturity projection (montecarlo.sql)

This is what grows maturity and prices the setback of every purchase in the app.

1. Open montecarlo.sql in a SQL file.
2. STEP 1: run SHOW DATABASES and the sample SELECT to confirm the mounted price
   table name and which variable_name holds the close (usually Post-Market Close).
3. STEP 3: edit the CALL so the first argument is your real table name, then run
   the whole file. It block bootstraps 5000 paths of 48 months from real QQQ
   monthly returns and writes DEW.CORE.mc_percentiles.
4. STEP 4: confirm p10 below p50 below p90 at every horizon.
5. STEP 5: it returns one cell of json. Copy that cell into
   shared/mc_percentiles.json, replacing the canned file. The api now runs on the
   real projection with no code change, since the engine reads that file on start.

To pick a different market proxy change the ticker in the CALL. QQQ is a broad
nasdaq listed etf and a safe default for this dataset.

## Still to wire (optional, later)

- Point the api at the Snowflake tables: fill the env vars for snowflake_store.py
  and add a store selector in main. The offline json store stays the default.
- Cortex narrative: one AI_COMPLETE call behind narrative.generate() with a 4
  second timeout to the fallback bank.
