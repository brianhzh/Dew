-- block bootstrap monte carlo over real market history, writes DEW.CORE.mc_percentiles.
-- run this in a snowsight sql worksheet AFTER setup.sql and after you have mounted
-- the free market listing. it produces p10 p50 p90 cumulative return by horizon month,
-- which the api reads to price the maturity setback of every purchase.

USE WAREHOUSE DEW_WH;
USE SCHEMA DEW.CORE;

-- STEP 1. the price view is SNOWFLAKE_PUBLIC_DATA_FREE.PUBLIC_DATA_FREE.STOCK_PRICE_TIMESERIES.
-- confirm which variable_name holds the close, then pass that label into the CALL.
SELECT DISTINCT variable_name
FROM SNOWFLAKE_PUBLIC_DATA_FREE.PUBLIC_DATA_FREE.STOCK_PRICE_TIMESERIES
WHERE ticker = 'QQQ';
-- the daily close is usually 'Post-Market Close'. use whatever label this returns.

-- STEP 2. the procedure. block bootstrap keeps real fat tails and sequence risk,
-- which is the honest reason to sample real months instead of a fixed mean and sigma.
CREATE OR REPLACE PROCEDURE DEW.CORE.run_montecarlo(source_table STRING, ticker STRING,
                                                   close_var STRING,
                                                   n_sims INT, block_len INT, horizon INT)
  RETURNS STRING
  LANGUAGE PYTHON
  RUNTIME_VERSION = '3.10'
  PACKAGES = ('snowflake-snowpark-python', 'numpy')
  HANDLER = 'run'
AS
$$
import numpy as np

def run(session, source_table, ticker, close_var, n_sims, block_len, horizon):
    q = f"""
      WITH monthly AS (
        SELECT DATE_TRUNC('month', date) AS mon, MAX_BY(value, date) AS px
        FROM {source_table}
        WHERE ticker = '{ticker}' AND variable_name = '{close_var}'
        GROUP BY 1
      )
      SELECT mon, px FROM monthly ORDER BY mon
    """
    rows = session.sql(q).collect()
    px = np.array([float(r['PX']) for r in rows if r['PX'] is not None])
    if len(px) < block_len + 2:
        raise ValueError(f'not enough price history for {ticker}, got {len(px)} months')
    rets = px[1:] / px[:-1] - 1.0            # monthly returns from month end closes
    n = len(rets)

    rng = np.random.default_rng(42)          # fixed seed so the table is reproducible
    paths = np.empty((n_sims, horizon))
    for i in range(n_sims):
        seq = []
        while len(seq) < horizon:
            start = int(rng.integers(0, n - block_len + 1))
            seq.extend(rets[start:start + block_len])   # a contiguous real block
        paths[i] = seq[:horizon]

    growth = np.cumprod(1.0 + paths, axis=1)  # cumulative multiplier per month
    out = []
    for m in range(horizon):
        p10, p50, p90 = np.percentile(growth[:, m], [10, 50, 90])
        out.append((m + 1, float(p10 - 1), float(p50 - 1), float(p90 - 1)))

    df = session.create_dataframe(
        out, schema=['HORIZON_MONTH', 'P10_GROWTH', 'P50_GROWTH', 'P90_GROWTH'])
    df.write.mode('overwrite').save_as_table('DEW.CORE.MC_PERCENTILES')
    return f'wrote {horizon} rows from {n} monthly returns of {ticker}'
$$;

-- STEP 3. run it. edit the first argument to your mounted table name from step 1.
-- QQQ is a broad nasdaq listed etf and a good market proxy. 5000 paths, 6 month blocks, 48 months.
CALL DEW.CORE.run_montecarlo('SNOWFLAKE_PUBLIC_DATA_FREE.PUBLIC_DATA_FREE.STOCK_PRICE_TIMESERIES',
                             'QQQ', 'Post-Market Close', 5000, 6, 48);

-- STEP 4. sanity. p10 below p50 below p90 at every horizon, and growth rising with time.
SELECT horizon_month, ROUND(p10_growth, 4) AS p10,
       ROUND(p50_growth, 4) AS p50, ROUND(p90_growth, 4) AS p90
FROM mc_percentiles
WHERE horizon_month IN (12, 24, 36, 48)
ORDER BY horizon_month;

-- STEP 5. export for the api. this returns one cell of json. copy it into
-- shared/mc_percentiles.json (replacing the canned file) and the api uses the real data.
SELECT OBJECT_CONSTRUCT(
         'horizon_months', 48,
         'source', 'snowflake montecarlo, ticker QQQ',
         'rows', ARRAY_AGG(OBJECT_CONSTRUCT('m', horizon_month,
                   'p10', ROUND(p10_growth, 4),
                   'p50', ROUND(p50_growth, 4),
                   'p90', ROUND(p90_growth, 4)))
                 WITHIN GROUP (ORDER BY horizon_month)
       )::STRING AS mc_json
FROM mc_percentiles;
