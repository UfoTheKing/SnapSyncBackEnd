import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('snaps_sync', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.bigInteger('snapShapeId').unsigned().index().references('id').inTable('snaps_shapes').onDelete('CASCADE').notNullable();
    table.bigInteger('snapInstanceId').unsigned().index().references('id').inTable('snaps_instances').onDelete('CASCADE').notNullable();

    table.string('imageKey').nullable().comment('S3 key of the image');

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
  ALTER TABLE snaps_sync
  ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('snaps_sync');
}
