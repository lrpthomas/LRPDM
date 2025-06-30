# Spatial Query Templates

## Proximity Search Template
```sql
WITH buffered_area AS (
  SELECT ST_Buffer(
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
    $3
  )::geometry AS geom
)
SELECT 
  f.*,
  ST_Distance(
    f.geom::geography, 
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
  ) AS distance_meters
FROM features f
JOIN buffered_area b ON ST_Intersects(f.geom, b.geom)
ORDER BY distance_meters 
LIMIT $4;
```

## Vector Tile Generation Template
```sql
SELECT ST_AsMVT(q, 'features', 4096, 'geom') AS mvt
FROM (
  SELECT 
    id, 
    properties,
    ST_AsMVTGeom(
      ST_Transform(geom, 3857),
      ST_TileEnvelope($1, $2, $3),
      4096, 64, true
    ) AS geom
  FROM features
  WHERE geom && ST_Transform(ST_TileEnvelope($1, $2, $3), 4326)
) q 
WHERE q.geom IS NOT NULL;
```

## Spatial Intersection Template
```sql
SELECT 
  a.id AS feature_a_id,
  b.id AS feature_b_id,
  ST_Area(ST_Intersection(a.geom, b.geom)) AS intersection_area,
  ST_AsGeoJSON(ST_Intersection(a.geom, b.geom)) AS intersection_geom
FROM features_a a
JOIN features_b b ON ST_Intersects(a.geom, b.geom)
WHERE ST_IsValid(a.geom) AND ST_IsValid(b.geom);
```

## Clustering Template
```sql
SELECT 
  ST_ClusterKMeans(geom, $1) OVER() AS cluster_id,
  array_agg(id) AS feature_ids,
  ST_Centroid(ST_Collect(geom)) AS cluster_center,
  count(*) AS feature_count
FROM features
WHERE geom IS NOT NULL
GROUP BY cluster_id;
```

## Spatial Aggregation Template
```sql
WITH grid AS (
  SELECT 
    ST_SquareGrid($1, ST_MakeEnvelope($2, $3, $4, $5, 4326)) AS cell
)
SELECT 
  row_number() OVER () AS cell_id,
  count(f.id) AS feature_count,
  avg(f.properties->>'value')::numeric AS avg_value,
  ST_AsGeoJSON(g.cell) AS cell_geom
FROM grid g
LEFT JOIN features f ON ST_Intersects(f.geom, g.cell)
GROUP BY g.cell
HAVING count(f.id) > 0;
```

## Buffer Analysis Template
```sql
WITH buffer_zones AS (
  SELECT 
    id,
    ST_Buffer(geom::geography, 100) AS buffer_100m,
    ST_Buffer(geom::geography, 500) AS buffer_500m,
    ST_Buffer(geom::geography, 1000) AS buffer_1km
  FROM source_features
)
SELECT 
  b.id,
  count(DISTINCT f1.id) AS features_within_100m,
  count(DISTINCT f2.id) AS features_within_500m,
  count(DISTINCT f3.id) AS features_within_1km
FROM buffer_zones b
LEFT JOIN target_features f1 ON ST_Intersects(f1.geom, b.buffer_100m::geometry)
LEFT JOIN target_features f2 ON ST_Intersects(f2.geom, b.buffer_500m::geometry)
LEFT JOIN target_features f3 ON ST_Intersects(f3.geom, b.buffer_1km::geometry)
GROUP BY b.id;
```

## Spatial Join Template
```sql
SELECT 
  a.*,
  b.properties->>'name' AS joined_name,
  b.properties->>'category' AS joined_category,
  ST_Distance(a.geom::geography, b.geom::geography) AS distance_meters
FROM features_a a
JOIN LATERAL (
  SELECT * FROM features_b b
  WHERE ST_DWithin(a.geom::geography, b.geom::geography, $1)
  ORDER BY ST_Distance(a.geom, b.geom)
  LIMIT 1
) b ON true;
```

## Geometry Validation Template
```sql
WITH validated AS (
  SELECT 
    id,
    geom,
    ST_IsValid(geom) AS is_valid,
    ST_IsValidReason(geom) AS invalid_reason,
    CASE 
      WHEN NOT ST_IsValid(geom) THEN ST_MakeValid(geom)
      ELSE geom
    END AS valid_geom
  FROM features
)
SELECT 
  id,
  is_valid,
  invalid_reason,
  ST_Equals(geom, valid_geom) AS unchanged,
  ST_AsGeoJSON(valid_geom) AS corrected_geom
FROM validated
WHERE NOT is_valid;
```