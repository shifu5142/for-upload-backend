import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("NO_DATABASE_URL");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });

const rows = await sql`
  SELECT
    parent.name AS parent_name,
    child.name AS child_name,
    (
      SELECT count(*)::int
      FROM playbooks p
      WHERE p.category_id = parent.id
    ) AS playbooks_on_parent,
    (
      SELECT count(*)::int
      FROM playbooks p
      WHERE p.category_id = child.id
    ) AS playbooks_on_child
  FROM categories parent
  LEFT JOIN categories child ON child.parent_category_id = parent.id
  WHERE parent.parent_category_id IS NULL
  ORDER BY parent.name, child.name
`;

console.log(JSON.stringify(rows, null, 2));

const orphans = await sql`
  SELECT p.id, p.name, p.category_id
  FROM playbooks p
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE c.id IS NULL
`;
console.log("orphan_playbooks", orphans.length);

await sql.end();
