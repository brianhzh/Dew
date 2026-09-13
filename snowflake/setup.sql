-- tables and seed for the student persona. paste into a snowsight worksheet.
-- needs a trial account with accountadmin, the trial default.
-- the seed must match seed.json in the shared folder.

CREATE WAREHOUSE IF NOT EXISTS DEW_WH
  WAREHOUSE_SIZE = XSMALL AUTO_SUSPEND = 300 AUTO_RESUME = TRUE;
CREATE DATABASE IF NOT EXISTS DEW;
CREATE SCHEMA IF NOT EXISTS DEW.CORE;
USE WAREHOUSE DEW_WH;
USE SCHEMA DEW.CORE;

CREATE OR REPLACE TABLE persona (
  user_id                STRING PRIMARY KEY,
  monthly_income         NUMBER(10,2),
  essentials_monthly     NUMBER(10,2),
  savings_target_monthly NUMBER(10,2),
  liquid_buffer          NUMBER(10,2),
  horizon_months         INT             -- about the degree length, 48
);

CREATE OR REPLACE TABLE goals (
  goal_id  STRING PRIMARY KEY,
  user_id  STRING,
  term     STRING,          -- short, mid or long. exactly 3 rows
  name     STRING,
  amount   NUMBER(10,2),
  progress NUMBER(10,2)
);

CREATE OR REPLACE TABLE transactions (
  txn_id       STRING PRIMARY KEY,
  user_id      STRING,
  ts           TIMESTAMP_NTZ,
  amount       NUMBER(10,2),
  category     STRING,
  merchant     STRING,
  is_recurring BOOLEAN,
  is_essential BOOLEAN,
  source       STRING       -- manual, simulated or plaid_sandbox
);

CREATE OR REPLACE TABLE decisions (
  decision_id     STRING PRIMARY KEY,
  user_id         STRING,
  ts              TIMESTAMP_NTZ,
  amount          NUMBER(10,2),
  category        STRING,
  is_recurring    BOOLEAN,
  is_essential    BOOLEAN,
  severity_bucket STRING,
  vigor_delta     FLOAT,
  maturity_delta  FLOAT,
  choice          STRING    -- buy or cancelled
);

CREATE OR REPLACE TABLE plant_state (
  user_id       STRING PRIMARY KEY,
  vigor         FLOAT,
  baseline      FLOAT,
  maturity      FLOAT,
  pests_json    VARIANT,
  last_event_ts TIMESTAMP_NTZ
);

CREATE OR REPLACE TABLE commitments (
  commitment_id STRING PRIMARY KEY,
  user_id       STRING,
  ts            TIMESTAMP_NTZ,
  kind          STRING,
  amount        NUMBER(10,2),
  goal_id       STRING,
  status        STRING
);

CREATE OR REPLACE TABLE mc_percentiles (
  horizon_month INT PRIMARY KEY,
  p10_growth    FLOAT,
  p50_growth    FLOAT,
  p90_growth    FLOAT
);  -- filled later by the percentile precompute, drives maturity growth

-- seed the student persona
INSERT INTO persona VALUES ('demo-1', 1600, 1250, 150, 1900, 48);

INSERT INTO goals VALUES
  ('g-short', 'demo-1', 'short', 'Reading-week trip',       400, 120),
  ('g-mid',   'demo-1', 'mid',   'Sublet deposit',          900, 150),
  ('g-long',  'demo-1', 'long',  'Graduate with a buffer', 5000, 480);

INSERT INTO plant_state
  SELECT 'demo-1', 72, 72, 41, PARSE_JSON('[]'), CURRENT_TIMESTAMP();

-- sanity check. expect disc_room 200
SELECT user_id,
       monthly_income - essentials_monthly - savings_target_monthly AS disc_room
FROM persona;
