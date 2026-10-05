CREATE TABLE IF NOT EXISTS training_courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO training_courses (title, visible, sort_order)
SELECT 'First Aid Level 1', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM training_courses WHERE title = 'First Aid Level 1');
INSERT INTO training_courses (title, visible, sort_order)
SELECT 'Fire Fighting', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM training_courses WHERE title = 'Fire Fighting');
INSERT INTO training_courses (title, visible, sort_order)
SELECT 'OHS SHE Representative', 1, 2
WHERE NOT EXISTS (SELECT 1 FROM training_courses WHERE title = 'OHS SHE Representative');
INSERT INTO training_courses (title, visible, sort_order)
SELECT 'Legal Liability', 1, 3
WHERE NOT EXISTS (SELECT 1 FROM training_courses WHERE title = 'Legal Liability');
INSERT INTO training_courses (title, visible, sort_order)
SELECT 'Working at Heights', 1, 4
WHERE NOT EXISTS (SELECT 1 FROM training_courses WHERE title = 'Working at Heights');
INSERT INTO training_courses (title, visible, sort_order)
SELECT 'Incident Investigations', 1, 5
WHERE NOT EXISTS (SELECT 1 FROM training_courses WHERE title = 'Incident Investigations');

INSERT INTO settings (key, value)
VALUES
  ('heroText', 'UBUNYE Safety & Compliance provides safety training in Eastern Cape, Limpopo and Mpumalanga, and consulting, ISO and OHS compliance services in the Eastern Cape.'),
  ('phone', '083 646 7294'),
  ('mickPhone', '060 949 9911'),
  ('whatsapp', '067 577 9148'),
  ('provinces', 'Eastern Cape, Limpopo, Mpumalanga')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;

UPDATE proof
SET verified = 0, published = 0
WHERE title = 'Case study framework'
  AND details = 'Problem → intervention → measurable result.';

UPDATE faq
SET question = 'Who can help with OHS compliance in the Eastern Cape?',
    answer = 'In the Eastern Cape, Nolan provides OHS compliance support, including audits, gap identification, documentation support and practical action planning. In Limpopo and Mpumalanga, Mick provides training courses only.'
WHERE question = 'Who can help with OHS compliance in South Africa?';

UPDATE faq
SET answer = 'In the Eastern Cape, Nolan provides SHEQ consulting and support for practical safety, health, environment and quality systems.'
WHERE question = 'What does a SHEQ consultant do?';

UPDATE faq
SET answer = 'Nolan provides ISO 45001 support, along with ISO 9001 and ISO 14001 support, in the Eastern Cape. Certification is awarded by an independent certification body.'
WHERE question = 'Who provides ISO 45001 support?';

UPDATE faq
SET answer = 'In the Eastern Cape, Nolan helps businesses prepare and review safety files. In Limpopo and Mpumalanga, Mick provides training courses only.'
WHERE question = 'Who can help prepare a safety file?';

UPDATE faq
SET answer = 'Nolan provides ongoing SHEQ retainer support in the Eastern Cape for businesses that need consistent compliance assistance without a full-time internal resource.'
WHERE question = 'When does a business need ongoing SHEQ support?';
