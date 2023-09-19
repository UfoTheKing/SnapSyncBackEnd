import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('snaps_shapes', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.string('name', 64).notNullable().comment('Shape name');
    table.integer('numberOfUsers').unsigned().notNullable().comment('Number of users in the shape');

    table.string('iconKey', 255).notNullable().comment('Icon key');
    table.string('focusedIconKey', 255).notNullable().comment('Focused icon key');

    table.integer('columns').unsigned().notNullable().defaultTo(0);
    table.integer('rows').unsigned().notNullable().defaultTo(0);
    table.integer('spacing').unsigned().notNullable().defaultTo(1);
    table.integer('width').unsigned().notNullable().defaultTo(1080);
    table.integer('height').unsigned().notNullable().defaultTo(1920);

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
    ALTER TABLE snaps_shapes
    ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
`);

  // UNIQUE KEY (name, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX sis_unarchived_uindex
    ON snaps_shapes (name, unarchived)
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('snaps_shapes');
}
