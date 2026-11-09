-- Ejecutar en pgAdmin (Query Tool) después del primer arranque del backend,
-- cuando TypeORM ya haya creado la tabla "personas".
INSERT INTO personas (nombre, correo, dia, mes) VALUES
  ('Ana Torres',      'ana.torres@example.com',     EXTRACT(DAY FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int),
  ('Luis Hernández',  'luis.hernandez@example.com', EXTRACT(DAY FROM CURRENT_DATE)::int, EXTRACT(MONTH FROM CURRENT_DATE)::int),
  ('María López',     'maria.lopez@example.com',    15, 3),
  ('Carlos Ramírez',  'carlos.ramirez@example.com', 1, 12);
