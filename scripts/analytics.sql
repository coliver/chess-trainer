-- Usage analytics from existing tables. Run with:
--   docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < scripts/analytics.sql
-- The first section reads auth_events (register/login/login_failed/logout, only
-- populated from the deploy that added it onward). The rest use "a training move
-- was submitted" (training_responses) as a proxy for "was active"; puzzle
-- attempts are not recorded.

\echo '--- Auth events per day (last 30 days) ---'
SELECT created_at::date AS day,
       count(*) FILTER (WHERE event_type = 'register') AS registers,
       count(*) FILTER (WHERE event_type = 'login') AS logins,
       count(DISTINCT user_id) FILTER (WHERE event_type = 'login') AS login_users,
       count(*) FILTER (WHERE event_type = 'login_failed') AS failed_logins,
       count(*) FILTER (WHERE event_type = 'logout') AS logouts
FROM auth_events
WHERE created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1 DESC;

\echo '--- Registered but never logged in (signed up since auth_events began) ---'
SELECT u.username, u.created_at::date AS signed_up
FROM users u
WHERE EXISTS (SELECT 1 FROM auth_events e WHERE e.user_id = u.id AND e.event_type = 'register')
  AND NOT EXISTS (SELECT 1 FROM auth_events e WHERE e.user_id = u.id AND e.event_type = 'login')
ORDER BY u.created_at DESC;

\echo '--- Signups per day (last 30 days) ---'
SELECT created_at::date AS day, count(*) AS signups
FROM users
WHERE created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1 DESC;

\echo '--- Daily active users and moves (last 30 days) ---'
SELECT r.created_at::date AS day,
       count(DISTINCT s.user_id) AS active_users,
       count(*) AS moves,
       round(100.0 * avg(r.is_correct::int), 1) AS pct_correct
FROM training_responses r
JOIN training_items i ON i.id = r.item_id
JOIN training_sessions s ON s.id = i.session_id
WHERE r.created_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1 DESC;

\echo '--- Weekly active users (last 8 weeks) ---'
SELECT date_trunc('week', r.created_at)::date AS week,
       count(DISTINCT s.user_id) AS active_users
FROM training_responses r
JOIN training_items i ON i.id = r.item_id
JOIN training_sessions s ON s.id = i.session_id
WHERE r.created_at > now() - interval '8 weeks'
GROUP BY 1 ORDER BY 1 DESC;

\echo '--- Per-user activity (all time) ---'
SELECT u.username,
       u.created_at::date AS signed_up,
       count(r.id) AS moves,
       max(r.created_at) AS last_active
FROM users u
LEFT JOIN training_sessions s ON s.user_id = u.id
LEFT JOIN training_items i ON i.session_id = s.id
LEFT JOIN training_responses r ON r.item_id = i.id
GROUP BY u.id
ORDER BY last_active DESC NULLS LAST;

\echo '--- Most trained openings (all time) ---'
SELECT coalesce(i.opening_name, s.opening_name) AS opening, count(*) AS moves
FROM training_responses r
JOIN training_items i ON i.id = r.item_id
JOIN training_sessions s ON s.id = i.session_id
GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
