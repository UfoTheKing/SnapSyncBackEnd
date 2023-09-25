import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('websocket_clients', table => {
    table.charset('utf8mb4');
    table.bigIncrements('id').unsigned().primary();

    table.bigInteger('userId').unsigned().index().references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.bigInteger('deviceId').unsigned().index().references('id').inTable('devices').onDelete('CASCADE').notNullable();

    table.uuid('uuid').notNullable();

    table.timestamp('startedAt').defaultTo(knex.fn.now());
    table.timestamp('endedAt').nullable().defaultTo(null);

    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt').nullable().defaultTo(null);
  });

  await knex.schema.raw(`
  ALTER TABLE websocket_clients
  ADD COLUMN unarchived BOOLEAN GENERATED ALWAYS AS (IF(deletedAt IS NULL, 1, NULL)) VIRTUAL
`);

  // UNIQUE KEY (uuid, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX uc_uuid_unarchived_uindex    
    ON websocket_clients (uuid, unarchived)
    `);

  // UNIQUE KEY (userId,deviceId, unarchived)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX uc_ud_unarchived_uindex
    ON websocket_clients (userId,deviceId, unarchived)
    `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('websocket_clients');
}
