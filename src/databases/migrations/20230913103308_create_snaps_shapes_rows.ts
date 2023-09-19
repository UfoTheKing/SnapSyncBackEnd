import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('snaps_shapes_rows', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('snapShapeId').unsigned().index().references('id').inTable('snaps_shapes').onDelete('CASCADE').notNullable();
    table.integer('row').unsigned().notNullable();

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
    ALTER TABLE snaps_shapes_rows
    ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('snaps_shapes_rows');
}
