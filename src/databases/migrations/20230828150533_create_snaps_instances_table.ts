import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('snaps_instances', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable().comment('User ID'); // Colui che ha creato lo snap

    table.string('instanceKey', 64).notNullable().comment('Key SHA256');
    table.boolean('timerStarted').defaultTo(false);
    table.integer('timerSeconds').defaultTo(10);
    table.timestamp('timerStartAt').nullable();

    table.integer('timerPublishSeconds').defaultTo(20);

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
    ALTER TABLE snaps_instances
    ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
`);

  // UNIQUE KEY (instanceKey, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX si_instanceKey_unarchived_uindex
    ON snaps_instances (instanceKey, unarchived)
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('snaps_instances');
}
