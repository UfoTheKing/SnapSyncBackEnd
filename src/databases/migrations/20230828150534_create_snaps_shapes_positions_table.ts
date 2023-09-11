import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('snaps_shapes_positions', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('snapShapeId').unsigned().index().references('id').inTable('snaps_shapes').onDelete('CASCADE').notNullable();

    table.string('name', 64).notNullable();

    table.boolean('ownerPosition').defaultTo(false).comment('Is this the owner position?');

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
  ALTER TABLE snaps_shapes_positions
  ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
`);

  // UNIQUE KEY (snapShapeId, name, unarchived)
  await knex.schema.raw(`
  CREATE UNIQUE INDEX sisp_unarchived_uindex
  ON snaps_shapes_positions (snapShapeId, name, unarchived)
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('snaps_shapes_positions');
}
